// Batch 2 — trend family (10 blocks). Some simplifications on advanced blocks
// (supertrend, aroon, ichimoku) — they produce compile-clean, behaviourally
// meaningful MQL5 without requiring third-party indicators.

import type { Translator } from "../types";

const sid = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);

const TF_ENUM: Record<string, string> = {
  M1: "PERIOD_M1", M5: "PERIOD_M5", M15: "PERIOD_M15", M30: "PERIOD_M30",
  H1: "PERIOD_H1", H4: "PERIOD_H4", D1: "PERIOD_D1", W1: "PERIOD_W1", MN1: "PERIOD_MN1",
};

// ── trend.emaSlope (explicit — filter.emaSlope already covered for legacy)
export const translate_trend_emaSlope: Translator = (node) => {
  const p = node.params as { period: number; lookback: number };
  const pIn = `InpTrSlopeP_${sid(node.id)}`;
  const lIn = `InpTrSlopeL_${sid(node.id)}`;
  const h = `hTrSlope_${sid(node.id)}`;
  return {
    inputs: [
      { name: pIn, type: "int", defaultExpr: String(p.period ?? 50), label: "EMA period" },
      { name: lIn, type: "int", defaultExpr: String(p.lookback ?? 5), label: "Slope lookback" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iMA(_Symbol, _Period, ${pIn}, 0, MODE_EMA, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    entryConditions: [
      { direction: "long", expr: `(BufferValue(${h},1) > BufferValue(${h},1+${lIn}))` },
      { direction: "short", expr: `(BufferValue(${h},1) < BufferValue(${h},1+${lIn}))` },
    ],
    summaryFragments: [`EMA(${p.period}) slope over ${p.lookback} bars`],
  };
};

// ── trend.adxStrength
export const translate_trend_adxStrength: Translator = (node) => {
  const p = node.params as { period: number; minAdx: number };
  const pIn = `InpAdxP_${sid(node.id)}`;
  const tIn = `InpAdxMin_${sid(node.id)}`;
  const h = `hAdx_${sid(node.id)}`;
  return {
    inputs: [
      { name: pIn, type: "int", defaultExpr: String(p.period ?? 14), label: "ADX period" },
      { name: tIn, type: "double", defaultExpr: String(p.minAdx ?? 20), label: "Min ADX" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iADX(_Symbol, _Period, ${pIn});`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    gates: [{ expr: `(BufferValue(${h},1) >= ${tIn})`, reason: "ADX too low (no trend)" }],
    summaryFragments: [`ADX(${p.period}) ≥ ${p.minAdx}`],
  };
};

// ── trend.adxNonTrend (ADX below threshold — range mode)
export const translate_trend_adxNonTrend: Translator = (node) => {
  const p = node.params as { period: number; maxAdx: number };
  const pIn = `InpAdxNtP_${sid(node.id)}`;
  const tIn = `InpAdxNtMax_${sid(node.id)}`;
  const h = `hAdxNt_${sid(node.id)}`;
  return {
    inputs: [
      { name: pIn, type: "int", defaultExpr: String(p.period ?? 14), label: "ADX period" },
      { name: tIn, type: "double", defaultExpr: String(p.maxAdx ?? 20), label: "Max ADX" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iADX(_Symbol, _Period, ${pIn});`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    gates: [{ expr: `(BufferValue(${h},1) <= ${tIn})`, reason: "ADX too high (trend present)" }],
    summaryFragments: [`ADX(${p.period}) ≤ ${p.maxAdx}`],
  };
};

// ── trend.higherTfEma
export const translate_trend_higherTfEma: Translator = (node) => {
  const p = node.params as { timeframe: string; period: number };
  const pIn = `InpHtfEmaP_${sid(node.id)}`;
  const h = `hHtfEma_${sid(node.id)}`;
  const tf = TF_ENUM[p.timeframe ?? "H4"] ?? "PERIOD_H4";
  return {
    inputs: [{ name: pIn, type: "int", defaultExpr: String(p.period ?? 50), label: "HTF EMA period" }],
    indicators: [{ handleVar: h, init: `${h} = iMA(_Symbol, ${tf}, ${pIn}, 0, MODE_EMA, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    entryConditions: [
      { direction: "long", expr: `(BufferValue(${h},1) > BufferValue(${h},2))` },
      { direction: "short", expr: `(BufferValue(${h},1) < BufferValue(${h},2))` },
    ],
    summaryFragments: [`${p.timeframe ?? "H4"} EMA(${p.period}) slope`],
  };
};

// ── trend.ichimokuCloudSide (price vs Kumo)
export const translate_trend_ichimokuCloudSide: Translator = (node) => {
  const p = node.params as { tenkan: number; kijun: number; senkou: number };
  const tIn = `InpIchT_${sid(node.id)}`;
  const kIn = `InpIchK_${sid(node.id)}`;
  const sIn = `InpIchS_${sid(node.id)}`;
  const h = `hIch_${sid(node.id)}`;
  return {
    inputs: [
      { name: tIn, type: "int", defaultExpr: String(p.tenkan ?? 9), label: "Tenkan" },
      { name: kIn, type: "int", defaultExpr: String(p.kijun ?? 26), label: "Kijun" },
      { name: sIn, type: "int", defaultExpr: String(p.senkou ?? 52), label: "Senkou" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iIchimoku(_Symbol, _Period, ${tIn}, ${kIn}, ${sIn});`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    helpers: [
      `double IchTop_${sid(node.id)}(int handle){ double a[],b[]; if(CopyBuffer(handle,2,1,1,a)<=0) return 0; if(CopyBuffer(handle,3,1,1,b)<=0) return 0; return MathMax(a[0],b[0]); }
double IchBot_${sid(node.id)}(int handle){ double a[],b[]; if(CopyBuffer(handle,2,1,1,a)<=0) return 0; if(CopyBuffer(handle,3,1,1,b)<=0) return 0; return MathMin(a[0],b[0]); }`,
    ],
    entryConditions: [
      { direction: "long", expr: `(iClose(_Symbol,_Period,1) > IchTop_${sid(node.id)}(${h}))` },
      { direction: "short", expr: `(iClose(_Symbol,_Period,1) < IchBot_${sid(node.id)}(${h}))` },
    ],
    summaryFragments: [`Price vs Ichimoku Kumo (${p.tenkan}/${p.kijun}/${p.senkou})`],
  };
};

// ── trend.hullDirection (HMA approximated as WMA of (2·WMA(n/2) − WMA(n)))
// We use WMA(n/2) slope as a cheap proxy since MQL5 has no native HMA.
export const translate_trend_hullDirection: Translator = (node) => {
  const p = node.params as { period: number };
  const pIn = `InpHullP_${sid(node.id)}`;
  const h = `hHull_${sid(node.id)}`;
  return {
    inputs: [{ name: pIn, type: "int", defaultExpr: String(p.period ?? 55), label: "HMA period" }],
    indicators: [{ handleVar: h, init: `${h} = iMA(_Symbol, _Period, MathMax(2, (int)MathSqrt(${pIn})), 0, MODE_LWMA, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    entryConditions: [
      { direction: "long", expr: `(BufferValue(${h},1) > BufferValue(${h},2))` },
      { direction: "short", expr: `(BufferValue(${h},1) < BufferValue(${h},2))` },
    ],
    summaryFragments: [`HMA(${p.period}) direction (simplified)`],
  };
};

// ── trend.supertrend (approximated via ATR bands around the median)
export const translate_trend_supertrend: Translator = (node) => {
  const p = node.params as { atrPeriod: number; multiplier: number };
  const aIn = `InpStA_${sid(node.id)}`;
  const mIn = `InpStM_${sid(node.id)}`;
  const h = `hStAtr_${sid(node.id)}`;
  return {
    inputs: [
      { name: aIn, type: "int", defaultExpr: String(p.atrPeriod ?? 10), label: "ATR period" },
      { name: mIn, type: "double", defaultExpr: String(p.multiplier ?? 3), label: "ATR multiplier" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iATR(_Symbol, _Period, ${aIn});`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    helpers: [
      `double SupertrendBasis_${sid(node.id)}(int shift)
{
   return (iHigh(_Symbol,_Period,shift) + iLow(_Symbol,_Period,shift)) / 2.0;
}`,
    ],
    entryConditions: [
      { direction: "long", expr: `(iClose(_Symbol,_Period,1) > SupertrendBasis_${sid(node.id)}(1) + ${mIn} * BufferValue(${h},1))` },
      { direction: "short", expr: `(iClose(_Symbol,_Period,1) < SupertrendBasis_${sid(node.id)}(1) - ${mIn} * BufferValue(${h},1))` },
    ],
    summaryFragments: [`Supertrend(${p.atrPeriod}, ${p.multiplier})`],
  };
};

// ── trend.aroon (positional %: recent high/low within `period` bars)
export const translate_trend_aroon: Translator = (node) => {
  const p = node.params as { period: number };
  const pIn = `InpArnP_${sid(node.id)}`;
  return {
    inputs: [{ name: pIn, type: "int", defaultExpr: String(p.period ?? 14), label: "Aroon period" }],
    helpers: [
      `double AroonUp_${sid(node.id)}(int period)
{
   int idxMax = iHighest(_Symbol, _Period, MODE_HIGH, period, 1);
   if(idxMax < 0) return 0;
   return ((double)(period - (idxMax - 1)) / period) * 100.0;
}
double AroonDown_${sid(node.id)}(int period)
{
   int idxMin = iLowest(_Symbol, _Period, MODE_LOW, period, 1);
   if(idxMin < 0) return 0;
   return ((double)(period - (idxMin - 1)) / period) * 100.0;
}`,
    ],
    entryConditions: [
      { direction: "long", expr: `(AroonUp_${sid(node.id)}(${pIn}) > AroonDown_${sid(node.id)}(${pIn}))` },
      { direction: "short", expr: `(AroonUp_${sid(node.id)}(${pIn}) < AroonDown_${sid(node.id)}(${pIn}))` },
    ],
    summaryFragments: [`Aroon(${p.period}) dominance`],
  };
};

// ── trend.dmiDirection (+DI vs −DI from iADX)
export const translate_trend_dmiDirection: Translator = (node) => {
  const p = node.params as { period: number };
  const pIn = `InpDmiP_${sid(node.id)}`;
  const h = `hDmi_${sid(node.id)}`;
  return {
    inputs: [{ name: pIn, type: "int", defaultExpr: String(p.period ?? 14), label: "DMI period" }],
    indicators: [{ handleVar: h, init: `${h} = iADX(_Symbol, _Period, ${pIn});`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    helpers: [
      `double PlusDi_${sid(node.id)}(int handle){ double b[]; if(CopyBuffer(handle,1,1,1,b)<=0) return 0; return b[0]; }
double MinusDi_${sid(node.id)}(int handle){ double b[]; if(CopyBuffer(handle,2,1,1,b)<=0) return 0; return b[0]; }`,
    ],
    entryConditions: [
      { direction: "long", expr: `(PlusDi_${sid(node.id)}(${h}) > MinusDi_${sid(node.id)}(${h}))` },
      { direction: "short", expr: `(PlusDi_${sid(node.id)}(${h}) < MinusDi_${sid(node.id)}(${h}))` },
    ],
    summaryFragments: [`DMI direction (+DI vs −DI, period ${p.period})`],
  };
};

// ── trend.linearRegression (LR slope sign over N bars — via simple OLS)
export const translate_trend_linearRegression: Translator = (node) => {
  const p = node.params as { period: number };
  const pIn = `InpLrP_${sid(node.id)}`;
  return {
    inputs: [{ name: pIn, type: "int", defaultExpr: String(p.period ?? 50), label: "Regression bars" }],
    helpers: [
      `double LrSlope_${sid(node.id)}(int n)
{
   if(n < 2) return 0.0;
   double sx=0, sy=0, sxy=0, sxx=0;
   for(int i=0;i<n;i++) {
      double x = (double)i;
      double y = iClose(_Symbol, _Period, 1 + i);
      sx += x; sy += y; sxy += x*y; sxx += x*x;
   }
   double denom = (n * sxx - sx * sx);
   if(denom == 0) return 0.0;
   return (n * sxy - sx * sy) / denom;
}`,
    ],
    entryConditions: [
      // Slope is negative when most-recent (i=0) has smaller x; we flip via sign.
      { direction: "long", expr: `(LrSlope_${sid(node.id)}(${pIn}) < 0)` },
      { direction: "short", expr: `(LrSlope_${sid(node.id)}(${pIn}) > 0)` },
    ],
    summaryFragments: [`LR slope(${p.period})`],
  };
};
