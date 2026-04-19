// @ts-nocheck — Supabase v2 generic resolution issue (PostgrestVersion 12).
"use client";

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { NotificationKind } from "./client";

export interface NotificationPref {
  kind: NotificationKind;
  in_app: boolean;
  email: boolean;
}

/** All kinds we expose in the settings UI. Keep in sync with the DB enum. */
export const NOTIFICATION_KINDS: { kind: NotificationKind; label: string; description: string }[] = [
  { kind: "purchase",        label: "Purchases",           description: "Someone buys or downloads one of your listings." },
  { kind: "review",          label: "Reviews",             description: "Someone reviews your listing." },
  { kind: "comment",         label: "Comments",            description: "Someone comments on your forum post." },
  { kind: "new_follower",    label: "New followers",       description: "Someone starts following you." },
  { kind: "post_approved",   label: "Post approved",       description: "A moderator approves your pending forum post." },
  { kind: "post_rejected",   label: "Post rejected",       description: "A moderator rejects your pending forum post." },
  { kind: "license_issued",  label: "License issued",      description: "A license you hold was just issued or activated." },
  { kind: "license_revoked", label: "License revoked",     description: "A license was revoked — immediate action may be needed." },
  { kind: "system",          label: "System notices",      description: "Platform-wide announcements and maintenance notes." },
];

function db() { return getSupabase(); }

export async function fetchMyPreferences(): Promise<Record<NotificationKind, NotificationPref>> {
  const base: Record<NotificationKind, NotificationPref> = {} as Record<NotificationKind, NotificationPref>;
  for (const k of NOTIFICATION_KINDS) {
    base[k.kind] = { kind: k.kind, in_app: true, email: false };
  }
  if (!isSupabaseConfigured()) return base;
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return base;

  const { data } = await s
    .from("notification_preferences")
    .select("kind, in_app, email")
    .eq("user_id", user.id);
  for (const r of (data ?? []) as NotificationPref[]) {
    if (base[r.kind]) base[r.kind] = r;
  }
  return base;
}

export async function setPreference(kind: NotificationKind, channel: "in_app" | "email", value: boolean): Promise<void> {
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("Not signed in");

  // Upsert: inserts a row or updates the chosen channel in place.
  const patch = channel === "in_app" ? { in_app: value } : { email: value };
  const { error } = await s
    .from("notification_preferences")
    .upsert({ user_id: user.id, kind, ...patch, updated_at: new Date().toISOString() });
  if (error) throw error;
}
