// Batch 2 — volatility family (8 blocks).

import type { Translator } from "../types";

const sid = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);

// ── vol.atrBand (ATR within [min,max] pips)
export const translate_vol_atrBand: Translator = (node) => {
  const p = node.params as { period: number; minAtrPips: number; maxAtrPips: number };
  const pIn = `InpVabP_${sid(node.id)}`;
  const lo = `InpVabLo_${sid(node.id)}`;
  const hi = `InpVabHi_${sid(node.id)}`;
  const h = `hVab_${sid(node.id)}`;
  return {
    inputs: [
      { name: pIn, type: "int", defaultExpr: String(p.period ?? 14), label: "ATR period" },
      { name: lo, type: "double", defaultExpr: String(p.minAtrPips ?? 5), label: "Min ATR (pips)" },
      { name: hi, type: "double", defaultExpr: String(p.maxAtrPips ?? 300), label: "Max ATR (pips)" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iATR(_Symbol, _Period, ${pIn});`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    gates: [{
      expr: `((BufferValue(${h},1) / ZxPipSize()) >= ${lo} && (BufferValue(${h},1) / ZxPipSize()) <= ${hi})`,
      reason: "ATR outside band",
    }],
    summaryFragments: [`ATR(${p.period}) ∈ [${p.minAtrPips}, ${p.maxAtrPips}] pips`],
  };
};

// ── vol.atrBelowAverage
export const translate_vol_atrBelowAverage: Translator = (node) => {
  const p = node.params as { atrPeriod: number; maPeriod: number };
  const aIn = `InpVblA_${sid(node.id)}`;
  const mIn = `InpVblM_${sid(node.id)}`;
  const h = `hVbl_${sid(node.id)}`;
  return {
    inputs: [
      { name: aIn, type: "int", defaultExpr: String(p.atrPeriod ?? 14), label: "ATR period" },
      { name: mIn, type: "int", defaultExpr: String(p.maPeriod ?? 50), label: "ATR-MA period" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iATR(_Symbol, _Period, ${aIn});`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    helpers: [
      `double AtrAvg_${sid(node.id)}(int handle, int bars)
{
   double b[]; if(CopyBuffer(handle, 0, 1, bars, b) <= 0) return 0.0;
   double s = 0.0; for(int i=0;i<bars;i++) s += b[i]; return s / bars;
}`,
    ],
    gates: [{ expr: `(BufferValue(${h},1) < AtrAvg_${sid(node.id)}(${h}, ${mIn}))`, reason: "ATR above its MA" }],
    summaryFragments: [`ATR(${p.atrPeriod}) < MA${p.maPeriod}`],
  };
};

// ── vol.keltnerInside (price inside Keltner channel — squeeze)
export const translate_vol_keltnerInside: Translator = (node) => {
  const p = node.params as { emaPeriod: number; atrPeriod: number; multiplier: number };
  const eIn = `InpKcE_${sid(node.id)}`;
  const aIn = `InpKcA_${sid(node.id)}`;
  const mIn = `InpKcM_${sid(node.id)}`;
  const hE = `hKcE_${sid(node.id)}`;
  const hA = `hKcA_${sid(node.id)}`;
  return {
    inputs: [
      { name: eIn, type: "int", defaultExpr: String(p.emaPeriod ?? 20), label: "Keltner EMA period" },
      { name: aIn, type: "int", defaultExpr: String(p.atrPeriod ?? 10), label: "Keltner ATR period" },
      { name: mIn, type: "double", defaultExpr: String(p.multiplier ?? 2), label: "Keltner multiplier" },
    ],
    indicators: [
      { handleVar: hE, init: `${hE} = iMA(_Symbol, _Period, ${eIn}, 0, MODE_EMA, PRICE_CLOSE);`, release: `if(${hE} != INVALID_HANDLE) IndicatorRelease(${hE});` },
      { handleVar: hA, init: `${hA} = iATR(_Symbol, _Period, ${aIn});`, release: `if(${hA} != INVALID_HANDLE) IndicatorRelease(${hA});` },
    ],
    gates: [{
      expr: `(iClose(_Symbol,_Period,1) <= BufferValue(${hE},1) + ${mIn} * BufferValue(${hA},1) && iClose(_Symbol,_Period,1) >= BufferValue(${hE},1) - ${mIn} * BufferValue(${hA},1))`,
      reason: "Outside Keltner channel",
    }],
    summaryFragments: [`Keltner inside (EMA${p.emaPeriod}, ATR${p.atrPeriod} × ${p.multiplier})`],
  };
};

// ── vol.stdDevThreshold (close-to-close σ > 0 — simplified pass gate)
export const translate_vol_stdDevThreshold: Translator = (node) => {
  const p = node.params as { period: number };
  const pIn = `InpStdDevP_${sid(node.id)}`;
  const h = `hStdDev_${sid(node.id)}`;
  return {
    inputs: [{ name: pIn, type: "int", defaultExpr: String(p.period ?? 20), label: "StdDev period" }],
    indicators: [{ handleVar: h, init: `${h} = iStdDev(_Symbol, _Period, ${pIn}, 0, MODE_SMA, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    gates: [{ expr: `(BufferValue(${h},1) > 0.0)`, reason: "StdDev zero (data not ready)" }],
    summaryFragments: [`StdDev(${p.period}) > 0`],
  };
};

// ── vol.dailyRange (block after N% of typical daily range is used)
// "Typical" approximated from the last 5 completed days via ATR(D1).
export const translate_vol_dailyRange: Translator = (node) => {
  const p = node.params as { maxPercent: number };
  const pIn = `InpDrPct_${sid(node.id)}`;
  const h = `hDrAtr_${sid(node.id)}`;
  return {
    inputs: [{ name: pIn, type: "double", defaultExpr: String(p.maxPercent ?? 70), label: "Max % of daily range used" }],
    indicators: [{ handleVar: h, init: `${h} = iATR(_Symbol, PERIOD_D1, 14);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    helpers: [
      `double DailyRangeUsed_${sid(node.id)}(int handle)
{
   double hi = iHigh(_Symbol, PERIOD_D1, 0);
   double lo = iLow(_Symbol, PERIOD_D1, 0);
   double used = hi - lo;
   double typical = BufferValue(handle, 1);
   if(typical <= 0) return 0.0;
   return (used / typical) * 100.0;
}`,
    ],
    gates: [{ expr: `(DailyRangeUsed_${sid(node.id)}(${h}) <= ${pIn})`, reason: "Daily range already exhausted" }],
    summaryFragments: [`Daily range used ≤ ${p.maxPercent}%`],
  };
};

// ── vol.volatilityRatio (fast ATR / slow ATR)
export const translate_vol_volatilityRatio: Translator = (node) => {
  const p = node.params as { fastPeriod: number; slowPeriod: number };
  const fIn = `InpVrF_${sid(node.id)}`;
  const sIn = `InpVrS_${sid(node.id)}`;
  const hF = `hVrF_${sid(node.id)}`;
  const hS = `hVrS_${sid(node.id)}`;
  return {
    inputs: [
      { name: fIn, type: "int", defaultExpr: String(p.fastPeriod ?? 7), label: "Fast ATR" },
      { name: sIn, type: "int", defaultExpr: String(p.slowPeriod ?? 50), label: "Slow ATR" },
    ],
    indicators: [
      { handleVar: hF, init: `${hF} = iATR(_Symbol, _Period, ${fIn});`, release: `if(${hF} != INVALID_HANDLE) IndicatorRelease(${hF});` },
      { handleVar: hS, init: `${hS} = iATR(_Symbol, _Period, ${sIn});`, release: `if(${hS} != INVALID_HANDLE) IndicatorRelease(${hS});` },
    ],
    // Default meaning: only trade when fast ATR > slow ATR (i.e. accelerating).
    gates: [{ expr: `(BufferValue(${hF},1) > BufferValue(${hS},1))`, reason: "Vol ratio not expanding" }],
    summaryFragments: [`ATR(${p.fastPeriod}) > ATR(${p.slowPeriod})`],
  };
};

// ── vol.gapFilter (open vs prior close)
export const translate_vol_gapFilter: Translator = (node) => {
  const p = node.params as { maxGapPips: number };
  const gIn = `InpGapMax_${sid(node.id)}`;
  return {
    inputs: [{ name: gIn, type: "double", defaultExpr: String(p.maxGapPips ?? 30), label: "Max gap (pips)" }],
    gates: [{
      expr: `(MathAbs(iOpen(_Symbol,_Period,0) - iClose(_Symbol,_Period,1)) / ZxPipSize() <= ${gIn})`,
      reason: "Opening gap too wide",
    }],
    summaryFragments: [`Gap ≤ ${p.maxGapPips} pips`],
  };
};

// ── vol.weekendCarry (block entries Friday after cutoff)
export const translate_vol_weekendCarry: Translator = (node) => {
  const p = node.params as { cutoffHour: number };
  const cIn = `InpWkndH_${sid(node.id)}`;
  return {
    inputs: [{ name: cIn, type: "int", defaultExpr: String(p.cutoffHour ?? 20), label: "Friday cutoff hour" }],
    helpers: [
      `bool WeekendCarryOk_${sid(node.id)}(int cutoff)
{
   MqlDateTime t; TimeToStruct(TimeTradeServer(), t);
   if(t.day_of_week != 5) return true;
   return (t.hour < cutoff);
}`,
    ],
    gates: [{ expr: `WeekendCarryOk_${sid(node.id)}(${cIn})`, reason: "Weekend carry cutoff" }],
    summaryFragments: [`Block after Fri ${p.cutoffHour}:00`],
  };
};
