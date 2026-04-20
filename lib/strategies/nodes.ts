import type { NodeCategory, NodeType } from "./types";

// ──────────────────────────────────────────────────────────────────
// Node registry (legacy source-of-truth for the builder)
// ──────────────────────────────────────────────────────────────────
// The block-level taxonomy lives in `lib/blocks/*`; this file is kept
// so that saved strategies and existing MQL5 translators continue to
// work without migration. Every entry below has a matching richer
// `BlockDefinition` in the new registry — see `lib/blocks/registry.ts`.

export type ParamKind =
  | "number"
  | "integer"
  | "string"
  | "boolean"
  | "select"
  | "multiSelect"
  | "time"
  | "direction"
  | "timeframe"
  | "csv";

export interface ParamSpec {
  key: string;
  label: string;
  kind: ParamKind;
  default: unknown;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
  options?: { value: string | number; label: string }[];
  premium?: boolean;
  /** Show only when another param has a specific value. */
  visibleWhen?: { key: string; equals: string | number | boolean };
  /** Inline unit displayed after the input. */
  unit?: "pips" | "points" | "%" | "$" | "bars" | "min" | "hours" | "sec";
}

export type NodeStatus = "active" | "beta" | "planned";
export type NodePlan = "free" | "pro" | "creator";

export interface NodeDefinition {
  type: NodeType;
  category: NodeCategory;
  label: string;
  summary: string;
  longDescription?: string;
  userExplanation?: string;
  subcategory?: string;
  premium?: boolean;
  plan?: NodePlan;
  status?: NodeStatus;
  tags?: string[];
  /** True when no MQL5 translator is implemented yet — UI shows "Preview". */
  stub?: boolean;
  params: ParamSpec[];
}

const directionSelect: ParamSpec = {
  key: "direction",
  label: "Direction",
  kind: "direction",
  default: "both",
  options: [
    { value: "long", label: "Long only" },
    { value: "short", label: "Short only" },
    { value: "both", label: "Both" },
  ],
};

const DAY_OPTIONS = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
];

// ──────────────────────────────────────────────────────────────────
// Node definitions
// ──────────────────────────────────────────────────────────────────

