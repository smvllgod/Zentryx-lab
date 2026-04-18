// Display metadata for every block family. The builder's node library
// renders exactly these groupings, in exactly this order.

import type { BlockFamily, BlockSurface } from "./types";

export interface FamilyMeta {
  family: BlockFamily;
  label: string;
  shortLabel: string;
  tagline: string;
  description: string;
  surface: BlockSurface;
  /** Tailwind-friendly color token for badges / dots. */
  color: string;
  /** Render order in the node library. */
  order: number;
  /** Icon name from lucide-react. */
  icon: string;
}

export const FAMILY_META: Record<BlockFamily, FamilyMeta> = {
  entry: {
    family: "entry",
    label: "Entry Logic",
    shortLabel: "Entry",
    tagline: "What triggers a new trade.",
    description: "Classic entry triggers: crossovers, breakouts, mean-reversion reads. Exactly one entry block per strategy.",
    surface: "canvas",
    color: "#10b981",
    order: 10,
    icon: "Zap",
  },
  confirmation: {
    family: "confirmation",
    label: "Confirmation",
    shortLabel: "Confirm",
    tagline: "Secondary checks that gate entries.",
    description: "Indicator / price-relation / time confirmations. Never fire an entry alone — they AND into the entry condition.",
    surface: "canvas",
    color: "#14b8a6",
    order: 20,
    icon: "CheckCircle2",
  },
  trend: {
    family: "trend",
    label: "Trend Filters",
    shortLabel: "Trend",
    tagline: "Align trades with the broader trend.",
    description: "Slope, strength and regime reads that veto counter-trend entries.",
    surface: "canvas",
    color: "#059669",
    order: 30,
    icon: "TrendingUp",
  },
  momentum: {
    family: "momentum",
    label: "Momentum Filters",
    shortLabel: "Momentum",
    tagline: "Oscillator-based veto rules.",
    description: "RSI / stoch / CCI / ROC blocking bands. Use these to stay out of exhausted markets.",
    surface: "canvas",
    color: "#0ea5e9",
    order: 40,
    icon: "Activity",
  },
  volatility: {
    family: "volatility",
    label: "Volatility Filters",
    shortLabel: "Vol",
    tagline: "Trade only in the right vol regime.",
    description: "ATR bands, Bollinger-width thresholds and range-used filters.",
    surface: "canvas",
    color: "#6366f1",
    order: 50,
    icon: "Waves",
  },
  structure: {
    family: "structure",
    label: "Market Structure",
    shortLabel: "Structure",
    tagline: "Swings, S/R and smart-money concepts.",
    description: "HH/HL, BOS / CHoCH, pivots, supply & demand, FVG, order blocks.",
    surface: "canvas",
    color: "#8b5cf6",
    order: 60,
    icon: "BarChart3",
  },
  candles: {
    family: "candles",
    label: "Candle Patterns",
    shortLabel: "Candles",
    tagline: "Single- and multi-bar patterns.",
    description: "Pin bars, engulfings, inside bars, morning / evening stars, tweezers.",
    surface: "canvas",
    color: "#a855f7",
    order: 70,
    icon: "Candlestick",
  },
  session: {
    family: "session",
    label: "Session Filters",
    shortLabel: "Session",
    tagline: "When to trade (hour / day / month).",
    description: "Custom windows, London / NY / Asia presets, weekday and holiday gates.",
    surface: "canvas",
    color: "#6366f1",
    order: 80,
    icon: "Clock",
  },
  news: {
    family: "news",
    label: "News / Event Filters",
    shortLabel: "News",
    tagline: "Avoid or embrace news events.",
    description: "Pause around events, currency scope, high-impact filter, FOMC/ECB day blockers.",
    surface: "canvas",
    color: "#ec4899",
    order: 90,
    icon: "Newspaper",
  },
  execution: {
    family: "execution",
    label: "Spread / Execution",
    shortLabel: "Execution",
    tagline: "Broker-realism gates.",
    description: "Spread caps, slippage limits, stops-level & freeze-level compliance, symbol whitelist.",
    surface: "canvas",
    color: "#0891b2",
    order: 100,
    icon: "Gauge",
  },
  risk: {
    family: "risk",
    label: "Risk Models",
    shortLabel: "Risk",
    tagline: "The risk budget of every trade.",
    description: "Fixed-risk %, cash risk, daily / weekly budget, ATR risk, Kelly, drawdown scaling.",
    surface: "canvas",
    color: "#f59e0b",
    order: 110,
    icon: "Shield",
  },
  lot: {
    family: "lot",
    label: "Lot Sizing",
    shortLabel: "Lots",
    tagline: "How risk becomes a concrete MT5 lot.",
    description: "Fixed, per-balance, risk-derived, volatility-scaled, anti-martingale.",
    surface: "canvas",
    color: "#f97316",
    order: 120,
    icon: "Calculator",
  },
  management: {
    family: "management",
    label: "Trade Management",
    shortLabel: "Manage",
    tagline: "Actions on open trades.",
    description: "Break-even, trailing stops, partial close, pyramiding, re-entry cooldowns.",
    surface: "canvas",
    color: "#84cc16",
    order: 130,
    icon: "Sliders",
  },
  exit: {
    family: "exit",
    label: "Exit Logic",
    shortLabel: "Exit",
    tagline: "Hard exits and targets.",
    description: "Fixed TP/SL, RR, ATR, time-based, opposite-signal, indicator reversal, equity targets.",
    surface: "canvas",
    color: "#ef4444",
    order: 140,
    icon: "LogOut",
  },
  basket: {
    family: "basket",
    label: "Basket / Portfolio",
    shortLabel: "Basket",
    tagline: "Cross-trade portfolio rules.",
    description: "Basket TP/SL, symbol groups, correlation caps, hedged pair closes.",
    surface: "canvas",
    color: "#3b82f6",
    order: 150,
    icon: "Layers",
  },
  grid: {
    family: "grid",
    label: "Grid / Recovery",
    shortLabel: "Grid",
    tagline: "Advanced (high-risk) recovery systems.",
    description: "Basic / ATR / martingale / anti-grid / smart-close.",
    surface: "canvas",
    color: "#a855f7",
    order: 160,
    icon: "Grid3x3",
  },
  mtf: {
    family: "mtf",
    label: "Multi-Timeframe",
    shortLabel: "MTF",
    tagline: "Reads from a second timeframe.",
    description: "Higher-TF EMA / RSI / MACD alignment and lower-TF triggers.",
    surface: "canvas",
    color: "#14b8a6",
    order: 170,
    icon: "Repeat",
  },
  utility: {
    family: "utility",
    label: "Utility / Constraints",
    shortLabel: "Utility",
    tagline: "Global behaviour tweaks and guardrails.",
    description: "One-trade-at-a-time, daily caps, equity floors, onlyNewBar, emergency stops.",
    surface: "canvas",
    color: "#64748b",
    order: 180,
    icon: "Settings2",
  },
  // ────────────────────────── non-canvas ──────────────────────────
  protection: {
    family: "protection",
    label: "Protection & Licensing",
    shortLabel: "Protect",
    tagline: "Configuration on export — not trade logic.",
    description: "Account locks, expiry, broker locks, license-key checks. Appears in the Export wizard.",
    surface: "protection-config",
    color: "#dc2626",
    order: 200,
    icon: "Lock",
  },
  packaging: {
    family: "packaging",
    label: "Marketplace Packaging",
    shortLabel: "Package",
    tagline: "Listing bundle configuration.",
    description: "Listing profile, pricing model, preset risk bundles, changelog, docs.",
    surface: "packaging",
    color: "#7c3aed",
    order: 210,
    icon: "Package",
  },
};

export function familyOrder(): BlockFamily[] {
  return (Object.values(FAMILY_META) as FamilyMeta[])
    .sort((a, b) => a.order - b.order)
    .map((m) => m.family);
}

export function canvasFamilyOrder(): BlockFamily[] {
  return familyOrder().filter((f) => FAMILY_META[f].surface === "canvas");
}
