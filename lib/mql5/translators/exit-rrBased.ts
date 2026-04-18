import type { Translator } from "../types";

export const translate_exit_rrBased: Translator = (node) => {
  const p = node.params as { stopLossPips: number; rr: number };
  const slInput = `InpRrSl_${shortId(node.id)}`;
  const rrInput = `InpRrRatio_${shortId(node.id)}`;

  return {
    inputs: [
      { name: slInput, type: "double", defaultExpr: String(p.stopLossPips), label: "Stop loss (pips)" },
      { name: rrInput, type: "double", defaultExpr: String(p.rr), label: "R:R" },
    ],
    stopLevels: {
      body: `// R:R exit (${node.id})
{
  double pipSize = 10.0 * SymbolInfoDouble(_Symbol, SYMBOL_POINT);
  double slDist = ${slInput} * pipSize;
  double tpDist = slDist * ${rrInput};
  if(isLong) { slPrice = entryPrice - slDist; tpPrice = entryPrice + tpDist; }
  else       { slPrice = entryPrice + slDist; tpPrice = entryPrice - tpDist; }
  slPriceDistancePips = ${slInput};
}`,
    },
    summaryFragments: [`SL ${p.stopLossPips} pips, TP = ${p.rr}×SL`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