export const NODE_DEFINITIONS: NodeDefinition[] = [
  // ── Entry ──────────────────────────────────────────────────────
  {
    type: "entry.emaCross",
    category: "entry",
    subcategory: "crossover",
    label: "EMA Cross",
    summary: "Buy/sell when fast EMA crosses slow EMA.",
    longDescription:
      "Classic two-EMA crossover. Fires long on fast-crosses-above-slow, short on the opposite. Commonly used as the backbone of trend-following strategies.",
    userExplanation:
      "The simplest trend-following trigger. Starts strategies on the right foot when paired with a trend filter.",
    plan: "free", status: "active", tags: ["trend", "crossover", "ema", "classic"],
    params: [
      { key: "fastPeriod", label: "Fast EMA", kind: "integer", default: 20, min: 2, max: 500, required: true },
      { key: "slowPeriod", label: "Slow EMA", kind: "integer", default: 50, min: 2, max: 500, required: true },
      directionSelect,
    ],
  },
  {
    type: "entry.smaCross",
    category: "entry",
    subcategory: "crossover",
    label: "SMA Cross",
    summary: "Buy/sell when fast SMA crosses slow SMA.",
    longDescription:
      "Same as EMA Cross but with simple moving averages. Included because many classic systems (golden / death cross) are specified in SMA.",
    userExplanation: "Use when you want to match classic SMA systems exactly rather than faster EMAs.",
    plan: "free", status: "active", tags: ["trend", "crossover", "sma"],
    params: [
      { key: "fastPeriod", label: "Fast SMA", kind: "integer", default: 20, min: 2, max: 500, required: true },
      { key: "slowPeriod", label: "Slow SMA", kind: "integer", default: 50, min: 2, max: 500, required: true },
      directionSelect,
    ],
  },
  {
    type: "entry.previousCandle",
    category: "entry",
    subcategory: "breakout",
    label: "Previous Candle Break",
    summary: "Enter when price breaks the previous candle high/low.",
    longDescription:
      "Enter long when price breaks the previous candle's high, short on the low. Respects an optional minimum range so tiny candles don't fire.",
    userExplanation: "Simplest possible breakout. Great starter block — pair with an HTF trend filter.",
    plan: "free", status: "active", tags: ["breakout", "price-action"],
    params: [
      directionSelect,
      { key: "minRangePips", label: "Minimum candle range", kind: "number", default: 5, min: 0, unit: "pips" },
    ],
  },
  {
    type: "entry.candleOpen",
    category: "entry",
    subcategory: "price-action",
    label: "Candle Open Follow",
    summary: "Open in the direction of the just-closed candle.",
    longDescription:
      "On every new bar, open a trade in the direction the previous candle closed. Bullish candle → long. Bearish candle → short. No indicators, no confirmation — pure momentum continuation. Set a minimum body size to filter out dojis.",
    userExplanation:
      "The fastest possible entry. Pair with strong stops or a grid / martingale block to handle the miss rate.",
    plan: "free", status: "active", tags: ["price-action", "momentum", "continuation"],
    params: [
      directionSelect,
      { key: "minBodyPips", label: "Minimum candle body", kind: "number", default: 0, min: 0, unit: "pips" },
    ],
  },
  {
    type: "entry.randomPosition",
    category: "entry",
    subcategory: "seeder",
    label: "Random Position Seeder",
    summary: "Open a random trade the moment the EA loads.",
    longDescription:
      "Fires exactly once: on the first new bar after attachment, open a random (or fixed) direction without checking any filters. The trigger then shuts off permanently. Designed as the initial leg for grid / martingale / basket systems that need something to build on.",
    userExplanation:
      "When you're running a grid or martingale, you don't need a clever entry — you just need a starting trade. This block gives you exactly that, with no setup.",
    plan: "pro", status: "active", tags: ["seeder", "grid", "martingale", "basket"],
    params: [
      {
        key: "mode",
        label: "Direction",
        kind: "select",
        default: "random",
        options: [
          { value: "random", label: "Random (50/50)" },
          { value: "long",   label: "Always long" },
          { value: "short",  label: "Always short" },
        ],
      },
    ],
  },
  {
    type: "entry.macdCross",
    category: "entry",
    subcategory: "crossover",
    label: "MACD Cross",
    summary: "Enter when MACD line crosses the signal line.",
    longDescription:
      "Fires on MACD-line crossing the signal line.",
    userExplanation: "A staple momentum trigger. Tends to work best when combined with a trend filter.",
    plan: "free", status: "active", tags: ["momentum", "macd", "crossover"],
    params: [
      { key: "fastPeriod", label: "Fast EMA", kind: "integer", default: 12, min: 2, required: true },
      { key: "slowPeriod", label: "Slow EMA", kind: "integer", default: 26, min: 2, required: true },
      { key: "signalPeriod", label: "Signal period", kind: "integer", default: 9, min: 1, required: true },
      directionSelect,
    ],
  },
  {
    type: "entry.stochCross",
    category: "entry",
    subcategory: "crossover",
    label: "Stochastic Cross",
    summary: "Enter on %K / %D crossover in overbought / oversold zones.",
    userExplanation: "Filters out noisy stoch crosses in the middle of the range.",
    plan: "free", status: "active", tags: ["stochastic", "reversal"],
    params: [
      { key: "kPeriod", label: "%K period", kind: "integer", default: 14, min: 1, required: true },
      { key: "dPeriod", label: "%D period", kind: "integer", default: 3, min: 1, required: true },
      { key: "slowing", label: "Slowing", kind: "integer", default: 3, min: 1 },
      { key: "overbought", label: "Overbought level", kind: "number", default: 80, min: 50, max: 100, unit: "%" },
      { key: "oversold", label: "Oversold level", kind: "number", default: 20, min: 0, max: 50, unit: "%" },
      directionSelect,
    ],
  },
  {
    type: "entry.rsiExtreme",
    category: "entry",
    subcategory: "reversal",
    label: "RSI Extremes",
    summary: "Long when RSI < oversold / short when RSI > overbought.",
    longDescription:
      "Classic mean-reversion entry. Fires when RSI crosses back inside the band (e.g. up through 30) to avoid catching falling knives.",
    userExplanation: "Fades overextended moves. Pair with a range / non-trend filter.",
    plan: "free", status: "active", tags: ["rsi", "reversal", "mean-reversion"],
    params: [
      { key: "period", label: "RSI period", kind: "integer", default: 14, min: 2, max: 200, required: true },
      { key: "overbought", label: "Overbought", kind: "number", default: 70, min: 50, max: 100 },
      { key: "oversold", label: "Oversold", kind: "number", default: 30, min: 0, max: 50 },
      { key: "onReentry", label: "Fire on re-entry into the band", kind: "boolean", default: true },
      directionSelect,
    ],
  },
  {
    type: "entry.bollingerBreak",
    category: "entry",
    subcategory: "breakout",
    label: "Bollinger Breakout",
    summary: "Enter on a close outside the Bollinger band envelope.",
    longDescription:
      "Close above the upper band fires long; close below the lower band fires short. Pairs best with a trend filter to avoid reversals.",
    userExplanation: "Volatility-aware breakout. Reacts to market expansion rather than fixed pip distances.",
    plan: "pro", status: "active", tags: ["bollinger", "breakout", "volatility"], premium: true,
    params: [
      { key: "period", label: "Period", kind: "integer", default: 20, min: 5, required: true },
      { key: "deviation", label: "Deviation (σ)", kind: "number", default: 2, step: 0.1, min: 0.5, required: true },
      directionSelect,
    ],
  },
  {
    type: "entry.donchianBreakout",
    category: "entry",
    subcategory: "breakout",
    label: "Donchian Breakout",
    summary: "Enter on close outside the N-bar Donchian channel.",
    longDescription:
      "Fires long on a close above the N-bar high, short on a close below the N-bar low. Turtle-style breakout baseline.",
    userExplanation: "Clean, robust breakout trigger that works across trendy markets.",
    plan: "pro", status: "active", tags: ["donchian", "breakout", "turtle"], premium: true,
    params: [
      { key: "period", label: "Channel period", kind: "integer", default: 20, min: 5, required: true },
      directionSelect,
    ],
  },
  {
    type: "entry.priceActionPinbar",
    category: "entry",
    subcategory: "pattern-trigger",
    label: "Pin Bar",
    summary: "Enter on a pin-bar reversal candlestick.",
    plan: "pro", status: "beta", tags: ["pin-bar", "price-action"], stub: true, premium: true,
    params: [
      { key: "wickRatio", label: "Wick/body ratio", kind: "number", default: 2, step: 0.1, min: 1, required: true },
      directionSelect,
    ],
  },
  {
    type: "entry.trendlineBreak",
    category: "entry",
    subcategory: "zone",
    label: "Trendline Break",
    summary: "Enter on a break of an auto-detected swing trendline.",
    plan: "creator", status: "planned", premium: true, stub: true,
    params: [
      { key: "lookback", label: "Lookback bars", kind: "integer", default: 50, min: 10 },
      directionSelect,
    ],
  },

  // ── Filter (legacy bucket covers confirmation / trend / momentum / vol / exec / mtf / candles) ──
  {
    type: "filter.rsi",
    category: "filter",
    subcategory: "momentum",
    label: "RSI Band Filter",
    summary: "Block entries when RSI is outside an allowed band.",
    userExplanation: "Simple noise filter — refuses trades when momentum is clearly exhausted.",
    plan: "free", status: "active", tags: ["rsi", "momentum", "band"],
    params: [
      { key: "period", label: "RSI period", kind: "integer", default: 14, min: 2, max: 200, required: true },
      { key: "longBelow", label: "Allow longs only when RSI <", kind: "number", default: 70, min: 0, max: 100 },
      { key: "shortAbove", label: "Allow shorts only when RSI >", kind: "number", default: 30, min: 0, max: 100 },
    ],
  },
  {
    type: "filter.rsiBand",
    category: "filter",
    subcategory: "momentum",
    label: "RSI Allowed Band",
    summary: "Block entries when RSI outside [low, high].",
    longDescription:
      "Only allows entries when RSI sits inside a permitted band. Keeps you out of overstretched markets.",
    plan: "free", status: "active", tags: ["rsi", "momentum"],
    params: [
      { key: "period", label: "RSI period", kind: "integer", default: 14, min: 2, max: 200, required: true },
      { key: "minRsi", label: "Min RSI", kind: "number", default: 30, min: 0, max: 100 },
      { key: "maxRsi", label: "Max RSI", kind: "number", default: 70, min: 0, max: 100 },
    ],
  },
  {
    type: "filter.priceAboveMa",
    category: "filter",
    subcategory: "confirmation",
    label: "Price vs Moving Average",
    summary: "Price must be on the correct side of a moving average.",
    longDescription:
      "Requires price to be on the bullish / bearish side of a moving average. Works like a lightweight trend filter.",
    userExplanation: "The cheapest trend filter you can add. Big impact for one block.",
    plan: "free", status: "active", tags: ["ma", "trend", "confirmation"],
    params: [
      { key: "maType", label: "MA type", kind: "select", default: "ema",
        options: [{ value: "ema", label: "EMA" }, { value: "sma", label: "SMA" }, { value: "wma", label: "WMA" }] },
      { key: "period", label: "Period", kind: "integer", default: 50, min: 2, required: true },
    ],
  },
  {
    type: "filter.emaSlope",
    category: "filter",
    subcategory: "trend",
    label: "EMA Slope",
    summary: "Require the slope of EMA(N) to match direction.",
    longDescription:
      "Computes the EMA slope over a lookback window and blocks trades that fight it.",
    userExplanation: "Keeps you out of counter-trend trades by requiring the MA to be moving your way.",
    plan: "free", status: "active", tags: ["ema", "trend", "slope"],
    params: [
      { key: "period", label: "EMA period", kind: "integer", default: 50, min: 2, required: true },
      { key: "lookback", label: "Slope lookback (bars)", kind: "integer", default: 5, min: 2, max: 50, unit: "bars" },
    ],
  },
  {
    type: "filter.rocThreshold",
    category: "filter",
    subcategory: "momentum",
    label: "Rate of Change",
    summary: "|ROC| above threshold.",
    userExplanation: "Fast way to demand minimum thrust before entering.",
    plan: "pro", status: "active", tags: ["roc", "momentum"], premium: true,
    params: [
      { key: "period", label: "ROC period", kind: "integer", default: 10, min: 1, required: true },
      { key: "threshold", label: "Threshold (%)", kind: "number", default: 0.2, min: 0, step: 0.05, unit: "%", required: true },
    ],
  },
  {
    type: "filter.pinBar",
    category: "filter",
    subcategory: "candles",
    label: "Pin Bar Filter",
    summary: "Require a pin-bar / hammer shape on the prior bar.",
    longDescription:
      "Recognises a pin bar / hammer / shooting-star shape. Tolerance parameters control the body-to-range ratio and minimum wick proportion.",
    userExplanation: "A real, well-specified price-action filter. Great companion for RSI extremes or S/R touches.",
    plan: "pro", status: "active", tags: ["pin-bar", "price-action"], premium: true, stub: true,
    params: [
      { key: "wickRatio", label: "Wick/body ratio", kind: "number", default: 2, step: 0.1, min: 1, required: true },
      { key: "maxBodyPct", label: "Max body (% of range)", kind: "number", default: 35, min: 5, max: 95, unit: "%", required: true },
      directionSelect,
    ],
  },
  {
    type: "filter.session",
    category: "session",
    subcategory: "hours",
    label: "Custom Hour Window",
    summary: "Only trade between server hours.",
    longDescription: "A custom trading window. Respects server time.",
    userExplanation: "The single most useful trading filter. Every strategy works better restricted to its native session.",
    plan: "free", status: "active", tags: ["session", "hours"],
    params: [
      { key: "startHour", label: "Start hour (server)", kind: "integer", default: 8, min: 0, max: 23, required: true },
      { key: "endHour", label: "End hour (server)", kind: "integer", default: 20, min: 0, max: 23, required: true },
    ],
  },
  {
    type: "filter.londonSession",
    category: "session",
    subcategory: "preset",
    label: "London Session",
    summary: "Trade during London hours (07:00–16:00 UTC).",
    userExplanation: "One click to restrict to London hours. Works beautifully for trend / breakout systems on majors.",
    plan: "free", status: "active", tags: ["session", "london"],
    params: [
      { key: "utcOffset", label: "Server UTC offset (h)", kind: "integer", default: 0, min: -12, max: 14 },
    ],
  },
  {
    type: "filter.spreadLimit",
    category: "filter",
    subcategory: "execution",
    label: "Spread Limit",
    summary: "Skip entries when spread exceeds a threshold.",
    userExplanation: "Single best defence against bad fills. Every strategy needs one.",
    plan: "free", status: "active", tags: ["spread", "execution"],
    params: [
      { key: "maxSpreadPoints", label: "Max spread (points)", kind: "integer", default: 30, min: 1, required: true, unit: "points" },
    ],
  },
  {
    type: "filter.atr",
    category: "filter",
    subcategory: "volatility",
    label: "ATR Filter",
    summary: "Only trade when ATR is above / below a threshold.",
    plan: "free", status: "active", tags: ["atr", "volatility"],
    params: [
      { key: "period", label: "ATR period", kind: "integer", default: 14, min: 1, required: true },
      { key: "minAtrPips", label: "Min ATR (pips)", kind: "number", default: 10, min: 0, unit: "pips" },
      { key: "maxAtrPips", label: "Max ATR (pips)", kind: "number", default: 500, min: 0, unit: "pips" },
    ],
  },
  {
    type: "filter.atrBand",
    category: "filter",
    subcategory: "volatility",
    label: "ATR Band",
    summary: "ATR within [min, max] pips.",
    longDescription:
      "Rejects entries when ATR is too low (chop) or too high (news spike). A single block that covers the majority of volatility filters users need.",
    userExplanation: "Stops you trading in dead markets AND in gappy markets.",
    plan: "free", status: "active", tags: ["atr", "volatility"],
    params: [
      { key: "period", label: "ATR period", kind: "integer", default: 14, min: 1, required: true },
      { key: "minAtrPips", label: "Min ATR (pips)", kind: "number", default: 5, min: 0, unit: "pips" },
      { key: "maxAtrPips", label: "Max ATR (pips)", kind: "number", default: 300, min: 0, unit: "pips" },
    ],
  },
  {
    type: "filter.adx",
    category: "filter",
    subcategory: "trend",
    label: "ADX Trend Strength",
    summary: "Require ADX above a threshold for a confirmed trend.",
    longDescription:
      "Requires ADX above a minimum value — only trade when a trend is actually present.",
    userExplanation: "Stops a trend-following system from taking trades in flat markets.",
    plan: "pro", status: "active", tags: ["adx", "trend"], premium: true,
    params: [
      { key: "period", label: "ADX period", kind: "integer", default: 14, min: 2, required: true },
      { key: "minAdx", label: "Minimum ADX", kind: "number", default: 20, min: 0, max: 100, required: true },
    ],
  },
  {
    type: "filter.higherTimeframeTrend",
    category: "filter",
    subcategory: "mtf",
    label: "Higher-TF Trend",
    summary: "Align with the higher-timeframe EMA slope.",
    userExplanation: "Stops counter-trend sniping — one of the highest-impact filters you can add.",
    plan: "pro", status: "active", tags: ["mtf", "trend"], premium: true, stub: true,
    params: [
      { key: "timeframe", label: "Higher timeframe", kind: "timeframe", default: "H4",
        options: [{ value: "H1", label: "H1" }, { value: "H4", label: "H4" }, { value: "D1", label: "D1" }] },
      { key: "emaPeriod", label: "EMA period", kind: "integer", default: 50, min: 5 },
    ],
  },
  {
    type: "filter.dayOfWeek",
    category: "session",
    subcategory: "day",
    label: "Day of Week",
    summary: "Only trade on selected weekdays.",
    plan: "free", status: "active", tags: ["session"], stub: true,
    params: [
      { key: "days", label: "Active days", kind: "multiSelect", default: "mon,tue,wed,thu,fri",
        options: DAY_OPTIONS,
        description: `Active days (comma-separated): ${DAY_OPTIONS.map((d) => d.value).join(", ")}` },
    ],
  },
  {
    type: "filter.maxDailyTrades",
    category: "utility",
    subcategory: "count",
    label: "Max Daily Trades",
    summary: "Stop opening new trades once the daily limit is hit.",
    plan: "free", status: "active", tags: ["constraint", "daily"],
    params: [
      { key: "maxTrades", label: "Max trades per day", kind: "integer", default: 5, min: 1, required: true },
    ],
  },
  {
    type: "filter.maxDailyLoss",
    category: "utility",
    subcategory: "risk-gate",
    label: "Daily Loss Limit",
    summary: "Pause trading for the day after losing X% of equity.",
    userExplanation: "Prop-firm compatible. Saves users from revenge-trading.",
    plan: "pro", status: "active", tags: ["daily", "risk"], premium: true,
    params: [
      { key: "maxLossPercent", label: "Max daily loss (%)", kind: "number", default: 3, min: 0.1, max: 50, step: 0.1, required: true, unit: "%" },
    ],
  },

  // Aliases that map to the new utility.* family for the UI — legacy
  // filter.* entries above keep the old category so saved graphs load.
  {
    type: "utility.maxDailyTrades",
    category: "utility",
    subcategory: "count",
    label: "Max Daily Trades",
    summary: "Stop opening new trades once the daily limit is hit.",
    plan: "free", status: "active", tags: ["constraint", "daily"],
    params: [
      { key: "maxTrades", label: "Max trades per day", kind: "integer", default: 5, min: 1, required: true },
    ],
  },
  {
    type: "utility.maxDailyLoss",
    category: "utility",
    subcategory: "risk-gate",
    label: "Max Daily Loss",
    summary: "Pause trading after −X% daily equity.",
    plan: "pro", status: "active", tags: ["daily", "risk"], premium: true,
    params: [
      { key: "maxLossPercent", label: "Max daily loss (%)", kind: "number", default: 3, min: 0.1, max: 50, step: 0.1, required: true, unit: "%" },
    ],
  },

  // ── Risk model ─────────────────────────────────────────────────
  {
    type: "risk.fixedRisk",
    category: "risk",
    subcategory: "budget",
    label: "Fixed-Risk per Trade",
    summary: "Risk X% of equity per trade.",
    longDescription:
      "Declares a per-trade risk budget. A Lot Sizing block is still required to convert this into a concrete lot size.",
    userExplanation: "The industry-standard risk model. Works for 95% of retail traders.",
    plan: "pro", status: "active", tags: ["risk", "percent"], premium: true,
    params: [
      { key: "riskPercent", label: "Risk per trade (%)", kind: "number", default: 1.0, min: 0.01, max: 10, step: 0.1, required: true, unit: "%" },
    ],
  },
  {
    type: "risk.dailyRiskBudget",
    category: "risk",
    subcategory: "budget",
    label: "Daily Risk Budget",
    summary: "Max Y% risk allocated per day across trades.",
    longDescription:
      "Hard cap on total risk opened in a single day. Once the budget is consumed, further entries are blocked until midnight server time.",
    userExplanation: "Prop-firm compatible daily risk cap. Crucial guard-rail.",
    plan: "pro", status: "active", tags: ["risk", "daily"], premium: true,
    params: [
      { key: "maxDailyRisk", label: "Max daily risk (%)", kind: "number", default: 3, min: 0.1, max: 50, step: 0.1, required: true, unit: "%" },
    ],
  },

  // Legacy risk aliases (kept so saved graphs don't break)
  {
    type: "risk.fixedLot",
    category: "lot",
    subcategory: "flat",
    label: "Fixed Lot (legacy)",
    summary: "Always trade the same lot size.",
    plan: "free", status: "active", tags: ["lot", "legacy"],
    params: [
      { key: "lots", label: "Lot size", kind: "number", default: 0.1, min: 0.01, step: 0.01, required: true },
    ],
  },
  {
    type: "risk.riskPercent",
    category: "risk",
    subcategory: "legacy",
    label: "Risk % per Trade (legacy)",
    summary: "Lot size sized to risk a % of equity vs. stop loss.",
    plan: "pro", status: "active", tags: ["risk", "legacy"], premium: true,
    params: [
      { key: "riskPercent", label: "Risk per trade (%)", kind: "number", default: 1.0, min: 0.1, max: 10, step: 0.1, required: true, unit: "%" },
    ],
  },
  {
    type: "risk.fixedRatio",
    category: "lot",
    subcategory: "anti-martin",
    label: "Fixed Ratio Sizing",
    summary: "Scale lot size as account grows (Ryan Jones style).",
    plan: "creator", status: "planned", tags: ["lot", "ratio"], premium: true, stub: true,
    params: [
      { key: "baseLot", label: "Base lot", kind: "number", default: 0.1, min: 0.01, step: 0.01, required: true },
      { key: "deltaDollars", label: "Delta ($ per step)", kind: "number", default: 500, min: 50, required: true, unit: "$" },
    ],
  },
  {
    type: "risk.volatilityScaled",
    category: "lot",
    subcategory: "vol-aware",
    label: "Volatility-Scaled Lot",
    summary: "Reduce lot size when ATR is elevated.",
    plan: "pro", status: "active", tags: ["lot", "atr"], premium: true, stub: true,
    params: [
      { key: "targetRiskPercent", label: "Target risk (%)", kind: "number", default: 1.0, min: 0.1, max: 10, step: 0.1, required: true, unit: "%" },
      { key: "atrPeriod", label: "ATR period", kind: "integer", default: 14 },
    ],
  },

  // ── Lot sizing ─────────────────────────────────────────────────
  {
    type: "lot.fixed",
    category: "lot",
    subcategory: "flat",
    label: "Fixed Lot",
    summary: "Always trade the same lot size.",
    userExplanation: "Simplest possible lot block. Ideal for early testing.",
    plan: "free", status: "active", tags: ["lot", "fixed"],
    params: [
      { key: "lots", label: "Lot size", kind: "number", default: 0.1, min: 0.01, step: 0.01, required: true },
    ],
  },
  {
    type: "lot.fromRisk",
    category: "lot",
    subcategory: "risk-aware",
    label: "Lot From Risk %",
    summary: "Lot derived from risk % and SL distance.",
    longDescription:
      "Computes lot such that SL distance × pip-value × lot = risk% × equity. The gold standard — keeps risk constant across SL sizes.",
    userExplanation: "Converts a Fixed-Risk model into an exact lot. Essential for consistent sizing.",
    plan: "pro", status: "active", tags: ["lot", "risk"], premium: true,
    params: [],
  },

  // ── Trade management (legacy bucket: exit) ─────────────────────
  {
    type: "manage.breakEven",
    category: "management",
    subcategory: "sl",
    label: "Break-Even",
    summary: "Move SL to entry once price advances by N pips.",
    userExplanation: "The default trade-management move. Adds survivability without changing trade selection.",
    plan: "free", status: "active", tags: ["break-even"],
    params: [
      { key: "triggerPips", label: "Trigger (pips)", kind: "number", default: 10, min: 1, required: true, unit: "pips" },
      { key: "offsetPips", label: "Offset (pips)", kind: "number", default: 1, min: 0, unit: "pips" },
    ],
  },
  {
    type: "manage.trailingStop",
    category: "management",
    subcategory: "trail",
    label: "Trailing Stop",
    summary: "Move stop with price after activation distance.",
    plan: "pro", status: "active", tags: ["trailing"], premium: true,
    params: [
      { key: "activationPips", label: "Activate after (pips)", kind: "number", default: 15, min: 0, required: true, unit: "pips" },
      { key: "trailingPips", label: "Trail distance (pips)", kind: "number", default: 10, min: 1, required: true, unit: "pips" },
    ],
  },
  {
    type: "manage.trailingStopAtr",
    category: "management",
    subcategory: "trail",
    label: "ATR Trailing",
    summary: "Trailing stop = k × ATR.",
    userExplanation: "The professional default. Adapts to quiet and wild markets.",
    plan: "pro", status: "active", tags: ["trailing", "atr"], premium: true,
    params: [
      { key: "period", label: "ATR period", kind: "integer", default: 14, min: 1, required: true },
      { key: "multiplier", label: "ATR multiplier", kind: "number", default: 2.5, min: 0.1, step: 0.1, required: true },
    ],
  },
  {
    type: "manage.partialClose",
    category: "management",
    subcategory: "partial",
    label: "Partial Close",
    summary: "Close part of the position at the first take-profit.",
    plan: "pro", status: "active", tags: ["partial"], premium: true,
    params: [
      { key: "firstTpPips", label: "First TP (pips)", kind: "number", default: 20, min: 1, required: true, unit: "pips" },
      { key: "closePercent", label: "Close portion (%)", kind: "number", default: 50, min: 1, max: 99, required: true, unit: "%" },
    ],
  },

  // Legacy exit.* aliases — kept so old saved graphs still load
  {
    type: "exit.trailingStop",
    category: "exit",
    subcategory: "legacy",
    label: "Trailing Stop (legacy)",
    summary: "Move stop with price after activation distance.",
    plan: "pro", status: "active", tags: ["trailing", "legacy"], premium: true,
    params: [
      { key: "activationPips", label: "Activate after (pips)", kind: "number", default: 15, min: 0, required: true, unit: "pips" },
      { key: "trailingPips", label: "Trail distance (pips)", kind: "number", default: 10, min: 1, required: true, unit: "pips" },
    ],
  },
  {
    type: "exit.breakEven",
    category: "exit",
    subcategory: "legacy",
    label: "Break Even (legacy)",
    summary: "Move stop to entry once price advances by N pips.",
    plan: "free", status: "active", tags: ["break-even", "legacy"],
    params: [
      { key: "triggerPips", label: "Trigger (pips)", kind: "number", default: 10, min: 1, required: true, unit: "pips" },
      { key: "offsetPips", label: "Offset (pips)", kind: "number", default: 1, min: 0, unit: "pips" },
    ],
  },
  {
    type: "exit.atrTrailing",
    category: "exit",
    subcategory: "legacy",
    label: "ATR Trailing (legacy)",
    summary: "Trail the stop by a multiple of ATR.",
    plan: "pro", status: "active", tags: ["atr", "legacy"], premium: true, stub: true,
    params: [
      { key: "period", label: "ATR period", kind: "integer", default: 14, min: 1, required: true },
      { key: "multiplier", label: "ATR multiplier", kind: "number", default: 2.5, min: 0.1, step: 0.1, required: true },
    ],
  },
  {
    type: "exit.partialClose",
    category: "exit",
    subcategory: "legacy",
    label: "Partial Close (legacy)",
    summary: "Close part of the position at the first take-profit.",
    plan: "pro", status: "active", tags: ["partial", "legacy"], premium: true, stub: true,
    params: [
      { key: "firstTpPips", label: "First TP (pips)", kind: "number", default: 20, min: 1, required: true, unit: "pips" },
      { key: "closePercent", label: "Close portion (%)", kind: "number", default: 50, min: 1, max: 99, required: true, unit: "%" },
    ],
  },

  // ── Exit ───────────────────────────────────────────────────────
  {
    type: "exit.fixedTpSl",
    category: "exit",
    subcategory: "fixed",
    label: "Fixed TP / SL",
    summary: "Set a fixed take profit and stop loss in pips.",
    userExplanation: "Always know exactly what you're risking and targeting.",
    plan: "free", status: "active", tags: ["tp", "sl"],
    params: [
      { key: "takeProfitPips", label: "Take profit (pips)", kind: "number", default: 30, min: 0, required: true, unit: "pips" },
      { key: "stopLossPips", label: "Stop loss (pips)", kind: "number", default: 15, min: 0, required: true, unit: "pips" },
    ],
  },
  {
    type: "exit.rrBased",
    category: "exit",
    subcategory: "rr",
    label: "R:R Exit",
    summary: "TP = N × risk distance.",
    longDescription:
      "Places TP as a multiple of the SL distance, so every trade has a defined reward:risk.",
    userExplanation: "Keeps average winner / loser predictable — essential for expectancy calculations.",
    plan: "pro", status: "active", tags: ["rr"], premium: true,
    params: [
      { key: "stopLossPips", label: "Stop loss (pips)", kind: "number", default: 20, min: 1, required: true, unit: "pips" },
      { key: "rr", label: "R:R ratio", kind: "number", default: 2, min: 0.1, step: 0.1, required: true },
    ],
  },
  {
    type: "exit.atrBased",
    category: "exit",
    subcategory: "atr",
    label: "ATR TP / SL",
    summary: "TP / SL = k × ATR.",
    userExplanation: "Exits that scale with the market — fewer 'stopped out by noise' situations.",
    plan: "pro", status: "active", tags: ["atr", "exit"], premium: true,
    params: [
      { key: "atrPeriod", label: "ATR period", kind: "integer", default: 14, min: 1, required: true },
      { key: "slMultiplier", label: "SL × ATR", kind: "number", default: 1.5, min: 0.1, step: 0.1, required: true },
      { key: "tpMultiplier", label: "TP × ATR", kind: "number", default: 3, min: 0.1, step: 0.1, required: true },
    ],
  },
  {
    type: "exit.timeBasedExit",
    category: "exit",
    subcategory: "time",
    label: "Time-Based Exit",
    summary: "Close any trade that stays open longer than N hours.",
    plan: "free", status: "active", tags: ["time"],
    params: [
      { key: "maxHours", label: "Max hold time (hours)", kind: "number", default: 24, min: 1, required: true, unit: "hours" },
    ],
  },
  {
    type: "exit.oppositeSignal",
    category: "exit",
    subcategory: "signal",
    label: "Close on Opposite Signal",
    summary: "Exit when the entry rule fires in the opposite direction.",
    userExplanation: "'Always in the market' style system. Great for trend-followers.",
    plan: "free", status: "active", tags: ["signal"],
    params: [],
  },
  {
    type: "exit.chandelierExit",
    category: "exit",
    subcategory: "chandelier",
    label: "Chandelier Exit",
    summary: "Trailing stop based on the highest-high/lowest-low ± N×ATR.",
    plan: "creator", status: "active", tags: ["chandelier", "trailing"], premium: true, stub: true,
    params: [
      { key: "period", label: "Lookback (bars)", kind: "integer", default: 22, min: 5, required: true, unit: "bars" },
      { key: "multiplier", label: "ATR multiplier", kind: "number", default: 3, min: 0.5, step: 0.1, required: true },
    ],
  },

  // ── Grid ───────────────────────────────────────────────────────
  {
    type: "grid.basicGrid",
    category: "grid",
    subcategory: "grid",
    label: "Basic Grid",
    summary: "Add positions every N pips against open drawdown.",
    userExplanation: "Classic grid. High risk — always pair with an emergency stop.",
    plan: "pro", status: "active", tags: ["grid"], premium: true, stub: true,
    params: [
      { key: "stepPips", label: "Step (pips)", kind: "number", default: 30, min: 5, required: true, unit: "pips" },
      { key: "maxOrders", label: "Max orders", kind: "integer", default: 5, min: 2, required: true },
      { key: "lotMultiplier", label: "Lot multiplier", kind: "number", default: 1.5, min: 1, step: 0.1 },
    ],
  },

  // ── News ───────────────────────────────────────────────────────
  {
    type: "news.pauseBeforeNews",
    category: "news",
    subcategory: "calendar",
    label: "Pause Before News",
    summary: "Stop opening trades X minutes before high-impact news.",
    userExplanation: "The single cheapest way to avoid whipsaws on high-impact releases.",
    plan: "pro", status: "active", tags: ["news"], premium: true, stub: true,
    params: [
      { key: "bufferMinutes", label: "Buffer (minutes)", kind: "integer", default: 30, min: 1, max: 240, required: true, unit: "min" },
    ],
  },

  // ── Utility ────────────────────────────────────────────────────
  {
    type: "utility.oneTradeAtTime",
    category: "utility",
    subcategory: "count",
    label: "One Trade At A Time",
    summary: "Don't open a new position while one is already open.",
    plan: "free", status: "active", tags: ["constraint"],
    params: [],
  },
  {
    type: "utility.maxOpenPositions",
    category: "utility",
    subcategory: "count",
    label: "Max Open Positions",
    summary: "Limit the number of simultaneous open positions.",
    plan: "free", status: "active", tags: ["constraint"],
    params: [
      { key: "maxPositions", label: "Max positions", kind: "integer", default: 3, min: 1, max: 50, required: true },
    ],
  },
  {
    type: "utility.onlyNewBar",
    category: "utility",
    subcategory: "tick",
    label: "Only On New Bar",
    summary: "Run entry logic once per bar.",
    longDescription:
      "Prevents the entry rule from re-evaluating on every tick. Almost always desired — many strategies misbehave without it.",
    userExplanation: "Stops intra-bar flipping and flicker. Usually a free accuracy boost.",
    plan: "free", status: "active", tags: ["tick"],
    params: [],
  },
  {
    type: "utility.slippageControl",
    category: "utility",
    subcategory: "execution",
    label: "Slippage Control",
    summary: "Reject orders when slippage exceeds X points.",
    plan: "free", status: "active", tags: ["slippage"], stub: true,
    params: [
      { key: "maxSlippagePoints", label: "Max slippage (points)", kind: "integer", default: 10, min: 0, required: true, unit: "points" },
    ],
  },
  {
    type: "utility.emergencyStop",
    category: "utility",
    subcategory: "emergency",
    label: "Emergency Stop",
    summary: "Flatten all positions if equity drops below X% of peak.",
    userExplanation: "Non-negotiable for grid / martingale users. Useful guardrail for everyone.",
    plan: "pro", status: "active", tags: ["emergency"], premium: true, stub: true,
    params: [
      { key: "maxDrawdownPercent", label: "Max drawdown (%)", kind: "number", default: 10, min: 1, max: 99, required: true, unit: "%" },
    ],
  },
];

