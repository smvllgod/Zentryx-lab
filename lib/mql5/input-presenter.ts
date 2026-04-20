// ──────────────────────────────────────────────────────────────────
// MT5 Input presenter — packages raw input declarations into a
// sectioned, professional-looking parameter block.
// ──────────────────────────────────────────────────────────────────
// The generator (`template.ts`) no longer emits a flat list of inputs.
// It feeds the merged `InputDecl[]` to `presentInputs()`, which:
//   1. Classifies each input into one of 13 sections (STRATEGY CORE,
//      ENTRY LOGIC, RISK MANAGEMENT, …) using an explicit stem→section
//      map with regex fallbacks — no emoji because MT5's Parameters
//      tab doesn't render them reliably.
//   2. Cleans up the user-facing `// label` comment (capitalisation,
//      em-dash subcategories, normalised units).
//   3. Orders within each section: bools first, then numeric (period
//      → multiplier → bounds), strings last, hints at the bottom.
//   4. Emits a native `input group "━━━ SECTION ━━━"` separator (MT5
//      build 2940+) — this is what creates collapsible headers in the
//      broker's Parameters tab.
//
// Three presets control density/branding:
//   - professional    : sober ASCII separators, clean labels (default)
//   - premium_seller  : heavier separators, populated PRODUCT INFO
//   - institutional   : minimal, technical labels, no PRODUCT INFO
//
// Extensibility: each translator can optionally stamp its inputs with
// an explicit `section` field; when absent, `inferSection()` picks the
// right section by stem + nodeType. The explicit path is the escape
// hatch for inputs that defy the heuristics (e.g. product metadata).
// ──────────────────────────────────────────────────────────────────

import type { InputDecl } from "./types";

export type InputSection =
  | "product_info"
  | "license"
  | "strategy_core"
  | "entry_logic"
  | "filters"
  | "risk_management"
  | "sl_tp"
  | "be_partial"
  | "trailing"
  | "session_news"
  | "execution"
  | "advanced"
  | "dashboard";

export type PresenterPreset = "professional" | "premium_seller" | "institutional";

/** InputDecl + optional metadata the presenter uses. Backwards-compatible
 * with plain InputDecl — fields are all optional. */
export interface SectionedInput extends InputDecl {
  /** Explicit section; when omitted, inferred from name + nodeType. */
  section?: InputSection;
  /** Purely informational (read-only intent) — renders at the bottom
   *  of its section and the label is prefixed with "ℹ". */
  hint?: boolean;
  /** Node type the input belongs to (set by the assembler from each
   *  contribution). Used by `inferSection()` when `section` is unset. */
  nodeType?: string;
  /** 0 = default; negative pulls to top of section; positive pushes
   *  to bottom. Used for the few cases where stem-order is wrong. */
  orderHint?: number;
}

export interface PresentInputsOptions {
  preset?: PresenterPreset;
  product?: {
    name?: string;
    version?: string;
    vendor?: string;
    supportUrl?: string;
  };
  /** Compact mode hides empty sections and collapses PRODUCT INFO. */
  compact?: boolean;
}

// ──────────────────────────────────────────────────────────────────
// Section ordering + titles
// ──────────────────────────────────────────────────────────────────

const SECTION_ORDER: Record<InputSection, number> = {
  product_info: 1,
  license: 2,
  strategy_core: 3,
  entry_logic: 4,
  filters: 5,
  risk_management: 6,
  sl_tp: 7,
  be_partial: 8,
  trailing: 9,
  session_news: 10,
  execution: 11,
  advanced: 12,
  dashboard: 13,
};

const SECTION_TITLES: Record<InputSection, string> = {
  product_info: "PRODUCT INFO",
  license: "LICENSE",
  strategy_core: "STRATEGY CORE",
  entry_logic: "ENTRY LOGIC",
  filters: "FILTERS",
  risk_management: "RISK MANAGEMENT",
  sl_tp: "STOP LOSS / TAKE PROFIT",
  be_partial: "BREAK EVEN / PARTIAL CLOSE",
  trailing: "TRAILING STOP",
  session_news: "SESSION / NEWS FILTERS",
  execution: "EXECUTION CONTROLS",
  advanced: "ADVANCED OPTIONS",
  dashboard: "VISUAL DASHBOARD",
};

