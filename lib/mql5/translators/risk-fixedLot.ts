import type { Translator } from "../types";

export const translate_risk_fixedLot: Translator = (node) => {
  const p = node.params as { lots: number };
  const v = `InpFixedLots_${shortId(node.id)}`;
  return {
    inputs: [
      { name: v, type: "double", defaultExpr: String(p.lots), label: "Fixed lot size" },
    ],
    lotExpr: `NormalizeLots(${v})`,
    summaryFragments: [`fixed ${p.lots} lots`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
