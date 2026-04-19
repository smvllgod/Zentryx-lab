// @ts-nocheck — Supabase v2 generic `never` widening.
"use client";

// Forum client-side helpers.
// Posts always land in `pending` status on creation (enforced by the
// `forum_posts_pending_guard` DB trigger for non-admins). Approval and
// rejection happen via /admin/moderation.

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

export type ForumCategory = Tables<"forum_categories">;
export type ForumPost     = Tables<"forum_posts">;
export type ForumComment  = Tables<"forum_comments">;

function db() {
  return getSupabase();
}

// ── Categories ─────────────────────────────────────────────────────

export async function listCategories(): Promise<ForumCategory[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await db()
    .from("forum_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data ?? []) as ForumCategory[];
}

// ── Posts ──────────────────────────────────────────────────────────

export interface PostWithAuthor extends ForumPost {
  author?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

async function hydrateAuthors<T extends { author_id: string }>(rows: T[]): Promise<(T & { author: PostWithAuthor["author"] })[]> {
  if (!rows.length) return [];
  const s = db();
  const ids = Array.from(new Set(rows.map((r) => r.author_id)));
  const { data } = await s
    .from("public_profiles")
    .select("id, display_name, avatar_url")
    .in("id", ids);
  const map = new Map<string, PostWithAuthor["author"]>();
  for (const p of (data ?? []) as { id: string; display_name: string; avatar_url: string | null }[]) {
    map.set(p.id, { id: p.id, display_name: p.display_name, avatar_url: p.avatar_url });
  }
  return rows.map((r) => ({ ...r, author: map.get(r.author_id) ?? null }));
}

export async function listApprovedPosts(opts: {
  category?: string;
  limit?: number;
  search?: string;
} = {}): Promise<PostWithAuthor[]> {
  if (!isSupabaseConfigured()) return [];
  let q = db()
    .from("forum_posts")
    .select("*")
    .eq("status", "approved")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);
  if (opts.category) q = q.eq("category_slug", opts.category);
  if (opts.search) q = q.or(`title.ilike.%${opts.search}%,body.ilike.%${opts.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return hydrateAuthors((data ?? []) as ForumPost[]);
}

export async function getPost(id: string): Promise<PostWithAuthor | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await db()
    .from("forum_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const [row] = await hydrateAuthors([data as ForumPost]);
  return row ?? null;
}

export async function listMyPosts(): Promise<ForumPost[]> {
  if (!isSupabaseConfigured()) return [];
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [];
  const { data, error } = await s
    .from("forum_posts")
    .select("*")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ForumPost[];
}

export async function createPost(input: {
  categorySlug: string;
  title: string;
  body: string;
  imageUrls?: string[];
}): Promise<ForumPost> {
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data, error } = await s
    .from("forum_posts")
    .insert({
      author_id: user.id,
      category_slug: input.categorySlug,
      title: input.title.trim(),
      body: input.body,
      image_urls: input.imageUrls ?? [],
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as ForumPost;
}

/**
 * Uploads one image to the `forum-images` bucket, scoped to the current
 * user's own prefix so RLS passes. Returns the public URL.
 */
export async function uploadForumImage(file: File): Promise<string> {
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("Not signed in");

  if (!file.type.startsWith("image/")) throw new Error("Not an image");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image exceeds 5 MB");

  const ext = file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1] ?? "png";
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext.toLowerCase()}`;

  const { error: uploadErr } = await s.storage
    .from("forum-images")
    .upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
  if (uploadErr) throw uploadErr;

  const { data } = s.storage.from("forum-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteForumImage(publicUrl: string): Promise<void> {
  const s = db();
  // Parse the storage path out of the public URL (last two segments = uid/file).
  const m = publicUrl.match(/\/forum-images\/(.+)$/);
  if (!m) return;
  await s.storage.from("forum-images").remove([m[1]]);
}

export async function updateMyPost(id: string, patch: { title?: string; body?: string; category_slug?: string; image_urls?: string[] }): Promise<void> {
  const { error } = await db().from("forum_posts").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteMyPost(id: string): Promise<void> {
  const { error } = await db().from("forum_posts").delete().eq("id", id);
  if (error) throw error;
}

export async function bumpViewCount(id: string): Promise<void> {
  // RLS allows select-only on approved posts for non-authors; updating
  // `view_count` from the client would need an RPC. For v1 we keep it
  // best-effort: admins have permission, everyone else silently no-ops.
  try {
    await db().rpc("increment_forum_view", { p_post_id: id });
  } catch {
    // RPC not defined yet — silently skip.
  }
}

// ── Moderation ─────────────────────────────────────────────────────

export async function listModerationQueue(status: "pending" | "rejected" = "pending"): Promise<PostWithAuthor[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await db()
    .from("forum_posts")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return hydrateAuthors((data ?? []) as ForumPost[]);
}

export async function approvePost(id: string): Promise<void> {
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  const { error } = await s
    .from("forum_posts")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user?.id ?? null,
      rejected_reason: null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function rejectPost(id: string, reason: string): Promise<void> {
  const { error } = await db()
    .from("forum_posts")
    .update({
      status: "rejected",
      rejected_reason: reason,
      approved_at: null,
      approved_by: null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function setPostPinned(id: string, pinned: boolean): Promise<void> {
  const { error } = await db().from("forum_posts").update({ pinned }).eq("id", id);
  if (error) throw error;
}

export async function setPostLocked(id: string, locked: boolean): Promise<void> {
  const { error } = await db().from("forum_posts").update({ locked }).eq("id", id);
  if (error) throw error;
}

// ── Comments ───────────────────────────────────────────────────────

export interface CommentWithAuthor extends ForumComment {
  author?: PostWithAuthor["author"];
}

export async function listComments(postId: string): Promise<CommentWithAuthor[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await db()
    .from("forum_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const hydrated = await hydrateAuthors((data ?? []) as ForumComment[]);
  return hydrated as CommentWithAuthor[];
}

export async function createComment(postId: string, body: string): Promise<ForumComment> {
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data, error } = await s
    .from("forum_comments")
    .insert({ post_id: postId, author_id: user.id, body })
    .select("*")
    .single();
  if (error) throw error;
  return data as ForumComment;
}

export async function deleteMyComment(id: string): Promise<void> {
  const { error } = await db().from("forum_comments").delete().eq("id", id);
  if (error) throw error;
}
