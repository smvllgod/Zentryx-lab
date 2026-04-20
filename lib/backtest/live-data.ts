"use client";

// Client helper for the market-data Netlify function. Returns the same
// Bar[] shape the synthetic generator produces, so it's a drop-in
// replacement inside the runner.

import type { Bar } from "./types";
import type { Timeframe } from "@/lib/strategies/types";

export interface LiveDataResult {
  bars: Bar[];
  source: "binance" | "yahoo";
}

export async function fetchLiveBars(opts: {
  symbol: string;
  timeframe: Timeframe;
  bars?: number;
}): Promise<LiveDataResult> {
  const params = new URLSearchParams({
    symbol: opts.symbol,
    timeframe: opts.timeframe,
    bars: String(opts.bars ?? 2000),
  });
  const res = await fetch(`/.netlify/functions/market-data?${params.toString()}`);
  const body = await res.json() as {
    ok: boolean;
    bars?: Bar[];
    source?: "binance" | "yahoo";
    error?: string;
    detail?: string;
  };
  if (!body.ok) throw new Error(body.detail || body.error || "market_data_failed");
  if (!body.bars || body.bars.length === 0) throw new Error("empty_bars");
  return { bars: body.bars, source: body.source ?? "yahoo" };
}
