"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Trade } from "@/lib/backtest/types";
import { cn } from "@/lib/utils/cn";

function fmtDate(ms: number) {
  return new Date(ms).toISOString().replace("T", " ").slice(0, 16);
}
function fmtUsd(v: number) {
  const sign = v < 0 ? "−" : v > 0 ? "+" : "";
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

export function TradesTable({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-xl">
        No trades generated in this run.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="text-[10px] font-700 uppercase tracking-widest text-gray-400">
            <th className="text-left px-3 py-2">#</th>
            <th className="text-left px-3 py-2">Side</th>
            <th className="text-left px-3 py-2">Open</th>
            <th className="text-left px-3 py-2">Close</th>
            <th className="text-right px-3 py-2">Lots</th>
            <th className="text-right px-3 py-2">Entry</th>
            <th className="text-right px-3 py-2">Exit</th>
            <th className="text-right px-3 py-2">Pips</th>
            <th className="text-right px-3 py-2">P/L</th>
            <th className="text-right px-3 py-2">R</th>
            <th className="text-left px-3 py-2">Reason</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr
              key={t.id}
              className={cn(
                "border-t border-gray-100 tabular-nums",
                t.pnl > 0 && "bg-emerald-50/30",
                t.pnl < 0 && "bg-red-50/30",
              )}
            >
              <td className="px-3 py-1.5 text-gray-500">{t.id}</td>
              <td className="px-3 py-1.5">
                <span className={cn(
                  "inline-flex items-center gap-1 font-600",
                  t.side === "long" ? "text-emerald-700" : "text-red-700",
                )}>
                  {t.side === "long" ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {t.side}
                </span>
              </td>
              <td className="px-3 py-1.5 text-gray-600">{fmtDate(t.openTime)}</td>
              <td className="px-3 py-1.5 text-gray-600">{fmtDate(t.closeTime)}</td>
              <td className="px-3 py-1.5 text-right">{t.lots.toFixed(2)}</td>
              <td className="px-3 py-1.5 text-right">{t.openPrice.toFixed(5)}</td>
              <td className="px-3 py-1.5 text-right">{t.closePrice.toFixed(5)}</td>
              <td className={cn(
                "px-3 py-1.5 text-right",
                t.pips > 0 ? "text-emerald-700" : t.pips < 0 ? "text-red-700" : "text-gray-500",
              )}>
                {t.pips > 0 ? "+" : ""}{t.pips.toFixed(1)}
              </td>
              <td className={cn(
                "px-3 py-1.5 text-right font-600",
                t.pnl > 0 ? "text-emerald-700" : t.pnl < 0 ? "text-red-700" : "text-gray-600",
              )}>
                {fmtUsd(t.pnl)}
              </td>
              <td className="px-3 py-1.5 text-right text-gray-600">
                {t.rMultiple >= 0 ? "+" : ""}{t.rMultiple.toFixed(2)}
              </td>
              <td className="px-3 py-1.5 text-gray-500 uppercase text-[10px] tracking-wider">{t.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
