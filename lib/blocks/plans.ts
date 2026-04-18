// Plan-scoped helpers for blocks. The canonical subscription / limit
// logic lives in `lib/billing/plans.ts` — these are *block-only* queries
// that can be made without re-importing every billing concept.

import { BLOCK_REGISTRY, getBlock } from "./registry";
import type { BlockPlan, BlockDefinition } from "./types";

const PLAN_ORDER: Record<BlockPlan, number> = { free: 0, pro: 1, creator: 2 };

export function planAtLeast(plan: BlockPlan, required: BlockPlan): boolean {
  return PLAN_ORDER[plan] >= PLAN_ORDER[required];
}

export function isBlockAvailable(
  id: string,
  ctx: { plan: BlockPlan; flags?: Set<string> },
): boolean {
  const b = getBlock(id);
  if (!b) return false;
  const effectivePlan = b.adminOverrides?.forcePlan ?? b.plan;
  const effectiveStatus = b.adminOverrides?.forceStatus ?? b.status;

  if (effectiveStatus === "disabled" || effectiveStatus === "planned") return false;
  if (b.adminOverrides?.forceHidden) return false;
  if (!planAtLeast(ctx.plan, effectivePlan)) return false;
  if (b.flags && b.flags.length > 0) {
    const set = ctx.flags ?? new Set();
    for (const f of b.flags) if (!set.has(f)) return false;
  }
  return true;
}

/**
 * Returns blocks the given plan can actually use in the builder.
 * Status = "active" | "beta" (beta is explicitly user-visible).
 */
export function blocksForPlan(plan: BlockPlan): BlockDefinition[] {
  return BLOCK_REGISTRY.filter(
    (b) =>
      b.surface === "canvas" &&
      (b.status === "active" || b.status === "beta") &&
      !b.adminOverrides?.forceHidden &&
      planAtLeast(plan, b.adminOverrides?.forcePlan ?? b.plan),
  );
}

/** Premium node ids — kept for compatibility with `lib/billing/plans.ts`. */
export function premiumBlockIds(): string[] {
  return BLOCK_REGISTRY.filter((b) => b.plan !== "free").map((b) => b.id);
}
