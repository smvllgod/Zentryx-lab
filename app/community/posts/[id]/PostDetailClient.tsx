"use client";

// ──────────────────────────────────────────────────────────────────
// /community/posts/[id]  — post + comments
// ──────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Lock, MessageCircle, Pin, Send, Trash2, Clock, User } from "lucide-react";
import { PublicShell } from "@/components/app/public-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/context";
import { useConfirm } from "@/components/ui/confirm";
import {
  getPost,
  listComments,
  createComment,
  deleteMyComment,
  deleteMyPost,
  type PostWithAuthor,
  type CommentWithAuthor,
} from "@/lib/forum/client";
import { formatRelative } from "@/lib/utils/format";

export default function PostDetailClient() {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const [postId, setPostId] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const match = window.location.pathname.match(/\/community\/posts\/([^\/?#]+)/);
    const id = match?.[1] ?? "";
    setPostId(id === "_" ? "" : id);
  }, []);

  const [post, setPost] = useState<PostWithAuthor | null>(null);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const p = await getPost(postId);
      if (!p) { setNotFound(true); return; }
      setPost(p);
      if (p.status === "approved") {
        setComments(await listComments(postId));
      }
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => { void load(); }, [load]);

  async function submitComment() {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      await createComment(postId, comment.trim());
      setComment("");
      toast.success("Comment posted.");
      await load();
    } catch (err) {
      toast.error("Failed: " + (err as Error).message);
    } finally {
      setPosting(false);
    }
  }

  if (loading) {
    return <PublicShell><div className="min-h-[50vh] flex items-center justify-center text-sm text-gray-400">Loading…</div></PublicShell>;
  }

  if (notFound || !post) {
    return (
      <PublicShell>
        <div className="max-w-2xl mx-auto py-20 text-center">
          <h1 className="text-xl font-700 text-gray-900">Post not found</h1>
          <p className="text-sm text-gray-500 mt-2">It might have been rejected, deleted, or never existed.</p>
          <Button asChild variant="secondary" className="mt-6">
            <a href="/community"><ArrowLeft size={12} /> Back to community</a>
          </Button>
        </div>
      </PublicShell>
    );
  }

  const isAuthor = user?.id != null && user.id === post.author_id;

  return (
    <PublicShell>
      <div className="max-w-3xl mx-auto px-5 lg:px-8 py-8">
        <div className="flex items-center gap-1.5 text-[11px] font-600 text-gray-400 mb-5">
          <a href="/community" className="hover:text-gray-700 inline-flex items-center gap-1"><ArrowLeft size={10} /> Community</a>
        </div>

        {post.status !== "approved" && (
          <div className={
            "mb-4 rounded-xl border px-4 py-3 text-xs " +
            (post.status === "pending"
              ? "border-amber-200/80 bg-amber-50/40 text-amber-800"
              : "border-red-200/80 bg-red-50/40 text-red-800")
          }>
            {post.status === "pending" ? (
              <>
                <Clock size={12} className="inline-block mr-1 -mt-0.5" />
                This post is awaiting moderation. Only you can see it.
              </>
            ) : (
              <>
                <strong>Rejected:</strong> {post.rejected_reason ?? "No reason given."}
              </>
            )}
          </div>
        )}

        <article>
          <div className="flex items-center gap-2 flex-wrap">
            {post.pinned && <Badge tone="amber"><Pin size={9} className="inline mr-0.5" />Pinned</Badge>}
            {post.locked && <Badge tone="slate"><Lock size={9} className="inline mr-0.5" />Locked</Badge>}
            <Badge tone="slate">{post.category_slug}</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-700 text-gray-900 leading-tight">{post.title}</h1>

          <div className="mt-4 flex items-center gap-2.5">
            <a href={post.author ? `/creator/${post.author.id}` : "#"} className="flex items-center gap-2 group">
              {post.author?.avatar_url ? (
                <img src={post.author.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-[11px] font-700 flex items-center justify-center">
                  {post.author?.display_name?.slice(0, 2).toUpperCase() ?? "?"}
                </div>
              )}
              <div>
                <div className="text-[12px] font-600 text-gray-900 group-hover:text-emerald-700">
                  {post.author?.display_name ?? "Anonymous"}
                </div>
                <div className="text-[10px] text-gray-400">{formatRelative(post.created_at)}</div>
              </div>
            </a>
          </div>

          <div className="mt-6 prose prose-sm max-w-none prose-p:leading-relaxed prose-headings:font-700 prose-headings:text-gray-900">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
          </div>

          {isAuthor && post.status === "pending" && (
            <div className="mt-6 flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={async () => {
                const ok = await confirm({
                  title: "Delete this pending post?",
                  body: "Your post is removed — no moderator review, no trace. You can always create a new one.",
                  destructive: true,
                  confirmLabel: "Delete",
                });
                if (!ok) return;
                try { await deleteMyPost(post.id); toast.success("Deleted."); window.location.href = "/community"; }
                catch (err) { toast.error((err as Error).message); }
              }}>
                <Trash2 size={12} /> Delete
              </Button>
            </div>
          )}
        </article>

        {post.status === "approved" && (
          <section className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-700 text-gray-900 inline-flex items-center gap-1.5">
                <MessageCircle size={13} className="text-emerald-600" />
                Comments <span className="text-gray-400 font-500">({comments.length})</span>
              </h2>
            </div>

            {!post.locked && user && (
              <Card className="mt-3">
                <CardContent>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="min-h-[80px]"
                    placeholder="Add a comment. Keep it constructive."
                  />
                  <div className="flex items-center justify-end mt-2">
                    <Button size="sm" onClick={submitComment} disabled={posting || !comment.trim()}>
                      <Send size={12} /> {posting ? "Posting…" : "Comment"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {!user && (
              <Card className="mt-3 bg-gray-50/60">
                <CardContent className="flex items-center gap-3 !py-4">
                  <User size={14} className="text-gray-400" />
                  <div className="text-xs text-gray-600">
                    <a href={`/sign-in?returnTo=/community/posts/${postId}`} className="font-700 text-emerald-600 hover:underline">Sign in</a> to join the discussion.
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="mt-4 space-y-3">
              {comments.length === 0 && (
                <EmptyState
                  icon={<MessageCircle size={16} />}
                  title="No comments yet"
                  description={post.locked ? "This thread is locked." : "Be the first to chime in."}
                />
              )}
              {comments.map((c) => (
                <CommentRow key={c.id} comment={c} viewerId={user?.id ?? null} onDeleted={load} />
              ))}
            </div>
          </section>
        )}
      </div>
    </PublicShell>
  );
}

function CommentRow({ comment, viewerId, onDeleted }: { comment: CommentWithAuthor; viewerId: string | null; onDeleted: () => void }) {
  const { confirm } = useConfirm();
  const mine = viewerId != null && viewerId === comment.author_id;
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3.5">
      <div className="flex items-center justify-between gap-3">
        <a href={comment.author ? `/creator/${comment.author.id}` : "#"} className="flex items-center gap-2 group min-w-0">
          {comment.author?.avatar_url ? (
            <img src={comment.author.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-700 flex items-center justify-center shrink-0">
              {comment.author?.display_name?.slice(0, 2).toUpperCase() ?? "?"}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[12px] font-600 text-gray-900 truncate group-hover:text-emerald-700">{comment.author?.display_name ?? "Anonymous"}</div>
            <div className="text-[10px] text-gray-400">{formatRelative(comment.created_at)}</div>
          </div>
        </a>
        {mine && (
          <button
            type="button"
            onClick={async () => {
              const ok = await confirm({
                title: "Delete your comment?",
                body: "This can't be undone.",
                destructive: true,
                confirmLabel: "Delete",
              });
              if (!ok) return;
              try { await deleteMyComment(comment.id); toast.success("Deleted."); onDeleted(); }
              catch (err) { toast.error((err as Error).message); }
            }}
            className="text-gray-400 hover:text-red-500"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
      <div className="mt-2 prose prose-sm max-w-none prose-p:leading-relaxed prose-p:my-1.5">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{comment.body}</ReactMarkdown>
      </div>
    </div>
  );
}
