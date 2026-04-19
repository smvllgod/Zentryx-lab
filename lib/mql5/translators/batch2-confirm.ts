// Batch 2 — confirmation family (8 blocks).

import type { Translator } from "../types";

const sid = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);

// ── confirm.rsiSide (longs when RSI > longAbove, shorts when RSI < shortBelow)
export const translate_confirm_rsiSide: Translator = (node) => {
  const p = node.params as { period: number; longAbove: number; shortBelow: number };
  const pIn = `InpRsSideP_${sid(node.id)}`;
  const la = `InpRsSideLa_${sid(node.id)}`;
  const sb = `InpRsSideSb_${sid(node.id)}`;
  const h = `hRsSide_${sid(node.id)}`;
  return {
    inputs: [
      { name: pIn, type: "int", defaultExpr: String(p.period ?? 14), label: "RSI period" },
      { name: la, type: "double", defaultExpr: String(p.longAbove ?? 50), label: "Longs only when RSI >" },
      { name: sb, type: "double", defaultExpr: String(p.shortBelow ?? 50), label: "Shorts only when RSI <" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iRSI(_Symbol, _Period, ${pIn}, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    entryConditions: [
      { direction: "long", expr: `(BufferValue(${h},1) > ${la})` },
      { direction: "short", expr: `(BufferValue(${h},1) < ${sb})` },
    ],
    summaryFragments: [`RSI side gate (${p.longAbove}/${p.shortBelow})`],
  };
};

// ── confirm.stochSlope
export const translate_confirm_stochSlope: Translator = (node) => {
  const p = node.params as { kPeriod: number };
  const kIn = `InpStSlopeK_${sid(node.id)}`;
  const h = `hStSlope_${sid(node.id)}`;
  return {
    inputs: [{ name: kIn, type: "int", defaultExpr: String(p.kPeriod ?? 14), label: "%K period" }],
    indicators: [{ handleVar: h, init: `${h} = iStochastic(_Symbol, _Period, ${kIn}, 3, 3, MODE_SMA, STO_LOWHIGH);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    entryConditions: [
      { direction: "long", expr: `(BufferValue(${h},1) > BufferValue(${h},2))` },
      { direction: "short", expr: `(BufferValue(${h},1) < BufferValue(${h},2))` },
    ],
    summaryFragments: [`Stoch %K(${p.kPeriod}) slope`],
  };
};

// ── confirm.priceVsVwap (session VWAP approximation)
// MQL5 has no built-in VWAP — approximate by running-sum of typical price × volume
// since session start (00:00 server). Emits a helper that recomputes on each bar.
export const translate_confirm_priceVsVwap: Translator = (node) => {
  return {
    helpers: [
      `double SessionVwap_${sid(node.id)}()
{
   MqlDateTime t; TimeToStruct(TimeTradeServer(), t);
   datetime sod = StructToTime(t) - t.hour*3600 - t.min*60 - t.sec;
   int shift = iBarShift(_Symbol, _Period, sod, false);
   if(shift <= 0) return iClose(_Symbol, _Period, 1);
   double sumPV = 0.0; double sumV = 0.0;
   for(int i = shift; i >= 1; i--) {
      double tp = (iHigh(_Symbol,_Period,i) + iLow(_Symbol,_Period,i) + iClose(_Symbol,_Period,i)) / 3.0;
      double v  = (double)iVolume(_Symbol, _Period, i);
      sumPV += tp * v; sumV += v;
   }
   return (sumV == 0) ? iClose(_Symbol,_Period,1) : sumPV / sumV;
}`,
    ],
    entryConditions: [
      { direction: "long", expr: `(iClose(_Symbol, _Period, 1) > SessionVwap_${sid(node.id)}())` },
      { direction: "short", expr: `(iClose(_Symbol, _Period, 1) < SessionVwap_${sid(node.id)}())` },
    ],
    summaryFragments: [`Price vs session VWAP`],
  };
};

// ── confirm.higherHigh (HH/HL for long, LH/LL for short) — simplified
export const translate_confirm_higherHigh: Translator = (node) => {
  const p = node.params as { lookback: number };
  const lIn = `InpHhL_${sid(node.id)}`;
  return {
    inputs: [{ name: lIn, type: "int", defaultExpr: String(p.lookback ?? 10), label: "Swing lookback" }],
    helpers: [
      `bool HigherHighLow_${sid(node.id)}(int lb)
{
   double hi1 = iHigh(_Symbol,_Period,1);
   double hi2 = iHigh(_Symbol,_Period,1 + lb);
   double lo1 = iLow(_Symbol,_Period,1);
   double lo2 = iLow(_Symbol,_Period,1 + lb);
   return (hi1 > hi2 && lo1 > lo2);
}
bool LowerHighLow_${sid(node.id)}(int lb)
{
   double hi1 = iHigh(_Symbol,_Period,1);
   double hi2 = iHigh(_Symbol,_Period,1 + lb);
   double lo1 = iLow(_Symbol,_Period,1);
   double lo2 = iLow(_Symbol,_Period,1 + lb);
   return (hi1 < hi2 && lo1 < lo2);
}`,
    ],
    entryConditions: [
      { direction: "long", expr: `HigherHighLow_${sid(node.id)}(${lIn})` },
      { direction: "short", expr: `LowerHighLow_${sid(node.id)}(${lIn})` },
    ],
    summaryFragments: [`HH/HL confirmation (${p.lookback} bars)`],
  };
};

// ── confirm.atrAboveMa
export const translate_confirm_atrAboveMa: Translator = (node) => {
  const p = node.params as { atrPeriod: number; maPeriod: number };
  const aIn = `InpAaMaA_${sid(node.id)}`;
  const mIn = `InpAaMaM_${sid(node.id)}`;
  const h = `hAaMa_${sid(node.id)}`;
  return {
    inputs: [
      { name: aIn, type: "int", defaultExpr: String(p.atrPeriod ?? 14), label: "ATR period" },
      { name: mIn, type: "int", defaultExpr: String(p.maPeriod ?? 50), label: "ATR-MA period" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iATR(_Symbol, _Period, ${aIn});`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    helpers: [
      `double AtrMa_${sid(node.id)}(int handle, int bars)
{
   double b[]; if(CopyBuffer(handle, 0, 1, bars, b) <= 0) return 0.0;
   double s = 0.0; for(int i=0;i<bars;i++) s += b[i]; return s / bars;
}`,
    ],
    gates: [{ expr: `(BufferValue(${h},1) > AtrMa_${sid(node.id)}(${h}, ${mIn}))`, reason: "ATR below its MA" }],
    summaryFragments: [`ATR(${p.atrPeriod}) > MA${p.maPeriod}`],
  };
};

// ── confirm.tickVolume
export const translate_confirm_tickVolume: Translator = (node) => {
  const p = node.params as { lookback: number; multiplier: number };
  const lIn = `InpTvL_${sid(node.id)}`;
  const kIn = `InpTvK_${sid(node.id)}`;
  return {
    inputs: [
      { name: lIn, type: "int", defaultExpr: String(p.lookback ?? 20), label: "Volume MA lookback" },
      { name: kIn, type: "double", defaultExpr: String(p.multiplier ?? 1.5), label: "Spike multiplier" },
    ],
    helpers: [
      `double TickVolumeMa_${sid(node.id)}(int bars)
{
   double s = 0.0;
   for(int i=1; i<=bars; i++) s += (double)iVolume(_Symbol, _Period, i);
   return s / bars;
}`,
    ],
    gates: [{ expr: `((double)iVolume(_Symbol, _Period, 1) >= TickVolumeMa_${sid(node.id)}(${lIn}) * ${kIn})`, reason: "No volume spike" }],
    summaryFragments: [`Tick volume > ${p.multiplier}× MA${p.lookback}`],
  };
};

// ── confirm.obvSlope (OBV rising/falling matches direction)
export const translate_confirm_obvSlope: Translator = (node) => {
  const p = node.params as { lookback: number };
  const lIn = `InpObvL_${sid(node.id)}`;
  const h = `hObv_${sid(node.id)}`;
  return {
    inputs: [{ name: lIn, type: "int", defaultExpr: String(p.lookback ?? 5), label: "OBV slope lookback" }],
    indicators: [{ handleVar: h, init: `${h} = iOBV(_Symbol, _Period, VOLUME_TICK);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    entryConditions: [
      { direction: "long", expr: `(BufferValue(${h},1) > BufferValue(${h},1+${lIn}))` },
      { direction: "short", expr: `(BufferValue(${h},1) < BufferValue(${h},1+${lIn}))` },
    ],
    summaryFragments: [`OBV slope (${p.lookback})`],
  };
};

// ── confirm.minBarsSinceSignal (cooldown: N bars since last trade fill)
export const translate_confirm_minBarsSinceSignal: Translator = (node) => {
  const p = node.params as { minBars: number };
  const mIn = `InpCdBars_${sid(node.id)}`;
  return {
    inputs: [{ name: mIn, type: "int", defaultExpr: String(p.minBars ?? 5), label: "Min bars since last trade" }],
    globals: [`datetime _zxLastEntryBar_${sid(node.id)} = 0;`],
    helpers: [
      `bool CooldownReady_${sid(node.id)}(int bars)
{
   if(_zxLastEntryBar_${sid(node.id)} == 0) return true;
   int shift = iBarShift(_Symbol, _Period, _zxLastEntryBar_${sid(node.id)}, false);
   return (shift >= bars);
}
void CooldownMark_${sid(node.id)}()
{
   _zxLastEntryBar_${sid(node.id)} = iTime(_Symbol, _Period, 0);
}`,
    ],
    gates: [{ expr: `CooldownReady_${sid(node.id)}(${mIn})`, reason: "Inside post-trade cooldown" }],
    onInitCode: [`// Bind OnTrade: we rely on bar age since last OrderSend to approximate cooldown.`],
    summaryFragments: [`Cooldown ${p.minBars} bars after trade`],
  };
};