// ──────────────────────────────────────────────────────────────────
// Stem → section map (authoritative when present)
// ──────────────────────────────────────────────────────────────────
// Keys are the literal stem of the input name before the `_${sid}`
// suffix. Matching is exact; the presenter strips the hash suffix
// before lookup. When the stem isn't listed, `inferSection()` falls
// back to nodeType-based inference.

const STEM_TO_SECTION: Record<string, InputSection> = {
  // ── Strategy core (hardcoded in template.ts, but listed for clarity)
  InpSymbolHint: "strategy_core",
  InpTimeframe: "strategy_core",
  InpMagic: "strategy_core",
  InpTradeComment: "strategy_core",

  // ── Product info (populated by the product block)
  InpProductName: "product_info",
  InpProductVersion: "product_info",
  InpProductVendor: "product_info",
  InpSupportUrl: "product_info",
  InpProductDesc: "product_info",

  // ── Telemetry lives with execution controls
  InpTelemetryUrl: "execution",
  InpTelemetryToken: "execution",
  InpTelemetryOn: "execution",

  // ── ENTRY LOGIC — moving-average / indicator-cross entries
  InpFast: "entry_logic",
  InpSlow: "entry_logic",
  InpFastSma: "entry_logic",
  InpSlowSma: "entry_logic",
  InpEmaAlignF: "entry_logic",
  InpEmaAlignM: "entry_logic",
  InpEmaAlignS: "entry_logic",
  InpMacdFast: "entry_logic",
  InpMacdSlow: "entry_logic",
  InpMacdSig: "entry_logic",
  InpMacdSideF: "entry_logic",
  InpMacdSideS: "entry_logic",
  InpMacdSideG: "entry_logic",
  InpMzcF: "entry_logic",
  InpMzcS: "entry_logic",
  InpRsiCrP: "entry_logic",
  InpStExK: "entry_logic",
  InpAdxCrP: "entry_logic",
  InpAdxCrT: "entry_logic",
  InpIkcT: "entry_logic",
  InpIkcK: "entry_logic",
  InpIkcS: "entry_logic",
  InpBbBrP: "entry_logic",
  InpBbBrD: "entry_logic",
  InpBbMrP: "entry_logic",
  InpBbMrD: "entry_logic",
  InpNbP: "entry_logic",
  InpAtrBrP: "entry_logic",
  InpAtrBrM: "entry_logic",
  InpDon: "entry_logic",
  InpSbStart: "entry_logic",
  InpSbEnd: "entry_logic",
  InpSrL: "entry_logic",
  InpTlL: "entry_logic",
  InpPinR: "entry_logic",
  InpPinB: "entry_logic",
  InpDojiB: "entry_logic",
  InpMrbW: "entry_logic",
  InpRfMin: "entry_logic",
  InpRfMax: "entry_logic",
  InpMsMin: "entry_logic",
  InpShhL: "entry_logic",
  InpSllL: "entry_logic",
  InpBosL: "entry_logic",
  InpChochL: "entry_logic",
  InpFrAge: "entry_logic",
  InpSrP: "entry_logic",
  InpSdL: "entry_logic",
  InpObL: "entry_logic",
  InpFvgL: "entry_logic",
  InpRnP: "entry_logic",

  // ── FILTERS — indicator-band filters, trend/volatility filters
  InpAdxP: "filters",
  InpAdxMin: "filters",
  InpAtrBP: "filters",
  InpAtrBLo: "filters",
  InpAtrBHi: "filters",
  InpAtrMin: "filters",
  InpAtrMax: "filters",
  InpAtrPeriod: "filters",
  InpAtrAbvP: "filters",
  InpAtrAbvM: "filters",
  InpPvMaP: "filters",
  InpVabP: "filters",
  InpVabLo: "filters",
  InpVabHi: "filters",
  InpCciBandP: "filters",
  InpCciBandLo: "filters",
  InpCciBandHi: "filters",
  InpHtfRsiP: "filters",
  InpRocP: "filters",
  InpConfP: "filters",
  InpBarClr: "filters",

  // ── RISK MANAGEMENT
  InpArRisk: "risk_management",
  InpArP: "risk_management",
  InpArM: "risk_management",
  InpFcCash: "risk_management",
  InpDsBase: "risk_management",
  InpDsFloor: "risk_management",
  InpDsDd: "risk_management",
  InpEcMa: "risk_management",
  InpKelly: "risk_management",
  InpKellyLook: "risk_management",
  InpWkBud: "risk_management",
  InpFixedRisk: "risk_management",
  InpRiskPercent: "risk_management",
  InpLotPct: "risk_management",
  InpLotPerBal: "risk_management",
  InpLotPerBalMin: "risk_management",
  InpFixedLot: "risk_management",
  InpFixedLots: "risk_management",
  InpCashRisk: "risk_management",
  InpFrBase: "risk_management",
  InpFrDelta: "risk_management",
  InpAmBase: "risk_management",
  InpAmMult: "risk_management",
  InpAmMax: "risk_management",
  InpMtBase: "risk_management",
  InpMtMult: "risk_management",
  InpMtSteps: "risk_management",
  InpVsRisk: "risk_management",
  InpVsP: "risk_management",
  InpEtT1: "risk_management",
  InpEtL1: "risk_management",
  InpEtT2: "risk_management",
  InpEtL2: "risk_management",
  InpEtT3: "risk_management",
  InpEtL3: "risk_management",
  InpDailyRiskBudget: "risk_management",
  InpMaxDailyLossPct: "risk_management",
  InpMaxDailyTrades: "risk_management",
  InpWkLoss: "risk_management",
  InpMclN: "risk_management",
  InpEqTgt: "risk_management",
  InpEmgDd: "risk_management",
  InpEmgFloor: "risk_management",
  InpEqFloor: "risk_management",
  InpMlMin: "risk_management",

  // ── STOP LOSS / TAKE PROFIT
  InpTpPips: "sl_tp",
  InpSlPips: "sl_tp",
  InpAtrExP: "sl_tp",
  InpAtrExSl: "sl_tp",
  InpAtrExTp: "sl_tp",
  InpRrSl: "sl_tp",
  InpRrRatio: "sl_tp",

  // ── BREAK EVEN / PARTIAL CLOSE
  InpBeTrigger: "be_partial",
  InpBeOffset: "be_partial",
  InpBeAtrP: "be_partial",
  InpBeAtrM: "be_partial",
  InpPartTp: "be_partial",
  InpPartPct: "be_partial",
  InpPcaP: "be_partial",
  InpPcaM: "be_partial",
  InpPcaPct: "be_partial",
  InpSmartOff: "be_partial",

  // ── TRAILING STOP
  InpAtrTrailP: "trailing",
  InpAtrTrailM: "trailing",
  InpChP: "trailing",
  InpChM: "trailing",
  InpPtPct: "trailing",
  InpStStep: "trailing",

  // ── SESSION / NEWS FILTERS
  InpLonOff: "session_news",
  InpLndOff: "session_news",
  InpNyOff: "session_news",
  InpAsiaOff: "session_news",
  InpOvpOff: "session_news",
  InpCwStart: "session_news",
  InpCwEnd: "session_news",
  InpSessionStart: "session_news",
  InpSessionEnd: "session_news",
  InpDowMask: "session_news",
  InpMoyMask: "session_news",
  InpHolDays: "session_news",
  InpEodHour: "session_news",
  InpNewsCsv: "session_news",
  InpNewsBef: "session_news",
  InpNewsAft: "session_news",
  InpNewsHi: "session_news",
  InpNewsCur: "session_news",
  InpNewsCbCsv: "session_news",
  InpNewsCbMin: "session_news",
  InpMacroNews: "session_news",
  InpMacroCsv: "session_news",
  InpNewsFeed: "session_news",

  // ── EXECUTION CONTROLS
  InpMaxSpread: "execution",
  InpUmSpr: "execution",
  InpExSpr: "execution",
  InpSlipPts: "execution",
  InpSymWl: "execution",
  InpMaxOpenPositions: "execution",
  InpCdSlM: "execution",
  InpCdTpM: "execution",
  InpRcMin: "execution",
  InpMinRange: "execution",

  // ── ADVANCED OPTIONS (grids, baskets, hedges, pyramiding)
  InpBkTp: "advanced",
  InpBkSl: "advanced",
  InpBkTpPct: "advanced",
  InpBkSlPct: "advanced",
  InpBkEmg: "advanced",
  InpBkGrp: "advanced",
  InpLipTrg: "advanced",
  InpLipLck: "advanced",
  InpCorrMax: "advanced",
  InpMagicScope: "advanced",
  InpGbStep: "advanced",
  InpGbMax: "advanced",
  InpGbMul: "advanced",
  InpGaP: "advanced",
  InpGaM: "advanced",
  InpGaMax: "advanced",
  InpGmStep: "advanced",
  InpGmMul: "advanced",
  InpGmMax: "advanced",
  InpAntiGrid: "advanced",
  InpPgStep: "advanced",
  InpAvgStep: "advanced",
  InpHrDd: "advanced",
  InpSgcTgt: "advanced",
  InpPyStep: "advanced",
  InpPyMax: "advanced",
  InpHdgDd: "advanced",
};

