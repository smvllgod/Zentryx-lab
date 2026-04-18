import { block } from "../_factory";
import type { BlockDefinition } from "../types";

// ── Basket / Portfolio (10) ──────────────────────────────────────────

export const BASKET_BLOCKS: BlockDefinition[] = [
  block({
    id: "basket.totalProfitTarget",
    family: "basket", subcategory: "tp", name: "Basket TP ($)",
    short: "Close all once net open profit ≥ $X.",
    plan: "pro", priority: "P2", complexity: "intermediate",
    affects: ["management", "exit"], tags: ["basket", "tp"],
    params: [{ key: "targetDollars", label: "Basket target ($)", kind: "number", default: 50, unit: "$",
      validation: [{ kind: "required" }, { kind: "min", value: 1 }] }],
  }),
  block({
    id: "basket.totalLossStop",
    family: "basket", subcategory: "sl", name: "Basket SL ($)",
    short: "Close all once net open loss ≤ −$X.",
    plan: "pro", priority: "P2", complexity: "intermediate",
    affects: ["management", "exit"], tags: ["basket", "sl"],
    params: [{ key: "lossDollars", label: "Basket SL ($)", kind: "number", default: 100, unit: "$",
      validation: [{ kind: "required" }, { kind: "min", value: 1 }] }],
  }),
  block({
    id: "basket.profitPct",
    family: "basket", subcategory: "tp", name: "Basket TP (%)",
    short: "Close all once basket P/L ≥ X% equity.",
    plan: "pro", priority: "P2", complexity: "intermediate",
    affects: ["management", "exit"], tags: ["basket", "tp"],
    params: [{ key: "targetPercent", label: "Target (%)", kind: "number", default: 1, unit: "%",
      validation: [{ kind: "required" }, { kind: "min", value: 0.1 }, { kind: "step", value: 0.1 }] }],
  }),
  block({
    id: "basket.lossPct",
    family: "basket", subcategory: "sl", name: "Basket SL (%)",
    short: "Close all once basket P/L ≤ −X% equity.",
    plan: "pro", priority: "P2", complexity: "intermediate",
    affects: ["management", "exit"], tags: ["basket", "sl"],
    params: [{ key: "lossPercent", label: "SL (%)", kind: "number", default: 2, unit: "%",
      validation: [{ kind: "required" }, { kind: "min", value: 0.1 }, { kind: "step", value: 0.1 }] }],
  }),
  block({
    id: "basket.lockInProfit",
    family: "basket", subcategory: "behaviour", name: "Lock-In Profit",
    short: "After +X, set basket SL to lock +Y.",
    plan: "creator", priority: "P3", complexity: "advanced", status: "planned",
    affects: ["management"], tags: ["lock-in"],
    params: [
      { key: "triggerPct", label: "Trigger (%)", kind: "number", default: 1 },
      { key: "lockPct", label: "Lock (%)", kind: "number", default: 0.4 },
    ],
  }),
  block({
    id: "basket.hedgedClose",
    family: "basket", subcategory: "behaviour", name: "Close Hedged Pair",
    short: "Close long + short together on condition.",
    plan: "creator", priority: "P3", complexity: "advanced", status: "planned",
    affects: ["management"], tags: ["hedge"], params: [],
  }),
  block({
    id: "basket.symbolGroup",
    family: "basket", subcategory: "scope", name: "Symbol Group",
    short: "Define which symbols share basket rules.",
    plan: "creator", priority: "P3", complexity: "intermediate", status: "planned",
    affects: ["management"], tags: ["scope"],
    params: [
      { key: "symbols", label: "Symbols (comma-separated)", kind: "csv", default: "EURUSD,GBPUSD" },
    ],
  }),
  block({
    id: "basket.correlationCap",
    family: "basket", subcategory: "portfolio", name: "Correlation Cap",
    short: "Cap trades on correlated pairs.",
    plan: "creator", priority: "P3", complexity: "advanced", status: "planned",
    affects: ["filter"], tags: ["correlation"],
    params: [
      { key: "maxCorrelated", label: "Max simultaneous correlated trades", kind: "integer", default: 2,
        validation: [{ kind: "required" }, { kind: "min", value: 1 }, { kind: "max", value: 10 }] },
    ],
  }),
  block({
    id: "basket.magicScope",
    family: "basket", subcategory: "scope", name: "Per-Magic Scope",
    short: "Apply rules only to trades with this magic number.",
    plan: "pro", priority: "P2", complexity: "basic",
    affects: ["management"], tags: ["magic"],
    params: [
      { key: "magic", label: "Magic number", kind: "integer", default: 20260418,
        validation: [{ kind: "min", value: 0 }] },
    ],
  }),
  block({
    id: "basket.emergencyBasket",
    family: "basket", subcategory: "emergency", name: "Basket Emergency Stop",
    short: "Nuke all trades on equity DD threshold.",
    plan: "pro", priority: "P2", complexity: "basic",
    affects: ["management", "exit"], tags: ["emergency"],
    params: [{ key: "maxDdPercent", label: "Max DD (%)", kind: "number", default: 5, unit: "%",
      validation: [{ kind: "required" }, { kind: "min", value: 0.1 }, { kind: "step", value: 0.1 }] }],
  }),
];
