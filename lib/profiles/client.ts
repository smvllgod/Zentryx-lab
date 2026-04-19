// @ts-nocheck — Supabase v2 generic `never` widening.
"use client";

// Client-side helpers for the creator profile surface:
//   • Update own profile (alias, bio, avatar).
//   • Fetch a public creator profile by id (reads from `public_profiles`).
//   • Fetch creator_stats for the trust badge + leaderboard.

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { TrustLevel } from "./trust";

export interface PublicProfile {
  id: string;
  display_name: string;
  full_name: string | null;
  alias: string | null;
  avatar_url: string | null;
  bio: string | null;
  plan: "free" | "pro" | "creator";
  created_at: string;
}

export interface CreatorStats {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  joined_at: string;
  listing_count: number;
  total_downloads: number;
  avg_rating: number;
  reviews_received: number;
  sales_count: number;
  account_age_days: number;
  trust_score: number;
  trust_level: TrustLevel;
}

function db() {
  return getSupabase();
}

// ── Self ──────────────────────────────────────────────────────────

export async function updateMyProfile(patch: {
  alias?: string | null;
  bio?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  is_public?: boolean;
}): Promise<void> {
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await s.from("profiles").update(patch).eq("id", user.id);
  if (error) throw error;
}

/**
 * Upload an avatar to the `avatars` bucket under the user's own prefix.
 * Returns the resulting public URL. Callers should persist it via
 * `updateMyProfile({ avatar_url: ... })`.
 */
export async function uploadAvatar(file: File): Promise<string> {
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const ext = (file.name.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "png";
  const path = `${user.id}/avatar-${Date.now()}.${safeExt}`;

  const { error: upErr } = await s.storage.from("avatars").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || `image/${safeExt}`,
  });
  if (upErr) throw upErr;

  const { data } = s.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

// ── Public views ──────────────────────────────────────────────────

export async function fetchPublicProfile(userId: string): Promise<PublicProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await db()
    .from("public_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  return (data ?? null) as PublicProfile | null;
}

export async function fetchCreatorStats(userId: string): Promise<CreatorStats | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await db()
    .from("creator_stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return null;
  return (data ?? null) as CreatorStats | null;
}

export async function fetchLeaderboard(limit = 20): Promise<CreatorStats[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await db()
    .from("creator_stats")
    .select("*")
    .order("trust_score", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as CreatorStats[];
}
