// Zentryx Lab — block-registry type surface.
// This is the single source of truth for every logic block in the product.
// Keep shapes wide enough to carry UI, validation, codegen, gating, and admin
// metadata without per-consumer re-declarations.

// ────────────────────────────────────────────────────────────────────
// Families
// ────────────────────────────────────────────────────────────────────
// 20 families — 18 canvas + 2 non-canvas configuration families.

export const BLOCK_FAMILIES = [
  "entry",
  "confirmation",
  "trend",
  "momentum",
  "volatility",
  "structure",
  "candles",
  "session",
  "news",
  "execution",
  "risk",
  "lot",
  "management",
  "exit",
  "basket",
  "grid",
  "mtf",
  "utility",
  "protection",
  "packaging",
] as const;
export type BlockFamily = (typeof BLOCK_FAMILIES)[number];

// ────────────────────────────────────────────────────────────────────
// Orthogonal enums
// ────────────────────────────────────────────────────────────────────

export const BLOCK_PLANS = ["free", "pro", "creator"] as const;
export type BlockPlan = (typeof BLOCK_PLANS)[number];

export const BLOCK_PRIORITIES = ["P1", "P2", "P3"] as const;
export type BlockPriority = (typeof BLOCK_PRIORITIES)[number];

export const BLOCK_COMPLEXITIES = ["basic", "intermediate", "advanced"] as const;
export type BlockComplexity = (typeof BLOCK_COMPLEXITIES)[number];

export const BLOCK_SURFACES = ["canvas", "export-config", "protection-config", "packaging"] as const;
export type BlockSurface = (typeof BLOCK_SURFACES)[number];

export const BLOCK_AFFECTS = ["entry", "filter", "risk", "management", "exit", "export"] as const;
export type BlockAffect = (typeof BLOCK_AFFECTS)[number];

export const BLOCK_STATUSES = ["active", "beta", "planned", "disabled"] as const;
export type BlockStatus = (typeof BLOCK_STATUSES)[number];

// ────────────────────────────────────────────────────────────────────
// Parameter schemas
// ────────────────────────────────────────────────────────────────────
// Discriminated union — each kind drives a different inspector control
// and a different slice of validation.

export type ParamKind =
  | "number"
  | "integer"
  | "string"
  | "boolean"
  | "select"
  | "multiSelect"
  | "time"
  | "timeframe"
  | "direction"
  | "symbol"
  | "csv"
  | "date";

export type ParamValue =
  | number
  | string
  | boolean
  | (string | number)[]
  | null;

export interface ParamOption {
  value: string | number;
  label: string;
  /** Hide this option behind a plan gate, e.g. "creator"-only timeframe. */
  plan?: BlockPlan;
}

export type ValidationRule =
  | { kind: "required"; message?: string }
  | { kind: "min"; value: number; message?: string }
  | { kind: "max"; value: number; message?: string }
  | { kind: "step"; value: number; message?: string }
  | { kind: "lessThan"; otherKey: string; message?: string }
  | { kind: "greaterThan"; otherKey: string; message?: string }
  | { kind: "oneOf"; values: (string | number)[]; message?: string }
  | { kind: "regex"; pattern: string; message?: string }
  | { kind: "custom"; ruleId: string; message?: string };

export interface BlockParamSpec {
  key: string;
  label: string;
  kind: ParamKind;
  default: ParamValue;
  description?: string;
  options?: ParamOption[];
  /** Flat validation rules; evaluated on every param change. */
  validation?: ValidationRule[];
  /** Displayed only — engine just treats the param as whatever `kind` dictates. */
  unit?: "pips" | "points" | "%" | "$" | "bars" | "min" | "hours" | "sec";
  /** Plan-gate a single parameter (e.g. `antiMartingale.multiplier` for Creator). */
  plan?: BlockPlan;
  /** Show only if another param equals a given value. Cheap conditional UI. */
  visibleWhen?: { key: string; equals: ParamValue };
  /** Tell the admin dashboard this param is advanced — collapsed by default. */
  advanced?: boolean;
}

// ────────────────────────────────────────────────────────────────────
// Block definition
// ────────────────────────────────────────────────────────────────────

export interface BlockAnalytics {
  /** Total times this block has been added to a strategy. */
  usageCount?: number;
  /** 0–100 rank among all blocks in its family. */
  popularity?: number;
  /** ISO-8601 — when the block definition last shipped. */
  lastUsedAt?: string;
}

export interface BlockDefinition {
  id: string;                                   // e.g. "trend.emaSlope" — unique
  slug: string;                                 // e.g. "ema-slope" — URL friendly
  family: BlockFamily;
  subcategory: string;                          // per-family grouping label
  displayName: string;
  shortDescription: string;                     // one-line
  longDescription: string;                      // inspector paragraph
  /**
   * Plain-English "why do I want this?" copy written for traders, not devs.
   * Shown in the node library tooltip + block-detail modal.
   */
  userExplanation: string;

  plan: BlockPlan;
  priority: BlockPriority;
  complexity: BlockComplexity;
  surface: BlockSurface;
  status: BlockStatus;

  affects: BlockAffect[];
  requiresMt5Indicator: boolean;
  producesCode: boolean;

  params: BlockParamSpec[];
  /** Compatible *families* — informational, used to build the node library filter. */
  compatibleWith?: BlockFamily[];
  /** Incompatible *families* — validator may warn on mixes. */
  incompatibleWith?: BlockFamily[];

  tags: string[];                               // search tags

  /** Optional — required feature flag(s) for the block to appear at all. */
  flags?: string[];

  /** Admin-controlled visibility override — admin dashboard writes here. */
  adminOverrides?: {
    forceHidden?: boolean;
    forcePlan?: BlockPlan;
    forceStatus?: BlockStatus;
  };

  analytics?: BlockAnalytics;

  /** ISO-8601 of when this definition was last edited. For admin audit logs. */
  updatedAt?: string;
}

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

export function isCanvasBlock(b: BlockDefinition): boolean {
  return b.surface === "canvas";
}

export function isConfigBlock(b: BlockDefinition): boolean {
  return b.surface !== "canvas";
}
