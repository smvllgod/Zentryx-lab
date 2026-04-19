"use client";

import { BLOCK_REGISTRY, FAMILY_META, type BlockFamily } from "@/lib/blocks";

interface Props {
  analytics: Map<string, { usage_count: number }>;
}

/**
 * Compact family-level heatmap. Each family shows as a strip whose
 * intensity reflects total usage_count across its blocks.
 */
export function BlocksHeatmap({ analytics }: Props) {
  const families = (Object.keys(FAMILY_META) as BlockFamily[])
    .filter((f) => FAMILY_META[f].surface === "canvas")
    .map((f) => {
      const blocks = BLOCK_REGISTRY.filter((b) => b.family === f);
      const usage = blocks.reduce((sum, b) => sum + (analytics.get(b.id)?.usage_count ?? 0), 0);
      return { family: f, meta: FAMILY_META[f], blocks, usage };
    })
    .sort((a, b) => b.usage - a.usage);

  const max = Math.max(1, ...families.map((f) => f.usage));

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1.5">
      {families.map(({ family, meta, blocks, usage }) => {
        const intensity = usage / max;               // 0..1
        const opacity = 0.08 + intensity * 0.72;
        return (
          <a
            key={family}
            href="/admin/blocks"
            className="group relative rounded-lg border border-gray-200/80 bg-white px-3 py-2.5 hover:border-gray-300 transition-colors overflow-hidden"
            title={`${meta.label}: ${usage} placements across ${blocks.length} blocks`}
          >
            <span
              aria-hidden
              className="absolute inset-0"
              style={{ background: meta.color, opacity }}
            />
            <div className="relative">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                <span className="text-[9px] font-700 uppercase tracking-wider text-gray-700">{meta.shortLabel}</span>
              </div>
              <div className="mt-1.5 text-[17px] font-700 text-gray-900 tabular-nums leading-none">{usage}</div>
              <div className="mt-0.5 text-[9px] text-gray-500">{blocks.length} blocks</div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
