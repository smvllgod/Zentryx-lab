import { block, P_PERIOD, P_TIMEFRAME } from "../_factory";
import type { BlockDefinition } from "../types";

// ── Multi-Timeframe (8) ──────────────────────────────────────────────

export const MTF_BLOCKS: BlockDefinition[] = [
  block({
    id: "mtf.higherTfAlignment",
    family: "mtf", subcategory: "direction", name: "Higher-TF Trend Alignment",
    short: "Higher-TF MA alignment with direction.",
    long: "Reads an EMA/SMA on a higher TF and requires its slope to match the intended trade direction.",
    userWhy: "Stops counter-trend sniping — one of the highest-impact filters you can add.",
    plan: "pro", priority: "P1", complexity: "intermediate",
    affects: ["filter"], mt5: true, tags: ["mtf", "trend"],
    params: [
      P_TIMEFRAME("timeframe", "Higher timeframe", "H4"),
      { key: "maType", label: "MA type", kind: "select", default: "ema",
        options: [{ value: "ema", label: "EMA" }, { value: "sma", label: "SMA" }] },
      P_PERIOD("period", "Period", 50, 2),
    ],
  }),
  block({
    id: "mtf.higherTfRsi",
    family: "mtf", subcategory: "momentum", name: "Higher-TF RSI",
    short: "RSI at higher TF must match direction.",
    plan: "pro", priority: "P2", complexity: "intermediate",
    affects: ["filter"], mt5: true, tags: ["mtf", "rsi"],
    params: [P_TIMEFRAME("timeframe", "Higher timeframe", "H4"), P_PERIOD("period", "RSI period", 14, 2)],
  }),
  block({
    id: "mtf.higherTfMacd",
    family: "mtf", subcategory: "momentum", name: "Higher-TF MACD",
    short: "MACD sign on higher TF agrees.",
    plan: "pro", priority: "P2", complexity: "intermediate",
    affects: ["filter"], mt5: true, tags: ["mtf", "macd"],
    params: [
      P_TIMEFRAME("timeframe", "Higher timeframe", "H4"),
      P_PERIOD("fastPeriod", "Fast EMA", 12, 2),
      P_PERIOD("slowPeriod", "Slow EMA", 26, 2),
      P_PERIOD("signalPeriod", "Signal", 9, 1),
    ],
  }),
  block({
    id: "mtf.lowerTfTrigger",
    family: "mtf", subcategory: "trigger", name: "Lower-TF Trigger",
    short: "Require a matching trigger on a lower TF.",
    plan: "creator", priority: "P3", complexity: "advanced", status: "beta",
    affects: ["filter"], mt5: true, tags: ["mtf"],
    params: [P_TIMEFRAME("timeframe", "Lower timeframe", "M5")],
  }),
  block({
    id: "mtf.dailyBias",
    family: "mtf", subcategory: "bias", name: "Daily Bias",
    short: "Daily close > / < daily open.",
    plan: "pro", priority: "P2", complexity: "intermediate",
    affects: ["filter"], mt5: true, tags: ["bias", "daily"],
    params: [],
  }),
  block({
    id: "mtf.weeklyBias",
    family: "mtf", subcategory: "bias", name: "Weekly Bias",
    short: "Weekly direction gate.",
    plan: "creator", priority: "P3", complexity: "intermediate", status: "beta",
    affects: ["filter"], mt5: true, tags: ["bias", "weekly"],
    params: [],
  }),
  block({
    id: "mtf.htfStructure",
    family: "mtf", subcategory: "structure", name: "HTF Market Structure",
    short: "HTF HH / LL required.",
    plan: "creator", priority: "P3", complexity: "advanced", status: "beta",
    affects: ["filter"], tags: ["mtf", "structure"],
    params: [P_TIMEFRAME("timeframe", "Higher timeframe", "H4")],
  }),
  block({
    id: "mtf.htfVolatility",
    family: "mtf", subcategory: "volatility", name: "HTF Volatility Regime",
    short: "ATR on HTF must be within band.",
    plan: "creator", priority: "P3", complexity: "advanced", status: "beta",
    affects: ["filter"], mt5: true, tags: ["mtf", "atr"],
    params: [P_TIMEFRAME("timeframe", "Higher timeframe", "H4"), P_PERIOD("period", "ATR period", 14, 1)],
  }),
];
