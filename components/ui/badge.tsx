import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "default" | "emerald" | "amber" | "red" | "blue" | "slate" | "purple";

const toneClasses: Record<Tone, string> = {
  default: "bg-gray-100 text-gray-700 border border-gray-200",
  emerald: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  amber:   "bg-amber-50 text-amber-700 border border-amber-200",
  red:     "bg-red-50 text-red-700 border border-red-200",
  blue:    "bg-sky-50 text-sky-700 border border-sky-200",
  slate:   "bg-slate-50 text-slate-700 border border-slate-200",
  purple:  "bg-purple-50 text-purple-700 border border-purple-200",
};

export function Badge({
  tone = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-600 uppercase tracking-wide",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
