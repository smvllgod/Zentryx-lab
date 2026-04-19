"use client";

import { cn } from "@/lib/utils/cn";

export type DateRange = "24h" | "7d" | "30d" | "90d" | "all";

const OPTS: { value: DateRange; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d",  label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All" },
];

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {OPTS.map((o, i) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "text-[11px] font-600 px-2.5 h-8 transition-colors",
            i > 0 && "border-l border-gray-200",
            value === o.value
              ? "bg-emerald-50 text-emerald-700"
              : "bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Convert a DateRange into an ISO cutoff for Supabase `.gte(created_at, …)`. */
export function rangeToSince(r: DateRange): string | null {
  if (r === "all") return null;
  const ms: Record<DateRange, number> = {
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    "90d": 90 * 24 * 60 * 60 * 1000,
    "all": 0,
  };
  return new Date(Date.now() - ms[r]).toISOString();
}

export function rangeBuckets(r: DateRange): number {
  switch (r) {
    case "24h": return 24;
    case "7d":  return 7;
    case "30d": return 30;
    case "90d": return 90;
    case "all": return 30;
  }
}
