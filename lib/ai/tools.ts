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
      "Signal that you have finished applying changes. Pass a final 1-3 sentence summary for the user.",
    input_schema: {
      type: "object",
      properties: { summary: { type: "string" } },
      required: ["summary"],
    },
  },
] as const;

// ──────────────────────────────────────────────────────────────────
// Client-side executor — applies a tool_use block against a graph
// and returns an updated graph + a textual result for the AI.
// ──────────────────────────────────────────────────────────────────

export interface ToolOutcome {
  graph: StrategyGraph;
  /** Text to feed back to the AI as tool_result content. */
  result: string;
  isError: boolean;
  /** True when the AI signalled done() — stop the loop. */
  finished?: boolean;
  /** Optional animation hint for the UI — highlight this node. */
  highlightNodeId?: string;
  /** Final user-facing message from done(). */
  doneMessage?: string;
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
        return { graph, result: summary, isError: false, finished: true, doneMessage: summary };
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

/** Helper: drill down to the final text content from the assistant. */
export function extractLastAssistantText(blocks: AiContentBlock[]): string {
  return blocks
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}
