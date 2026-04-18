import type { ThemeDefinition, MqlColor } from "./types";

// ────────────────────────────────────────────────────────────────────
// Theme registry — 6 professional presets.
// Each theme is designed for MT5 chart-object rendering constraints:
// solid fills, bordered rectangles, OBJ_LABEL text, integer pixel
// positioning, no gradients, no semi-transparency, no shadows.
// ────────────────────────────────────────────────────────────────────

// Helper for type-safe color literals.
const c = (css: string, mql: string): MqlColor => ({ css, mql });

// ────────────────────────────────────────────────────────────────────
// Minimal Pro — free default
// ────────────────────────────────────────────────────────────────────
const MINIMAL_PRO: ThemeDefinition = {
  id: "minimal-pro",
  displayName: "Minimal Pro",
  tagline: "Clean panel. Quiet chrome. Emerald accent.",
  designIntent:
    "Flat white-on-dark with a single emerald accent line. Designed to be readable over any chart background without fighting price action. Uses minimal border chrome so the KPIs feel like metadata, not decoration.",
  targetUser: "Daytraders who keep charts busy and want the EA panel to disappear when they're reading price.",
  plan: "free",
  palette: {
    panelBg:    c("#0F1412", "C'15,20,18'"),
    panelBorder: c("#1C2420", "C'28,36,32'"),
    headerBg:   c("#0F1412", "C'15,20,18'"),
    headerText: c("#FFFFFF", "clrWhite"),
    bodyText:   c("#9AA3A0", "C'154,163,160'"),
    valueText:  c("#FFFFFF", "clrWhite"),
    accent:     c("#10B981", "C'16,185,129'"),
    positive:   c("#10B981", "C'16,185,129'"),
    negative:   c("#EF4444", "C'239,68,68'"),
    warning:    c("#F59E0B", "C'245,158,11'"),
    muted:      c("#4B5350", "C'75,83,80'"),
  },
  typography: {
    h1:   { font: "Arial",    size: 11, weight: "bold" },
    h2:   { font: "Arial",    size: 9,  weight: "regular" },
    body: { font: "Arial",    size: 9 },
    mono: { font: "Consolas", size: 9 },
  },
  headerStyle: "minimal",
  borderStyle: "thin",
  kpiEmphasis: "subtle",
  layout: {
    defaultCorner: "top-right",
    defaultSize: "standard",
    supportedSizes: ["compact", "standard", "full"],
    padding: { x: 10, y: 8 },
    moduleSpacing: 3,
    rowHeight: 14,
    headerHeight: 22,
    footerHeight: 14,
  },
  recommendedModules: [
    "eaName", "status", "symbol", "timeframe",
    "floatingPnl", "dailyPnl", "openTrades",
    "spread", "sessionStatus",
  ],
  compactModeSupported: true,
  mql5Notes:
    "Uses OBJ_RECTANGLE_LABEL with a 1-px border, solid fills. No bitmap objects. Font sizes kept at 9–11 for consistent rendering on all DPI.",
};

