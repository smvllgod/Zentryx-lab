// Small factory to keep family files compact. Every family file calls
// `block({...})` which fills sensible defaults so each entry stays
// readable (5–15 lines) instead of a 40-field object literal.

import type {
  BlockAffect,
  BlockComplexity,
  BlockDefinition,
  BlockFamily,
  BlockParamSpec,
  BlockPlan,
  BlockPriority,
  BlockStatus,
  BlockSurface,
} from "./types";

interface BlockInput {
  id: string;
  family: BlockFamily;
  subcategory: string;
  name: string;
  short: string;
  long?: string;
  userWhy?: string;

  plan?: BlockPlan;
  priority?: BlockPriority;
  complexity?: BlockComplexity;
  surface?: BlockSurface;
  status?: BlockStatus;

  affects?: BlockAffect[];
  mt5?: boolean;
  codegen?: boolean;

  params?: BlockParamSpec[];
  compatibleWith?: BlockFamily[];
  incompatibleWith?: BlockFamily[];
  tags?: string[];
  flags?: string[];
  updatedAt?: string;
}

export function block(input: BlockInput): BlockDefinition {
  const slug = input.id.split(".").pop()!.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()).replace(/^-/, "");
  return {
    id: input.id,
    slug,
    family: input.family,
    subcategory: input.subcategory,
    displayName: input.name,
    shortDescription: input.short,
    longDescription: input.long ?? input.short,
    userExplanation: input.userWhy ?? input.short,
    plan: input.plan ?? "free",
    priority: input.priority ?? "P2",
    complexity: input.complexity ?? "basic",
    surface: input.surface ?? "canvas",
    status: input.status ?? "active",
    affects: input.affects ?? ["filter"],
    requiresMt5Indicator: input.mt5 ?? false,
    producesCode: input.codegen ?? true,
    params: input.params ?? [],
    compatibleWith: input.compatibleWith,
    incompatibleWith: input.incompatibleWith,
    tags: input.tags ?? [],
    flags: input.flags,
    updatedAt: input.updatedAt,
  };
}

// Common param snippets, exported so family files don't re-declare them.
export const P_DIRECTION: BlockParamSpec = {
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

export const P_PERIOD = (
  key: string,
  label: string,
  def: number,
  min = 2,
  max = 500,
): BlockParamSpec => ({
  key,
  label,
  kind: "integer",
  default: def,
  validation: [{ kind: "required" }, { kind: "min", value: min }, { kind: "max", value: max }],
});

export const P_PIPS = (
  key: string,
  label: string,
  def: number,
  { min = 0, max = 10000, step = 0.1 }: { min?: number; max?: number; step?: number } = {},
): BlockParamSpec => ({
  key,
  label,
  kind: "number",
  default: def,
  unit: "pips",
  validation: [
    { kind: "required" },
    { kind: "min", value: min },
    { kind: "max", value: max },
    { kind: "step", value: step },
  ],
});

export const P_PERCENT = (
  key: string,
  label: string,
  def: number,
  { min = 0.01, max = 100 }: { min?: number; max?: number } = {},
): BlockParamSpec => ({
  key,
  label,
  kind: "number",
  default: def,
  unit: "%",
  validation: [
    { kind: "required" },
    { kind: "min", value: min },
    { kind: "max", value: max },
  ],
});

export const P_TIMEFRAME = (
  key = "timeframe",
  label = "Timeframe",
  def = "H4",
): BlockParamSpec => ({
  key,
  label,
  kind: "timeframe",
  default: def,
  options: [
    { value: "M1", label: "M1" },
    { value: "M5", label: "M5" },
    { value: "M15", label: "M15" },
    { value: "M30", label: "M30" },
    { value: "H1", label: "H1" },
    { value: "H4", label: "H4" },
    { value: "D1", label: "D1" },
    { value: "W1", label: "W1" },
  ],
});
