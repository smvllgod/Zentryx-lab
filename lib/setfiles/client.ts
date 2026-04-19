// @ts-nocheck — Supabase v2 generic `never` widening.
"use client";

// Client-side setfile CRUD.
//
// Paths: `<user_id>/<setfile_id>.set` — matches the RLS policies defined
// in 0008_platform_expansion.sql. The DB row `file_path` stores the
// relative path inside the `setfiles` storage bucket.

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

export type SetfileRow = Tables<"setfiles">;

function db() {
  return getSupabase();
}

// Max file size — matches bucket limit.
export const MAX_SETFILE_BYTES = 512 * 1024; // 512 KB

// Accepted extensions. MT5 uses `.set` almost exclusively; we accept a
// couple of adjacent formats for flexibility (some tools export `.setx`).
export const ACCEPTED_SETFILE_EXT = [".set", ".setx", ".txt"];

// ── Listing (self) ─────────────────────────────────────────────────

export async function listMySetfiles(opts: {
  listingId?: string;
  strategyId?: string;
  onlyPersonal?: boolean;
  limit?: number;
} = {}): Promise<SetfileRow[]> {
  if (!isSupabaseConfigured()) return [];
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [];
  let q = s.from("setfiles").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(opts.limit ?? 200);
  if (opts.listingId) q = q.eq("listing_id", opts.listingId);
  if (opts.strategyId) q = q.eq("strategy_id", opts.strategyId);
  if (opts.onlyPersonal) q = q.eq("scope", "personal");
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SetfileRow[];
}

export async function listSetfilesForListing(listingId: string): Promise<SetfileRow[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await db()
    .from("setfiles")
    .select("*")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as SetfileRow[];
}

export async function countSetfilesForListing(listingId: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const { count } = await db()
    .from("setfiles")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId);
  return count ?? 0;
}

export async function listPublicSetfiles(limit = 100): Promise<SetfileRow[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await db()
    .from("setfiles")
    .select("*")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as SetfileRow[];
}

// ── Create ─────────────────────────────────────────────────────────

export interface UploadSetfileInput {
  file: File;
  name: string;
  description?: string | null;
  symbol?: string | null;
  timeframe?: string | null;
  broker?: string | null;
  listingId?: string | null;
  strategyId?: string | null;
  isPublic?: boolean;
}

export async function uploadSetfile(input: UploadSetfileInput): Promise<SetfileRow> {
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("Not signed in");

  if (input.file.size > MAX_SETFILE_BYTES) {
    throw new Error(`Setfile too large (${Math.round(input.file.size / 1024)} KB). Max is ${Math.round(MAX_SETFILE_BYTES / 1024)} KB.`);
  }
  const ext = (input.file.name.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? ".set").toLowerCase();
  if (!ACCEPTED_SETFILE_EXT.includes(ext)) {
    throw new Error(`Unsupported setfile extension "${ext}". Use one of: ${ACCEPTED_SETFILE_EXT.join(", ")}`);
  }

  // We need a stable id to compute the storage path; insert the row
  // first (without file_path) to get it, then upload, then patch the path.
  const scope: SetfileRow["scope"] =
    input.listingId ? "listing" :
    input.strategyId ? "strategy" : "personal";

  const { data: pre, error: preErr } = await s
    .from("setfiles")
    .insert({
      user_id: user.id,
      listing_id: input.listingId ?? null,
      strategy_id: input.strategyId ?? null,
      name: input.name.trim() || input.file.name,
      description: input.description ?? null,
      symbol: input.symbol ?? null,
      timeframe: input.timeframe ?? null,
      broker: input.broker ?? null,
      file_path: "",       // patched below
      file_bytes: input.file.size,
      scope,
      is_public: Boolean(input.isPublic),
    })
    .select("*")
    .single();
  if (preErr || !pre) throw preErr ?? new Error("Failed to insert setfile row");

  const path = `${user.id}/${pre.id}${ext}`;
  const { error: upErr } = await s.storage
    .from("setfiles")
    .upload(path, input.file, {
      cacheControl: "60",
      upsert: true,
      contentType: "application/octet-stream",
    });
  if (upErr) {
    // Rollback the row so we don't leave a ghost.
    await s.from("setfiles").delete().eq("id", pre.id);
    throw upErr;
  }

  const { data: updated, error: patchErr } = await s
    .from("setfiles")
    .update({ file_path: path })
    .eq("id", pre.id)
    .select("*")
    .single();
  if (patchErr) throw patchErr;
  return updated as SetfileRow;
}

// ── Update / delete ────────────────────────────────────────────────

export async function updateSetfile(id: string, patch: {
  name?: string;
  description?: string | null;
  symbol?: string | null;
  timeframe?: string | null;
  broker?: string | null;
  listing_id?: string | null;
  strategy_id?: string | null;
  is_public?: boolean;
}): Promise<void> {
  const { error } = await db().from("setfiles").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteSetfile(id: string): Promise<void> {
  const s = db();
  const { data: row } = await s.from("setfiles").select("file_path").eq("id", id).maybeSingle();
  const { error } = await s.from("setfiles").delete().eq("id", id);
  if (error) throw error;
  if (row?.file_path) {
    await s.storage.from("setfiles").remove([row.file_path]).catch(() => undefined);
  }
}

// ── Download ───────────────────────────────────────────────────────

/**
 * Public URL for a setfile (bucket is public — the setfiles row itself
 * is the ACL, storage just serves bytes).
 */
export function setfilePublicUrl(row: Pick<SetfileRow, "file_path">): string {
  if (!row.file_path) return "";
  const { data } = db().storage.from("setfiles").getPublicUrl(row.file_path);
  return data.publicUrl;
}

/** Fetch the raw bytes of a setfile. Used by the ZIP bundler at download. */
export async function fetchSetfileBlob(row: Pick<SetfileRow, "file_path">): Promise<Blob | null> {
  if (!row.file_path) return null;
  const { data, error } = await db().storage.from("setfiles").download(row.file_path);
  if (error) return null;
  return data ?? null;
}
