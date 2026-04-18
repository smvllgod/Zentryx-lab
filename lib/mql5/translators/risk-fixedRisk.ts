import type { Translator } from "../types";

// The Fixed-Risk block sets a per-trade risk budget as a global.
// Actual lot conversion happens inside a Lot-Sizing block (`lot.fromRisk`).

export const translate_risk_fixedRisk: Translator = (node) => {
  const p = node.params as { riskPercent: number };
  const input = `InpFixedRisk_${shortId(node.id)}`;

  return {
    inputs: [
      { name: input, type: "double", defaultExpr: String(p.riskPercent), label: "Risk per trade (%)" },
    ],
    globals: [
      `// Declared by risk.fixedRisk — consumed by lot.fromRisk
double RiskPercentPerTrade() { return ${input}; }`,
    ],
    summaryFragments: [`Risk ${p.riskPercent}% per trade`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