// ──────────────────────────────────────────────────────────────────
// Section inference
// ──────────────────────────────────────────────────────────────────

/**
 * Inputs declared by translators have a stem + a `_${sid}` disambiguator
 * suffix (6 chars of alnum). Strip it to recover the canonical stem.
 */
function stemOf(name: string): string {
  const m = /^(Inp[A-Za-z0-9]+?)(?:_[A-Za-z0-9]{1,12})?$/.exec(name);
  return m?.[1] ?? name;
}

/**
 * Resolve a section for an input. Order of precedence:
 *   1. Explicit `section` on the input
 *   2. Stem match against STEM_TO_SECTION
 *   3. nodeType prefix (entry.* → entry_logic, risk.* → risk_management, …)
 *   4. Last-resort "execution" bucket
 */
export function inferSection(input: SectionedInput): InputSection {
  if (input.section) return input.section;

  const stem = stemOf(input.name);
  const hit = STEM_TO_SECTION[stem];
  if (hit) return hit;

  const t = input.nodeType ?? "";
  if (t.startsWith("entry.") || t.startsWith("confirm.") || t.startsWith("candle.") || t.startsWith("struct."))
    return "entry_logic";
  if (t.startsWith("filter.") || t.startsWith("trend.") || t.startsWith("momentum.") || t.startsWith("mtf.") || t.startsWith("vol."))
    return "filters";
  if (t.startsWith("session.") || t.startsWith("news."))
    return "session_news";
  if (t.startsWith("risk.") || t.startsWith("lot.")) return "risk_management";
  if (t === "exit.fixedTpSl" || t === "exit.atrBased" || t === "exit.rrBased") return "sl_tp";
  if (t === "exit.breakEven" || t === "manage.partialClose" || t === "manage.partialCloseAtr" || t === "manage.convertToBreakEven" || t === "manage.breakEvenAtrMulti")
    return "be_partial";
  if (t === "exit.trailingStop" || t === "manage.trailingStopAtr" || t === "manage.chandelierTrail" || t === "manage.percentTrail" || t === "manage.stepTrail")
    return "trailing";
  if (t === "exit.endOfDay") return "session_news";
  if (t === "exit.equityTargetExit" || t === "utility.emergencyStop") return "risk_management";
  if (t.startsWith("grid.") || t.startsWith("basket.")) return "advanced";
  if (t === "manage.pyramiding" || t === "manage.antiPyramiding" || t === "manage.hedgeAgainstDd")
    return "advanced";
  if (t.startsWith("exec.") || t.startsWith("utility.")) return "execution";

  return "execution";
}

