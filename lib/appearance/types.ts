// Zentryx Lab — EA visual appearance system
// ────────────────────────────────────────────────────────────────────
// This module defines the *visual layer* of an exported MT5 Expert
// Advisor. It is deliberately decoupled from trading logic (`lib/blocks`)
// and from export protection (`configs/protection.*`).
//
// Three concerns, three modules:
//   1. Trading logic     → lib/blocks/**            (what the EA does)
//   2. EA appearance     → lib/appearance/**        (how the panel looks)
//   3. Export protection → lib/blocks/configs/**    (where it may run)
//
// The source of truth is `VisualSchema` — a serialisable JSON object
// persisted with the strategy. The MQL5 renderer (lib/mql5/appearance-
// renderer.ts) converts that schema into OBJ_RECTANGLE_LABEL /
// OBJ_LABEL / OBJ_BITMAP_LABEL creation code that plugs into the
// existing `SectionContribution` pipeline.
//
// Controlled customisation only: the user picks a theme preset, toggles
// KPI modules, sets accent colour / position / size / corner. No
// arbitrary drag-and-drop of elements.

export type PanelCorner =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type PanelSize = "compact" | "standard" | "full";

// ────────────────────────────────────────────────────────────────────
// Themes
// ────────────────────────────────────────────────────────────────────

export type ThemeId =
  | "minimal-pro"
  | "institutional"
  | "modern-glass"
  | "classic-trader"
  | "dark-terminal"
  | "light-pro";

export type ThemePlan = "free" | "pro" | "creator";

/**
 * Colours are MQL5-friendly: stored as 0xBBGGRR hex (MQL5's native
 * representation for OBJPROP_COLOR / OBJPROP_BGCOLOR). We also keep a
 * CSS-friendly preview value for the React UI.
 */
export interface MqlColor {
  /** Preview hex `#RRGGBB` for the React UI. */
  css: string;
  /** MQL5 literal — `C'0x__,0x__,0x__'` compatible OR clrXxx constant. */
  mql: string;
}

export type HeaderStyle = "solid" | "bordered" | "minimal" | "accent-bar";
export type BorderStyle = "none" | "thin" | "thick" | "double";
export type FontFace = "Consolas" | "Arial" | "Tahoma" | "Verdana" | "Lucida Console";

/**
 * Typography hierarchy used by the renderer.
 *
 * `h1` — EA name / header title
 * `h2` — subtitle / section heads
 * `body` — KPI labels and values
 * `mono` — numeric values, tabular (price, lots, pnl)
 */
export interface ThemeTypography {
  h1: { font: FontFace; size: number; weight?: "regular" | "bold" };
  h2: { font: FontFace; size: number; weight?: "regular" | "bold" };
  body: { font: FontFace; size: number };
  mono: { font: FontFace; size: number };
}

/**
 * KPI emphasis rules — how aggressively the theme highlights numeric
 * values vs. labels. Drives the renderer's decision to use accent colour
 * on values, bold text, separator bars, etc.
 */
export type KpiEmphasis = "subtle" | "balanced" | "pronounced";

export interface ThemeLayoutRules {
  /** Default panel corner if none set by user. */
  defaultCorner: PanelCorner;
  /** Default panel size if none set by user. */
  defaultSize: PanelSize;
  /** Supported sizes for this theme. Some themes may restrict to certain sizes. */
  supportedSizes: PanelSize[];
  /** Padding (px) inside the panel. */
  padding: { x: number; y: number };
  /** Space between KPI rows (px). */
  moduleSpacing: number;
  /** Height of a KPI row at body font size (px). */
  rowHeight: number;
  /** Height of the header area (px). 0 = no header. */
  headerHeight: number;
  /** Height of the footer area (px). 0 = no footer. */
  footerHeight: number;
}

export interface ThemePalette {
  panelBg: MqlColor;              // panel background
  panelBorder: MqlColor;          // panel border / divider
  headerBg: MqlColor;             // header row background (if solid)
  headerText: MqlColor;           // header text
  bodyText: MqlColor;             // KPI label text
  valueText: MqlColor;            // KPI value text
  accent: MqlColor;               // theme accent (user may override)
  positive: MqlColor;             // green — positive pnl / trend-up
  negative: MqlColor;             // red — negative pnl / breach
  warning: MqlColor;              // amber — cooldown / budget-near-limit
  muted: MqlColor;                // very quiet secondary text
}

