import { PREMIUM_NODE_TYPES, PLANS, type PlanTier } from "./plans";
import type { NodeType, StrategyGraph } from "@/lib/strategies/types";

export interface GateReason {
  ok: boolean;
  reason?: string;
  upgradeTo?: PlanTier;
}

export function canSaveStrategy(plan: PlanTier, currentCount: number): GateReason {
  const limit = PLANS[plan].limits.maxStrategies;
  if (limit === "unlimited") return { ok: true };
  if (currentCount >= limit) {
    return {
      ok: false,
      reason: `Free plan is limited to ${limit} strategies. Upgrade to Pro for unlimited.`,
      upgradeTo: "pro",
    };
  }
  return { ok: true };
}

export function canExport(plan: PlanTier): GateReason {
  if (PLANS[plan].limits.exportEnabled) return { ok: true };
  return {
    ok: false,
    reason: "Export is disabled on your plan.",
    upgradeTo: "pro",
  };
}

export function canPreviewCode(plan: PlanTier): GateReason {
  if (PLANS[plan].limits.codePreviewEnabled) return { ok: true };
  return {
    ok: false,
    reason: "Readable source code and clipboard copy are a Pro feature.",
    upgradeTo: "pro",
  };
}

export function canPublishToMarketplace(plan: PlanTier): GateReason {
  if (PLANS[plan].limits.marketplacePublishingEnabled) return { ok: true };
  return {
    ok: false,
    reason: "Marketplace publishing is a Creator plan feature.",
    upgradeTo: "creator",
  };
}

// Returns the list of premium node types the user currently has in their
// graph that their plan isn't entitled to. Empty list = no gate.
export function premiumNodesInUse(plan: PlanTier, graph: StrategyGraph): NodeType[] {
  if (PLANS[plan].limits.premiumNodesAllowed) return [];
  const seen = new Set<NodeType>();
  for (const n of graph.nodes) {
    if (PREMIUM_NODE_TYPES.has(n.type)) seen.add(n.type);
  }
  return [...seen];
}
