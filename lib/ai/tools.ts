import { nanoid } from "nanoid";
import {
  CATEGORY_ORDER,
  type StrategyEdge,
  type StrategyGraph,
  type StrategyNode,
  type NodeType,
} from "@/lib/strategies/types";
import { defaultParams, getNodeDefinition } from "@/lib/strategies/nodes";
import { validateStrategy } from "@/lib/strategies/validators";
import { isValidConnectionShape } from "@/components/builder/BuilderCanvas";
import type { AiContentBlock, AiToolUseBlock } from "./types";

// ──────────────────────────────────────────────────────────────────
// Tool schemas — sent to Claude so it knows what it can call.
// Matches the shape of Anthropic's `tools` input_schema (JSON Schema).
// ──────────────────────────────────────────────────────────────────
export const TOOL_SCHEMAS = [
  {
    name: "add_node",
    description:
      "Add a new node to the strategy graph. Use this for every new building block the user needs. Returns the assigned id.",
    input_schema: {
      type: "object",
      properties: {
        node_type: {
          type: "string",
          description:
            'Exact NodeType string, e.g. "entry.emaCross", "filter.rsi", "risk.fixedLot", "exit.fixedTpSl".',
        },
        params: {
          type: "object",
          description:
            "Optional parameter overrides. If omitted, the node's default params are used.",
        },
      },
      required: ["node_type"],
    },
  },
  {
    name: "connect_nodes",
    description:
      "Create a directed edge from source_id to target_id. Must respect category ordering (entry → filter → risk → exit).",
    input_schema: {
      type: "object",
      properties: {
        source_id: { type: "string" },
        target_id: { type: "string" },
      },
      required: ["source_id", "target_id"],
    },
  },
  {
    name: "update_node_params",
    description:
      "Mutate parameters of an existing node. Only supplied keys are updated; others are left intact.",
    input_schema: {
      type: "object",
      properties: {
        node_id: { type: "string" },
        params: { type: "object" },
      },
      required: ["node_id", "params"],
    },
  },
  {
    name: "delete_node",
    description:
      "Remove a node and every edge that references it.",
    input_schema: {
      type: "object",
      properties: { node_id: { type: "string" } },
      required: ["node_id"],
    },
  },
  {
    name: "delete_edge",
    description: "Remove a single edge by id.",
    input_schema: {
      type: "object",
      properties: { edge_id: { type: "string" } },
      required: ["edge_id"],
    },
  },
  {
    name: "set_metadata",
    description:
      "Update strategy metadata — name, symbol, timeframe, magic number, trade comment.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        symbol: { type: "string" },
        timeframe: {
          type: "string",
          enum: ["M1", "M5", "M15", "M30", "H1", "H4", "D1"],
        },
        magicNumber: { type: "integer" },
        tradeComment: { type: "string" },
      },
    },
  },
  {
    name: "list_graph",
    description:
      "Return the current graph (nodes + edges + metadata) as JSON. Use when you need a fresh view after several mutations.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_validation",
    description:
      "Return the current validator diagnostics (errors + warnings).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "done",
    description:
      "Signal that you have finished applying changes. Always end multi-step responses with this tool. The UI renders your input as a rich summary card, so be generous with the structured fields — this is the only place the user reads a clean recap of what you did. Aim for specific, scannable bullets (short phrases, not paragraphs).",
    input_schema: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description:
            "One-sentence headline (under 120 chars) describing the end result. Example: \"Built a USDJPY M5 scalper with EMA cross entry, 3 filters, and ATR-based exits.\"",
        },
        whatChanged: {
          type: "array",
          items: { type: "string" },
          description:
            "Concrete bullets — what you added, modified, or removed in this turn. One idea per bullet, under 100 chars each. Example: [\"Added EMA 8/21 cross entry (long + short)\", \"Wired risk_fixed_lot at 0.10 lots\", \"Renamed strategy to 'USDJPY Scalper Pro'\"]. Don't invent items to pad the list — keep it to what actually changed.",
        },
        strategyShape: {
          type: "string",
          description:
            "Optional 1-2 sentence plain-language description of the strategy's runtime behaviour. Example: \"Enters on EMA cross during London session, sizes 1% risk on ATR-based stops, trails with break-even after +1R.\" Omit for pure metadata / fix-only turns.",
        },
        nextSteps: {
          type: "array",
          items: { type: "string" },
          description:
            "2-4 concrete suggestions the user might do next. Each under 100 chars. Example: [\"Validate and preview the MQL5 source\", \"Backtest on EURUSD M5 2023-2024\", \"Add a news filter if you want to avoid NFP\"]. Prioritise what is actually meaningful for this strategy, not generic tips.",
        },
        warnings: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional list of caveats, trade-offs, or gotchas specific to this strategy. Example: [\"Magic number shared with existing EAs will conflict — consider bumping\", \"No news filter — be cautious around NFP\"]. Omit if nothing warrants attention.",
        },
      },
      required: ["summary", "whatChanged", "nextSteps"],
    },
  },
] as const;