export interface ThemeDefinition {
  id: ThemeId;
  displayName: string;
  tagline: string;
  designIntent: string;           // one-paragraph rationale
  targetUser: string;             // persona / style fit
  plan: ThemePlan;
  palette: ThemePalette;
  typography: ThemeTypography;
  headerStyle: HeaderStyle;
  borderStyle: BorderStyle;
  kpiEmphasis: KpiEmphasis;
  layout: ThemeLayoutRules;
  recommendedModules: KpiModuleId[];
  compactModeSupported: boolean;
  mql5Notes: string;              // what this theme does / doesn't need
}

// ────────────────────────────────────────────────────────────────────
// KPI modules
// ────────────────────────────────────────────────────────────────────

export type KpiModuleId =
  | "eaName"
  | "status"
  | "symbol"
  | "timeframe"
  | "accountNumber"
  | "broker"
  | "spread"
  | "floatingPnl"
  | "dailyPnl"
  | "openTrades"
  | "riskMode"
  | "lotSize"
  | "dailyTarget"
  | "drawdownLimit"
  | "sessionStatus"
  | "newsFilterStatus"
  | "licenseStatus";

export type KpiColumnWidth = "auto" | "narrow" | "wide";
export type KpiValueKind = "text" | "number" | "price" | "pips" | "money" | "percent" | "status";

export interface KpiModuleDefinition {
  id: KpiModuleId;
  label: string;                   // shown on the panel
  description: string;             // admin / tooltip copy
  /** MQL5 expression returning a string for the value column. */
  mql5ValueExpr: string;
  valueKind: KpiValueKind;
  /**
   * Render priority. Higher comes first in the panel.
   * In compact mode, low-priority modules drop off first.
   */
  priority: number;
  defaultVisible: boolean;
  defaultCompact: boolean;         // included in compact mode by default
  /** Width hint — drives column sizing in grid layouts. */
  columnWidth: KpiColumnWidth;
  /**
   * Extra globals / helpers the module needs emitted once. Referenced
   * by `mql5ValueExpr`. Keep minimal.
   */
  mql5Requires?: string[];
  /** Only valid when the strategy contains specific block families. */
  requiresBlockFamily?: string[];
  plan?: ThemePlan;
}

// ────────────────────────────────────────────────────────────────────
// Visual schema
// ────────────────────────────────────────────────────────────────────

export interface Branding {
  eaName: string;
  subtitle?: string;
  creatorName?: string;
  versionLabel?: string;
}

export interface PanelLayoutConfig {
  corner: PanelCorner;
  /** Offset (px) from the chosen corner. */
  offset: { x: number; y: number };
  size: PanelSize;
  /** If true, render in compact mode regardless of panel size. */
  compact: boolean;
}

export interface VisualOverrides {
  /** Accent override (CSS / MQL pair). Overrides theme accent. */
  accent?: MqlColor;
  /** Hide the EA header row entirely. Default: false. */
  hideHeader?: boolean;
  /** Hide the footer row (creator / version). Default: false. */
  hideFooter?: boolean;
}

export interface VisualSchema {
  version: number;
  themeId: ThemeId;
  branding: Branding;
  layout: PanelLayoutConfig;
  /**
   * Per-module visibility. Any module not in this map uses its default.
   * Keys are `KpiModuleId`.
   */
  modules: Partial<Record<KpiModuleId, { visible: boolean }>>;
  overrides: VisualOverrides;
}

export const VISUAL_SCHEMA_VERSION = 1;

/** Default schema — Minimal Pro, top-right, standard size. */
export function defaultVisualSchema(eaName: string, creator?: string): VisualSchema {
  return {
    version: VISUAL_SCHEMA_VERSION,
    themeId: "minimal-pro",
    branding: {
      eaName,
      creatorName: creator,
      versionLabel: "v1.0",
    },
    layout: {
      corner: "top-right",
      offset: { x: 12, y: 12 },
      size: "standard",
      compact: false,
    },
    modules: {},
    overrides: {},
  };
}
