"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { Template, TemplateRisk } from "@/lib/templates/types";

const RISK_TONE: Record<TemplateRisk, "emerald" | "amber" | "red" | "default"> = {
  low: "emerald",
  medium: "default",
  high: "amber",
  "very-high": "red",
};

const RISK_LABEL: Record<TemplateRisk, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
  "very-high": "Very high risk",
};

export function TemplateCard({
  template,
  onSelect,
  compact = false,
}: {
  template: Template;
  onSelect: (t: Template) => void;
  /** Slightly smaller padding/type for dense grids. */
  compact?: boolean;
}) {
  const accent = template.accent ?? "#10b981";
  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className={cn(
        "group relative text-left rounded-2xl border border-gray-200 bg-white transition-all",
        "hover:border-gray-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.08)]",
        compact ? "p-4" : "p-5",
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div
          className={cn(
            "rounded-xl flex items-center justify-center text-2xl shrink-0",
            compact ? "w-10 h-10" : "w-12 h-12",
          )}
          style={{ background: accent + "18" }}
          aria-hidden
        >
          <span>{template.emoji}</span>
        </div>
        <div className="flex flex-wrap gap-1 justify-end">
          <Badge tone={RISK_TONE[template.risk]}>{RISK_LABEL[template.risk]}</Badge>
          {template.featured && <Badge tone="purple">Featured</Badge>}
        </div>
      </div>
      <h3 className={cn("font-700 text-gray-900 leading-tight", compact ? "text-sm" : "text-base")}>
        {template.name}
      </h3>
      <p className={cn("mt-1.5 text-gray-500 leading-relaxed", compact ? "text-xs" : "text-sm")}>
        {template.tagline}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-600 text-gray-500 uppercase tracking-wider">
        <span className="px-2 py-0.5 rounded-full bg-gray-100">{template.category}</span>
        <span className="px-2 py-0.5 rounded-full bg-gray-100">{template.difficulty}</span>
        <span className="px-2 py-0.5 rounded-full bg-gray-100">
          {template.recommendedTimeframes.join(", ")}
        </span>
      </div>
    </button>
  );
}
