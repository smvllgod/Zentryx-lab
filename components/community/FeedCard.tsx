"use client";

import { useState } from "react";
import { Heart, MessageSquare, Trash2, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/context";
import {
  toggleFeedLike, listFeedComments, createFeedComment, deleteFeedComment, softDeleteFeedPost,
  type FeedPost, type FeedComment,
} from "@/lib/feed/client";
import { formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export function FeedCard({ post, onDeleted }: { post: FeedPost; onDeleted?: (id: string) => void }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(Boolean(post.liked_by_me));
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<FeedComment[] | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [busy, setBusy] = useState(false);

  const isOwn = user?.id === post.author_id;

  async function toggleLike() {
    if (!user) { toast.error("Sign in to like posts."); return; }
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try { await toggleFeedLike(post.id, next); }
    catch (err) {
      setLiked(!next);
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
      toast.error((err as Error).message);
    }
  }

  async function openComments() {
    setCommentsOpen((v) => !v);
    if (!comments) {
      try {
        const rows = await listFeedComments(post.id);
        setComments(rows);
      } catch (err) {
        toast.error((err as Error).message);
      }
    }
  }

  async function sendComment() {
    if (!user) { toast.error("Sign in to comment."); return; }
    if (!commentBody.trim()) return;
    setPosting(true);
    try {
      const c = await createFeedComment(post.id, commentBody.trim());
      setComments((prev) => prev ? [...prev, { ...c, author: { id: user.id, display_name: "You", avatar_url: null } }] : [c]);
      setCommentCount((n) => n + 1);
      setCommentBody("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPosting(false);
    }
  }

  async function removeComment(id: string) {
    try {
      await deleteFeedComment(id);
      setComments((prev) => prev ? prev.filter((c) => c.id !== id) : prev);
      setCommentCount((n) => Math.max(0, n - 1));
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function deletePost() {
    if (!confirm("Delete this post?")) return;
    setBusy(true);
    try {
      await softDeleteFeedPost(post.id);
      onDeleted?.(post.id);
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4">
      <header className="flex items-center gap-3 mb-2.5">
        <a href={`/creator/${post.author_id}/`} className="inline-flex items-center gap-2.5 group">
          <Avatar name={post.author?.display_name ?? "User"} avatar={post.author?.avatar_url ?? null} />
          <div>
            <div className="text-sm font-700 text-gray-900 group-hover:text-emerald-700">
              {post.author?.display_name ?? "Anonymous"}
            </div>
            <div className="text-[10px] text-gray-400">{formatRelative(post.created_at)}</div>
          </div>
        </a>
        {isOwn && (
          <button
            type="button"
            onClick={deletePost}
            disabled={busy}
            className="ml-auto text-gray-300 hover:text-red-500 p-1"
            aria-label="Delete post"
          >
            <Trash2 size={14} />
          </button>
        )}
      </header>

      {post.body && (
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">{post.body}</p>
      )}

      {post.image_urls.length > 0 && (
        <div className={cn(
          "mt-3 rounded-xl overflow-hidden grid gap-1",
          post.image_urls.length === 1 && "grid-cols-1",
          post.image_urls.length === 2 && "grid-cols-2",
          post.image_urls.length === 3 && "grid-cols-2 grid-rows-2",
          post.image_urls.length >= 4 && "grid-cols-2 grid-rows-2",
        )}>
          {post.image_urls.slice(0, 4).map((u, i) => (
            <a
              key={u}
              href={u}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "relative block bg-gray-100",
                post.image_urls.length === 3 && i === 0 && "row-span-2",
              )}
            >
              <img src={u} alt="" className="w-full h-full object-cover aspect-[4/3]" loading="lazy" />
              {i === 3 && post.image_urls.length > 4 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-700">
                  +{post.image_urls.length - 4}
                </div>
              )}
            </a>
          ))}
        </div>
      )}

      <footer className="mt-3 flex items-center gap-1 text-xs border-t border-gray-100 pt-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={toggleLike}
          className={cn("gap-1.5", liked && "text-red-600 hover:text-red-700")}
          title={liked ? "Unlike" : "Like"}
        >
          <Heart size={14} className={liked ? "fill-red-500 text-red-500" : ""} />
          {likeCount > 0 ? likeCount : "Like"}
        </Button>
        <Button size="sm" variant="ghost" onClick={openComments} className="gap-1.5">
          <MessageSquare size={14} />
          {commentCount > 0 ? commentCount : "Comment"}
        </Button>
      </footer>

      {commentsOpen && (
        <div className="mt-3 border-t border-gray-100 pt-3 space-y-2.5">
          {comments === null ? (
            <div className="text-xs text-gray-400 text-center py-2">Loading comments…</div>
          ) : comments.length === 0 ? (
            <div className="text-xs text-gray-400 text-center py-2">No comments yet — be first.</div>
          ) : (
            <ul className="space-y-2">
              {comments.map((c) => (
                <li key={c.id} className="flex items-start gap-2 group">
                  <Avatar name={c.author?.display_name ?? "User"} avatar={c.author?.avatar_url ?? null} size="xs" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs">
                      <span className="font-600 text-gray-900">{c.author?.display_name ?? "Anonymous"}</span>
                      <span className="text-gray-400 ml-2 text-[10px]">{formatRelative(c.created_at)}</span>
                    </div>
                    <div className="text-xs text-gray-700 whitespace-pre-wrap break-words">{c.body}</div>
                  </div>
                  {c.author_id === user?.id && (
                    <button
                      type="button"
                      onClick={() => removeComment(c.id)}
                      className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"
                      aria-label="Delete comment"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {user && (
            <div className="flex items-end gap-2">
              <Input
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Write a reply…"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendComment(); } }}
                maxLength={1000}
                className="flex-1"
              />
              <Button size="sm" onClick={sendComment} disabled={posting || !commentBody.trim()}>
                {posting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              </Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function Avatar({ name, avatar, size = "md" }: { name: string; avatar: string | null; size?: "xs" | "md" }) {
  const dim = size === "xs" ? "w-6 h-6 text-[9px]" : "w-9 h-9 text-[11px]";
  return (
    <div className={cn("rounded-full overflow-hidden bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0 font-700 text-white", dim)}>
      {avatar ? (
        <img src={avatar} alt="" className="w-full h-full object-cover" />
      ) : (
        (name.match(/\b\w/g) ?? []).slice(0, 2).join("").toUpperCase() || "?"
      )}
    </div>
  );
}
