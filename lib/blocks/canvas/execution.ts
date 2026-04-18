import { block } from "../_factory";
import type { BlockDefinition } from "../types";

// ── Spread / Execution Filters (8) ───────────────────────────────────

export const EXECUTION_BLOCKS: BlockDefinition[] = [
  block({
    id: "exec.spreadLimit",
    family: "execution", subcategory: "spread", name: "Max Spread",
    short: "Skip entries when spread exceeds limit.",
    long: "Hard cap on entry spread, in MT5 points (one tenth of a pip on 5-digit brokers).",
    userWhy: "Single best defence against bad fills. Every strategy needs one.",
    plan: "free", priority: "P1", complexity: "basic",
    affects: ["filter"], tags: ["spread", "execution"],
    params: [
      { key: "maxSpreadPoints", label: "Max spread (points)", kind: "integer", default: 30, unit: "points",
        validation: [{ kind: "required" }, { kind: "min", value: 1 }, { kind: "max", value: 10000 }] },
    ],
  }),
  block({
    id: "exec.spreadRatio",
    family: "execution", subcategory: "spread", name: "Spread / ATR Ratio",
    short: "Block entries when spread > k × ATR.",
    plan: "pro", priority: "P2", complexity: "intermediate",
    affects: ["filter"], mt5: true, tags: ["spread", "atr"],
    params: [
      { key: "atrPeriod", label: "ATR period", kind: "integer", default: 14,
        validation: [{ kind: "required" }, { kind: "min", value: 1 }] },
      { key: "maxRatio", label: "Max spread / ATR", kind: "number", default: 0.15,
        validation: [{ kind: "required" }, { kind: "min", value: 0.01 }, { kind: "step", value: 0.01 }] },
    ],
  }),
  block({
    id: "exec.slippageControl",
    family: "execution", subcategory: "slippage", name: "Max Slippage",
    short: "Reject orders over N points of slippage.",
    long: "Passed to OrderSend deviation. Orders exceeding slippage are simply rejected by the broker.",
    userWhy: "Second line of defence against fills in fast markets.",
    plan: "free", priority: "P1", complexity: "basic",
    affects: ["filter"], tags: ["slippage"],
    params: [
      { key: "maxSlippagePoints", label: "Max slippage (points)", kind: "integer", default: 10, unit: "points",
        validation: [{ kind: "required" }, { kind: "min", value: 0 }, { kind: "max", value: 10000 }] },
    ],
  }),
  block({
    id: "exec.minStopsLevel",
    family: "execution", subcategory: "broker", name: "Broker Stops-Level Check",
    short: "Respect broker min-stop distance on SL/TP.",
    plan: "pro", priority: "P2", complexity: "intermediate",
    affects: ["filter"], tags: ["broker"], params: [],
  }),
  block({
    id: "exec.freezeLevel",
    family: "execution", subcategory: "broker", name: "Freeze-Level Check",
    short: "Block modifications within freeze level.",
    plan: "pro", priority: "P3", complexity: "intermediate", status: "planned",
    affects: ["filter"], tags: ["broker"], params: [],
  }),
  block({
    id: "exec.minEquity",
    family: "execution", subcategory: "account", name: "Minimum Equity",
    short: "Block entries below equity floor.",
    plan: "pro", priority: "P2", complexity: "basic",
    affects: ["filter"], tags: ["equity"],
    params: [
      { key: "floor", label: "Equity floor ($)", kind: "number", default: 100, unit: "$",
        validation: [{ kind: "required" }, { kind: "min", value: 0 }] },
    ],
  }),
  block({
    id: "exec.marginLevelFloor",
    family: "execution", subcategory: "account", name: "Margin-Level Floor",
    short: "Block new trades if margin-level% < threshold.",
    plan: "pro", priority: "P2", complexity: "intermediate",
    affects: ["filter"], tags: ["margin"],
    params: [
      { key: "minMarginLevel", label: "Min margin-level (%)", kind: "number", default: 200, unit: "%",
        validation: [{ kind: "required" }, { kind: "min", value: 50 }, { kind: "max", value: 10000 }] },
    ],
  }),
  block({
    id: "exec.symbolWhitelist",
    family: "execution", subcategory: "broker", name: "Allowed Symbols",
    short: "Only run on symbols in the list.",
    plan: "pro", priority: "P2", complexity: "basic",
    affects: ["filter"], tags: ["symbols"],
    params: [
      { key: "symbols", label: "Symbols (comma-separated)", kind: "csv", default: "EURUSD,GBPUSD,USDJPY,XAUUSD" },
    ],
  }),
];
