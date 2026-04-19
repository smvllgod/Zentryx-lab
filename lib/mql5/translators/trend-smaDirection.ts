import type { Translator } from "../types";

// SMA rising / falling — compare SMA value N bars ago to the current bar.
// Long-OK when slope is positive; short-OK when negative.

export const translate_trend_smaDirection: Translator = (node) => {
  const p = node.params as { period: number; lookback: number };
  const pIn = `InpSmaDirP_${sid(node.id)}`;
  const lIn = `InpSmaDirL_${sid(node.id)}`;
  const h = `hSmaDir_${sid(node.id)}`;

  return {
    inputs: [
      { name: pIn, type: "int", defaultExpr: String(p.period ?? 100), label: "SMA period" },
      { name: lIn, type: "int", defaultExpr: String(p.lookback ?? 5), label: "Slope lookback" },
    ],
    indicators: [
      { handleVar: h, init: `${h} = iMA(_Symbol, _Period, ${pIn}, 0, MODE_SMA, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` },
    ],
    entryConditions: [
      { direction: "long", expr: `(BufferValue(${h},1) > BufferValue(${h},1+${lIn}))` },
      { direction: "short", expr: `(BufferValue(${h},1) < BufferValue(${h},1+${lIn}))` },
    ],
    summaryFragments: [`SMA(${p.period}) direction over ${p.lookback}`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
