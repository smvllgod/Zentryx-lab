import type { Translator } from "../types";

export const translate_exit_fixedTpSl: Translator = (node) => {
  const p = node.params as { takeProfitPips: number; stopLossPips: number };
  const tpVar = `InpTpPips_${shortId(node.id)}`;
  const slVar = `InpSlPips_${shortId(node.id)}`;
  return {
    inputs: [
      { name: tpVar, type: "double", defaultExpr: String(p.takeProfitPips), label: "Take profit (pips)" },
      { name: slVar, type: "double", defaultExpr: String(p.stopLossPips), label: "Stop loss (pips)" },
    ],
    stopLevels: {
      body: `double pip = ZxPipSize();
double tpDist = ${tpVar} * pip;
double slDist = ${slVar} * pip;
if(direction == ORDER_TYPE_BUY)  { slPrice = entryPrice - slDist; tpPrice = entryPrice + tpDist; }
else                              { slPrice = entryPrice + slDist; tpPrice = entryPrice - tpDist; }`,
    },
    summaryFragments: [`TP ${p.takeProfitPips}p / SL ${p.stopLossPips}p`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
