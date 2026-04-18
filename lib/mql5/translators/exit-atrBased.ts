import type { Translator } from "../types";

export const translate_exit_atrBased: Translator = (node) => {
  const p = node.params as { atrPeriod: number; slMultiplier: number; tpMultiplier: number };
  const periodInput = `InpAtrExP_${shortId(node.id)}`;
  const slInput = `InpAtrExSl_${shortId(node.id)}`;
  const tpInput = `InpAtrExTp_${shortId(node.id)}`;
  const h = `hAtrExit_${shortId(node.id)}`;

  return {
    inputs: [
      { name: periodInput, type: "int", defaultExpr: String(p.atrPeriod), label: "ATR period" },
      { name: slInput, type: "double", defaultExpr: String(p.slMultiplier), label: "SL × ATR" },
      { name: tpInput, type: "double", defaultExpr: String(p.tpMultiplier), label: "TP × ATR" },
    ],
    indicators: [
      { handleVar: h, init: `${h} = iATR(_Symbol, _Period, ${periodInput});`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` },
    ],
    stopLevels: {
      body: `// ATR-based exit (${node.id})
{
  double atr = BufferValue(${h}, 1);
  double slDist = atr * ${slInput};
  double tpDist = atr * ${tpInput};
  if(isLong) { slPrice = entryPrice - slDist; tpPrice = entryPrice + tpDist; }
  else       { slPrice = entryPrice + slDist; tpPrice = entryPrice - tpDist; }
  slPriceDistancePips = slDist / (10.0 * SymbolInfoDouble(_Symbol, SYMBOL_POINT));
}`,
    },
    summaryFragments: [`ATR exit (SL ${p.slMultiplier}×, TP ${p.tpMultiplier}×)`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