// Legacy map (40 V1 blocks with hand-written NodeDefinition rows).
// Extended lazily on first call with blocks from the modular registry
// (lib/blocks/*) so template strategies that reference trend/confirm/
// exit/risk/utility nodes resolve without "Unknown node type" errors.
const _byType = new Map<NodeType, NodeDefinition>(
  NODE_DEFINITIONS.map((d) => [d.type, d]),
);
let _byTypeExtended = false;

function ensureExtended() {
  if (_byTypeExtended) return;
  _byTypeExtended = true;
  for (const b of ALL_CANVAS_BLOCKS) {
    const key = b.id as NodeType;
    if (_byType.has(key)) continue;           // legacy wins for translator-wired ids
    _byType.set(key, blockToNodeDefinition(b));
  }
}

export function getNodeDefinition(type: NodeType): NodeDefinition | undefined {
  ensureExtended();
  return _byType.get(type);
}

export function getNodesByCategory(category: NodeCategory): NodeDefinition[] {
  return NODE_DEFINITIONS.filter((n) => n.category === category);
}

export function defaultParams(type: NodeType): Record<string, unknown> {
  const def = getNodeDefinition(type);
  if (!def) return {};
  const out: Record<string, unknown> = {};
  for (const p of def.params) out[p.key] = p.default;
  return out;
}

