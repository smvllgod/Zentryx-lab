// @ts-nocheck — Supabase v2 generics
"use client";

// Reviews — list, write, edit, delete + purchase-eligibility check.
// RLS (migration 0007) enforces the "must have paid purchase" rule on
// INSERT; this module mirrors the check client-side so we can show /
// hide the review form and surface a friendly message.

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

export type ReviewRow = Tables<"reviews"> & {
  author?: { full_name: string | null; email: string } | null;
};

function db() { return getSupabase(); }

export async function listReviews(listingId: string): Promise<ReviewRow[]> {
  if (!isSupabaseConfigured()) return [];
  const s = db();
  const { data, error } = await s
    .from("reviews")
    .select("*")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as ReviewRow[];
  if (rows.length === 0) return rows;
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

export async function myReviewFor(listingId: string): Promise<ReviewRow | null> {
  if (!isSupabaseConfigured()) return null;
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const { data } = await s
    .from("reviews")
    .select("*")
    .eq("listing_id", listingId)
    .eq("author_id", user.id)
    .maybeSingle();
  return (data ?? null) as ReviewRow | null;
}

/**
 * Returns true if the signed-in user has a `paid` purchase for the listing.
 * Also covers "free" listings: a zero-price listing is always reviewable
 * once the user has clicked "Get" (recorded as a free purchase).
 */
export async function hasPurchased(listingId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return false;
  const { data, error } = await s
    .from("purchases")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", user.id)
    .eq("status", "paid")
    .limit(1);
  if (error) return false;
  return (data ?? []).length > 0;
}

export async function writeReview(args: {
  listingId: string;
  rating: number;
  body: string;
}): Promise<ReviewRow> {
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const rating = Math.max(1, Math.min(5, Math.round(args.rating)));
  const { data, error } = await s
    .from("reviews")
    .upsert(
      {
        listing_id: args.listingId,
        author_id: user.id,
        rating,
        body: args.body.trim() || null,
      },
      { onConflict: "listing_id,author_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data as ReviewRow;
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await db().from("reviews").delete().eq("id", id);
  if (error) throw error;
}
