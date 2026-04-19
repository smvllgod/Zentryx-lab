import type { Translator } from "../types";

// ATR above its own N-period moving average. "Expansion" regime filter.
// We compute the ATR-MA in MQL5 by averaging ATR values over `maPeriod` bars.

export const translate_vol_atrAboveAverage: Translator = (node) => {
  const p = node.params as { atrPeriod: number; maPeriod: number };
  const aIn = `InpAtrAbvP_${sid(node.id)}`;
  const mIn = `InpAtrAbvM_${sid(node.id)}`;
  const h = `hAtrAbv_${sid(node.id)}`;

  return {
    inputs: [
      { name: aIn, type: "int", defaultExpr: String(p.atrPeriod ?? 14), label: "ATR period" },
      { name: mIn, type: "int", defaultExpr: String(p.maPeriod ?? 50), label: "ATR-MA period" },
    ],
    indicators: [
      {
        handleVar: h,
        init: `${h} = iATR(_Symbol, _Period, ${aIn});`,
        release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});`,
      },
    ],
    helpers: [
      `double AtrAverage(int handle, int bars)
{
   if(handle == INVALID_HANDLE || bars <= 0) return 0.0;
   double buf[];
   if(CopyBuffer(handle, 0, 1, bars, buf) <= 0) return 0.0;
   double sum = 0.0; for(int i=0;i<bars;i++) sum += buf[i];
   return sum / bars;
}`,
    ],
    gates: [
      { expr: `(BufferValue(${h},1) > AtrAverage(${h}, ${mIn}))`, reason: "ATR below its MA (low volatility)" },
    ],
    summaryFragments: [`ATR(${p.atrPeriod}) > MA${p.maPeriod}`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
