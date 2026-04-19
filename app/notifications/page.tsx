"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, Trash2, ShoppingBag, Star, MessageCircle, Check, AlertTriangle, KeyRound, ShieldCheck, Settings, UserPlus, Inbox, Mail } from "lucide-react";
import { AppShell } from "@/components/app/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import {
  listMyNotifications,
  markAllRead,
  markRead,
  deleteNotification,
  deleteAllRead,
  type NotificationRow,
  type NotificationKind,
} from "@/lib/notifications/client";
import {
  NOTIFICATION_KINDS,
  fetchMyPreferences,
  setPreference,
  type NotificationPref,
} from "@/lib/notifications/preferences";
import { formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

// new_follower is a new enum value introduced in 0015 — regenerated types
// haven't caught up yet so we loosen to Partial<Record<…>>.
const ICONS: Partial<Record<NotificationKind, React.ComponentType<{ size?: number; className?: string }>>> & Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  purchase: ShoppingBag,
  review: Star,
  comment: MessageCircle,
  new_follower: UserPlus,
  post_approved: Check,
  post_rejected: AlertTriangle,
  license_issued: KeyRound,
  license_revoked: ShieldCheck,
  system: Bell,
};

const TONE: Partial<Record<NotificationKind, string>> & Record<string, string> = {
  purchase: "bg-emerald-50 text-emerald-600",
  review: "bg-amber-50 text-amber-600",
  comment: "bg-sky-50 text-sky-600",
  new_follower: "bg-emerald-50 text-emerald-600",
  post_approved: "bg-emerald-50 text-emerald-600",
  post_rejected: "bg-red-50 text-red-600",
  license_issued: "bg-purple-50 text-purple-600",
  license_revoked: "bg-red-50 text-red-600",
  system: "bg-gray-100 text-gray-600",
};