// ────────────────────────────────────────────────────────────────────
// Institutional — pro
// ────────────────────────────────────────────────────────────────────
const INSTITUTIONAL: ThemeDefinition = {
  id: "institutional",
  displayName: "Institutional",
  tagline: "Bloomberg-style data grid.",
  designIntent:
    "High-density numeric grid inspired by institutional terminals. Uppercase labels, strict tabular figures, cold palette. Designed to look authoritative on a prop-firm challenge account.",
  targetUser: "Prop-firm traders and creators selling serious-looking systems.",
  plan: "pro",
  palette: {
    panelBg:    c("#0A0E1A", "C'10,14,26'"),
    panelBorder: c("#1E2538", "C'30,37,56'"),
    headerBg:   c("#121828", "C'18,24,40'"),
    headerText: c("#E5E7EB", "C'229,231,235'"),
    bodyText:   c("#8B93A7", "C'139,147,167'"),
    valueText:  c("#F8FAFC", "C'248,250,252'"),
    accent:     c("#3B82F6", "C'59,130,246'"),
    positive:   c("#22C55E", "C'34,197,94'"),
    negative:   c("#EF4444", "C'239,68,68'"),
    warning:    c("#EAB308", "C'234,179,8'"),
    muted:      c("#4B5367", "C'75,83,103'"),
  },
  typography: {
    h1:   { font: "Tahoma",   size: 11, weight: "bold" },
    h2:   { font: "Tahoma",   size: 9,  weight: "regular" },
    body: { font: "Tahoma",   size: 9 },
    mono: { font: "Consolas", size: 10 },
  },
  headerStyle: "solid",
  borderStyle: "thin",
  kpiEmphasis: "pronounced",
  layout: {
    defaultCorner: "top-right",
    defaultSize: "full",
    supportedSizes: ["standard", "full"],
    padding: { x: 12, y: 10 },
    moduleSpacing: 4,
    rowHeight: 16,
    headerHeight: 26,
    footerHeight: 18,
  },
  recommendedModules: [
    "eaName", "status", "symbol", "timeframe",
    "accountNumber", "broker", "spread",
    "floatingPnl", "dailyPnl", "openTrades",
    "riskMode", "lotSize",
    "dailyTarget", "drawdownLimit",
    "sessionStatus", "newsFilterStatus", "licenseStatus",
  ],
  compactModeSupported: false,   // density is the point — no compact
  mql5Notes:
    "Solid-fill header with border. All numeric values rendered in Consolas 10 for tabular alignment. Heavy — not recommended under standard size.",
};

// ────────────────────────────────────────────────────────────────────
// Modern Glass — pro
// ────────────────────────────────────────────────────────────────────
// NB: MT5 has no real transparency on OBJ_RECTANGLE_LABEL. We simulate
// the "glass" look with a dark navy panel + subtle light-blue accents
// + thin inner border. It reads as "frosted" over dark chart themes.
const MODERN_GLASS: ThemeDefinition = {
  id: "modern-glass",
  displayName: "Modern Glass",
  tagline: "Dark navy with soft cyan accents.",
  designIntent:
    "Pseudo-glass look — deep navy base with thin inset border and a cyan accent. Reads best on dark chart templates. No real transparency (MQL5 rectangle objects don't support alpha) — we cheat with colour harmony.",
  targetUser: "Modern traders / content creators whose streams are dark-themed.",
  plan: "pro",
  palette: {
    panelBg:    c("#0B1220", "C'11,18,32'"),
    panelBorder: c("#233148", "C'35,49,72'"),
    headerBg:   c("#0F1830", "C'15,24,48'"),
    headerText: c("#E0F2FE", "C'224,242,254'"),
    bodyText:   c("#9BB0C6", "C'155,176,198'"),
    valueText:  c("#FFFFFF", "clrWhite"),
    accent:     c("#22D3EE", "C'34,211,238'"),
    positive:   c("#34D399", "C'52,211,153'"),
    negative:   c("#F87171", "C'248,113,113'"),
    warning:    c("#FBBF24", "C'251,191,36'"),
    muted:      c("#5A6B82", "C'90,107,130'"),
  },
  typography: {
    h1:   { font: "Verdana",  size: 11, weight: "bold" },
    h2:   { font: "Verdana",  size: 9,  weight: "regular" },
    body: { font: "Verdana",  size: 9 },
    mono: { font: "Consolas", size: 9 },
  },
  headerStyle: "accent-bar",
  borderStyle: "thin",
  kpiEmphasis: "balanced",
  layout: {
    defaultCorner: "top-right",
    defaultSize: "standard",
    supportedSizes: ["compact", "standard", "full"],
    padding: { x: 12, y: 10 },
    moduleSpacing: 4,
    rowHeight: 15,
    headerHeight: 24,
    footerHeight: 16,
  },
  recommendedModules: [
    "eaName", "status", "symbol", "timeframe",
    "floatingPnl", "dailyPnl", "openTrades",
    "riskMode", "sessionStatus", "newsFilterStatus",
  ],
  compactModeSupported: true,
  mql5Notes:
    "Accent bar above header = a 2-px tall RECTANGLE_LABEL in accent colour. No bitmaps. No gradients. Works best against dark chart backgrounds — keep a muted preview so users don't pick it on white charts.",
};