// ──────────────────────────────────────────────────────────────────
// Label cleanup
// ──────────────────────────────────────────────────────────────────

/** Tokens the cleaner treats as always-uppercase (abbreviations).
 *  Never add lowercase-by-convention units like "pips", "points",
 *  "bars", "min", "hours" — those are unit words that should stay
 *  lower-case even inside parens. */
const CAPS_WORDS = new Set([
  "ATR", "ADX", "RSI", "MA", "EMA", "SMA", "MACD", "CCI", "BB", "HTF", "MTF",
  "TP", "SL", "BE", "DD", "DOW", "EOD", "NY", "CSV", "UTC", "BOS", "CHOCH",
  "FVG", "S/R", "S/D", "UI", "EA", "P/L", "R/R", "RR", "URL",
]);

/** Unit words — always kept lowercase even when they appear as a
 *  bare token outside parens, which can happen in malformed labels.
 *  Restricted to unambiguous trading units only. Words like "hour",
 *  "hours", "minutes", "min", "max", "days" are descriptors far more
 *  often than units, so they title-case normally. */
const LOWER_WORDS = new Set([
  "pips", "points", "bars", "ticks", "lots", "pts",
]);

/** Parenthesised suffixes that are UNITS (keep parens) vs. SUBCATEGORIES
 *  (convert to em-dash). Anything not matching either list is kept as-is. */
