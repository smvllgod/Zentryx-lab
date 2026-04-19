import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Sparkline } from "./Sparkline";

type Tone = "default" | "emerald" | "amber" | "red" | "purple" | "blue";

const TONE: Record<Tone, { bg: string; text: string; stroke: string; fill: string }> = {
  default: { bg: "bg-gray-100",    text: "text-gray-500",    stroke: "#64748B", fill: "rgba(100,116,139,0.08)" },
  emerald: { bg: "bg-emerald-50",  text: "text-emerald-600", stroke: "#10b981", fill: "rgba(16,185,129,0.10)" },
  amber:   { bg: "bg-amber-50",    text: "text-amber-600",   stroke: "#F59E0B", fill: "rgba(245,158,11,0.10)" },
  red:     { bg: "bg-red-50",      text: "text-red-600",     stroke: "#EF4444", fill: "rgba(239,68,68,0.10)" },
  purple:  { bg: "bg-purple-50",   text: "text-purple-600",  stroke: "#8b5cf6", fill: "rgba(139,92,246,0.10)" },
  blue:    { bg: "bg-sky-50",      text: "text-sky-600",     stroke: "#0EA5E9", fill: "rgba(14,165,233,0.10)" },
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
  trend,
  delta,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: Tone;
  /** 14-point time series for the sparkline */
  trend?: number[];
  /** Percent change vs previous period (e.g. 12 or -8). Displayed next to the value. */
  delta?: number | null;
}) {
  const t = TONE[tone];
  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5 flex flex-col gap-3 hover:border-gray-300/80 transition-colors">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-[10px] font-700 uppercase tracking-[0.12em] text-gray-400">{label}</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-[22px] font-700 text-gray-900 tabular-nums leading-none">{value}</span>
            {typeof delta === "number" && (
              <span
                className={cn(
                  "text-[10px] font-600 tabular-nums px-1.5 py-0.5 rounded",
                  delta > 0 ? "text-emerald-700 bg-emerald-50"
                  : delta < 0 ? "text-red-700 bg-red-50"
                  : "text-gray-500 bg-gray-100",
                )}
              >
                {delta > 0 ? "+" : ""}{delta.toFixed(0)}%
              </span>
            )}
          </div>
          {hint && <div className="mt-1 text-[11px] text-gray-500 truncate">{hint}</div>}
        </div>
        {icon && (
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", t.bg, t.text)}>
            {icon}
          </div>
        )}
      </div>
      {trend && trend.length > 0 && (
        <div className="-mx-1">
          <Sparkline data={trend} width={260} height={30} stroke={t.stroke} fill={t.fill} className="w-full h-[30px]" />
        </div>
      )}
    </div>
  );
}