// ────────────────────────────────────────────────────────────────────
// Classic Trader — free
// ────────────────────────────────────────────────────────────────────
const CLASSIC_TRADER: ThemeDefinition = {
  id: "classic-trader",
  displayName: "Classic Trader",
  tagline: "Warm creams and charcoal — old-school trading desk.",
  designIntent:
    "Warm parchment panel with charcoal text — the feel of a classic MT4 indicator. Intentionally understated. Emphasises the EA name and PnL; everything else is secondary.",
  targetUser: "Traditionalists and MT4→MT5 migrants who dislike neon themes.",
  plan: "free",
  palette: {
    panelBg:    c("#F2EEDE", "C'242,238,222'"),
    panelBorder: c("#9C8F70", "C'156,143,112'"),
    headerBg:   c("#E6DFCB", "C'230,223,203'"),
    headerText: c("#1F2937", "C'31,41,55'"),
    bodyText:   c("#4B5563", "C'75,85,99'"),
    valueText:  c("#111827", "C'17,24,39'"),
    accent:     c("#B45309", "C'180,83,9'"),
    positive:   c("#166534", "C'22,101,52'"),
    negative:   c("#991B1B", "C'153,27,27'"),
    warning:    c("#B45309", "C'180,83,9'"),
    muted:      c("#8A8778", "C'138,135,120'"),
  },
  typography: {
    h1:   { font: "Tahoma", size: 12, weight: "bold" },
    h2:   { font: "Tahoma", size: 9,  weight: "regular" },
    body: { font: "Tahoma", size: 9 },
    mono: { font: "Lucida Console", size: 9 },
  },
  headerStyle: "bordered",
  borderStyle: "double",
  kpiEmphasis: "balanced",
  layout: {
    defaultCorner: "top-left",
    defaultSize: "standard",
    supportedSizes: ["compact", "standard"],
    padding: { x: 12, y: 10 },
    moduleSpacing: 4,
    rowHeight: 16,
    headerHeight: 26,
    footerHeight: 16,
  },
  recommendedModules: [
    "eaName", "status", "symbol", "timeframe",
    "floatingPnl", "openTrades", "lotSize", "sessionStatus",
  ],
  compactModeSupported: true,
  mql5Notes:
    "Double border = two RECTANGLE_LABELs offset by 1 px. Light palette — avoid choosing this on dark chart templates (the UI preview should warn).",
};

// ────────────────────────────────────────────────────────────────────
// Dark Terminal — pro
// ────────────────────────────────────────────────────────────────────
const DARK_TERMINAL: ThemeDefinition = {
  id: "dark-terminal",
  displayName: "Dark Terminal",
  tagline: "Monospace. Phosphor green. All business.",
  designIntent:
    "A console/terminal aesthetic — pure black panel, phosphor-green accent, monospace body. Reads like a trading terminal, not a dashboard. Uses uppercase labels only.",
  targetUser: "Algorithmic traders and quants who want the EA to look like a log stream.",
  plan: "pro",
  palette: {
    panelBg:    c("#000000", "clrBlack"),
    panelBorder: c("#143322", "C'20,51,34'"),
    headerBg:   c("#030806", "C'3,8,6'"),
    headerText: c("#34D399", "C'52,211,153'"),
    bodyText:   c("#6EE7B7", "C'110,231,183'"),
    valueText:  c("#A7F3D0", "C'167,243,208'"),
    accent:     c("#10B981", "C'16,185,129'"),
    positive:   c("#34D399", "C'52,211,153'"),
    negative:   c("#F87171", "C'248,113,113'"),
    warning:    c("#FACC15", "C'250,204,21'"),
    muted:      c("#065F46", "C'6,95,70'"),
  },
  typography: {
    h1:   { font: "Consolas", size: 11, weight: "bold" },
    h2:   { font: "Consolas", size: 9,  weight: "regular" },
    body: { font: "Consolas", size: 9 },
    mono: { font: "Consolas", size: 9 },
  },
  headerStyle: "minimal",
  borderStyle: "thin",
  kpiEmphasis: "pronounced",
  layout: {
    defaultCorner: "top-left",
    defaultSize: "standard",
    supportedSizes: ["compact", "standard", "full"],
    padding: { x: 10, y: 8 },
    moduleSpacing: 2,
    rowHeight: 13,
    headerHeight: 20,
    footerHeight: 12,
  },
  recommendedModules: [
    "eaName", "status", "symbol", "timeframe",
    "floatingPnl", "dailyPnl", "openTrades",
    "spread", "riskMode", "sessionStatus", "licenseStatus",
  ],
  compactModeSupported: true,
  mql5Notes:
    "All text Consolas. Uppercase transformation applied at render-time (the MQL5 renderer ToUpper()s labels for this theme). Minimal border.",
};