const UNIT_PATTERNS = [
  /\(pips\)$/i,
  /\(points\)$/i,
  /\(%\)$/i,
  /\(\$\)$/i,
  /\(min\)$/i,
  /\(bars\)$/i,
  /\(h\)$/i,
  /\(hours\)$/i,
  /\(minutes\)$/i,
  /\(seconds\)$/i,
  /\(× ATR\)$/i,
  /\(x ATR\)$/i,
  /\(CSV\)$/i,
];

/**
 * Titlecase a label while preserving known abbreviations in full caps.
 * Examples:
 *   "ATR period (risk)"          → "ATR Period — Risk"
 *   "Min ADX"                    → "Min ADX"
 *   "risk %"                     → "Risk (%)"
 *   "Close portion (%)"          → "Close Portion (%)"
 *   "ATR multiplier (SL distance)" → "ATR Multiplier — SL Distance"
 *   "Trail (%)"                  → "Trail (%)"
 *   "Grid lot ×"                 → "Grid Lot (×)"
 */
export function cleanLabel(raw: string): string {
  let s = raw.trim();
  if (!s) return s;

  // 1. Normalise the stray "× at end" → "(× ATR)" when ATR is implied,
  //    otherwise "(×)".
  s = s.replace(/\s*×\s*ATR\s*$/i, " (× ATR)");
  s = s.replace(/\s+×\s*$/g, " (×)");
  s = s.replace(/\s*x\s*ATR\s*$/i, " (× ATR)");

  // 2. Convert subcategory parens to em-dash. Heuristic: if the paren
  //    content is NOT a known unit pattern AND doesn't look like a
  //    format/data example (dots, colons, commas, quotes, digits),
  //    treat it as a subcategory label and promote to em-dash.
  //    Long paren content (>20 chars) stays — it's almost always a
  //    format hint like "yyyy.mm.dd hh:mm,high;..."
  const parenMatch = /\(([^()]+)\)\s*$/.exec(s);
  if (parenMatch) {
    const full = parenMatch[0];
    const inner = parenMatch[1].trim();
    const isUnit = UNIT_PATTERNS.some((p) => p.test(full));
    const looksLikeFormat = /[.,:;"'\\%]|\d/.test(inner);
    const tooLong = inner.length > 20;
    if (!isUnit && !looksLikeFormat && !tooLong) {
      s = s.slice(0, parenMatch.index).trimEnd() + " — " + inner;
    }
  }

  // 3. Title-case, preserving caps abbreviations and %/$ tokens.
  //    Use a word-boundary regex so punctuation (parens, slashes,
  //    em-dashes) doesn't get folded into the word — e.g. "(× ATR)"
  //    stays "(× ATR)", not "(× Atr)".
  //
  //    Quoted substrings (e.g. format hints like `"yyyy.mm.dd"`) are
  //    stashed behind placeholders so title-casing doesn't mangle
  //    them, then restored at the end.
  const quoted: string[] = [];
  s = s.replace(/"([^"]*)"/g, (_m, body) => {
    const idx = quoted.length;
    quoted.push(body);
    return `\x01Q${idx}\x01`;
  });
  s = s.replace(/\b[A-Za-z][A-Za-z0-9/]*\b/g, (word) => {
    const lo = word.toLowerCase();
    if (LOWER_WORDS.has(lo)) return lo;
    const up = word.toUpperCase();
    if (CAPS_WORDS.has(up)) return up;
    if (word.length <= 1) return word.toUpperCase();
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
  });
  s = s.replace(/\x01Q(\d+)\x01/g, (_m, n) => `"${quoted[Number(n)]}"`);

  // 4. Fix known phrasing: "Risk %" → "Risk (%)".
  s = s.replace(/\bRisk %$/i, "Risk (%)");
  s = s.replace(/\b% $/i, "(%) ");

  // 5. Collapse double spaces.
  s = s.replace(/\s+/g, " ").trim();

  // 6. Hard truncate to ~48 chars (MT5 Parameters column ellipsis limit).
  if (s.length > 48) s = s.slice(0, 46).trimEnd() + "…";

  return s;
}

