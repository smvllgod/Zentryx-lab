import { block, P_PIPS } from "../_factory";
import type { BlockDefinition, BlockParamSpec } from "../types";

const DIRECTION: BlockParamSpec = {
  key: "direction",
  label: "Direction",
  kind: "direction",
  default: "both",
  options: [
    { value: "long", label: "Long only (bullish)" },
    { value: "short", label: "Short only (bearish)" },
    { value: "both", label: "Both" },
  ],
};

// ── Candle Patterns (14) ─────────────────────────────────────────────

export const CANDLE_BLOCKS: BlockDefinition[] = [
  block({
    id: "candle.pinBar",
    family: "candles", subcategory: "single", name: "Pin Bar / Hammer",
    short: "Long wick with small body — reversal hint.",
    long: "Recognises a pin bar / hammer / shooting-star shape. Tolerance parameters control the body-to-range ratio and minimum wick proportion.",
    userWhy: "A real, well-specified price-action filter. Great companion for RSI extremes or S/R touches.",
    plan: "pro", priority: "P1", complexity: "intermediate",
    affects: ["filter"], tags: ["price-action", "pattern"],
    params: [
      { key: "wickRatio", label: "Wick/body ratio", kind: "number", default: 2,
        validation: [{ kind: "required" }, { kind: "min", value: 1 }, { kind: "step", value: 0.1 }] },
      { key: "maxBodyPct", label: "Max body (% of range)", kind: "number", default: 35, unit: "%",
        validation: [{ kind: "required" }, { kind: "min", value: 5 }, { kind: "max", value: 95 }] },
      DIRECTION,
    ],
  }),
  block({
    id: "candle.doji",
    family: "candles", subcategory: "single", name: "Doji",
    short: "Body smaller than tolerance × range.",
    plan: "pro", priority: "P2", complexity: "basic",
    affects: ["filter"], tags: ["doji"],
    params: [
      { key: "maxBodyPct", label: "Max body (% of range)", kind: "number", default: 10, unit: "%",
        validation: [{ kind: "required" }, { kind: "min", value: 1 }, { kind: "max", value: 50 }] },
    ],
  }),
  block({
    id: "candle.marubozu",
    family: "candles", subcategory: "single", name: "Marubozu",
    short: "Full-body candle (no wicks).",
    plan: "pro", priority: "P2", complexity: "basic",
    affects: ["filter"], tags: ["marubozu"],
    params: [
      { key: "maxWickPct", label: "Max wick (% of range)", kind: "number", default: 5, unit: "%",
        validation: [{ kind: "required" }, { kind: "min", value: 0 }, { kind: "max", value: 30 }] },
      DIRECTION,
    ],
  }),
  block({
    id: "candle.engulfing",
    family: "candles", subcategory: "two-bar", name: "Engulfing",
    short: "Bullish / bearish engulfing.",
    plan: "pro", priority: "P2", complexity: "intermediate",
    affects: ["filter"], tags: ["engulfing"],
    params: [DIRECTION],
  }),
  block({
    id: "candle.harami",
    family: "candles", subcategory: "two-bar", name: "Harami",
    short: "Inside-bar reversal.",
    plan: "creator", priority: "P3", complexity: "intermediate", status: "planned",
    affects: ["filter"], tags: ["harami"],
    params: [DIRECTION],
  }),
  block({
    id: "candle.insideBar",
    family: "candles", subcategory: "two-bar", name: "Inside Bar",
    short: "Current bar fully inside the prior bar.",
    plan: "pro", priority: "P2", complexity: "basic",
    affects: ["filter"], tags: ["inside-bar"],
    params: [],
  }),
  block({
    id: "candle.outsideBar",
    family: "candles", subcategory: "two-bar", name: "Outside Bar",
    short: "Current bar fully engulfs prior bar's range.",
    plan: "pro", priority: "P3", complexity: "basic", status: "planned",
    affects: ["filter"], tags: ["outside-bar"],
    params: [],
  }),
  block({
    id: "candle.morningStar",
    family: "candles", subcategory: "multi-bar", name: "Morning Star",
    short: "3-bar bullish reversal.",
    plan: "creator", priority: "P3", complexity: "advanced", status: "planned",
    affects: ["filter"], tags: ["reversal", "morning-star"],
    params: [],
  }),
  block({
    id: "candle.eveningStar",
    family: "candles", subcategory: "multi-bar", name: "Evening Star",
    short: "3-bar bearish reversal.",
    plan: "creator", priority: "P3", complexity: "advanced", status: "planned",
    affects: ["filter"], tags: ["reversal", "evening-star"],
    params: [],
  }),
  block({
    id: "candle.threeWhiteSoldiers",
    family: "candles", subcategory: "multi-bar", name: "Three White Soldiers",
    short: "Three strong bullish bars in a row.",
    plan: "creator", priority: "P3", complexity: "advanced", status: "planned",
    affects: ["filter"], tags: ["continuation"],
    params: [],
  }),
  block({
    id: "candle.threeBlackCrows",
    family: "candles", subcategory: "multi-bar", name: "Three Black Crows",
    short: "Three strong bearish bars in a row.",
    plan: "creator", priority: "P3", complexity: "advanced", status: "planned",
    affects: ["filter"], tags: ["continuation"],
    params: [],
  }),
  block({
    id: "candle.piercing",
    family: "candles", subcategory: "two-bar", name: "Piercing / Dark Cloud",
    short: "Classic reversal pair.",
    plan: "creator", priority: "P3", complexity: "intermediate", status: "planned",
    affects: ["filter"], tags: ["reversal"], params: [DIRECTION],
  }),
  block({
    id: "candle.tweezer",
    family: "candles", subcategory: "two-bar", name: "Tweezer Top / Bottom",
    short: "Matching wicks reversal.",
    plan: "creator", priority: "P3", complexity: "intermediate", status: "planned",
    affects: ["filter"], tags: ["tweezer"], params: [DIRECTION],
  }),
  block({
    id: "candle.rangeFilter",
    family: "candles", subcategory: "single", name: "Bar Range Filter",
    short: "Bar range must / mustn't exceed threshold (pips).",
    plan: "pro", priority: "P2", complexity: "basic",
    affects: ["filter"], tags: ["range"],
    params: [
      P_PIPS("minRangePips", "Min range", 5),
      P_PIPS("maxRangePips", "Max range", 300),
    ],
  }),
];
