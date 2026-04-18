import type { Translator } from "../types";

export const translate_filter_emaSlope: Translator = (node) => {
  const p = node.params as { period: number; lookback: number };
  const period = `InpSlopeP_${shortId(node.id)}`;
  const lookback = `InpSlopeL_${shortId(node.id)}`;
  const h = `hSlope_${shortId(node.id)}`;

  return {
    inputs: [
      { name: period, type: "int", defaultExpr: String(p.period), label: "EMA period" },
      { name: lookback, type: "int", defaultExpr: String(p.lookback), label: "Slope lookback" },
    ],
    indicators: [
      { handleVar: h, init: `${h} = iMA(_Symbol, _Period, ${period}, 0, MODE_EMA, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` },
    ],
    entryConditions: [
      { direction: "long", expr: `(BufferValue(${h},1) > BufferValue(${h},1+${lookback}))` },
      { direction: "short", expr: `(BufferValue(${h},1) < BufferValue(${h},1+${lookback}))` },
    ],
    summaryFragments: [`EMA(${p.period}) slope over ${p.lookback} bars`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
