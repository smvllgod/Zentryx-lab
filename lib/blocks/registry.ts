// Aggregate registry — the one import every consumer should use.
// Tree-shaken by module; the builder only imports what it needs.

import { ENTRY_BLOCKS } from "./canvas/entry";
import { CONFIRMATION_BLOCKS } from "./canvas/confirmation";
import { TREND_BLOCKS } from "./canvas/trend";
import { MOMENTUM_BLOCKS } from "./canvas/momentum";
import { VOLATILITY_BLOCKS } from "./canvas/volatility";
import { STRUCTURE_BLOCKS } from "./canvas/structure";
import { CANDLE_BLOCKS } from "./canvas/candles";
import { SESSION_BLOCKS } from "./canvas/session";
import { NEWS_BLOCKS } from "./canvas/news";
import { EXECUTION_BLOCKS } from "./canvas/execution";
import { RISK_BLOCKS } from "./canvas/risk";
import { LOT_BLOCKS } from "./canvas/lot";
import { MANAGEMENT_BLOCKS } from "./canvas/management";
import { EXIT_BLOCKS } from "./canvas/exit";
import { BASKET_BLOCKS } from "./canvas/basket";
import { GRID_BLOCKS } from "./canvas/grid";
import { MTF_BLOCKS } from "./canvas/mtf";
import { UTILITY_BLOCKS } from "./canvas/utility";
import { PROTECTION_BLOCKS } from "./configs/protection";
import { PACKAGING_BLOCKS } from "./configs/packaging";

import type {
  BlockDefinition,
  BlockFamily,
  BlockPlan,
  BlockStatus,
  BlockSurface,
} from "./types";

// ────────────────────────────────────────────────────────────────────
// Master list
// ────────────────────────────────────────────────────────────────────

export const ALL_CANVAS_BLOCKS: BlockDefinition[] = [
  ...ENTRY_BLOCKS,
  ...CONFIRMATION_BLOCKS,
  ...TREND_BLOCKS,
  ...MOMENTUM_BLOCKS,
  ...VOLATILITY_BLOCKS,
  ...STRUCTURE_BLOCKS,
  ...CANDLE_BLOCKS,
  ...SESSION_BLOCKS,
  ...NEWS_BLOCKS,
  ...EXECUTION_BLOCKS,
  ...RISK_BLOCKS,
  ...LOT_BLOCKS,
  ...MANAGEMENT_BLOCKS,
  ...EXIT_BLOCKS,
  ...BASKET_BLOCKS,
  ...GRID_BLOCKS,
  ...MTF_BLOCKS,
  ...UTILITY_BLOCKS,
];

export const ALL_CONFIG_BLOCKS: BlockDefinition[] = [
  ...PROTECTION_BLOCKS,
  ...PACKAGING_BLOCKS,
];

export const BLOCK_REGISTRY: BlockDefinition[] = [
  ...ALL_CANVAS_BLOCKS,
  ...ALL_CONFIG_BLOCKS,
];

// ────────────────────────────────────────────────────────────────────
// Indexes
// ────────────────────────────────────────────────────────────────────

const _byId = new Map<string, BlockDefinition>(BLOCK_REGISTRY.map((b) => [b.id, b]));
const _bySlug = new Map<string, BlockDefinition>(BLOCK_REGISTRY.map((b) => [b.slug, b]));

if (_byId.size !== BLOCK_REGISTRY.length) {
  const counts = new Map<string, number>();
  for (const b of BLOCK_REGISTRY) counts.set(b.id, (counts.get(b.id) ?? 0) + 1);
  const dupes = [...counts.entries()].filter(([, c]) => c > 1).map(([id]) => id);
  throw new Error(`Duplicate block id(s) in registry: ${dupes.join(", ")}`);
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

export function getBlock(id: string): BlockDefinition | undefined {
  return _byId.get(id);
}

export function getBlockBySlug(slug: string): BlockDefinition | undefined {
  return _bySlug.get(slug);
}

export interface BlockFilter {
  family?: BlockFamily;
  families?: BlockFamily[];
  plan?: BlockPlan;
  surface?: BlockSurface;
  status?: BlockStatus | BlockStatus[];
  includeAdminHidden?: boolean;     // default: false
}

export function listBlocks(filter: BlockFilter = {}): BlockDefinition[] {
  return BLOCK_REGISTRY.filter((b) => matchesFilter(b, filter));
}

export function searchBlocks(
  query: string,
  filter: BlockFilter = {},
): BlockDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return listBlocks(filter);
  return listBlocks(filter).filter((b) => blockMatchesQuery(b, q));
}

export function groupByFamily(
  blocks: BlockDefinition[],
): Record<BlockFamily, BlockDefinition[]> {
  const out = {} as Record<BlockFamily, BlockDefinition[]>;
  for (const b of blocks) {
    (out[b.family] ??= []).push(b);
  }
  return out;
}

export function defaultParamValues(id: string): Record<string, unknown> {
  const def = getBlock(id);
  if (!def) return {};
  const out: Record<string, unknown> = {};
  for (const p of def.params) out[p.key] = p.default;
  return out;
}

// ────────────────────────────────────────────────────────────────────
// Internals
// ────────────────────────────────────────────────────────────────────

function blockMatchesQuery(b: BlockDefinition, q: string): boolean {
  if (b.displayName.toLowerCase().includes(q)) return true;
  if (b.shortDescription.toLowerCase().includes(q)) return true;
  if (b.id.toLowerCase().includes(q)) return true;
  if (b.family.toLowerCase().includes(q)) return true;
  if (b.subcategory.toLowerCase().includes(q)) return true;
  for (const tag of b.tags) if (tag.toLowerCase().includes(q)) return true;
  return false;
}

function matchesFilter(b: BlockDefinition, f: BlockFilter): boolean {
  if (f.family && b.family !== f.family) return false;
  if (f.families && !f.families.includes(b.family)) return false;
  if (f.plan && b.plan !== f.plan) return false;
  if (f.surface && b.surface !== f.surface) return false;
  if (f.status) {
    const statuses = Array.isArray(f.status) ? f.status : [f.status];
    if (!statuses.includes(b.status)) return false;
  } else if (!f.includeAdminHidden) {
    if (b.status === "disabled" || b.status === "planned") return false;
    if (b.adminOverrides?.forceHidden) return false;
  }
  return true;
}
