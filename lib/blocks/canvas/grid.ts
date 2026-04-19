import { block, P_PIPS, P_PERIOD } from "../_factory";
import type { BlockDefinition } from "../types";

// ── Grid / Recovery (9) ──────────────────────────────────────────────

export const GRID_BLOCKS: BlockDefinition[] = [
  block({
    id: "grid.basic",
    family: "grid", subcategory: "grid", name: "Basic Grid",
    short: "Add positions every N pips against DD.",
    long: "Adds positions at fixed pip intervals against open drawdown. Hard-cap enforced via `maxOrders`.",
    userWhy: "Classic grid. High risk — always pair with an emergency stop.",
    plan: "pro", priority: "P1", complexity: "intermediate",
    affects: ["management"], tags: ["grid"],
    params: [
      P_PIPS("stepPips", "Grid step", 30, { min: 5 }),
      { key: "maxOrders", label: "Max orders", kind: "integer", default: 5,
        validation: [{ kind: "required" }, { kind: "min", value: 2 }, { kind: "max", value: 30 }] },
      { key: "lotMultiplier", label: "Lot multiplier", kind: "number", default: 1,
        validation: [{ kind: "required" }, { kind: "min", value: 1 }, { kind: "max", value: 3 }, { kind: "step", value: 0.1 }] },
    ],
  }),
  block({
    id: "grid.atrSpaced",
    family: "grid", subcategory: "grid", name: "ATR-Spaced Grid",
    short: "Grid step = k × ATR.",
    plan: "pro", priority: "P2", complexity: "intermediate",
    affects: ["management"], mt5: true, tags: ["grid", "atr"],
    params: [
      P_PERIOD("atrPeriod", "ATR period", 14, 1),
      { key: "multiplier", label: "ATR multiplier", kind: "number", default: 1.5,
        validation: [{ kind: "required" }, { kind: "min", value: 0.1 }, { kind: "step", value: 0.1 }] },
      { key: "maxOrders", label: "Max orders", kind: "integer", default: 5,
        validation: [{ kind: "required" }, { kind: "min", value: 2 }, { kind: "max", value: 30 }] },
    ],
  }),
  block({
    id: "grid.martingaleGrid",
    family: "grid", subcategory: "recovery", name: "Martingale Grid",
    short: "Grid with lot multiplier (capped).",
    plan: "creator", priority: "P3", complexity: "advanced",
    affects: ["management"], tags: ["martingale", "grid", "risky"],
    params: [
      P_PIPS("stepPips", "Grid step", 30, { min: 5 }),
      { key: "multiplier", label: "Lot multiplier", kind: "number", default: 1.5,
        validation: [{ kind: "required" }, { kind: "min", value: 1 }, { kind: "max", value: 3 }, { kind: "step", value: 0.1 }] },
      { key: "maxOrders", label: "Max orders", kind: "integer", default: 4,
        validation: [{ kind: "required" }, { kind: "min", value: 2 }, { kind: "max", value: 6 }] },
    ],
  }),
  block({
    id: "grid.antiGrid",
    family: "grid", subcategory: "grid", name: "Anti-Grid (Reverse)",
    short: "Grid in the direction of trend.",
    plan: "creator", priority: "P3", complexity: "advanced",
    affects: ["management"], tags: ["grid"], params: [],
  }),
  block({
    id: "grid.pyramidGrid",
    family: "grid", subcategory: "recovery", name: "Pyramid Grid (profit-only)",
    short: "Add only while in profit.",
    plan: "creator", priority: "P3", complexity: "advanced",
    affects: ["management"], tags: ["pyramid", "grid"],
    params: [P_PIPS("stepPips", "Step", 15, { min: 5 })],
  }),
  block({
    id: "grid.averagingDown",
    family: "grid", subcategory: "recovery", name: "Simple Averaging",
    short: "Fixed-lot averaging down, capped.",
    plan: "creator", priority: "P3", complexity: "intermediate",
    affects: ["management"], tags: ["averaging"],
    params: [P_PIPS("stepPips", "Step", 40, { min: 5 })],
  }),
  block({
    id: "grid.recoveryOnOppositeSig",
    family: "grid", subcategory: "recovery", name: "Recovery on Opposite Signal",
    short: "Add against trend on entry-rule flip.",
    plan: "creator", priority: "P3", complexity: "advanced",
    affects: ["management"], tags: ["recovery"], params: [],
  }),
  block({
    id: "grid.hedgeRecovery",
    family: "grid", subcategory: "recovery", name: "Hedge Recovery",
    short: "Open inverse position when DD > threshold.",
    plan: "creator", priority: "P3", complexity: "advanced",
    affects: ["management"], tags: ["hedge"],
    params: [{ key: "triggerDdPct", label: "Trigger DD (%)", kind: "number", default: 2,
      validation: [{ kind: "required" }, { kind: "min", value: 0.1 }, { kind: "step", value: 0.1 }] }],
  }),
  block({
    id: "grid.smartClose",
    family: "grid", subcategory: "exit", name: "Smart Grid Close",
    short: "Close entire grid at computed BE + target.",
    plan: "creator", priority: "P3", complexity: "advanced",
    affects: ["management", "exit"], tags: ["grid", "close"],
    params: [{ key: "targetDollars", label: "Close at profit ($)", kind: "number", default: 30, unit: "$",
      validation: [{ kind: "required" }, { kind: "min", value: 1 }] }],
  }),
];
