import { CATEGORY_ORDER as CANONICAL_ORDER, type StrategyGraph, type NodeCategory } from "@/lib/strategies/types";
import { validateStrategy, type Diagnostic } from "@/lib/strategies/validators";
import { summarizeStrategy } from "@/lib/strategies/summary";
import type { CompileOptions, CompileResult, SectionContribution } from "./types";
import { TRANSLATORS } from "./translators";
import { assemble } from "./template";
import { renderAppearance } from "./appearance-renderer";
import { translateProtections } from "./protections";

// ──────────────────────────────────────────────────────────────────
// Compiler pipeline
// ──────────────────────────────────────────────────────────────────
//   1. validate    — block on errors
//   2. order       — deterministic node order (entry → filter → risk → exit → util)
//   3. translate   — each node produces a SectionContribution
//   4. assemble    — template renders the final .mq5 source
// ──────────────────────────────────────────────────────────────────

// Use the canonical CATEGORY_ORDER from `lib/strategies/types` so the compiler
// stays in sync with any new categories added later (e.g. `lot`, `management`).
const CATEGORY_ORDER: readonly NodeCategory[] = CANONICAL_ORDER;

export function compileStrategy(
  graph: StrategyGraph,
  options: CompileOptions = {},
): CompileResult {
  const validation = validateStrategy(graph);
  const diagnostics: Diagnostic[] = [...validation.diagnostics];
  const summary = summarizeStrategy(graph);

  // Stop early on hard errors — emit a stub source instead of broken MQL5.
  if (!validation.ok) {
    return {
      source: errorStub(graph, diagnostics),
      diagnostics,
      summary,
      contributions: {},
      nodeTypes: [],
    };
  }

  // Stable ordering keeps generated code deterministic across runs.
  const ordered = [...graph.nodes].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a.category);
    const ib = CATEGORY_ORDER.indexOf(b.category);
    if (ia !== ib) return ia - ib;
    return a.id.localeCompare(b.id);
  });

  const contributions: Record<string, SectionContribution> = {};
  const collected: SectionContribution[] = [];

  for (const node of ordered) {
    const translator = TRANSLATORS[node.type];
    if (!translator) {
      // Preview-only nodes: downgrade to warning and keep compiling.
      // The node still contributes to the visual graph but emits no MQL5,
      // so the rest of the strategy still produces runnable code.
      diagnostics.push({
        level: "warning",
        code: "stub_node",
        message: `"${node.type}" is a preview node — skipped in MQL5 generation (for now).`,
        nodeId: node.id,
      });
      continue;
    }
    try {
      const c = translator(node, graph);
      contributions[node.id] = c;
      collected.push(c);
    } catch (err) {
      diagnostics.push({
        level: "error",
        code: "translator_threw",
        message: `Translator for ${node.type} failed: ${(err as Error).message}`,
        nodeId: node.id,
      });
    }
  }

  if (diagnostics.some((d) => d.level === "error")) {
    return {
      source: errorStub(graph, diagnostics),
      diagnostics,
      summary,
      contributions,
      nodeTypes: dedupeTypes(graph),
    };
  }

  // Appearance — rendered last so its OnInit/OnDeinit hooks run after
  // indicator handle setup. If the strategy has no appearance schema
  // set, we skip the renderer entirely (no panel objects, no helpers).
  if (graph.metadata.appearance) {
    try {
      collected.push(renderAppearance(graph.metadata.appearance));
    } catch (err) {
      diagnostics.push({
        level: "warning",
        code: "appearance_failed",
        message: `Appearance renderer failed: ${(err as Error).message}. EA compiled without the chart panel.`,
      });
    }
  }

  // Protection blocks — account lock / expiry / broker lock / demo-only /
  // license key / IP lock. Enabled from the Protection Panel at export
  // time. Watermark and obfuscation are handled as a source-level
  // post-pass (see lib/mql5/obfuscator.ts), not here.
  if (options.protections) {
    try {
      for (const contribution of translateProtections(options.protections)) {
        collected.push(contribution);
      }
    } catch (err) {
      diagnostics.push({
        level: "warning",
        code: "protection_failed",
        message: `Protection codegen failed: ${(err as Error).message}. EA compiled without runtime protections.`,
      });
    }
  }

  const source = assemble({
    eaName: options.eaName ?? sanitizeFilename(graph.metadata.name),
    graph,
    contributions: collected,
  });

  return {
    source,
    diagnostics,
    summary,
    contributions,
    nodeTypes: dedupeTypes(graph),
  };
}

export function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60) || "Strategy"
  );
}

function dedupeTypes(graph: StrategyGraph) {
  const set = new Set(graph.nodes.map((n) => n.type));
  return [...set].sort();
}

function errorStub(graph: StrategyGraph, diagnostics: Diagnostic[]): string {
  const errors = diagnostics
    .filter((d) => d.level === "error")
    .map((d) => `// ! ${d.message}`)
    .join("\n");
  return `// Zentryx Lab — strategy "${graph.metadata.name}" has errors and was not compiled.
//
${errors}
`;
}
