// Client-side read-model for block analytics. The `block_analytics`
// table is filled by a nightly server job (Phase D). This module just
// exposes helpers for the admin dashboard and the builder's node
// library tooltip.

import type { BlockDefinition } from "./types";

export interface BlockAnalyticsRow {
  block_id: string;
  usage_count: number;
  unique_users: number;
  popularity: number;           // 0–100 within the family
  last_used_at: string | null;
}

export function applyAnalytics(
  blocks: BlockDefinition[],
  rows: BlockAnalyticsRow[],
): BlockDefinition[] {
  const byId = new Map(rows.map((r) => [r.block_id, r]));
  return blocks.map((b) => {
    const r = byId.get(b.id);
    if (!r) return b;
    return {
      ...b,
      analytics: {
        usageCount: r.usage_count,
        popularity: r.popularity,
        lastUsedAt: r.last_used_at ?? undefined,
      },
    };
  });
}

export function rankByPopularity(blocks: BlockDefinition[]): BlockDefinition[] {
  return [...blocks].sort(
    (a, b) => (b.analytics?.popularity ?? 0) - (a.analytics?.popularity ?? 0),
  );
}

export function rankByUsage(blocks: BlockDefinition[]): BlockDefinition[] {
  return [...blocks].sort(
    (a, b) => (b.analytics?.usageCount ?? 0) - (a.analytics?.usageCount ?? 0),
  );
}
