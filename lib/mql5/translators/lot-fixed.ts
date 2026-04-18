import type { Translator } from "../types";

export const translate_lot_fixed: Translator = (node) => {
  const p = node.params as { lots: number };
  const input = `InpFixedLot_${shortId(node.id)}`;
  return {
    inputs: [
      { name: input, type: "double", defaultExpr: String(p.lots), label: "Fixed lot" },
    ],
    lotExpr: input,
    summaryFragments: [`Fixed lot ${p.lots}`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
