import { getNodeDefinition } from "./nodes";
import type { StrategyGraph, StrategyNode } from "./types";

export type DiagnosticLevel = "error" | "warning" | "info";

export interface Diagnostic {
  level: DiagnosticLevel;
  code: string;
  message: string;
  nodeId?: string;
}

export interface ValidationResult {
  ok: boolean;
  diagnostics: Diagnostic[];
}

// ──────────────────────────────────────────────────────────────────
// Validation engine
// ──────────────────────────────────────────────────────────────────
// Runs over a strategy graph and returns a list of diagnostics.
// Errors block code generation; warnings/info are advisory.
// Each rule is a small pure function so they can be composed/tested.
// ──────────────────────────────────────────────────────────────────

type Rule = (graph: StrategyGraph) => Diagnostic[];

const requireEntry: Rule = (g) => {
  const has = g.nodes.some((n) => n.category === "entry");
  return has
    ? []
    : [{ level: "error", code: "missing_entry", message: "Add at least one Entry node." }];
};

const requireRisk: Rule = (g) => {
  // A strategy needs *either* a risk node (budget declarator) or a lot node
  // (direct sizer) — ideally both, but one is enough to generate valid MQL5.
  const has = g.nodes.some((n) => n.category === "risk" || n.category === "lot");
  return has
    ? []
    : [{ level: "error", code: "missing_risk", message: "Add a Risk or Lot Sizing node so the EA knows your position size." }];
};

const requireExit: Rule = (g) => {
  const has = g.nodes.some((n) => n.category === "exit");
  return has
    ? []
    : [{ level: "warning", code: "missing_exit", message: "No Exit node — trades will rely on broker stop levels only." }];
};

const conflictingRisk: Rule = (g) => {
  const risk = g.nodes.filter((n) => n.category === "risk");
  return risk.length > 1
    ? [{
        level: "error",
        code: "conflicting_risk",
        message: "Only one Risk node may be active. Remove the duplicates.",
        nodeId: risk[1].id,
      }]
    : [];
};

const conflictingLot: Rule = (g) => {
  const lot = g.nodes.filter((n) => n.category === "lot");
  return lot.length > 1
    ? [{
        level: "error",
        code: "conflicting_lot",
        message: "Only one Lot Sizing node may be active. Remove the duplicates.",
        nodeId: lot[1].id,
      }]
    : [];
};

const requiredParamsPresent: Rule = (g) => {
  const out: Diagnostic[] = [];
  for (const node of g.nodes) {
    const def = getNodeDefinition(node.type);
    if (!def) {
      out.push({
        level: "error",
        code: "unknown_node",
        message: `Unknown node type: ${node.type}`,
        nodeId: node.id,
      });
      continue;
    }
    for (const p of def.params) {
      if (!p.required) continue;
      const v = (node.params as Record<string, unknown>)[p.key];
      if (v === undefined || v === null || v === "") {
        out.push({
          level: "error",
          code: "missing_param",
          message: `${def.label}: "${p.label}" is required.`,
          nodeId: node.id,
        });
      }
    }
  }
  return out;
};

const sanityCheckEmaCross: Rule = (g) => {
  const out: Diagnostic[] = [];
  for (const n of g.nodes) {
    if (n.type !== "entry.emaCross") continue;
    const fast = Number((n.params as Record<string, unknown>).fastPeriod);
    const slow = Number((n.params as Record<string, unknown>).slowPeriod);
    if (fast >= slow) {
      out.push({
        level: "error",
        code: "ema_periods_invalid",
        message: "EMA Cross: fast period must be less than slow period.",
        nodeId: n.id,
      });
    }
  }
  return out;
};

const sanityCheckSession: Rule = (g) => {
  const out: Diagnostic[] = [];
  for (const n of g.nodes) {
    if (n.type !== "filter.session") continue;
    const start = Number((n.params as Record<string, unknown>).startHour);
    const end = Number((n.params as Record<string, unknown>).endHour);
    if (start === end) {
      out.push({
        level: "warning",
        code: "session_zero_window",
        message: "Session filter has start == end; the EA will never trade.",
        nodeId: n.id,
      });
    }
  }
  return out;
};

const orphanNodes: Rule = (g) => {
  if (g.nodes.length <= 1) return [];
  const connected = new Set<string>();
  for (const e of g.edges) {
    connected.add(e.source);
    connected.add(e.target);
  }
  const out: Diagnostic[] = [];
  for (const n of g.nodes) {
    if (!connected.has(n.id)) {
      out.push({
        level: "warning",
        code: "orphan_node",
        message: `${labelFor(n)} is not connected to anything.`,
        nodeId: n.id,
      });
    }
  }
  return out;
};

function labelFor(n: StrategyNode): string {
  const def = getNodeDefinition(n.type);
  return n.label ?? def?.label ?? n.type;
}

const RULES: Rule[] = [
  requireEntry,
  requireRisk,
  requireExit,
  conflictingRisk,
  conflictingLot,
  requiredParamsPresent,
  sanityCheckEmaCross,
  sanityCheckSession,
  orphanNodes,
];

export function validateStrategy(graph: StrategyGraph): ValidationResult {
  const diagnostics = RULES.flatMap((r) => r(graph));
  const ok = diagnostics.every((d) => d.level !== "error");
  return { ok, diagnostics };
}