// ──────────────────────────────────────────────────────────────────
// Within-section ordering
// ──────────────────────────────────────────────────────────────────

/**
 * Deterministic ordering inside one section. Bools first (feature
 * toggles), then int (periods, counts), then double (multipliers,
 * %/$), then string (CSV, symbol, paths). Hints go last. Within a
 * type group, preserve original declaration order (stable sort).
 */
function typeRank(t: InputDecl["type"]): number {
  switch (t) {
    case "bool":   return 0;
    case "int":    return 1;
    case "double": return 2;
    case "string": return 3;
  }
}

function compareInputs(a: SectionedInput, b: SectionedInput, ai: number, bi: number): number {
  const hintA = a.hint ? 1 : 0;
  const hintB = b.hint ? 1 : 0;
  if (hintA !== hintB) return hintA - hintB;

  const orderA = a.orderHint ?? 0;
  const orderB = b.orderHint ?? 0;
  if (orderA !== orderB) return orderA - orderB;

  const tA = typeRank(a.type);
  const tB = typeRank(b.type);
  if (tA !== tB) return tA - tB;

  return ai - bi;
}

// ──────────────────────────────────────────────────────────────────
// Separator rendering
// ──────────────────────────────────────────────────────────────────

/** Build a fixed-width `input group "━━━ TITLE ━━━"` banner. Keeps every
 * section separator visually identical in the MT5 parameters UI. */
function renderSeparator(section: InputSection, preset: PresenterPreset): string {
  const title = SECTION_TITLES[section];
  // Banner widths are tuned so every section looks the same length in
  // MT5's Parameters tab (~60 chars visually). Titles are max 30 chars.
  const TOTAL = 62;
  switch (preset) {
    case "institutional": {
      // Minimal: --- TITLE ---
      return `input group "--- ${title} ---"`;
    }
    case "premium_seller": {
      // Heavier: ═══ TITLE ═══ with padding to TOTAL
      const pad = Math.max(4, TOTAL - title.length - 6);
      const left = "═".repeat(Math.floor(pad / 2));
      const right = "═".repeat(pad - Math.floor(pad / 2));
      return `input group "${left} ${title} ${right}"`;
    }
    case "professional":
    default: {
      // Sober: ━━━ TITLE ━━━ with padding to TOTAL
      const pad = Math.max(4, TOTAL - title.length - 4);
      const left = "━".repeat(Math.floor(pad / 2));
      const right = "━".repeat(pad - Math.floor(pad / 2));
      return `input group "${left} ${title} ${right}"`;
    }
  }
}

