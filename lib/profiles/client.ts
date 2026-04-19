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

// ── Follows ───────────────────────────────────────────────────────

export interface FollowCounts {
  followers_count: number;
  following_count: number;
}

export async function fetchFollowCounts(userId: string): Promise<FollowCounts> {
  if (!isSupabaseConfigured()) return { followers_count: 0, following_count: 0 };
  const { data } = await db()
    .from("creator_follow_counts")
    .select("followers_count, following_count")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as FollowCounts) ?? { followers_count: 0, following_count: 0 };
}

export async function isFollowing(creatorId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return false;
  if (user.id === creatorId) return false;
  const { data } = await s
    .from("creator_follows")
    .select("creator_id")
    .eq("follower_id", user.id)
    .eq("creator_id", creatorId)
    .maybeSingle();
  return Boolean(data);
}

export async function followCreator(creatorId: string): Promise<void> {
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("Sign in to follow creators.");
  if (user.id === creatorId) throw new Error("You can't follow yourself.");
  const { error } = await s
    .from("creator_follows")
    .insert({ follower_id: user.id, creator_id: creatorId });
  // 23505 = unique_violation on (follower_id, creator_id) — race is fine.
  if (error && error.code !== "23505") throw error;
}

export async function unfollowCreator(creatorId: string): Promise<void> {
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { error } = await s
    .from("creator_follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("creator_id", creatorId);
  if (error) throw error;
}

export interface FollowedListing {
  listing_id: string;
  title: string;
  price_cents: number;
  currency: string;
  thumbnail_url: string | null;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  created_at: string;
}

export async function fetchFollowedFeed(limit = 20): Promise<FollowedListing[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await db()
    .rpc("followed_creators_feed", { _limit: limit });
  if (error) return [];
  return (data ?? []) as FollowedListing[];
}
