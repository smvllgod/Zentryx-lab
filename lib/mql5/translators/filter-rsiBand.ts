import type { Translator } from "../types";

export const translate_filter_rsiBand: Translator = (node) => {
  const p = node.params as { period: number; minRsi: number; maxRsi: number };
  const period = `InpRsiBandP_${shortId(node.id)}`;
  const lo = `InpRsiBandLo_${shortId(node.id)}`;
  const hi = `InpRsiBandHi_${shortId(node.id)}`;
  const h = `hRsiBand_${shortId(node.id)}`;

  return {
    inputs: [
      { name: period, type: "int", defaultExpr: String(p.period), label: "RSI period" },
      { name: lo, type: "double", defaultExpr: String(p.minRsi), label: "Min RSI" },
      { name: hi, type: "double", defaultExpr: String(p.maxRsi), label: "Max RSI" },
    ],
    indicators: [
      { handleVar: h, init: `${h} = iRSI(_Symbol, _Period, ${period}, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` },
    ],
    entryConditions: [
      { direction: "both", expr: `(BufferValue(${h},1) >= ${lo} && BufferValue(${h},1) <= ${hi})` },
    ],
    summaryFragments: [`RSI(${p.period}) in [${p.minRsi}, ${p.maxRsi}]`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