// ──────────────────────────────────────────────────────────────────
// Public entry point
// ──────────────────────────────────────────────────────────────────

/**
 * Render the full `input`-block portion of the .mq5 file. Replaces
 * the old `inputsBlock(inputs)` helper in template.ts. The core
 * strategy inputs (symbol hint, timeframe, magic, trade comment) are
 * NOT in `inputs` — they're emitted by the caller before this block
 * and should already carry their `InpSymbolHint` / `InpMagic` names.
 * To have them participate in the strategy_core section, pass them
 * via `inputs` with the appropriate `section: "strategy_core"` tag.
 */
export function presentInputs(
  inputs: SectionedInput[],
  opts: PresentInputsOptions = {},
): string {
  const preset: PresenterPreset = opts.preset ?? "professional";
  if (inputs.length === 0 && !opts.product?.name) {
    return "// (no inputs)";
  }

  // 1. Inject PRODUCT INFO pseudo-inputs if the caller provided product
  //    metadata. These aren't MQL5-backed variables in the usual sense —
  //    they're declared as `input string` with a default and MT5 shows
  //    them read-only from the user's perspective.
  const augmented: SectionedInput[] = [...inputs];
  if (opts.product) {
    const p = opts.product;
    if (p.name) {
      augmented.push({
        name: "InpProductName",
        type: "string",
        defaultExpr: `"${escape(p.name)}"`,
        label: "Product Name",
        section: "product_info",
      });
    }
    if (p.version) {
      augmented.push({
        name: "InpProductVersion",
        type: "string",
        defaultExpr: `"${escape(p.version)}"`,
        label: "Version",
        section: "product_info",
      });
    }
    if (p.vendor) {
      augmented.push({
        name: "InpProductVendor",
        type: "string",
        defaultExpr: `"${escape(p.vendor)}"`,
        label: "Vendor",
        section: "product_info",
      });
    }
    if (p.supportUrl) {
      augmented.push({
        name: "InpSupportUrl",
        type: "string",
        defaultExpr: `"${escape(p.supportUrl)}"`,
        label: "Support URL",
        section: "product_info",
      });
    }
  }

  // 2. Group by section.
  const bySection = new Map<InputSection, SectionedInput[]>();
  augmented.forEach((inp, idx) => {
    const section = inferSection(inp);
    const bucket = bySection.get(section) ?? [];
    bucket.push({ ...inp, _declIndex: idx } as SectionedInput & { _declIndex: number });
    bySection.set(section, bucket);
  });

  // 3. Sort sections by global order, then render.
  const orderedSections = ([...bySection.keys()] as InputSection[]).sort(
    (a, b) => SECTION_ORDER[a] - SECTION_ORDER[b],
  );

  const lines: string[] = [];
  for (const section of orderedSections) {
    const bucket = bySection.get(section) ?? [];
    if (bucket.length === 0) continue;
    // Sort within section.
    bucket.sort((a, b) =>
      compareInputs(
        a,
        b,
        (a as SectionedInput & { _declIndex: number })._declIndex,
        (b as SectionedInput & { _declIndex: number })._declIndex,
      ),
    );

    lines.push("");
    lines.push(renderSeparator(section, preset));
    for (const inp of bucket) {
      lines.push(renderInput(inp));
    }
  }

  return lines.join("\n").replace(/^\n+/, "");
}

function renderInput(i: SectionedInput): string {
  const label = i.label ? cleanLabel(i.label) : "";
  const comment = label ? ` // ${label}` : "";
  return `input ${i.type} ${i.name} = ${i.defaultExpr};${comment}`;
}

function escape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