// ──────────────────────────────────────────────────────────────────
// Client-side executor — applies a tool_use block against a graph
// and returns an updated graph + a textual result for the AI.
// ──────────────────────────────────────────────────────────────────

export interface DoneSummary {
  /** One-sentence headline describing the end result. */
  summary: string;
  /** Concrete bullets of what was added, modified, or removed. */
  whatChanged: string[];
  /** Optional 1-2 sentence description of the strategy's runtime behaviour. */
  strategyShape?: string;
  /** 2-4 concrete suggestions for what to do next. */
  nextSteps: string[];
  /** Optional caveats / trade-offs. */
  warnings?: string[];
}

export interface ToolOutcome {
  graph: StrategyGraph;
  /** Text to feed back to the AI as tool_result content. */
  result: string;
  isError: boolean;
  /** True when the AI signalled done() — stop the loop. */
  finished?: boolean;
  /** Optional animation hint for the UI — highlight this node. */
  highlightNodeId?: string;
  /** Structured recap from done(), rendered as a rich card. */
  doneSummary?: DoneSummary;
}

export function executeTool(block: AiToolUseBlock, graph: StrategyGraph): ToolOutcome {
  try {
    const { name, input } = block;

    switch (name) {
      case "add_node":
        return addNode(graph, input);
      case "connect_nodes":
        return connectNodes(graph, input);
      case "update_node_params":
        return updateNodeParams(graph, input);
      case "delete_node":
        return deleteNode(graph, input);
      case "delete_edge":
        return deleteEdge(graph, input);
      case "set_metadata":
        return setMetadata(graph, input);
      case "list_graph":
        return {
          graph,
          result: JSON.stringify({ metadata: graph.metadata, nodes: graph.nodes, edges: graph.edges }),
          isError: false,
        };
      case "list_validation":
        return {
          graph,
          result: JSON.stringify(validateStrategy(graph)),
          isError: false,
        };
      case "done": {
        const summary = String(input.summary ?? "Done.");
        const whatChanged = toStringArray(input.whatChanged);
        const nextSteps = toStringArray(input.nextSteps);
        const warnings = toStringArray(input.warnings);
        const strategyShape = typeof input.strategyShape === "string" && input.strategyShape.trim()
          ? input.strategyShape.trim()
          : undefined;
        const doneSummary: DoneSummary = {
          summary,
          whatChanged,
          strategyShape,
          nextSteps,
          warnings: warnings.length ? warnings : undefined,
        };
        // Plain-text echo for the tool_result. The AI sees this; the UI
        // reads `doneSummary` instead for the rich card.
        const result = [
          summary,
          whatChanged.length ? `Changes: ${whatChanged.join("; ")}` : null,
          strategyShape ? `Shape: ${strategyShape}` : null,
          nextSteps.length ? `Next: ${nextSteps.join("; ")}` : null,
          warnings.length ? `Warnings: ${warnings.join("; ")}` : null,
        ].filter(Boolean).join("\n");
        return { graph, result: result || summary, isError: false, finished: true, doneSummary };
      }
      default:
        return { graph, result: `Unknown tool "${name}".`, isError: true };
    }
  } catch (err) {
    return { graph, result: `Tool error: ${(err as Error).message}`, isError: true };
  }
}

