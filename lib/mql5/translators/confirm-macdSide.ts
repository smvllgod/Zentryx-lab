import type { Translator } from "../types";

// MACD histogram side — long-OK when histogram >= 0, short-OK when <= 0.
// Histogram buffer is index 2 on iMACD (buffer 0 = MACD line, buffer 1 = signal,
// buffer 2 = histogram).

export const translate_confirm_macdSide: Translator = (node) => {
  const p = node.params as { fastPeriod: number; slowPeriod: number; signalPeriod: number };
  const fIn = `InpMacdSideF_${sid(node.id)}`;
  const sIn = `InpMacdSideS_${sid(node.id)}`;
  const gIn = `InpMacdSideG_${sid(node.id)}`;
  const h = `hMacdSide_${sid(node.id)}`;

  return {
    inputs: [
      { name: fIn, type: "int", defaultExpr: String(p.fastPeriod ?? 12), label: "MACD fast EMA" },
      { name: sIn, type: "int", defaultExpr: String(p.slowPeriod ?? 26), label: "MACD slow EMA" },
      { name: gIn, type: "int", defaultExpr: String(p.signalPeriod ?? 9), label: "MACD signal" },
    ],
    indicators: [
      {
        handleVar: h,
        init: `${h} = iMACD(_Symbol, _Period, ${fIn}, ${sIn}, ${gIn}, PRICE_CLOSE);`,
        release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});`,
      },
    ],
    helpers: [
      `double MacdHistValue(int handle, int shift)
{
   if(handle == INVALID_HANDLE) return 0.0;
   double main[]; double sig[];
   if(CopyBuffer(handle, 0, shift, 1, main) <= 0) return 0.0;
   if(CopyBuffer(handle, 1, shift, 1, sig) <= 0) return 0.0;
   return main[0] - sig[0];
}`,
    ],
    entryConditions: [
      { direction: "long", expr: `(MacdHistValue(${h},1) >= 0)` },
      { direction: "short", expr: `(MacdHistValue(${h},1) <= 0)` },
    ],
    summaryFragments: [`MACD(${p.fastPeriod},${p.slowPeriod},${p.signalPeriod}) side`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
