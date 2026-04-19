"use client";

import { useEffect, useState } from "react";
import { Radio, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { fetchLiveStats, type LiveStats } from "@/lib/telemetry/client";

/**
 * Only shows when the listing's strategy has live_feed_enabled = true AND
 * at least one telemetry event exists. Fetches stats via the strategy_live_stats
 * RPC (public read-only, no auth required).
 */
export function LivePerformanceBadge({ strategyId, compact = false }: { strategyId: string; compact?: boolean }) {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await fetchLiveStats(strategyId);
        if (!alive) return;
        // Only display if there's actually telemetry (trades_total > 0).
        if (s && s.trades_total > 0) setStats(s);
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, [strategyId]);

  if (!loaded || !stats) return null;

  const up30 = stats.pnl_30d >= 0;
  return (
    <div
      className={cn(
        "rounded-lg border flex items-center gap-2 text-xs",
        compact ? "px-2 py-1" : "px-2.5 py-1.5",
        up30 ? "border-emerald-200 bg-emerald-50/60" : "border-red-200 bg-red-50/60",
      )}
    >
      <div
        className={cn(
          "inline-flex items-center gap-1 font-700",
          up30 ? "text-emerald-700" : "text-red-700",
        )}
      >
        <Radio size={11} className="animate-pulse" />
        Live
      </div>
      <div className={cn("flex items-center gap-1 font-600 tabular-nums", up30 ? "text-emerald-700" : "text-red-700")}>
        {up30 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        {fmtUsdCompact(stats.pnl_30d)}
        <span className="text-gray-500 font-500">(30d)</span>
      </div>
      <div className="text-gray-500">· {stats.trades_30d} trades · {stats.win_rate_30d}% win</div>
    </div>
  );
}

function fmtUsdCompact(v: number): string {
  const sign = v < 0 ? "−" : v > 0 ? "+" : "";
  const abs = Math.abs(v);
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}
