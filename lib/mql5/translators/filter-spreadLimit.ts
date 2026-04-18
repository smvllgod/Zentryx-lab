import type { Translator } from "../types";

export const translate_filter_spreadLimit: Translator = (node) => {
  const p = node.params as { maxSpreadPoints: number };
  const v = `InpMaxSpread_${shortId(node.id)}`;
  return {
    inputs: [
      { name: v, type: "int", defaultExpr: String(p.maxSpreadPoints), label: "Max spread (points)" },
    ],
    gates: [
      {
        expr: `((int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) <= ${v})`,
        reason: "spread above limit",
      },
    ],
    summaryFragments: [`spread ≤ ${p.maxSpreadPoints} pts`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
