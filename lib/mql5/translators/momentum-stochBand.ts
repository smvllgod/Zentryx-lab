import type { Translator } from "../types";

// Stochastic %K within [min, max]. Gate-style — applies to both directions.

export const translate_momentum_stochBand: Translator = (node) => {
  const p = node.params as { kPeriod: number; minK: number; maxK: number };
  const kIn = `InpStochBandK_${sid(node.id)}`;
  const lo = `InpStochBandLo_${sid(node.id)}`;
  const hi = `InpStochBandHi_${sid(node.id)}`;
  const h = `hStochBand_${sid(node.id)}`;

  return {
    inputs: [
      { name: kIn, type: "int", defaultExpr: String(p.kPeriod ?? 14), label: "%K period" },
      { name: lo, type: "double", defaultExpr: String(p.minK ?? 20), label: "Min %K" },
      { name: hi, type: "double", defaultExpr: String(p.maxK ?? 80), label: "Max %K" },
    ],
    indicators: [
      {
        handleVar: h,
        init: `${h} = iStochastic(_Symbol, _Period, ${kIn}, 3, 3, MODE_SMA, STO_LOWHIGH);`,
        release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});`,
      },
    ],
    gates: [
      { expr: `(BufferValue(${h},1) >= ${lo} && BufferValue(${h},1) <= ${hi})`, reason: "Stochastic %K outside band" },
    ],
    summaryFragments: [`Stoch %K ∈ [${p.minK}, ${p.maxK}]`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
