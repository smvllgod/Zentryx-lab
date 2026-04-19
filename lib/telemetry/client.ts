// @ts-nocheck — Supabase v2 generic resolution issue (PostgrestVersion 12).
"use client";

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export interface TelemetryEvent {
  id: string;
  strategy_id: string;
  ticket: number;
  symbol: string;
  timeframe: string | null;
  side: "long" | "short";
  open_time: string;
  open_price: number;
  close_time: string;
  close_price: number;
  lots: number;
  pnl_cash: number;
  pnl_pips: number | null;
  close_reason: string | null;
  equity_after: number | null;
  balance_after: number | null;
  account_currency: string | null;
  broker: string | null;
  ea_version: string | null;
  reported_at: string;
}

export interface LiveStats {
  trades_30d: number;
  win_rate_30d: number;
  pnl_30d: number;
  trades_total: number;
  win_rate_total: number;
  pnl_total: number;
  last_trade_at: string | null;
}

export async function listTelemetryEvents(strategyId: string, limit = 200): Promise<TelemetryEvent[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await getSupabase()
    .from("strategy_telemetry_events")
    .select("*")
    .eq("strategy_id", strategyId)
    .order("close_time", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as TelemetryEvent[];
}

export async function fetchLiveStats(strategyId: string): Promise<LiveStats | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await getSupabase()
    .rpc("strategy_live_stats", { _strategy_id: strategyId });
  if (error || !data || (data as unknown[]).length === 0) return null;
  const r = (data as unknown as LiveStats[])[0];
  return r;
}

export async function rotateTelemetryToken(strategyId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const db = getSupabase();
  // Generate a new UUID client-side; Postgres will reject if it's not a UUID.
  const newToken = crypto.randomUUID();
  const { error } = await db
    .from("strategies")
    .update({ telemetry_token: newToken })
    .eq("id", strategyId);
  if (error) return null;
  return newToken;
}