export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  entry: "Entry",
  filter: "Filter",
  risk: "Risk",
  lot: "Lot Sizing",
  management: "Manage",
  exit: "Exit",
  grid: "Grid",
  session: "Session",
  news: "News",
  utility: "Utility",
};

export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  entry: "#10b981",
  filter: "#0ea5e9",
  risk: "#f59e0b",
  lot: "#f97316",
  management: "#84cc16",
  exit: "#ef4444",
  grid: "#a855f7",
  session: "#6366f1",
  news: "#ec4899",
  utility: "#64748b",
};

// ──────────────────────────────────────────────────────────────────
// V1 search & filtering helpers (for the node library UI)
// ──────────────────────────────────────────────────────────────────

export function searchNodes(query: string, defs: NodeDefinition[] = NODE_DEFINITIONS): NodeDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return defs;
  return defs.filter((d) => {
    if (d.label.toLowerCase().includes(q)) return true;
    if (d.summary.toLowerCase().includes(q)) return true;
    if (d.type.toLowerCase().includes(q)) return true;
    if (d.subcategory?.toLowerCase().includes(q)) return true;
    for (const tag of d.tags ?? []) if (tag.toLowerCase().includes(q)) return true;
    return false;
  });
}

// ──────────────────────────────────────────────────────────────────
// Bridge: surface the full 200+ block library from lib/blocks/*
// ──────────────────────────────────────────────────────────────────
// The legacy NODE_DEFINITIONS above covers the 40 V1-shipped blocks
// with rich inspector/translator wiring. The modular registry at
// lib/blocks/* defines another 170+ beta blocks. We expose a merged
// view so NodeLibrary shows everything — new blocks render as "Beta"
// and fall back to the compiler's stub-warning path if they have no
// translator yet.

