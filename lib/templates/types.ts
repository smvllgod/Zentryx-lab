// ──────────────────────────────────────────────────────────────────
// Strategy templates — types
// ──────────────────────────────────────────────────────────────────
// Templates ship as code (not DB rows) for V1. Catalog is the source
// of truth in `lib/templates/catalog.ts`; UI reads `TEMPLATE_LIST` to
// render cards and reads `getTemplateBySlug(slug)` to instantiate a
// real strategy from one.

import type { StrategyGraph, StrategyNode, StrategyEdge, Timeframe } from "@/lib/strategies/types";

export type TemplateCategory =
  | "trend"        // Trend-following
  | "mean-reversion"
  | "breakout"
  | "scalper"
  | "prop-firm"
  | "grid"         // Grid / basket
  | "martingale"   // High-risk recovery
  | "multi-tf"
  | "one-shot";    // Classic single-entry

export type TemplateDifficulty = "beginner" | "intermediate" | "advanced";
export type TemplateRisk = "low" | "medium" | "high" | "very-high";

export interface TemplateMeta {
  /** Stable slug used in URLs (e.g. "ema-cross-atr-exit"). */
  slug: string;
  /** Display name shown on cards. */
  name: string;
  /** Category for filtering. */
  category: TemplateCategory;
  /** Gives the user a difficulty hint. */
  difficulty: TemplateDifficulty;
  /** Risk profile badge. */
  risk: TemplateRisk;
  /** One-line pitch on cards. */
  tagline: string;
  /** Long-form description shown in the template modal. */
  description: string;
  /** Paragraphs explaining how the strategy trades — plain English. */
  howItWorks: string[];
  /** When the strategy tends to do well. */
  whenItWorks: string[];
  /** When it tends to struggle. */
  whenItFails: string[];
  /** Suggested symbols — rendered as chips. */
  recommendedSymbols: string[];
  /** Suggested timeframes. */
  recommendedTimeframes: Timeframe[];
  /** Minimum account balance the strategy is designed for (USD). */
  minBalanceUsd: number;
  /** Short "good to know" list (risk caveats, prerequisites). */
  caveats?: string[];
  /** Hex color used as accent on the card / badge (fallbacks to emerald). */
  accent?: string;
  /** Emoji icon shown on the card. */
  emoji: string;
  /** Set to true to mark a template as featured on the overview page. */
  featured?: boolean;
}

export interface Template extends TemplateMeta {
  /**
   * Pure factory returning a ready-to-save graph. Called when the user
   * clicks "Use this template" — we pass a fresh name and let the factory
   * stamp fresh node ids to avoid cross-strategy id collisions.
   */
  build(opts: { strategyName: string }): StrategyGraph;
}

export type BuiltNode = Omit<StrategyNode, "id"> & { idHint?: string };
export type BuiltEdge = Omit<StrategyEdge, "id"> & { sourceHint: string; targetHint: string };
