"use client";

// Topbar notification bell — dropdown with recent notifications, unread
// counter, mark-as-read per item + mark-all-read. Realtime via Supabase
// subscription so the bell updates live while the dropdown stays open.

import { useCallback, useEffect, useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  Bell, Check, CheckCheck, ExternalLink, MessageCircle, ShoppingBag,
  Star, ShieldCheck, Trash2, AlertTriangle, KeyRound,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  countUnread,
  listMyNotifications,
  markAllRead,
  markRead,
  deleteNotification,
  type NotificationRow,
  type NotificationKind,
} from "@/lib/notifications/client";
import { formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const ICONS: Record<NotificationKind, React.ComponentType<{ size?: number; className?: string }>> = {
  purchase:          ShoppingBag,
  review:            Star,
  comment:           MessageCircle,
  post_approved:     Check,
  post_rejected:     AlertTriangle,
  license_issued:    KeyRound,
  license_revoked:   ShieldCheck,
  system:            Bell,
};

const TONE: Record<NotificationKind, string> = {
  purchase:          "bg-emerald-50 text-emerald-600",
  review:            "bg-amber-50 text-amber-600",
  comment:           "bg-sky-50 text-sky-600",
  post_approved:     "bg-emerald-50 text-emerald-600",
  post_rejected:     "bg-red-50 text-red-600",
  license_issued:    "bg-purple-50 text-purple-600",
  license_revoked:   "bg-red-50 text-red-600",
  system:            "bg-gray-100 text-gray-600",
};

export function NotificationsBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [list, n] = await Promise.all([listMyNotifications({ limit: 20 }), countUnread()]);
      setRows(list);
      setUnread(n);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch on mount + whenever auth changes.
  useEffect(() => {
    if (!user) return;
    void refresh();
  }, [user, refresh]);

  // Live updates via Supabase Realtime. Subscribes to INSERTs on the
  // user's own notifications row. Close + re-open the subscription when
  // the user id changes.
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    const s = getSupabase();
    const channel = s
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => { void refresh(); },
      )
      .subscribe();
    return () => { void s.removeChannel(channel); };
  }, [user, refresh]);

  // Poll as a fallback when the tab regains focus (realtime sometimes
  // drops silently after long idle).
  useEffect(() => {
    function onFocus() { void refresh(); }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) void refresh();
  }

  async function onMarkAll() {
    try { await markAllRead(); void refresh(); } catch { /* ignore */ }
  }

  async function onRowClick(row: NotificationRow) {
    if (row.read_at == null) {
      try { await markRead(row.id); } catch { /* ignore */ }
    }
    if (row.link && typeof window !== "undefined") {
      window.location.href = row.link;
    } else {
      void refresh();
    }
  }

  async function onDelete(row: NotificationRow, e: React.MouseEvent) {
    e.stopPropagation();
    try { await deleteNotification(row.id); void refresh(); } catch { /* ignore */ }
  }

  const hasUnread = unread > 0;

  if (!user) return null;

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "relative w-9 h-9 rounded-lg inline-flex items-center justify-center transition-colors",
            hasUnread ? "text-emerald-700 hover:bg-emerald-50" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100",
          )}
          aria-label={hasUnread ? `${unread} unread notifications` : "Notifications"}
        >
          <Bell size={16} />
          {hasUnread && (
            <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full bg-emerald-500 text-white text-[9px] font-700 leading-none">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-50 w-[360px] max-h-[70vh] rounded-2xl border border-gray-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.12)] overflow-hidden flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out"
        >
          <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100">
            <div>
              <div className="text-sm font-700 text-gray-900">Notifications</div>
              <div className="text-[10px] text-gray-400">{unread > 0 ? `${unread} unread` : "You're all caught up"}</div>
            </div>
            {hasUnread && (
              <button
                type="button"
                onClick={onMarkAll}
                className="inline-flex items-center gap-1 text-[11px] font-600 text-emerald-700 hover:text-emerald-800"
              >
                <CheckCheck size={11} /> Mark all read
              </button>
            )}
          </header>

          <div className="flex-1 overflow-y-auto">
            {loading && rows.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <div className="inline-flex w-9 h-9 rounded-full bg-gray-100 items-center justify-center text-gray-400 mb-2">
                  <Bell size={15} />
                </div>
                <div className="text-[13px] font-700 text-gray-900">Nothing here yet</div>
                <div className="mt-1 text-[11px] text-gray-500 leading-snug">
                  New downloads, reviews, and comments on your listings and posts show up here.
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {rows.map((r) => {
                  const Icon = ICONS[r.kind] ?? Bell;
                  const tone = TONE[r.kind] ?? "bg-gray-100 text-gray-600";
                  const isRead = r.read_at != null;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => onRowClick(r)}
                        className={cn(
                          "w-full text-left flex items-start gap-3 px-4 py-3 transition-colors",
                          isRead ? "hover:bg-gray-50" : "bg-emerald-50/30 hover:bg-emerald-50/60",
                        )}
                      >
                        <div className={cn("w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0", tone)}>
                          <Icon size={13} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className={cn("text-[12.5px] truncate", isRead ? "font-500 text-gray-700" : "font-700 text-gray-900")}>
                              {r.title}
                            </div>
                            {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                          </div>
                          {r.body && <div className="text-[11px] text-gray-500 line-clamp-2 mt-0.5 leading-snug">{r.body}</div>}
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
                            <span>{formatRelative(r.created_at)}</span>
                            {r.link && <span className="inline-flex items-center gap-0.5"><ExternalLink size={9} /></span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => onDelete(r, e)}
                          className="text-gray-300 hover:text-red-500 p-1 -m-1 shrink-0"
                          aria-label="Delete notification"
                        >
                          <Trash2 size={12} />
                        </button>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <footer className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/40 flex items-center justify-between">
            <a href="/notifications" className="text-[11px] font-600 text-gray-600 hover:text-gray-900">
              See all
            </a>
            <a href="/settings" className="text-[11px] text-gray-400 hover:text-gray-600">
              Notification settings
            </a>
          </footer>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