import { ALL_CANVAS_BLOCKS } from "../blocks/registry";
import type { BlockDefinition, BlockFamily } from "../blocks/types";

// Map new block families to the legacy category union.
const FAMILY_TO_CATEGORY: Record<BlockFamily, NodeCategory> = {
  entry: "entry",
  confirmation: "filter",
  trend: "filter",
  momentum: "filter",
  volatility: "filter",
  structure: "filter",
  candles: "filter",
  session: "session",
  news: "news",
  execution: "filter",
  risk: "risk",
  lot: "lot",
  management: "management",
  exit: "exit",
  basket: "utility",
  grid: "grid",
  mtf: "filter",
  utility: "utility",
  // protection + packaging are non-canvas (export config) — never surfaced here
  protection: "utility",
  packaging: "utility",
};

function toLegacyKind(k: BlockDefinition["params"][number]["kind"]): ParamKind {
  switch (k) {
    case "multiSelect": return "multiSelect";
    case "timeframe": return "timeframe";
    case "direction": return "direction";
    case "csv": return "csv";
    case "number": return "number";
    case "integer": return "integer";
    case "string": return "string";
    case "boolean": return "boolean";
    case "select": return "select";
    case "time": return "time";
    case "date": return "string";        // date → fallback to string input
    case "symbol": return "string";      // symbol → free text for now
    default: return "string";
  }
}