function addNode(graph: StrategyGraph, input: Record<string, unknown>): ToolOutcome {
  const type = String(input.node_type ?? "");
  const def = getNodeDefinition(type as NodeType);
  if (!def) {
    return { graph, result: `No such node type "${type}".`, isError: true };
  }
  const catIndex = Math.max(0, CATEGORY_ORDER.indexOf(def.category));
  const existingInCategory = graph.nodes.filter((n) => n.category === def.category).length;
  const newNode: StrategyNode = {
    id: `n-${nanoid(6)}`,
    type: def.type,
    category: def.category,
    position: {
      x: 80 + catIndex * 280,
      y: 120 + existingInCategory * 140,
    },
    params: { ...defaultParams(def.type), ...(input.params as Record<string, unknown> | undefined ?? {}) },
  };
  return {
    graph: { ...graph, nodes: [...graph.nodes, newNode] },
    result: `Added ${def.label} with id "${newNode.id}".`,
    isError: false,
    highlightNodeId: newNode.id,
  };
}

function connectNodes(graph: StrategyGraph, input: Record<string, unknown>): ToolOutcome {
  const source = String(input.source_id ?? "");
  const target = String(input.target_id ?? "");
  const src = graph.nodes.find((n) => n.id === source);
  const tgt = graph.nodes.find((n) => n.id === target);
  if (!src || !tgt) {
    return { graph, result: `One of the referenced nodes doesn't exist.`, isError: true };
  }
  if (!isValidConnectionShape(src, tgt)) {
    return {
      graph,
      result: `Refused: "${src.category}" → "${tgt.category}" breaks the category flow (entry → filter → risk → exit).`,
      isError: true,
    };
  }
  if (graph.edges.some((e) => e.source === source && e.target === target)) {
    return { graph, result: "Edge already exists.", isError: false };
  }
  const edge: StrategyEdge = { id: `e-${nanoid(6)}`, source, target };
  return {
    graph: { ...graph, edges: [...graph.edges, edge] },
    result: `Connected ${src.type} → ${tgt.type}.`,
    isError: false,
  };
}

function updateNodeParams(graph: StrategyGraph, input: Record<string, unknown>): ToolOutcome {
  const id = String(input.node_id ?? "");
  const patch = (input.params ?? {}) as Record<string, unknown>;
  const node = graph.nodes.find((n) => n.id === id);
  if (!node) return { graph, result: `No node "${id}".`, isError: true };
  return {
    graph: {
      ...graph,
      nodes: graph.nodes.map((n) =>
        n.id === id
          ? { ...n, params: { ...(n.params as Record<string, unknown>), ...patch } }
          : n,
      ),
    },
    result: `Updated params of ${node.type}.`,
    isError: false,
    highlightNodeId: id,
  };
}

function deleteNode(graph: StrategyGraph, input: Record<string, unknown>): ToolOutcome {
  const id = String(input.node_id ?? "");
  const node = graph.nodes.find((n) => n.id === id);
  if (!node) return { graph, result: `No node "${id}".`, isError: true };
  return {
    graph: {
      ...graph,
      nodes: graph.nodes.filter((n) => n.id !== id),
      edges: graph.edges.filter((e) => e.source !== id && e.target !== id),
    },
    result: `Deleted ${node.type}.`,
    isError: false,
  };
}

function deleteEdge(graph: StrategyGraph, input: Record<string, unknown>): ToolOutcome {
  const id = String(input.edge_id ?? "");
  if (!graph.edges.some((e) => e.id === id)) {
    return { graph, result: `No edge "${id}".`, isError: true };
  }
  return {
    graph: { ...graph, edges: graph.edges.filter((e) => e.id !== id) },
    result: `Removed edge ${id}.`,
    isError: false,
  };
}

function setMetadata(graph: StrategyGraph, input: Record<string, unknown>): ToolOutcome {
  const patch = input as Partial<StrategyGraph["metadata"]>;
  return {
    graph: { ...graph, metadata: { ...graph.metadata, ...patch } },
    result: `Metadata updated.`,
    isError: false,
  };
}

/** Coerce an AI-supplied value into a clean string[] — trims, drops empties. */
function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (trimmed.length > 0) out.push(trimmed);
  }
  return out;
}

/** Helper: drill down to the final text content from the assistant. */
export function extractLastAssistantText(blocks: AiContentBlock[]): string {
  return blocks
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}
