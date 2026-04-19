import { block, P_PERCENT, P_PERIOD } from "../_factory";
import type { BlockDefinition } from "../types";

// ── Risk Models (8) ──────────────────────────────────────────────────

export const RISK_BLOCKS: BlockDefinition[] = [
  block({
    id: "risk.fixedRisk",
    family: "risk", subcategory: "budget", name: "Fixed-Risk per Trade",
    short: "Risk X% of equity per trade.",
    long: "Declares a per-trade risk budget. A Lot Sizing block is still required to convert this into a concrete lot size.",
    userWhy: "The industry-standard risk model. Works for 95% of retail traders.",
    plan: "pro", priority: "P1", complexity: "basic",
    affects: ["risk"], tags: ["risk", "percent"],
    params: [P_PERCENT("riskPercent", "Risk per trade", 1, { min: 0.01, max: 10 })],
  }),
  block({
    id: "risk.fixedCashRisk",
    family: "risk", subcategory: "budget", name: "Fixed Cash Risk",
    short: "Risk $X per trade (balance-independent).",
    plan: "pro", priority: "P1", complexity: "basic",
    affects: ["risk"], tags: ["risk", "cash"],
    params: [
      { key: "riskDollars", label: "Risk per trade ($)", kind: "number", default: 20, unit: "$",
        validation: [{ kind: "required" }, { kind: "min", value: 0.01 }] },
    ],
  }),
  block({
    id: "risk.kellyFraction",
    family: "risk", subcategory: "budget", name: "Kelly Fraction",
    short: "Size by (fractional) Kelly. Experimental.",
    plan: "creator", priority: "P3", complexity: "advanced",
    affects: ["risk"], tags: ["kelly"],
    params: [
      { key: "fraction", label: "Kelly fraction", kind: "number", default: 0.25,
        validation: [{ kind: "required" }, { kind: "min", value: 0.05 }, { kind: "max", value: 1 }, { kind: "step", value: 0.05 }] },
    ],
  }),
  block({
    id: "risk.atrRisk",
    family: "risk", subcategory: "budget", name: "ATR-Based Risk",
    short: "Risk X% where SL = k × ATR.",
    plan: "pro", priority: "P2", complexity: "intermediate",
    affects: ["risk"], mt5: true, tags: ["risk", "atr"],
    params: [
      P_PERCENT("riskPercent", "Risk per trade", 1, { min: 0.01, max: 10 }),
      P_PERIOD("atrPeriod", "ATR period", 14, 1),
      { key: "atrMultiplier", label: "ATR multiplier (SL distance)", kind: "number", default: 2,
        validation: [{ kind: "required" }, { kind: "min", value: 0.1 }, { kind: "step", value: 0.1 }] },
    ],
  }),
  block({
    id: "risk.dailyRiskBudget",
    family: "risk", subcategory: "budget", name: "Daily Risk Budget",
    short: "Max Y% risk allocated per day across trades.",
    long: "Hard cap on total risk opened in a single day. Once the budget is consumed, further entries are blocked until midnight server time.",
    userWhy: "Prop-firm compatible daily risk cap. Crucial guard-rail.",
    plan: "pro", priority: "P1", complexity: "intermediate",
    affects: ["risk"], tags: ["risk", "daily"],
    params: [P_PERCENT("maxDailyRisk", "Max daily risk", 3, { min: 0.1, max: 50 })],
  }),
  block({
    id: "risk.weeklyRiskBudget",
    family: "risk", subcategory: "budget", name: "Weekly Risk Budget",
    short: "Mirror daily — but weekly.",
    plan: "creator", priority: "P2", complexity: "intermediate",
    affects: ["risk"], tags: ["risk", "weekly"],
    params: [P_PERCENT("maxWeeklyRisk", "Max weekly risk", 8, { min: 0.1, max: 100 })],
  }),
  block({
    id: "risk.drawdownScale",
    family: "risk", subcategory: "adaptive", name: "Drawdown Risk Scaler",
    short: "Auto-reduce risk after X% open DD.",
    plan: "creator", priority: "P3", complexity: "advanced",
    affects: ["risk"], tags: ["drawdown", "adaptive"],
    params: [
      P_PERCENT("triggerDdPercent", "Trigger DD", 5, { min: 0.1, max: 50 }),
      P_PERCENT("scaleFactor", "Risk scale factor", 50, { min: 10, max: 100 }),
    ],
  }),
  block({
    id: "risk.equityCurveStop",
    family: "risk", subcategory: "adaptive", name: "Equity-Curve Kill Switch",
    short: "Stop trading when equity curve breaks its own MA.",
    plan: "creator", priority: "P3", complexity: "advanced",
    affects: ["risk"], tags: ["equity-curve"],
    params: [P_PERIOD("maPeriod", "Equity-curve MA", 20, 5)],
  }),
];