// ────────────────────────────────────────────────────────────────────
// Light Pro — free
// ────────────────────────────────────────────────────────────────────
const LIGHT_PRO: ThemeDefinition = {
  id: "light-pro",
  displayName: "Light Pro",
  tagline: "Soft white panel with brand accent.",
  designIntent:
    "Clean neutral white with a single accent column. Reads well on light chart templates (white or off-white backgrounds) — the opposite companion to Dark Terminal.",
  targetUser: "Traders with light chart templates; content creators with bright studio setups.",
  plan: "free",
  palette: {
    panelBg:    c("#FFFFFF", "clrWhite"),
    panelBorder: c("#E2E8F0", "C'226,232,240'"),
    headerBg:   c("#F8FAFC", "C'248,250,252'"),
    headerText: c("#0F172A", "C'15,23,42'"),
    bodyText:   c("#64748B", "C'100,116,139'"),
    valueText:  c("#0F172A", "C'15,23,42'"),
    accent:     c("#10B981", "C'16,185,129'"),
    positive:   c("#059669", "C'5,150,105'"),
    negative:   c("#DC2626", "C'220,38,38'"),
    warning:    c("#D97706", "C'217,119,6'"),
    muted:      c("#94A3B8", "C'148,163,184'"),
  },
  typography: {
    h1:   { font: "Arial",    size: 11, weight: "bold" },
    h2:   { font: "Arial",    size: 9,  weight: "regular" },
    body: { font: "Arial",    size: 9 },
    mono: { font: "Consolas", size: 9 },
  },
  headerStyle: "bordered",
  borderStyle: "thin",
  kpiEmphasis: "subtle",
  layout: {
    defaultCorner: "top-right",
    defaultSize: "standard",
    supportedSizes: ["compact", "standard", "full"],
    padding: { x: 11, y: 9 },
    moduleSpacing: 3,
    rowHeight: 15,
    headerHeight: 22,
    footerHeight: 14,
  },
  recommendedModules: [
    "eaName", "status", "symbol", "timeframe",
    "floatingPnl", "dailyPnl", "openTrades",
    "spread", "riskMode", "sessionStatus",
  ],
  compactModeSupported: true,
  mql5Notes:
    "Light palette. Avoid choosing with a dark chart template (the UI warns). Thin 1-px borders. Accent column drawn as a narrow RECTANGLE_LABEL on the left edge.",
};

// ────────────────────────────────────────────────────────────────────
// Registry
// ────────────────────────────────────────────────────────────────────

export const THEME_REGISTRY: Record<import("./types").ThemeId, ThemeDefinition> = {
  "minimal-pro":     MINIMAL_PRO,
  "institutional":   INSTITUTIONAL,
  "modern-glass":    MODERN_GLASS,
  "classic-trader":  CLASSIC_TRADER,
  "dark-terminal":   DARK_TERMINAL,
  "light-pro":       LIGHT_PRO,
};

export const ALL_THEMES: ThemeDefinition[] = [
  MINIMAL_PRO, LIGHT_PRO, CLASSIC_TRADER,    // free tier
  INSTITUTIONAL, DARK_TERMINAL, MODERN_GLASS, // pro tier
];

export function getTheme(id: import("./types").ThemeId): ThemeDefinition {
  return THEME_REGISTRY[id];
}
