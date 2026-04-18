import type { NodeType, StrategyGraph, StrategyNode } from "@/lib/strategies/types";
import type { Diagnostic } from "@/lib/strategies/validators";

// ──────────────────────────────────────────────────────────────────
// MQL5 compiler — typed interfaces for every stage
// ──────────────────────────────────────────────────────────────────
// Each translator contributes a SectionContribution; the assembler
// merges contributions across nodes into a final EA template.
// Sections roughly map to physical sections of an MQL5 source file.
// ──────────────────────────────────────────────────────────────────

export interface InputDecl {
  /** MQL5 input variable name (e.g. "InpFastEma"). Unique. */
  name: string;
  /** MQL5 type (int, double, bool, string). */
  type: "int" | "double" | "bool" | "string";
  /** Default value as a literal MQL5 expression. */
  defaultExpr: string;
  /** Display label inside MT5 (uses MQL5 input "label" syntax). */
  label?: string;
  /** Comment shown above the input. */
  comment?: string;
}

export interface IndicatorHandle {
  /** Variable name for the handle (e.g. "hFastEma"). */
  handleVar: string;
  /** OnInit() body that creates the handle. Multiline MQL5 statements. */
  init: string;
  /** Cleanup statement for OnDeinit(). */
  release: string;
  /** Optional: MQL5 buffer/value lookup helper code emitted into globals. */
  globals?: string;
}

export type SignalDirection = "long" | "short";

export interface SectionContribution {
  /** Inputs this node contributes. Names must be globally unique. */
  inputs?: InputDecl[];
  /** Indicator handles (created in OnInit, released in OnDeinit). */
  indicators?: IndicatorHandle[];
  /** Free-standing helper functions emitted at file scope. */
  helpers?: string[];
  /** Globals (constants, statics) emitted at file scope. */
  globals?: string[];
  /**
   * Boolean MQL5 expression that must be true for the given direction
   * for an entry to fire. Combined via AND across all entry/filter
   * contributions for the same direction.
   */
  entryConditions?: { direction: SignalDirection | "both"; expr: string }[];
  /** Pre-trade gates (executed in OnTick before any logic). Return true to allow trading. */
  gates?: { expr: string; reason: string }[];
  /**
   * Lot-sizing expression — only one node may contribute. Receives
   * `entryPrice` and `slPrice` as MQL5 doubles in scope.
   */
  lotExpr?: string;
  /** Computes initial SL/TP given entry price + direction. */
  stopLevels?: {
    /** MQL5 statements producing `slPrice` and `tpPrice` doubles. */
    body: string;
  };
  /** Code injected into the position-management routine (trailing, BE, etc.). */
  positionManagement?: string[];
  /** Code injected at the tail of OnInit (after indicator handle checks). */
  onInitCode?: string[];
  /** Code injected at the tail of OnDeinit. */
  onDeinitCode?: string[];
  /** Sections of generated_summary inputs the node wants to contribute. */
  summaryFragments?: string[];
}

export type Translator = (
  node: StrategyNode,
  graph: StrategyGraph,
) => SectionContribution;

export interface CompileOptions {
  /** Optional override for EA name. Defaults to graph.metadata.name. */
  eaName?: string;
}

export interface CompileResult {
  source: string;
  diagnostics: Diagnostic[];
  summary: string;
  /** Map of node id -> contribution, useful for debugging the compiler. */
  contributions: Record<string, SectionContribution>;
  /** Sorted unique list of node types referenced. */
  nodeTypes: NodeType[];
}
