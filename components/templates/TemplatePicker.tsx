"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TemplateCard } from "./TemplateCard";
import { TemplateDetail } from "./TemplateDetail";
import { TEMPLATE_LIST } from "@/lib/templates/catalog";
import type { Template, TemplateCategory } from "@/lib/templates/types";
import { cn } from "@/lib/utils/cn";

const CATEGORY_LABELS: { value: TemplateCategory | "all"; label: string }[] = [
  { value: "all",            label: "All" },
  { value: "trend",          label: "Trend" },
  { value: "mean-reversion", label: "Mean reversion" },
  { value: "breakout",       label: "Breakout" },
  { value: "scalper",        label: "Scalper" },
  { value: "multi-tf",       label: "Multi-TF" },
  { value: "one-shot",       label: "One-shot" },
  { value: "prop-firm",      label: "Prop-firm" },
  { value: "grid",           label: "Grid" },
  { value: "martingale",     label: "Martingale" },
];

export function TemplatePicker({
  compact = false,
  limit,
  featuredFirst = true,
  showFilters = true,
}: {
  /** Smaller card padding for sidebar-sized grids. */
  compact?: boolean;
  /** Cap the number of rendered templates — useful for "top 4" previews. */
  limit?: number;
  /** Show featured first, then the rest. */
  featuredFirst?: boolean;
  /** Hide the category + search bar (keeps it pure). */
  showFilters?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TemplateCategory | "all">("all");
  const [active, setActive] = useState<Template | null>(null);

  const filtered = useMemo(() => {
    let list = TEMPLATE_LIST.slice();
    if (featuredFirst) {
      list.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    }
    if (category !== "all") list = list.filter((t) => t.category === category);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.tagline.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.recommendedSymbols.some((s) => s.toLowerCase().includes(q)),
      );
    }
    if (typeof limit === "number") list = list.slice(0, limit);
    return list;
  }, [query, category, limit, featuredFirst]);

  return (
    <>
      {showFilters && (
        <div className="mb-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates by name, symbol, or idea…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_LABELS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-600 transition-colors",
                  category === c.value
                    ? "bg-gray-900 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-10">No templates match your search.</div>
      ) : (
        <div className={cn(
          "grid gap-3",
          compact
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        )}>
          {filtered.map((t) => (
            <TemplateCard
              key={t.slug}
              template={t}
              compact={compact}
              onSelect={(tpl) => setActive(tpl)}
            />
          ))}
        </div>
      )}

      <TemplateDetail
        template={active}
        open={active !== null}
        onOpenChange={(v) => { if (!v) setActive(null); }}
      />
    </>
  );
}
