import type { Translator } from "../types";

export const translate_risk_dailyRiskBudget: Translator = (node) => {
  const p = node.params as { maxDailyRisk: number };
  const input = `InpDailyRiskBudget_${shortId(node.id)}`;

  return {
    inputs: [
      { name: input, type: "double", defaultExpr: String(p.maxDailyRisk), label: "Max daily risk (%)" },
    ],
    globals: [
      `// Accumulated daily risk (reset on new day in OnTick guard)
double g_DailyRiskUsed_${shortId(node.id)} = 0.0;
datetime g_DailyRiskDay_${shortId(node.id)} = 0;`,
    ],
    gates: [{
      expr: `DailyRiskAllows(${input})`,
      reason: "daily risk budget consumed",
    }],
    helpers: [
      `bool DailyRiskAllows(double budgetPct) {
  datetime today = iTime(_Symbol, PERIOD_D1, 0);
  if(today != g_DailyRiskDay_${shortId(node.id)}) {
    g_DailyRiskDay_${shortId(node.id)} = today;
    g_DailyRiskUsed_${shortId(node.id)} = 0.0;
  }
  return (g_DailyRiskUsed_${shortId(node.id)} < budgetPct);
}`,
    ],
    summaryFragments: [`Max daily risk ${p.maxDailyRisk}%`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
