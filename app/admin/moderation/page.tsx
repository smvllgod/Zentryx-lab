"use client";

// ──────────────────────────────────────────────────────────────────
// /admin/moderation  — forum post approval queue
// ──────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import { Check, X, Pin, Lock, Unlock, Eye, MessageCircle, Search } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard } from "@/components/admin/StatCard";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import {
  listModerationQueue,
  approvePost,
  rejectPost,
  setPostPinned,
  setPostLocked,
  type PostWithAuthor,
} from "@/lib/forum/client";
import { formatRelative } from "@/lib/utils/format";
import { logAdminAction } from "@/lib/admin/queries";

export default function AdminModerationPage() {
  const [rows, setRows] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"pending" | "rejected">("pending");
  const [search, setSearch] = useState("");

  const [rejectTarget, setRejectTarget] = useState<PostWithAuthor | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listModerationQueue(view);
      setRows(list);
    } catch (err) {
      toast.error("Load failed: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => { void load(); }, [load]);

  async function approve(p: PostWithAuthor) {
    try {
      await approvePost(p.id);
      void logAdminAction({
        action: "forum_post.approve",
        targetType: "forum_post",
        targetId: p.id,
        before: { status: p.status },
        after: { status: "approved" },
      });
      toast.success(`Approved "${p.title}".`);
      void load();
    } catch (err) {
      toast.error("Approve failed: " + (err as Error).message);
    }
  }

  async function doReject() {
    if (!rejectTarget) return;
    try {
      const reason = rejectReason.trim() || "Violates community guidelines.";
      await rejectPost(rejectTarget.id, reason);
      void logAdminAction({
        action: "forum_post.reject",
        targetType: "forum_post",
        targetId: rejectTarget.id,
        before: { status: rejectTarget.status },
        after: { status: "rejected", reason },
      });
      toast.success("Rejected.");
      setRejectTarget(null);
      setRejectReason("");
      void load();
    } catch (err) {
      toast.error("Reject failed: " + (err as Error).message);
    }
  }

  const filtered = search
    ? rows.filter((r) => r.title.toLowerCase().includes(search.toLowerCase()) || r.body.toLowerCase().includes(search.toLowerCase()))
    : rows;

  return (
    <AdminShell
      title="Moderation"
      subtitle={`${filtered.length} post${filtered.length === 1 ? "" : "s"} awaiting review`}
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Moderation" }]}
      actions={
        <div className="flex items-center gap-2">
          <NativeSelect value={view} onChange={(e) => setView(e.target.value as "pending" | "rejected")}>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </NativeSelect>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title / body…" className="w-56" />
          <Button size="sm" variant="secondary" onClick={load}>Refresh</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <StatCard label="Pending review" value={view === "pending" ? filtered.length : "—"} tone="amber" />
        <StatCard label="Already rejected" value={view === "rejected" ? filtered.length : "—"} tone="red" />
        <StatCard label="Tip" value="Approve generously" />
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<MessageCircle size={18} />}
              title="Queue is clear"
              description={view === "pending" ? "Nothing to review. Nice job." : "No rejected posts match the current filters."}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <ModerationCard
              key={p.id}
              post={p}
              onApprove={() => approve(p)}
              onReject={() => { setRejectTarget(p); setRejectReason(""); }}
              onPin={async () => {
                try { await setPostPinned(p.id, !p.pinned); toast.success(p.pinned ? "Unpinned" : "Pinned"); void load(); }
                catch (err) { toast.error((err as Error).message); }
              }}
              onLock={async () => {
                try { await setPostLocked(p.id, !p.locked); toast.success(p.locked ? "Unlocked" : "Locked"); void load(); }
                catch (err) { toast.error((err as Error).message); }
              }}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!rejectTarget}
        onOpenChange={(v) => !v && setRejectTarget(null)}
        title={`Reject "${rejectTarget?.title}"?`}
        body={
          <div>
            <p className="mb-3 text-sm text-gray-600">The author will see this reason when they open their post.</p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[80px]"
              placeholder="e.g. Off-topic self-promotion. Please share this in a showcase post with actual content."
            />
          </div>
        }
        destructive
        confirmLabel="Reject"
        onConfirm={doReject}
      />
    </AdminShell>
  );
}

function ModerationCard({
  post,
  onApprove,
  onReject,
  onPin,
  onLock,
}: {
  post: PostWithAuthor;
  onApprove: () => void;
  onReject: () => void;
  onPin: () => void;
  onLock: () => void;
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone="slate">{post.category_slug}</Badge>
              <Badge tone={post.status === "pending" ? "amber" : "red"}>{post.status}</Badge>
              {post.pinned && <Badge tone="amber"><Pin size={9} className="inline mr-0.5" />Pinned</Badge>}
              {post.locked && <Badge tone="slate"><Lock size={9} className="inline mr-0.5" />Locked</Badge>}
            </div>
            <h3 className="mt-1.5 text-sm font-700 text-gray-900 break-words">{post.title}</h3>
            <div className="mt-1 text-[11px] text-gray-400">
              by {post.author?.display_name ?? "Anonymous"} · {formatRelative(post.created_at)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" variant="secondary" onClick={onPin} title={post.pinned ? "Unpin" : "Pin"}>
              <Pin size={12} />
            </Button>
            <Button size="sm" variant="secondary" onClick={onLock} title={post.locked ? "Unlock" : "Lock"}>
              {post.locked ? <Unlock size={12} /> : <Lock size={12} />}
            </Button>
            <Button size="sm" variant="ghost" onClick={onReject}>
              <X size={12} /> Reject
            </Button>
            <Button size="sm" onClick={onApprove}>
              <Check size={12} /> Approve
            </Button>
          </div>
        </div>

        <pre className="mt-3 whitespace-pre-wrap text-[12.5px] text-gray-700 leading-relaxed max-h-80 overflow-auto font-sans bg-gray-50/60 rounded-lg border border-gray-100 p-3">
          {post.body}
        </pre>

        {post.status === "rejected" && post.rejected_reason && (
          <div className="mt-3 rounded-lg border border-red-200/80 bg-red-50/40 text-xs text-red-800 px-3 py-2">
            <strong>Rejection reason:</strong> {post.rejected_reason}
          </div>
        )}

        <div className="mt-3 text-[10px] text-gray-400 flex items-center gap-1.5">
          <Eye size={10} /> Only you (admin) and the author can see this post until approved.
        </div>
      </CardContent>
    </Card>
  );
}
