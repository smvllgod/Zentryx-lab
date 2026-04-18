import { block } from "../_factory";
import type { BlockDefinition } from "../types";

// ── Lot Sizing (10) ──────────────────────────────────────────────────

export const LOT_BLOCKS: BlockDefinition[] = [
  block({
    id: "lot.fixed",
    family: "lot", subcategory: "flat", name: "Fixed Lot",
    short: "Always trade the same lot size.",
    long: "Trivial — always sends the same lot to OrderSend. Required pair for the Fixed-Risk model if you want predictable sizing.",
    userWhy: "Simplest possible lot block. Ideal for early testing.",
    plan: "free", priority: "P1", complexity: "basic",
    affects: ["risk"], tags: ["lot", "fixed"],
    params: [
      { key: "lots", label: "Lot size", kind: "number", default: 0.1,
        validation: [{ kind: "required" }, { kind: "min", value: 0.01 }, { kind: "step", value: 0.01 }] },
    ],
  }),
  block({
    id: "lot.perBalance",
    family: "lot", subcategory: "scaled", name: "Lot per Balance",
    short: "lot = base × (balance / $1000).",
    plan: "free", priority: "P1", complexity: "basic",
    affects: ["risk"], tags: ["lot", "scaled"],
    params: [
      { key: "baseLot", label: "Base lot per $1,000", kind: "number", default: 0.1,
        validation: [{ kind: "required" }, { kind: "min", value: 0.01 }, { kind: "step", value: 0.01 }] },
      { key: "minLot", label: "Min lot", kind: "number", default: 0.01,
        validation: [{ kind: "min", value: 0.01 }, { kind: "step", value: 0.01 }] },
    ],
  }),
  block({
    id: "lot.fromRisk",
    family: "lot", subcategory: "risk-aware", name: "Lot From Risk %",
    short: "Lot derived from risk % and SL distance.",
    long: "Computes lot such that SL distance × pip-value × lot = risk% × equity. The gold standard — keeps risk constant across SL sizes.",
    userWhy: "Converts a Fixed-Risk or ATR-Risk model into an exact lot. Essential for consistent position sizing.",
    plan: "pro", priority: "P1", complexity: "intermediate",
    affects: ["risk"], tags: ["lot", "risk"], params: [],
  }),
  block({
    id: "lot.fromCashRisk",
    family: "lot", subcategory: "risk-aware", name: "Lot From Cash Risk",
    short: "Lot derived from fixed $risk and SL.",
    plan: "pro", priority: "P1", complexity: "intermediate",
    affects: ["risk"], tags: ["lot", "cash"], params: [],
  }),
  block({
    id: "lot.fixedRatio",
    family: "lot", subcategory: "anti-martin", name: "Fixed Ratio (Ryan Jones)",
    short: "Scale lots per delta-dollars equity gain.",
    plan: "creator", priority: "P3", complexity: "advanced", status: "planned",
    affects: ["risk"], tags: ["lot", "ratio"],
    params: [
      { key: "baseLot", label: "Base lot", kind: "number", default: 0.1,
        validation: [{ kind: "required" }, { kind: "min", value: 0.01 }, { kind: "step", value: 0.01 }] },
      { key: "deltaDollars", label: "Delta ($ per step)", kind: "number", default: 500,
        validation: [{ kind: "required" }, { kind: "min", value: 50 }] },
    ],
  }),
  block({
    id: "lot.antiMartingale",
    family: "lot", subcategory: "anti-martin", name: "Anti-Martingale",
    short: "Scale up after wins, reset after losses.",
    plan: "creator", priority: "P3", complexity: "advanced", status: "planned",
    affects: ["risk"], tags: ["lot", "anti-martingale"],
    params: [
      { key: "baseLot", label: "Base lot", kind: "number", default: 0.1 },
      { key: "multiplier", label: "Multiplier per win", kind: "number", default: 1.5,
        validation: [{ kind: "required" }, { kind: "min", value: 1 }, { kind: "step", value: 0.1 }] },
      { key: "maxLot", label: "Max lot (cap)", kind: "number", default: 1.0 },
    ],
  }),
  block({
    id: "lot.martingale",
    family: "lot", subcategory: "martin", name: "Martingale (guarded)",
    short: "Multiplier after losses — hard-capped.",
    plan: "creator", priority: "P3", complexity: "advanced", status: "planned",
    affects: ["risk"], tags: ["lot", "martingale", "risky"],
    params: [
      { key: "baseLot", label: "Base lot", kind: "number", default: 0.05 },
      { key: "multiplier", label: "Multiplier after loss", kind: "number", default: 2,
        validation: [{ kind: "required" }, { kind: "min", value: 1 }, { kind: "max", value: 3 }, { kind: "step", value: 0.1 }] },
      { key: "maxSteps", label: "Max consecutive multiplications", kind: "integer", default: 3,
        validation: [{ kind: "required" }, { kind: "min", value: 1 }, { kind: "max", value: 6 }] },
    ],
  }),
  block({
    id: "lot.volatilityScaled",
    family: "lot", subcategory: "vol-aware", name: "Volatility-Scaled Lot",
    short: "Target constant cash risk via ATR.",
    plan: "pro", priority: "P2", complexity: "intermediate",
    affects: ["risk"], mt5: true, tags: ["lot", "atr"],
    params: [
      { key: "targetRiskPercent", label: "Target risk (%)", kind: "number", default: 1,
        validation: [{ kind: "required" }, { kind: "min", value: 0.1 }, { kind: "max", value: 10 }, { kind: "step", value: 0.1 }] },
      { key: "atrPeriod", label: "ATR period", kind: "integer", default: 14,
        validation: [{ kind: "required" }, { kind: "min", value: 1 }] },
    ],
  }),
  block({
    id: "lot.equityTiered",
    family: "lot", subcategory: "tiered", name: "Tiered by Equity",
    short: "Different base lots by equity brackets.",
    plan: "pro", priority: "P2", complexity: "intermediate",
    affects: ["risk"], tags: ["lot", "tiered"],
    params: [
      { key: "tiers", label: "Tiers (JSON)", kind: "string", default: '[{"min":0,"lot":0.01},{"min":1000,"lot":0.05},{"min":5000,"lot":0.2}]', advanced: true },
    ],
  }),
  block({
    id: "lot.percentOfAccount",
    family: "lot", subcategory: "flat", name: "Percent of Account",
    short: "lot = (equity × %) / contract-size.",
    plan: "pro", priority: "P2", complexity: "basic",
    affects: ["risk"], tags: ["lot", "percent"],
    params: [
      { key: "percent", label: "% of account", kind: "number", default: 2, unit: "%",
        validation: [{ kind: "required" }, { kind: "min", value: 0.1 }, { kind: "max", value: 100 }, { kind: "step", value: 0.1 }] },
    ],
  }),
];
