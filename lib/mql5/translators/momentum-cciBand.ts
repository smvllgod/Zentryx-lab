import type { Translator } from "../types";

// CCI within [min, max]. Gate-style — same behaviour as RSI band.

export const translate_momentum_cciBand: Translator = (node) => {
  const p = node.params as { period: number; minCci: number; maxCci: number };
  const pIn = `InpCciBandP_${sid(node.id)}`;
  const lo = `InpCciBandLo_${sid(node.id)}`;
  const hi = `InpCciBandHi_${sid(node.id)}`;
  const h = `hCciBand_${sid(node.id)}`;

  return {
    inputs: [
      { name: pIn, type: "int", defaultExpr: String(p.period ?? 20), label: "CCI period" },
      { name: lo, type: "double", defaultExpr: String(p.minCci ?? -100), label: "Min CCI" },
      { name: hi, type: "double", defaultExpr: String(p.maxCci ?? 100), label: "Max CCI" },
    ],
    indicators: [
      {
        handleVar: h,
        init: `${h} = iCCI(_Symbol, _Period, ${pIn}, PRICE_TYPICAL);`,
        release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});`,
      },
    ],
    gates: [
      { expr: `(BufferValue(${h},1) >= ${lo} && BufferValue(${h},1) <= ${hi})`, reason: "CCI outside band" },
    ],
    summaryFragments: [`CCI(${p.period}) ∈ [${p.minCci}, ${p.maxCci}]`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
