import type { Translator } from "../types";

export const translate_filter_atrBand: Translator = (node) => {
  const p = node.params as { period: number; minAtrPips: number; maxAtrPips: number };
  const period = `InpAtrBP_${shortId(node.id)}`;
  const lo = `InpAtrBLo_${shortId(node.id)}`;
  const hi = `InpAtrBHi_${shortId(node.id)}`;
  const h = `hAtrBand_${shortId(node.id)}`;

  return {
    inputs: [
      { name: period, type: "int", defaultExpr: String(p.period), label: "ATR period" },
      { name: lo, type: "double", defaultExpr: String(p.minAtrPips), label: "Min ATR (pips)" },
      { name: hi, type: "double", defaultExpr: String(p.maxAtrPips), label: "Max ATR (pips)" },
    ],
    indicators: [
      { handleVar: h, init: `${h} = iATR(_Symbol, _Period, ${period});`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` },
    ],
    globals: [`#define ATRPIP_FACTOR (SymbolInfoDouble(_Symbol, SYMBOL_POINT) * 10.0)`],
    entryConditions: [
      { direction: "both", expr: `((BufferValue(${h},1) / ATRPIP_FACTOR) >= ${lo} && (BufferValue(${h},1) / ATRPIP_FACTOR) <= ${hi})` },
    ],
    summaryFragments: [`ATR(${p.period}) in [${p.minAtrPips}, ${p.maxAtrPips}] pips`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
