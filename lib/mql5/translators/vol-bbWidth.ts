import type { Translator } from "../types";

// Bollinger bandwidth — width = (upper - lower) / middle. Gate fires when
// width is above (expansion) or below (squeeze) the threshold.

export const translate_vol_bbWidth: Translator = (node) => {
  const p = node.params as { period: number; deviation: number; widthThreshold: number; mode: "above" | "below" };
  const pIn = `InpBbW_P_${sid(node.id)}`;
  const dIn = `InpBbW_D_${sid(node.id)}`;
  const tIn = `InpBbW_T_${sid(node.id)}`;
  const h = `hBbW_${sid(node.id)}`;

  const cmp = p.mode === "below" ? "<=" : ">=";

  return {
    inputs: [
      { name: pIn, type: "int", defaultExpr: String(p.period ?? 20), label: "BB period" },
      { name: dIn, type: "double", defaultExpr: String(p.deviation ?? 2), label: "BB deviation (σ)" },
      { name: tIn, type: "double", defaultExpr: String(p.widthThreshold ?? 0.004), label: "Width threshold" },
    ],
    indicators: [
      {
        handleVar: h,
        init: `${h} = iBands(_Symbol, _Period, ${pIn}, 0, ${dIn}, PRICE_CLOSE);`,
        release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});`,
      },
    ],
    helpers: [
      `double BbWidthNorm(int handle, int shift)
{
   if(handle == INVALID_HANDLE) return 0.0;
   double mid[]; double up[]; double lo[];
   if(CopyBuffer(handle, 0, shift, 1, mid) <= 0) return 0.0;
   if(CopyBuffer(handle, 1, shift, 1, up) <= 0) return 0.0;
   if(CopyBuffer(handle, 2, shift, 1, lo) <= 0) return 0.0;
   if(mid[0] == 0) return 0.0;
   return (up[0] - lo[0]) / mid[0];
}`,
    ],
    gates: [
      { expr: `(BbWidthNorm(${h},1) ${cmp} ${tIn})`, reason: `BB width not in ${p.mode ?? "above"} regime` },
    ],
    summaryFragments: [`BB width ${p.mode ?? "above"} ${p.widthThreshold}`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
