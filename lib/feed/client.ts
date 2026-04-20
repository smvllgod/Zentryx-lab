// @ts-nocheck — Supabase v2 generic resolution issue (PostgrestVersion 12).
"use client";

// Social feed client helpers. Backed by `feed_posts` (separate from the
// forum) + `feed_likes` and `feed_comments`. Images live in the shared
// `forum-images` bucket (single bucket, single RLS rule for both).

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export interface FeedAuthor {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface FeedPost {
  id: string;
  author_id: string;
  body: string;
  image_urls: string[];
  like_count: number;
  comment_count: number;
  created_at: string;
  author?: FeedAuthor | null;
  /** True if the viewer (if signed in) has liked this post. */
  liked_by_me?: boolean;
}

export interface FeedComment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: FeedAuthor | null;
}

function db() { return getSupabase(); }

async function hydrateAuthors<T extends { author_id: string }>(rows: T[]): Promise<(T & { author: FeedAuthor | null })[]> {
  if (!rows.length) return [] as (T & { author: FeedAuthor | null })[];
  const s = db();
  const ids = Array.from(new Set(rows.map((r) => r.author_id)));
  const { data } = await s
    .from("public_profiles")
    .select("id, display_name, avatar_url")
    .in("id", ids);
  const map = new Map<string, FeedAuthor>();
  for (const p of (data ?? []) as FeedAuthor[]) map.set(p.id, p);
  return rows.map((r) => ({ ...r, author: map.get(r.author_id) ?? null }));
}

export async function listFeedPosts(opts: { limit?: number; before?: string } = {}): Promise<FeedPost[]> {
  if (!isSupabaseConfigured()) return [];
  const s = db();
  let q = s.from("feed_posts")
    .select("id, author_id, body, image_urls, like_count, comment_count, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 30);
  if (opts.before) q = q.lt("created_at", opts.before);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as FeedPost[];
  const hydrated = await hydrateAuthors(rows);

  // Stamp liked_by_me for the current viewer in a single query.
  const { data: userData } = await s.auth.getUser();
  const user = userData?.user;
  if (user && hydrated.length > 0) {
    const ids = hydrated.map((r) => r.id);
    const { data: likes } = await s
      .from("feed_likes")
      .select("post_id")
      .eq("user_id", user.id)
      .in("post_id", ids);
    const set = new Set((likes ?? []).map((l: { post_id: string }) => l.post_id));
    return hydrated.map((p) => ({ ...p, liked_by_me: set.has(p.id) }));
  }
  return hydrated.map((p) => ({ ...p, liked_by_me: false }));
}

export async function listMyFeedPosts(limit = 20): Promise<FeedPost[]> {
  if (!isSupabaseConfigured()) return [];
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [];
  const { data, error } = await s
    .from("feed_posts")
    .select("id, author_id, body, image_urls, like_count, comment_count, created_at")
    .eq("author_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return await hydrateAuthors((data ?? []) as FeedPost[]);
}

export async function createFeedPost(input: { body: string; imageUrls?: string[] }): Promise<FeedPost> {
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("Sign in to post.");
  const { data, error } = await s
    .from("feed_posts")
    .insert({ author_id: user.id, body: input.body.trim(), image_urls: input.imageUrls ?? [] })
    .select("*")
    .single();
  if (error) throw error;
  return data as FeedPost;
}

export async function softDeleteFeedPost(postId: string): Promise<void> {
  const s = db();
  const { error } = await s
    .from("feed_posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", postId);
  if (error) throw error;
}

// ── Likes ────────────────────────────────────────────────────────

export async function toggleFeedLike(postId: string, next: boolean): Promise<void> {
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("Sign in to like posts.");
  if (next) {
    const { error } = await s
      .from("feed_likes")
      .insert({ post_id: postId, user_id: user.id });
    if (error && error.code !== "23505") throw error; // race-safe
  } else {
    const { error } = await s
      .from("feed_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    if (error) throw error;
  }
}

// ── Comments ─────────────────────────────────────────────────────

export async function listFeedComments(postId: string): Promise<FeedComment[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await db()
    .from("feed_comments")
    .select("id, post_id, author_id, body, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return await hydrateAuthors((data ?? []) as FeedComment[]);
}

export async function createFeedComment(postId: string, body: string): Promise<FeedComment> {
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("Sign in to comment.");
  const { data, error } = await s
    .from("feed_comments")
    .insert({ post_id: postId, author_id: user.id, body: body.trim() })
    .select("*")
    .single();
  if (error) throw error;
  return data as FeedComment;
}

export async function deleteFeedComment(id: string): Promise<void> {
  const { error } = await db().from("feed_comments").delete().eq("id", id);
  if (error) throw error;
}

// ── Images ───────────────────────────────────────────────────────
// Re-uses the existing `forum-images` bucket + RLS so we don't
// duplicate storage config.

export async function uploadFeedImage(file: File): Promise<string> {
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("Sign in to upload images.");
  if (!file.type.startsWith("image/")) throw new Error("Not an image");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image exceeds 5 MB");
  const ext = file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1] ?? "png";
  const path = `${user.id}/feed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext.toLowerCase()}`;
  const { error } = await s.storage
    .from("forum-images")
    .upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
  if (error) throw error;
  const { data } = s.storage.from("forum-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFeedImage(publicUrl: string): Promise<void> {
  const s = db();
  const m = publicUrl.match(/\/forum-images\/(.+)$/);
  if (!m) return;
  await s.storage.from("forum-images").remove([m[1]]);
}
