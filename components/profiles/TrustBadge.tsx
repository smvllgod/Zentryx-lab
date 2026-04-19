"use client";

import { Sparkles, TrendingUp, ShieldCheck, Crown } from "lucide-react";
import { TRUST_BADGES, type TrustLevel } from "@/lib/profiles/trust";
import { cn } from "@/lib/utils/cn";

interface Props {
  level: TrustLevel;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

const ICONS: Record<TrustLevel, React.ComponentType<{ size?: number; className?: string }>> = {
  new:     Sparkles,
  rising:  TrendingUp,
  trusted: ShieldCheck,
  top:     Crown,
};

const TONE_CLASSES: Record<TrustLevel, string> = {
  new:     "bg-slate-50 text-slate-700 border-slate-200",
  rising:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  trusted: "bg-purple-50 text-purple-700 border-purple-200",
  top:     "bg-amber-50 text-amber-700 border-amber-200",
};

export function TrustBadge({ level, size = "sm", showLabel = true, className }: Props) {
  const meta = TRUST_BADGES[level];
  const Icon = ICONS[level];
  const tone = TONE_CLASSES[level];
  const isSmall = size === "sm";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-700 uppercase tracking-wider",
        isSmall ? "gap-1 px-2 py-0.5 text-[10px]" : "gap-1.5 px-2.5 py-1 text-[11px]",
        tone,
        className,
      )}
      title={meta.description}
    >
      <Icon size={isSmall ? 10 : 12} />
      {showLabel && meta.label}
    </span>
  );
}