export default function NotificationsPage() {
  const { confirm } = useConfirm();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [view, setView] = useState<"inbox" | "preferences">("inbox");
  const [prefs, setPrefs] = useState<Record<NotificationKind, NotificationPref> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listMyNotifications({ limit: 100, unreadOnly: filter === "unread" }));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (view !== "preferences" || prefs !== null) return;
    void (async () => {
      setPrefs(await fetchMyPreferences());
    })();
  }, [view, prefs]);

  async function togglePref(kind: NotificationKind, channel: "in_app" | "email", value: boolean) {
    if (!prefs) return;
    const next = { ...prefs, [kind]: { ...prefs[kind], [channel]: value } };
    setPrefs(next);
    try {
      await setPreference(kind, channel, value);
    } catch (err) {
      setPrefs(prefs);
      toast.error((err as Error).message);
    }
  }

  const unreadCount = rows.filter((r) => r.read_at == null).length;

  async function handleMarkAll() {
    try { await markAllRead(); toast.success("All read."); void load(); }
    catch (err) { toast.error((err as Error).message); }
  }

  async function handleClearRead() {
    const ok = await confirm({
      title: "Delete all read notifications?",
      body: "Unread notifications are kept. This cannot be undone.",
      destructive: true,
      confirmLabel: "Delete read",
    });
    if (!ok) return;
    try { await deleteAllRead(); toast.success("Cleared."); void load(); }
    catch (err) { toast.error((err as Error).message); }
  }

  async function handleDeleteOne(row: NotificationRow) {
    try { await deleteNotification(row.id); void load(); }
    catch (err) { toast.error((err as Error).message); }
  }

  async function handleClick(row: NotificationRow) {
    if (row.read_at == null) {
      try { await markRead(row.id); } catch { /* ignore */ }
    }
    if (row.link) window.location.href = row.link;
    else void load();
  }

  return (
    <AppShell
      title="Notifications"
      actions={
        view === "inbox" ? (
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button size="sm" variant={filter === "all" ? "secondary" : "ghost"} onClick={() => setFilter("all")}>All</Button>
            <Button size="sm" variant={filter === "unread" ? "secondary" : "ghost"} onClick={() => setFilter("unread")}>
              Unread {unreadCount > 0 && <span className="ml-0.5 text-[10px] text-emerald-600">· {unreadCount}</span>}
            </Button>
            {unreadCount > 0 && (
              <Button size="sm" variant="ghost" onClick={handleMarkAll} className="hidden md:inline-flex">
                <CheckCheck size={12} /> Mark all read
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleClearRead} className="hidden md:inline-flex">
              <Trash2 size={12} /> Clear read
            </Button>
          </div>
        ) : null
      }
    >
      {/* View tabs */}
      <div className="mb-4 inline-flex rounded-lg border border-gray-200 overflow-hidden bg-white">
        <button
          type="button"
          onClick={() => setView("inbox")}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-600",
            view === "inbox" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50",
          )}
        >
          <Inbox size={12} /> Inbox
          {unreadCount > 0 && view !== "inbox" && (
            <span className="ml-0.5 text-[10px] text-emerald-600">· {unreadCount}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setView("preferences")}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 border-l border-gray-200",
            view === "preferences" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50",
          )}
        >
          <Settings size={12} /> Preferences
        </button>
      </div>

      {view === "preferences" ? (
        <Card>
          <CardContent>
            <h2 className="text-sm font-700 text-gray-900 mb-1">Notification preferences</h2>
            <p className="text-xs text-gray-500 mb-4 max-w-2xl">
              Control what shows up in your inbox and (soon) your email. Email delivery
              requires SMTP wiring and is off by default for every kind — toggle it on to
              opt in as the integration rolls out.
            </p>

            <ul className="divide-y divide-gray-100">
              {NOTIFICATION_KINDS.map((meta) => {
                const Icon = ICONS[meta.kind] ?? Bell;
                const tone = TONE[meta.kind] ?? "bg-gray-100 text-gray-600";
                const pref = prefs?.[meta.kind];
                return (
                  <li key={meta.kind} className="py-3 flex items-start gap-3">
                    <div className={cn("w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0", tone)}>
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-700 text-gray-900">{meta.label}</div>
                      <div className="text-[11px] text-gray-500 leading-snug mt-0.5">{meta.description}</div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 shrink-0 pt-1">
                      <PrefSwitch
                        label="In-app"
                        icon={<Bell size={11} />}
                        checked={pref ? pref.in_app : true}
                        onChange={(v) => togglePref(meta.kind, "in_app", v)}
                      />
                      <PrefSwitch
                        label="Email"
                        icon={<Mail size={11} />}
                        checked={pref ? pref.email : false}
                        onChange={(v) => togglePref(meta.kind, "email", v)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-[10px] text-gray-400">
              Email channel is a setting only right now — transactional mail will ship once we wire Resend.
              Your preferences are already saved so the rollout is silent.
            </p>
          </CardContent>
        </Card>
      ) : (
      <Card>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Bell size={18} />}
              title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
              description="New downloads, reviews, comments and licenses will land here."
            />
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
                      onClick={() => handleClick(r)}
                      className={cn(
                        "w-full text-left flex items-start gap-3 py-3.5 transition-colors -mx-6 px-6",
                        isRead ? "hover:bg-gray-50" : "bg-emerald-50/20 hover:bg-emerald-50/40",
                      )}
                    >
                      <div className={cn("w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0", tone)}>
                        <Icon size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={cn("text-sm truncate", isRead ? "font-500 text-gray-700" : "font-700 text-gray-900")}>
                            {r.title}
                          </div>
                          {!isRead && <Badge tone="emerald">new</Badge>}
                        </div>
                        {r.body && <div className="text-xs text-gray-500 line-clamp-2 mt-0.5 leading-snug">{r.body}</div>}
                        <div className="mt-1 text-[10px] text-gray-400">{formatRelative(r.created_at)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void handleDeleteOne(r); }}
                        className="text-gray-300 hover:text-red-500 p-1 shrink-0"
                        aria-label="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
      )}
    </AppShell>
  );
}

function PrefSwitch({ label, icon, checked, onChange }: { label: string; icon: React.ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <span className="inline-flex items-center gap-1 text-[11px] font-600 text-gray-600">
        {icon} {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
          checked ? "bg-emerald-500" : "bg-gray-200",
        )}
      >
        <span
          className={cn(
            "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}
