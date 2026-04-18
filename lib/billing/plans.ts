import type { NodeType } from "@/lib/strategies/types";

export type PlanTier = "free" | "pro" | "creator";

export interface PlanLimits {
  maxStrategies: number | "unlimited";
  premiumNodesAllowed: boolean;
  /** Can download the .mq5 source file. */
  exportEnabled: boolean;
  /** Can read the generated code un-blurred and copy it to clipboard. */
  codePreviewEnabled: boolean;
  marketplacePublishingEnabled: boolean;
  creatorAnalytics: boolean;
  /** Zentryx AI helper quota — enforced server-side. */
  aiQuota: { kind: "lifetime" | "daily"; limit: number };
}

export interface Plan {
  id: PlanTier;
  name: string;
  tagline: string;
  monthlyPrice: number;
  features: string[];
  limits: PlanLimits;
}

export const PLANS: Record<PlanTier, Plan> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Start building, learn the platform.",
    monthlyPrice: 0,
    features: [
      "Up to 3 saved strategies",
      "Core node library",
      ".mq5 downloads (source obfuscated)",
      "Zentryx AI — 15 trial messages",
      "Community support",
    ],
    limits: {
      maxStrategies: 3,
      premiumNodesAllowed: false,
      exportEnabled: true,          // ← Free can download the .mq5 file
      codePreviewEnabled: false,    // ← but the preview stays blurred
      marketplacePublishingEnabled: false,
      creatorAnalytics: false,
      aiQuota: { kind: "lifetime", limit: 15 },
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "Ship real EAs to MetaTrader 5.",
    monthlyPrice: 29,
    features: [
      "Unlimited saved strategies",
      "Advanced nodes (Risk %, trailing, etc.)",
      "Readable MQL5 preview + copy to clipboard",
      "Zentryx AI — 30 trial messages",
      "Strategy versioning",
      "Priority email support",
    ],
    limits: {
      maxStrategies: "unlimited",
      premiumNodesAllowed: true,
      exportEnabled: true,
      codePreviewEnabled: true,
      marketplacePublishingEnabled: false,
      creatorAnalytics: false,
      aiQuota: { kind: "lifetime", limit: 30 },
    },
  },
  creator: {
    id: "creator",
    name: "Creator",
    tagline: "Sell your strategies on the marketplace.",
    monthlyPrice: 79,
    features: [
      "Everything in Pro",
      "Zentryx AI — 150 messages / day",
      "Marketplace publishing",
      "Listing management",
      "Creator analytics",
      "Early access to new nodes",
    ],
    limits: {
      maxStrategies: "unlimited",
      premiumNodesAllowed: true,
      exportEnabled: true,
      codePreviewEnabled: true,
      marketplacePublishingEnabled: true,
      creatorAnalytics: true,
      aiQuota: { kind: "daily", limit: 150 },
    },
  },
};

// Premium-only node types — Free plan can drag them in, but can't export.
export const PREMIUM_NODE_TYPES: ReadonlySet<NodeType> = new Set<NodeType>([
  // Legacy premium IDs
  "risk.riskPercent",
  "risk.fixedRatio",
  "risk.volatilityScaled",
  "exit.trailingStop",
  "exit.atrTrailing",
  "exit.partialClose",
  "exit.chandelierExit",
  "entry.bollingerBreak",
  "entry.donchianBreakout",
  "entry.trendlineBreak",
  "filter.adx",
  "filter.higherTimeframeTrend",
  "filter.maxDailyLoss",
  "grid.basicGrid",
  "news.pauseBeforeNews",
  "utility.emergencyStop",
  // V1 additions (Pro)
  "risk.fixedRisk",
  "risk.dailyRiskBudget",
  "lot.fromRisk",
  "manage.breakEven",
  "manage.trailingStop",
  "manage.trailingStopAtr",
  "manage.partialClose",
  "exit.rrBased",
  "exit.atrBased",
  "filter.pinBar",
  "filter.rocThreshold",
  "utility.maxDailyLoss",
]);
