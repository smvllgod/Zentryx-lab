// @ts-nocheck — see lib/strategies/store.ts for the same supabase-js generic note.
"use client";

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

export type ListingRow = Tables<"marketplace_listings">;

function db() {
  return getSupabase();
}

export async function listPublishedListings(filter?: { tag?: string }): Promise<ListingRow[]> {
  if (!isSupabaseConfigured()) return [];
  let q = db().from("marketplace_listings").select("*").eq("status", "published");
  if (filter?.tag) q = q.contains("tags", [filter.tag]);
  q = q.order("created_at", { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export interface ListingAuthor {
  id: string;
  display_name: string;
  full_name: string | null;
  alias: string | null;
  avatar_url: string | null;
  /** Email kept for back-compat — may be null since we now query the public view. */
  email: string | null;
}

export interface ListingWithAuthor extends ListingRow {
  author: ListingAuthor | null;
}

/**
 * Published listings joined with author display info. Used by the
 * public marketplace UI.
 *
 * The author is resolved via the `public_profiles` view (safe subset of
 * `profiles` — no email/plan/role). With migration 0008's "profiles
 * public read" policy, any viewer sees every public-opt-in creator,
 * so listing cards show real names instead of "Anonymous".
 */
export async function listPublishedListingsWithAuthors(): Promise<ListingWithAuthor[]> {
  if (!isSupabaseConfigured()) return [];
  const s = db();
  const { data: listings, error } = await s
    .from("marketplace_listings")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (listings ?? []) as ListingRow[];
  if (rows.length === 0) return [];
  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
  const { data: authors } = await s
    .from("public_profiles")
    .select("id, display_name, full_name, alias, avatar_url")
    .in("id", authorIds);
  const byId = new Map<string, ListingAuthor>();
  for (const a of (authors ?? []) as {
    id: string;
    display_name: string;
    full_name: string | null;
    alias: string | null;
    avatar_url: string | null;
  }[]) {
    byId.set(a.id, { ...a, email: null });
  }
  return rows.map((r) => ({ ...r, author: byId.get(r.author_id) ?? null }));
}

/** Single listing with its author — used by the detail page. */
export async function getListingWithAuthor(id: string): Promise<ListingWithAuthor | null> {
  if (!isSupabaseConfigured()) return null;
  const s = db();
  const { data: listing, error } = await s
    .from("marketplace_listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !listing) return null;
  const row = listing as ListingRow;
  const { data: author } = await s
    .from("public_profiles")
    .select("id, display_name, full_name, alias, avatar_url")
    .eq("id", row.author_id)
    .maybeSingle();
  const a = author as { id: string; display_name: string; full_name: string | null; alias: string | null; avatar_url: string | null } | null;
  return { ...row, author: a ? { ...a, email: null } : null };
}

export async function listOwnListings(): Promise<ListingRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = db();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("marketplace_listings")
    .select("*")
    .eq("author_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getListing(id: string): Promise<ListingRow | null> {
  const { data, error } = await db()
    .from("marketplace_listings")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function createListing(args: {
  strategyId: string;
  title: string;
  description: string;
  priceCents: number;
  tags: string[];
}): Promise<ListingRow> {
  const supabase = db();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data, error } = await supabase
    .from("marketplace_listings")
    .insert({
      strategy_id: args.strategyId,
      author_id: user.id,
      title: args.title,
      description: args.description,
      price_cents: args.priceCents,
      tags: args.tags,
      status: "draft",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateListing(
  id: string,
  patch: Partial<{
    title: string;
    description: string;
    price_cents: number;
    tags: string[];
    status: "draft" | "published" | "archived";
    thumbnail_url: string | null;
    presentation_image_url: string | null;
    gallery_urls: string[];
  }>,
): Promise<ListingRow> {
  const { data, error } = await db()
    .from("marketplace_listings")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listTags() {
  const { data, error } = await db().from("marketplace_tags").select("*").order("label");
  if (error) throw error;
  return data ?? [];
}
