// @ts-nocheck — Supabase v2 generic `never` widening.
"use client";

// Notifications client helpers. Drives the topbar bell + /notifications
// page. Rows are emitted server-side via triggers (see 0009 migration);
// the browser only reads / marks-read / deletes.

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

export type NotificationRow = Tables<"notifications">;
export type NotificationKind = NotificationRow["kind"];

function db() {
  return getSupabase();
}

export async function listMyNotifications(opts: { limit?: number; unreadOnly?: boolean } = {}): Promise<NotificationRow[]> {
  if (!isSupabaseConfigured()) return [];
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [];
  let q = s.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(opts.limit ?? 30);
  if (opts.unreadOnly) q = q.is("read_at", null);
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as NotificationRow[];
}

export async function countUnread(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return 0;
  const { count } = await s
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);
  return count ?? 0;
}

export async function markRead(id: string): Promise<void> {
  const s = db();
  const { error } = await s
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllRead(): Promise<void> {
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return;
  const { error } = await s
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  if (error) throw error;
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await db().from("notifications").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteAllRead(): Promise<void> {
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return;
  const { error } = await s.from("notifications").delete().eq("user_id", user.id).not("read_at", "is", null);
  if (error) throw error;
}