function toLegacyParam(p: BlockDefinition["params"][number]): ParamSpec {
  const { min, max, step, required } = extractNumericRules(p.validation);
  return {
    key: p.key,
    label: p.label,
    kind: toLegacyKind(p.kind),
    default: p.default as unknown,
    required,
    min, max, step,
    description: p.description,
    options: p.options as ParamSpec["options"],
    unit: p.unit,
    visibleWhen: p.visibleWhen as ParamSpec["visibleWhen"],
  };
}

function extractNumericRules(rules: BlockDefinition["params"][number]["validation"] | undefined) {
  let min: number | undefined, max: number | undefined, step: number | undefined, required = false;
  for (const r of rules ?? []) {
    if (r.kind === "min") min = r.value;
    else if (r.kind === "max") max = r.value;
    else if (r.kind === "step") step = r.value;
    else if (r.kind === "required") required = true;
  }
  return { min, max, step, required };
}

export function blockToNodeDefinition(b: BlockDefinition): NodeDefinition {
  const isStub = b.status === "beta";
  return {
    type: b.id as NodeType,
    category: FAMILY_TO_CATEGORY[b.family],
    subcategory: b.subcategory,
    label: b.displayName,
    summary: b.shortDescription,
    longDescription: b.longDescription,
    userExplanation: b.userExplanation,
    plan: b.plan,
    status: b.status === "active" ? "active" : b.status === "beta" ? "beta" : "planned",
    tags: b.tags,
    premium: b.plan !== "free",
    stub: isStub,                    // compiler treats as preview if no translator
    params: b.params.map(toLegacyParam),
  };
}

/**
 * Full node-library source: legacy V1 blocks + every non-duplicate
 * block from the modular registry that is active / beta.
 * Legacy wins on id collision because it carries the translator wiring.
 */
export function getAllNodeDefinitions(): NodeDefinition[] {
  const legacyIds = new Set(NODE_DEFINITIONS.map((d) => d.type));
  const extra = ALL_CANVAS_BLOCKS
    .filter((b) => (b.status === "active" || b.status === "beta") && !legacyIds.has(b.id as NodeType))
    .map(blockToNodeDefinition);
  return [...NODE_DEFINITIONS, ...extra];
}
