"use client";

import { cn } from "@/lib/utils/cn";
import type { BacktestMetrics } from "@/lib/backtest/types";

function fmtCurrency(v: number, digits = 2) {
  if (!Number.isFinite(v)) return "∞";
  const sign = v < 0 ? "−" : "";
  return `${sign}$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: digits })}`;
}
function fmtPct(v: number) {
  if (!Number.isFinite(v)) return "—";
  return `${v.toFixed(2)}%`;
}
function fmtNum(v: number, digits = 2) {
  if (!Number.isFinite(v)) return "∞";
  return v.toFixed(digits);
}

export function MetricsGrid({ m }: { m: BacktestMetrics }) {
  const profitable = m.netProfit >= 0;
  const retPct = m.startingBalance > 0 ? (m.netProfit / m.startingBalance) * 100 : 0;

  const cards: { label: string; value: string; hint?: string; tone?: "good" | "bad" | "neutral" }[] = [
    {
      label: "Net profit",
      value: fmtCurrency(m.netProfit),
      hint: `${fmtPct(retPct)} return`,
      tone: profitable ? "good" : "bad",
    },
    { label: "Ending equity", value: fmtCurrency(m.endingEquity), hint: `starting $${m.startingBalance.toLocaleString()}`, tone: "neutral" },
    { label: "Total trades", value: String(m.totalTrades), hint: `${m.wins} win / ${m.losses} loss`, tone: "neutral" },
    { label: "Win rate", value: fmtPct(m.winRate * 100), hint: `${m.wins}/${m.totalTrades}`, tone: m.winRate >= 0.5 ? "good" : "neutral" },
    { label: "Profit factor", value: fmtNum(m.profitFactor, 2), hint: "gross win / gross loss", tone: m.profitFactor >= 1.5 ? "good" : m.profitFactor >= 1 ? "neutral" : "bad" },
    { label: "Expectancy / trade", value: fmtCurrency(m.expectancyPerTrade), hint: `R = ${fmtNum(m.rExpectancy, 2)}`, tone: m.expectancyPerTrade >= 0 ? "good" : "bad" },
    { label: "Max drawdown", value: fmtCurrency(m.maxDrawdownAbs), hint: fmtPct(m.maxDrawdownPct), tone: m.maxDrawdownPct >= 15 ? "bad" : m.maxDrawdownPct >= 8 ? "neutral" : "good" },
    { label: "Recovery factor", value: fmtNum(m.recoveryFactor, 2), hint: "net profit / max DD", tone: m.recoveryFactor >= 2 ? "good" : "neutral" },
    { label: "Sharpe ratio", value: fmtNum(m.sharpeRatio, 2), hint: "trade-based", tone: m.sharpeRatio >= 1 ? "good" : "neutral" },
    { label: "Avg win", value: fmtCurrency(m.averageWin), hint: `largest ${fmtCurrency(m.largestWin)}`, tone: "neutral" },
    { label: "Avg loss", value: fmtCurrency(m.averageLoss), hint: `largest ${fmtCurrency(m.largestLoss)}`, tone: "neutral" },
    { label: "Max streak", value: `${m.maxConsecutiveWins}W / ${m.maxConsecutiveLosses}L`, hint: "consecutive", tone: "neutral" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {cards.map((c, i) => (
        <div
          key={i}
          className={cn(
            "rounded-xl border p-3 bg-white",
            c.tone === "good" && "border-emerald-200 bg-emerald-50/40",
            c.tone === "bad" && "border-red-200 bg-red-50/40",
            (!c.tone || c.tone === "neutral") && "border-gray-200",
          )}
        >
          <div className="text-[10px] font-700 uppercase tracking-widest text-gray-400">{c.label}</div>
          <div className={cn(
            "mt-1 text-lg font-800 tabular-nums",
            c.tone === "good" ? "text-emerald-700" : c.tone === "bad" ? "text-red-700" : "text-gray-900",
          )}>
            {c.value}
          </div>
          {c.hint && <div className="text-xs text-gray-500 mt-0.5">{c.hint}</div>}
        </div>
      ))}
    </div>
  );
}
