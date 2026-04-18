// @ts-nocheck — Supabase v2 generic widening.
"use client";

// Fire-and-forget usage-event logger. Called when a user adds a block
// to a strategy. Silent on failure — analytics must never break the UI.

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export async function logBlockUsage(blockId: string, strategyId?: string | null) {
  if (!isSupabaseConfigured()) return;
  try {
    const s = getSupabase();
    const user = (await s.auth.getUser()).data.user;
    if (!user) return;
    await s.from("block_usage_events").insert({
      block_id: blockId,
      user_id: user.id,
      strategy_id: strategyId ?? null,
      event: "add",
    });
  } catch {
    // swallow — analytics is best-effort
  }
}
