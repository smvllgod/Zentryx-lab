// Declarative param validation. Each BlockParamSpec carries a list of
// ValidationRules — the engine evaluates them and returns typed errors.

import { getBlock } from "./registry";
import type { BlockParamSpec, ValidationRule } from "./types";

export interface ParamValidationError {
  paramKey: string;
  ruleKind: ValidationRule["kind"];
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ParamValidationError[];
}

export function validateBlockParams(
  blockId: string,
  params: Record<string, unknown>,
): ValidationResult {
  const def = getBlock(blockId);
  if (!def) {
    return {
      ok: false,
      errors: [{ paramKey: "*", ruleKind: "required", message: `Unknown block: ${blockId}` }],
    };
  }
  const errors: ParamValidationError[] = [];
  for (const p of def.params) {
    const value = params[p.key];
    for (const rule of p.validation ?? []) {
      const err = applyRule(p, rule, value, params);
      if (err) errors.push(err);
    }
  }
  return { ok: errors.length === 0, errors };
}

function applyRule(
  p: BlockParamSpec,
  rule: ValidationRule,
  value: unknown,
  allParams: Record<string, unknown>,
): ParamValidationError | null {
  const fail = (message: string): ParamValidationError => ({
    paramKey: p.key,
    ruleKind: rule.kind,
    message: rule.message ?? message,
  });

  switch (rule.kind) {
    case "required":
      if (value === null || value === undefined || value === "") return fail(`${p.label} is required.`);
      return null;
    case "min":
      if (typeof value === "number" && value < rule.value) return fail(`${p.label} must be ≥ ${rule.value}.`);
      return null;
    case "max":
      if (typeof value === "number" && value > rule.value) return fail(`${p.label} must be ≤ ${rule.value}.`);
      return null;
    case "step":
      if (typeof value === "number") {
        const epsilon = 1e-9;
        const ratio = value / rule.value;
        if (Math.abs(ratio - Math.round(ratio)) > epsilon) {
          return fail(`${p.label} must be a multiple of ${rule.value}.`);
        }
      }
      return null;
    case "lessThan": {
      const other = allParams[rule.otherKey];
      if (typeof value === "number" && typeof other === "number" && !(value < other)) {
        return fail(`${p.label} must be less than ${rule.otherKey}.`);
      }
      return null;
    }
    case "greaterThan": {
      const other = allParams[rule.otherKey];
      if (typeof value === "number" && typeof other === "number" && !(value > other)) {
        return fail(`${p.label} must be greater than ${rule.otherKey}.`);
      }
      return null;
    }
    case "oneOf":
      if (value !== null && value !== undefined && !rule.values.includes(value as string | number)) {
        return fail(`${p.label} is not a valid option.`);
      }
      return null;
    case "regex":
      if (typeof value === "string" && !new RegExp(rule.pattern).test(value)) {
        return fail(`${p.label} is not in the expected format.`);
      }
      return null;
    case "custom":
      // Custom rules live in lib/blocks/rules/*.ts — resolved by id.
      return null;
  }
}
