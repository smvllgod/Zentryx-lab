import type { Translator } from "../types";

export const translate_filter_rocThreshold: Translator = (node) => {
  const p = node.params as { period: number; threshold: number };
  const period = `InpRocP_${shortId(node.id)}`;
  const th = `InpRocTh_${shortId(node.id)}`;

  // Rate-of-change approximation without an extra indicator handle:
  // ROC = (close[1] - close[period+1]) / close[period+1] * 100
  const expr =
    `(MathAbs((iClose(_Symbol,_Period,1) - iClose(_Symbol,_Period,1+${period}))/iClose(_Symbol,_Period,1+${period})*100.0) >= ${th})`;

  return {
    inputs: [
      { name: period, type: "int", defaultExpr: String(p.period), label: "ROC period" },
      { name: th, type: "double", defaultExpr: String(p.threshold), label: "ROC threshold (%)" },
    ],
    entryConditions: [{ direction: "both", expr }],
    summaryFragments: [`|ROC(${p.period})| ≥ ${p.threshold}%`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
