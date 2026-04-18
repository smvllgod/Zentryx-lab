"use client";

import { useMemo, useState } from "react";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  NODE_DEFINITIONS,
  searchNodes,
  type NodeDefinition,
} from "@/lib/strategies/nodes";
import type { NodeCategory } from "@/lib/strategies/types";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/lib/auth/context";
import type { PlanTier } from "@/lib/billing/plans";

// Canvas categories shown in the node library — ordered by the canonical
// connection flow: entry → filter → session/news → risk → lot → management → exit → grid → utility.
const VISIBLE_CATEGORIES: NodeCategory[] = [
  "entry",
  "filter",
  "session",
  "news",
  "risk",
  "lot",
  "management",
  "exit",
  "grid",
  "utility",
];

export function NodeLibrary({ onAdd }: { onAdd: (def: NodeDefinition) => void }) {
  const [query, setQuery] = useState("");
  const [onlyForMyPlan, setOnlyForMyPlan] = useState(false);
  const { profile } = useAuth();
  const plan = (profile?.plan ?? "free") as PlanTier;

  const visible = useMemo(() => {
    let defs = NODE_DEFINITIONS.filter(
      (d) =>
        VISIBLE_CATEGORIES.includes(d.category) &&
        (d.status ?? "active") !== "planned" &&
        // Skip legacy alias duplicates (clearly marked in the label)
        !d.label.toLowerCase().includes("(legacy)"),
    );
    if (query) defs = searchNodes(query, defs);
    if (onlyForMyPlan) defs = defs.filter((d) => planCovers(plan, d.plan ?? "free"));
    return defs;
  }, [query, onlyForMyPlan, plan]);

  const grouped = VISIBLE_CATEGORIES.map((cat) => ({
    cat,
    items: visible.filter((d) => d.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      <div className="px-3 py-3 border-b border-gray-100 sticky top-0 bg-white space-y-2">
        <input
          type="text"
          placeholder="Search nodes or tags…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-300"
        />
        <label className="flex items-center gap-2 text-[11px] text-gray-500">
          <input
            type="checkbox"
            checked={onlyForMyPlan}
            onChange={(e) => setOnlyForMyPlan(e.target.checked)}
            className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-400"
          />
          Only nodes available on my plan
        </label>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {grouped.length === 0 && (
          <div className="px-4 py-6 text-xs text-gray-400 text-center">No matching nodes.</div>
        )}
        {grouped.map((g) => (
          <div key={g.cat}>
            <div className="px-2 mb-1.5 flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: CATEGORY_COLORS[g.cat] }}
              />
              <span className="text-[10px] font-700 uppercase tracking-wider text-gray-500">
                {CATEGORY_LABELS[g.cat]}
              </span>
              <span className="text-[10px] text-gray-300 ml-auto">{g.items.length}</span>
            </div>
            <div className="space-y-1">
              {g.items.map((def) => {
                const available = planCovers(plan, def.plan ?? "free");
                return (
                  <button
                    key={def.type}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/zentryx-node", def.type);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    draggable
                    onDoubleClick={() => onAdd(def)}
                    className={cn(
                      "group w-full text-left rounded-lg border border-transparent px-2.5 py-2 hover:border-gray-200 hover:bg-gray-50 transition-colors cursor-grab active:cursor-grabbing",
                      !available && "opacity-75",
                    )}
                    title={def.userExplanation ?? def.summary}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[12px] font-600 text-gray-900">{def.label}</span>
                      {def.status === "beta" && (
                        <span className="text-[9px] font-700 uppercase tracking-wider text-sky-600">
                          Beta
                        </span>
                      )}
                      {def.premium && def.status !== "beta" && (
                        <span
                          className={cn(
                            "text-[9px] font-700 uppercase tracking-wider",
                            def.plan === "creator" ? "text-purple-600" : "text-amber-600",
                          )}
                        >
                          {def.plan === "creator" ? "Creator" : "Pro"}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                      {def.summary}
                    </div>
                    {def.tags && def.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {def.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="text-[8px] font-600 uppercase tracking-wider text-gray-400"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 px-3 py-2 text-[10px] text-gray-400">
        Drag onto canvas, or double-click to add.
      </div>
    </div>
  );
}

function planCovers(plan: PlanTier, required: string): boolean {
  const order: Record<string, number> = { free: 0, pro: 1, creator: 2 };
  return (order[plan] ?? 0) >= (order[required] ?? 0);
}
