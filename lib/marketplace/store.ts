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

export interface ListingWithAuthor extends ListingRow {
  author: { id: string; full_name: string | null; email: string } | null;
}

/**
 * Published listings joined with author display info. Used by the
 * public marketplace UI.
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
    .from("profiles")
    .select("id,full_name,email")
    .in("id", authorIds);
  const byId = new Map(
    (authors ?? []).map((a: { id: string; full_name: string | null; email: string }) => [a.id, a]),
  );
  return rows.map((r) => ({ ...r, author: byId.get(r.author_id) ?? null }));
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
