import { block, P_PIPS, P_PERIOD } from "../_factory";
import type { BlockDefinition } from "../types";

// ── Trade Management (14) ────────────────────────────────────────────

export const MANAGEMENT_BLOCKS: BlockDefinition[] = [
  block({
    id: "manage.breakEven",
    family: "management", subcategory: "sl", name: "Break-Even",
    short: "Move SL to entry after +X pips.",
    long: "Moves the stop loss to entry (+ optional offset) once price advances by the trigger distance.",
    userWhy: "The default trade-management move. Adds survivability without changing trade selection.",
    plan: "free", priority: "P1", complexity: "basic",
    affects: ["management"], tags: ["break-even", "management"],
    params: [
      P_PIPS("triggerPips", "Trigger", 10, { min: 1 }),
      P_PIPS("offsetPips", "Offset", 1, { min: 0 }),
    ],
  }),
  block({
    id: "manage.breakEvenAtrMulti",
    family: "management", subcategory: "sl", name: "ATR-Multiple Break-Even",
    short: "BE when profit ≥ k × ATR.",
    plan: "pro", priority: "P2", complexity: "intermediate",
    affects: ["management"], mt5: true, tags: ["break-even", "atr"],
    params: [
      P_PERIOD("atrPeriod", "ATR period", 14, 1),
      { key: "multiplier", label: "ATR multiplier (trigger)", kind: "number", default: 1,
        validation: [{ kind: "required" }, { kind: "min", value: 0.1 }, { kind: "step", value: 0.1 }] },
    ],
  }),
  block({
    id: "manage.trailingStop",
    family: "management", subcategory: "trail", name: "Trailing Stop (fixed pips)",
    short: "Step-trail after activation.",
    long: "Activates once in profit, then advances the stop every time price makes a new high (long) or low (short).",
    userWhy: "Locks in gains without a fixed TP.",
    plan: "pro", priority: "P1", complexity: "intermediate",
    affects: ["management"], tags: ["trailing", "management"],
    params: [
      P_PIPS("activationPips", "Activate after", 15, { min: 0 }),
      P_PIPS("trailingPips", "Trail distance", 10, { min: 1 }),
    ],
  }),
  block({
    id: "manage.trailingStopAtr",
    family: "management", subcategory: "trail", name: "ATR Trailing Stop",
    short: "Trail by k × ATR.",
    long: "ATR-aware trailing stop — scales automatically with volatility.",
    userWhy: "The professional default. Adapts to quiet and wild markets.",
    plan: "pro", priority: "P1", complexity: "intermediate",
    affects: ["management"], mt5: true, tags: ["trailing", "atr"],
    params: [
      P_PERIOD("period", "ATR period", 14, 1),
      { key: "multiplier", label: "ATR multiplier", kind: "number", default: 2.5,
        validation: [{ kind: "required" }, { kind: "min", value: 0.1 }, { kind: "step", value: 0.1 }] },
    ],
  }),
  block({
    id: "manage.chandelierTrail",
    family: "management", subcategory: "trail", name: "Chandelier Trailing",
    short: "Highest-high minus k × ATR.",
    plan: "creator", priority: "P2", complexity: "advanced",
    affects: ["management"], mt5: true, tags: ["trailing", "chandelier"],
    params: [
      P_PERIOD("period", "Lookback (bars)", 22, 5),
      { key: "multiplier", label: "ATR multiplier", kind: "number", default: 3,
        validation: [{ kind: "required" }, { kind: "min", value: 0.5 }, { kind: "step", value: 0.1 }] },
    ],
  }),
  block({
    id: "manage.percentTrail",
    family: "management", subcategory: "trail", name: "Percent Trailing",
    short: "Trail at X% of price.",
    plan: "pro", priority: "P2", complexity: "intermediate",
    affects: ["management"], tags: ["trailing", "percent"],
    params: [
      { key: "trailPct", label: "Trail (%)", kind: "number", default: 0.5, unit: "%",
        validation: [{ kind: "required" }, { kind: "min", value: 0.01 }, { kind: "step", value: 0.01 }] },
    ],
  }),
  block({
    id: "manage.stepTrail",
    family: "management", subcategory: "trail", name: "Step (Ratchet) Trail",
    short: "Advance SL every +N pips.",
    plan: "pro", priority: "P2", complexity: "intermediate",
    affects: ["management"], tags: ["trailing", "step"],
    params: [
      P_PIPS("stepPips", "Step", 10, { min: 1 }),
    ],
  }),
  block({
    id: "manage.partialClose",
    family: "management", subcategory: "partial", name: "Partial Close",
    short: "Close X% at first TP.",
    long: "At the first-TP trigger, close a percentage of the position. Useful with a trailing stop on the runner.",
    userWhy: "Real-world 'book half, trail the rest' flow.",
    plan: "pro", priority: "P1", complexity: "intermediate",
    affects: ["management"], tags: ["partial", "take-profit"],
    params: [
      P_PIPS("firstTpPips", "First TP", 20, { min: 1 }),
      { key: "closePercent", label: "Close portion", kind: "number", default: 50, unit: "%",
        validation: [{ kind: "required" }, { kind: "min", value: 1 }, { kind: "max", value: 99 }] },
    ],
  }),
  block({
    id: "manage.partialCloseAtr",
    family: "management", subcategory: "partial", name: "ATR Partial Close",
    short: "Close X% when profit ≥ k × ATR.",
    plan: "pro", priority: "P2", complexity: "intermediate",
    affects: ["management"], mt5: true, tags: ["partial", "atr"],
    params: [
      P_PERIOD("atrPeriod", "ATR period", 14, 1),
      { key: "multiplier", label: "ATR multiplier (trigger)", kind: "number", default: 1,
        validation: [{ kind: "required" }, { kind: "min", value: 0.1 }, { kind: "step", value: 0.1 }] },
      { key: "closePercent", label: "Close portion", kind: "number", default: 50, unit: "%",
        validation: [{ kind: "required" }, { kind: "min", value: 1 }, { kind: "max", value: 99 }] },
    ],
  }),
  block({
    id: "manage.pyramiding",
    family: "management", subcategory: "scale-in", name: "Pyramiding",
    short: "Add every N pips in-profit (capped).",
    plan: "creator", priority: "P3", complexity: "advanced", status: "planned",
    affects: ["management"], tags: ["pyramiding"],
    params: [
      P_PIPS("stepPips", "Step", 20, { min: 1 }),
      { key: "maxAdds", label: "Max adds", kind: "integer", default: 3,
        validation: [{ kind: "required" }, { kind: "min", value: 1 }, { kind: "max", value: 10 }] },
    ],
  }),
  block({
    id: "manage.antiPyramiding",
    family: "management", subcategory: "scale-out", name: "Scale-Out on Weakness",
    short: "Reduce size when momentum fades.",
    plan: "creator", priority: "P3", complexity: "advanced", status: "planned",
    affects: ["management"], tags: ["scale-out"], params: [],
  }),
  block({
    id: "manage.reentryCooldown",
    family: "management", subcategory: "behaviour", name: "Re-entry Cooldown",
    short: "Block reopen for N minutes after close.",
    plan: "free", priority: "P2", complexity: "basic",
    affects: ["management"], tags: ["cooldown"],
    params: [
      { key: "minutes", label: "Cooldown (min)", kind: "integer", default: 15, unit: "min",
        validation: [{ kind: "required" }, { kind: "min", value: 1 }] },
    ],
  }),
  block({
    id: "manage.hedgeAgainstDd",
    family: "management", subcategory: "hedge", name: "Hedge Against Drawdown",
    short: "Open inverse trade if DD > threshold.",
    plan: "creator", priority: "P3", complexity: "advanced", status: "planned",
    affects: ["management"], tags: ["hedge"],
    params: [
      { key: "ddPercent", label: "Trigger DD (%)", kind: "number", default: 3,
        validation: [{ kind: "required" }, { kind: "min", value: 0.1 }, { kind: "step", value: 0.1 }] },
    ],
  }),
  block({
    id: "manage.convertToBreakEven",
    family: "management", subcategory: "sl", name: "Smart BE on Opposite Signal",
    short: "BE+offset once opposing signal appears.",
    plan: "creator", priority: "P3", complexity: "advanced", status: "planned",
    affects: ["management"], tags: ["break-even", "smart"],
    params: [P_PIPS("offsetPips", "Offset", 1, { min: 0 })],
  }),
];
