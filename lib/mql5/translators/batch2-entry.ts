// Batch 2 — entry family (15 blocks).
// Each emits entryConditions for long / short. The canvas `direction` param
// narrows the emitted conditions.

import type { Translator } from "../types";
import type { SignalDirection } from "../types";

const sid = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);

function dirConds(dir: string | undefined, longExpr: string, shortExpr: string) {
  const d = (dir ?? "both") as "long" | "short" | "both";
  const out: { direction: SignalDirection; expr: string }[] = [];
  if (d === "long" || d === "both") out.push({ direction: "long", expr: longExpr });
  if (d === "short" || d === "both") out.push({ direction: "short", expr: shortExpr });
  return out;
}

// ── entry.macdZeroCross
export const translate_entry_macdZeroCross: Translator = (node) => {
  const p = node.params as { fastPeriod: number; slowPeriod: number; direction?: string };
  const tag = sid(node.id);
  const h = `hMzc_${tag}`;
  return {
    inputs: [
      { name: `InpMzcF_${tag}`, type: "int", defaultExpr: String(p.fastPeriod ?? 12), label: "MACD fast" },
      { name: `InpMzcS_${tag}`, type: "int", defaultExpr: String(p.slowPeriod ?? 26), label: "MACD slow" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iMACD(_Symbol, _Period, InpMzcF_${tag}, InpMzcS_${tag}, 9, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    entryConditions: dirConds(
      p.direction,
      `(BufferValue(${h},1) > 0 && BufferValue(${h},2) <= 0)`,
      `(BufferValue(${h},1) < 0 && BufferValue(${h},2) >= 0)`,
    ),
    summaryFragments: [`MACD zero cross`],
  };
};

// ── entry.rsiCross (RSI crosses 50)
export const translate_entry_rsiCross: Translator = (node) => {
  const p = node.params as { period: number; direction?: string };
  const tag = sid(node.id);
  const h = `hRsiCr_${tag}`;
  return {
    inputs: [{ name: `InpRsiCrP_${tag}`, type: "int", defaultExpr: String(p.period ?? 14), label: "RSI period" }],
    indicators: [{ handleVar: h, init: `${h} = iRSI(_Symbol, _Period, InpRsiCrP_${tag}, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    entryConditions: dirConds(
      p.direction,
      `(BufferValue(${h},1) > 50 && BufferValue(${h},2) <= 50)`,
      `(BufferValue(${h},1) < 50 && BufferValue(${h},2) >= 50)`,
    ),
    summaryFragments: [`RSI(${p.period}) centerline cross`],
  };
};

// ── entry.adxCross (ADX crosses threshold)
export const translate_entry_adxCross: Translator = (node) => {
  const p = node.params as { period: number; threshold: number; direction?: string };
  const tag = sid(node.id);
  const h = `hAdxCr_${tag}`;
  return {
    inputs: [
      { name: `InpAdxCrP_${tag}`, type: "int", defaultExpr: String(p.period ?? 14), label: "ADX period" },
      { name: `InpAdxCrT_${tag}`, type: "double", defaultExpr: String(p.threshold ?? 20), label: "Activation ADX" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iADX(_Symbol, _Period, InpAdxCrP_${tag});`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    helpers: [
      `double Adx_${tag}(int handle, int shift) { double b[]; if(CopyBuffer(handle,0,shift,1,b)<=0) return 0; return b[0]; }
double PlusDi_${tag}(int handle, int shift) { double b[]; if(CopyBuffer(handle,1,shift,1,b)<=0) return 0; return b[0]; }
double MinusDi_${tag}(int handle, int shift) { double b[]; if(CopyBuffer(handle,2,shift,1,b)<=0) return 0; return b[0]; }`,
    ],
    entryConditions: dirConds(
      p.direction,
      `(Adx_${tag}(${h},1) > InpAdxCrT_${tag} && Adx_${tag}(${h},2) <= InpAdxCrT_${tag} && PlusDi_${tag}(${h},1) > MinusDi_${tag}(${h},1))`,
      `(Adx_${tag}(${h},1) > InpAdxCrT_${tag} && Adx_${tag}(${h},2) <= InpAdxCrT_${tag} && PlusDi_${tag}(${h},1) < MinusDi_${tag}(${h},1))`,
    ),
    summaryFragments: [`ADX(${p.period}) > ${p.threshold} activation`],
  };
};

// ── entry.ichimokuKijun
export const translate_entry_ichimokuKijun: Translator = (node) => {
  const p = node.params as { tenkan: number; kijun: number; senkou: number; direction?: string };
  const tag = sid(node.id);
  const h = `hIkc_${tag}`;
  return {
    inputs: [
      { name: `InpIkcT_${tag}`, type: "int", defaultExpr: String(p.tenkan ?? 9), label: "Tenkan" },
      { name: `InpIkcK_${tag}`, type: "int", defaultExpr: String(p.kijun ?? 26), label: "Kijun" },
      { name: `InpIkcS_${tag}`, type: "int", defaultExpr: String(p.senkou ?? 52), label: "Senkou" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iIchimoku(_Symbol, _Period, InpIkcT_${tag}, InpIkcK_${tag}, InpIkcS_${tag});`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    helpers: [
      `double IkcKij_${tag}(int handle, int shift) { double b[]; if(CopyBuffer(handle,1,shift,1,b)<=0) return 0; return b[0]; }`,
    ],
    entryConditions: dirConds(
      p.direction,
      `(iClose(_Symbol,_Period,1) > IkcKij_${tag}(${h},1) && iClose(_Symbol,_Period,2) <= IkcKij_${tag}(${h},2))`,
      `(iClose(_Symbol,_Period,1) < IkcKij_${tag}(${h},1) && iClose(_Symbol,_Period,2) >= IkcKij_${tag}(${h},2))`,
    ),
    summaryFragments: [`Price crosses Kijun(${p.kijun})`],
  };
};

// ── entry.bollingerBreak
export const translate_entry_bollingerBreak: Translator = (node) => {
  const p = node.params as { period: number; deviation: number; direction?: string };
  const tag = sid(node.id);
  const h = `hBbBr_${tag}`;
  return {
    inputs: [
      { name: `InpBbBrP_${tag}`, type: "int", defaultExpr: String(p.period ?? 20), label: "BB period" },
      { name: `InpBbBrD_${tag}`, type: "double", defaultExpr: String(p.deviation ?? 2), label: "BB deviation" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iBands(_Symbol, _Period, InpBbBrP_${tag}, 0, InpBbBrD_${tag}, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    helpers: [
      `double BbUp_${tag}(int handle, int shift) { double b[]; if(CopyBuffer(handle,1,shift,1,b)<=0) return 0; return b[0]; }
double BbLo_${tag}(int handle, int shift) { double b[]; if(CopyBuffer(handle,2,shift,1,b)<=0) return 0; return b[0]; }`,
    ],
    entryConditions: dirConds(
      p.direction,
      `(iClose(_Symbol,_Period,1) > BbUp_${tag}(${h},1))`,
      `(iClose(_Symbol,_Period,1) < BbLo_${tag}(${h},1))`,
    ),
    summaryFragments: [`Bollinger(${p.period}, ${p.deviation}σ) breakout`],
  };
};

// ── entry.nBarBreakout
export const translate_entry_nBarBreakout: Translator = (node) => {
  const p = node.params as { period: number; direction?: string };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpNbP_${tag}`, type: "int", defaultExpr: String(p.period ?? 10), label: "Breakout bars" }],
    entryConditions: dirConds(
      p.direction,
      `(iClose(_Symbol,_Period,1) > iHigh(_Symbol, _Period, iHighest(_Symbol, _Period, MODE_HIGH, InpNbP_${tag}, 2)))`,
      `(iClose(_Symbol,_Period,1) < iLow(_Symbol,  _Period, iLowest(_Symbol,  _Period, MODE_LOW,  InpNbP_${tag}, 2)))`,
    ),
    summaryFragments: [`${p.period}-bar high/low break`],
  };
};

// ── entry.atrBreakout
export const translate_entry_atrBreakout: Translator = (node) => {
  const p = node.params as { atrPeriod: number; multiplier: number; direction?: string };
  const tag = sid(node.id);
  const h = `hAtrBr_${tag}`;
  return {
    inputs: [
      { name: `InpAtrBrP_${tag}`, type: "int", defaultExpr: String(p.atrPeriod ?? 14), label: "ATR period" },
      { name: `InpAtrBrM_${tag}`, type: "double", defaultExpr: String(p.multiplier ?? 1.0), label: "ATR multiplier" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iATR(_Symbol, _Period, InpAtrBrP_${tag});`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    entryConditions: dirConds(
      p.direction,
      `(iClose(_Symbol,_Period,1) > iOpen(_Symbol,_Period,1) + InpAtrBrM_${tag} * BufferValue(${h},1))`,
      `(iClose(_Symbol,_Period,1) < iOpen(_Symbol,_Period,1) - InpAtrBrM_${tag} * BufferValue(${h},1))`,
    ),
    summaryFragments: [`ATR(${p.atrPeriod}) × ${p.multiplier} breakout`],
  };
};

// ── entry.sessionBreakout (prior session range)
export const translate_entry_sessionBreakout: Translator = (node) => {
  const p = node.params as { session: "asia" | "london" | "custom"; direction?: string };
  const tag = sid(node.id);
  const sess = p.session ?? "asia";
  const [startH, endH] = sess === "london" ? [7, 16] : sess === "custom" ? [0, 8] : [0, 8];
  return {
    inputs: [
      { name: `InpSbStart_${tag}`, type: "int", defaultExpr: String(startH), label: "Session start hour" },
      { name: `InpSbEnd_${tag}`, type: "int", defaultExpr: String(endH), label: "Session end hour" },
    ],
    helpers: [
      `double SessionHigh_${tag}(int startH, int endH)
{
   MqlDateTime t; TimeToStruct(TimeTradeServer(), t);
   datetime sod = StructToTime(t) - t.hour*3600 - t.min*60 - t.sec;
   datetime s = sod + startH * 3600;
   datetime e = sod + endH * 3600;
   int si = iBarShift(_Symbol, _Period, s, false);
   int ei = iBarShift(_Symbol, _Period, e, false);
   if(si < 0 || ei < 0 || si < ei) return 0.0;
   double hi = 0;
   for(int i = ei; i <= si; i++) {
      double bh = iHigh(_Symbol, _Period, i);
      if(bh > hi) hi = bh;
   }
   return hi;
}
double SessionLow_${tag}(int startH, int endH)
{
   MqlDateTime t; TimeToStruct(TimeTradeServer(), t);
   datetime sod = StructToTime(t) - t.hour*3600 - t.min*60 - t.sec;
   datetime s = sod + startH * 3600;
   datetime e = sod + endH * 3600;
   int si = iBarShift(_Symbol, _Period, s, false);
   int ei = iBarShift(_Symbol, _Period, e, false);
   if(si < 0 || ei < 0 || si < ei) return 0.0;
   double lo = DBL_MAX;
   for(int i = ei; i <= si; i++) {
      double bl = iLow(_Symbol, _Period, i);
      if(bl < lo) lo = bl;
   }
   return (lo == DBL_MAX) ? 0 : lo;
}`,
    ],
    entryConditions: dirConds(
      p.direction,
      `(iClose(_Symbol,_Period,1) > SessionHigh_${tag}(InpSbStart_${tag}, InpSbEnd_${tag}))`,
      `(iClose(_Symbol,_Period,1) < SessionLow_${tag}(InpSbStart_${tag}, InpSbEnd_${tag}))`,
    ),
    summaryFragments: [`${sess} session break`],
  };
};

// ── entry.stochExtreme (%K leaves OB/OS)
export const translate_entry_stochExtreme: Translator = (node) => {
  const p = node.params as { kPeriod: number; direction?: string };
  const tag = sid(node.id);
  const h = `hStEx_${tag}`;
  return {
    inputs: [{ name: `InpStExK_${tag}`, type: "int", defaultExpr: String(p.kPeriod ?? 14), label: "%K period" }],
    indicators: [{ handleVar: h, init: `${h} = iStochastic(_Symbol, _Period, InpStExK_${tag}, 3, 3, MODE_SMA, STO_LOWHIGH);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    entryConditions: dirConds(
      p.direction,
      `(BufferValue(${h},1) > 20 && BufferValue(${h},2) <= 20)`,
      `(BufferValue(${h},1) < 80 && BufferValue(${h},2) >= 80)`,
    ),
    summaryFragments: [`Stoch %K extreme exit`],
  };
};

// ── entry.bollingerMeanRev
export const translate_entry_bollingerMeanRev: Translator = (node) => {
  const p = node.params as { period: number; deviation: number; direction?: string };
  const tag = sid(node.id);
  const h = `hBbMr_${tag}`;
  return {
    inputs: [
      { name: `InpBbMrP_${tag}`, type: "int", defaultExpr: String(p.period ?? 20), label: "BB period" },
      { name: `InpBbMrD_${tag}`, type: "double", defaultExpr: String(p.deviation ?? 2), label: "BB deviation" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iBands(_Symbol, _Period, InpBbMrP_${tag}, 0, InpBbMrD_${tag}, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    helpers: [
      `double BbMrUp_${tag}(int handle, int s){ double b[]; if(CopyBuffer(handle,1,s,1,b)<=0) return 0; return b[0]; }
double BbMrLo_${tag}(int handle, int s){ double b[]; if(CopyBuffer(handle,2,s,1,b)<=0) return 0; return b[0]; }`,
    ],
    entryConditions: dirConds(
      p.direction,
      // Long when previous bar closed below lower band and current bar closed back above it.
      `(iClose(_Symbol,_Period,2) < BbMrLo_${tag}(${h},2) && iClose(_Symbol,_Period,1) > BbMrLo_${tag}(${h},1))`,
      `(iClose(_Symbol,_Period,2) > BbMrUp_${tag}(${h},2) && iClose(_Symbol,_Period,1) < BbMrUp_${tag}(${h},1))`,
    ),
    summaryFragments: [`Bollinger mean reversion`],
  };
};

// ── entry.supportResistance (auto-detected S/R touch)
export const translate_entry_supportResistance: Translator = (node) => {
  const p = node.params as { lookback: number; direction?: string };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpSrL_${tag}`, type: "int", defaultExpr: String(p.lookback ?? 50), label: "Swing lookback" }],
    helpers: [
      `double SwingHigh_${tag}(int lb){ int i = iHighest(_Symbol, _Period, MODE_HIGH, lb, 2); return (i<0) ? 0 : iHigh(_Symbol,_Period,i); }
double SwingLow_${tag}(int lb){ int i = iLowest(_Symbol, _Period, MODE_LOW, lb, 2); return (i<0) ? 0 : iLow(_Symbol,_Period,i); }`,
    ],
    entryConditions: dirConds(
      p.direction,
      `(iLow(_Symbol,_Period,1) <= SwingLow_${tag}(InpSrL_${tag}) * 1.001 && iClose(_Symbol,_Period,1) > iOpen(_Symbol,_Period,1))`,
      `(iHigh(_Symbol,_Period,1) >= SwingHigh_${tag}(InpSrL_${tag}) * 0.999 && iClose(_Symbol,_Period,1) < iOpen(_Symbol,_Period,1))`,
    ),
    summaryFragments: [`S/R touch (${p.lookback} lookback)`],
  };
};

// ── entry.trendlineBreak (simplified: break of N-bar swing low/high slope)
export const translate_entry_trendlineBreak: Translator = (node) => {
  const p = node.params as { lookback: number; direction?: string };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpTlL_${tag}`, type: "int", defaultExpr: String(p.lookback ?? 50), label: "Trendline lookback" }],
    helpers: [
      `double TrendlineUp_${tag}(int lb){
   int i = iLowest(_Symbol, _Period, MODE_LOW, lb, 2);
   return (i<0) ? 0 : iLow(_Symbol,_Period,i);
}
double TrendlineDn_${tag}(int lb){
   int i = iHighest(_Symbol, _Period, MODE_HIGH, lb, 2);
   return (i<0) ? 0 : iHigh(_Symbol,_Period,i);
}`,
    ],
    entryConditions: dirConds(
      p.direction,
      `(iClose(_Symbol,_Period,1) > TrendlineDn_${tag}(InpTlL_${tag}))`,
      `(iClose(_Symbol,_Period,1) < TrendlineUp_${tag}(InpTlL_${tag}))`,
    ),
    summaryFragments: [`Trendline break (${p.lookback})`],
  };
};

// ── entry.priceActionPinbar
export const translate_entry_priceActionPinbar: Translator = (node) => {
  const p = node.params as { wickRatio: number; direction?: string };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpPinR_${tag}`, type: "double", defaultExpr: String(p.wickRatio ?? 2), label: "Wick/body ratio" }],
    helpers: [
      `bool PinBull_${tag}(double ratio){
   double o = iOpen(_Symbol,_Period,1);
   double c = iClose(_Symbol,_Period,1);
   double h = iHigh(_Symbol,_Period,1);
   double l = iLow(_Symbol,_Period,1);
   double body = MathAbs(c - o);
   double lowWick = MathMin(o, c) - l;
   if(body <= 0) return false;
   return (lowWick >= body * ratio) && (c > o);
}
bool PinBear_${tag}(double ratio){
   double o = iOpen(_Symbol,_Period,1);
   double c = iClose(_Symbol,_Period,1);
   double h = iHigh(_Symbol,_Period,1);
   double l = iLow(_Symbol,_Period,1);
   double body = MathAbs(c - o);
   double highWick = h - MathMax(o, c);
   if(body <= 0) return false;
   return (highWick >= body * ratio) && (c < o);
}`,
    ],
    entryConditions: dirConds(
      p.direction,
      `PinBull_${tag}(InpPinR_${tag})`,
      `PinBear_${tag}(InpPinR_${tag})`,
    ),
    summaryFragments: [`Pin-bar (${p.wickRatio}× body)`],
  };
};

// ── entry.engulfingTrigger
export const translate_entry_engulfingTrigger: Translator = (node) => {
  const p = node.params as { direction?: string };
  return {
    helpers: [
      `bool EngulfBull(){
   double o2 = iOpen(_Symbol,_Period,2); double c2 = iClose(_Symbol,_Period,2);
   double o1 = iOpen(_Symbol,_Period,1); double c1 = iClose(_Symbol,_Period,1);
   return (c2 < o2 && c1 > o1 && c1 > o2 && o1 < c2);
}
bool EngulfBear(){
   double o2 = iOpen(_Symbol,_Period,2); double c2 = iClose(_Symbol,_Period,2);
   double o1 = iOpen(_Symbol,_Period,1); double c1 = iClose(_Symbol,_Period,1);
   return (c2 > o2 && c1 < o1 && c1 < o2 && o1 > c2);
}`,
    ],
    entryConditions: dirConds(p.direction, `EngulfBull()`, `EngulfBear()`),
    summaryFragments: [`Engulfing entry`],
  };
};

// ── entry.multiSignal (Composite Signal Gate) — N-of-M simplified to AND of
// trend + momentum alignment. Users typically combine canvas-side.
export const translate_entry_multiSignal: Translator = (node) => {
  const p = node.params as { minRequired: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpMsMin_${tag}`, type: "int", defaultExpr: String(p.minRequired ?? 2), label: "Min confirmations" }],
    indicators: [
      { handleVar: `hMsEma_${tag}`, init: `hMsEma_${tag} = iMA(_Symbol, _Period, 50, 0, MODE_EMA, PRICE_CLOSE);`, release: `if(hMsEma_${tag} != INVALID_HANDLE) IndicatorRelease(hMsEma_${tag});` },
      { handleVar: `hMsRsi_${tag}`, init: `hMsRsi_${tag} = iRSI(_Symbol, _Period, 14, PRICE_CLOSE);`, release: `if(hMsRsi_${tag} != INVALID_HANDLE) IndicatorRelease(hMsRsi_${tag});` },
      { handleVar: `hMsMacd_${tag}`, init: `hMsMacd_${tag} = iMACD(_Symbol, _Period, 12, 26, 9, PRICE_CLOSE);`, release: `if(hMsMacd_${tag} != INVALID_HANDLE) IndicatorRelease(hMsMacd_${tag});` },
    ],
    helpers: [
      `int MsBullCount_${tag}(){
   int n = 0;
   if(iClose(_Symbol,_Period,1) > BufferValue(hMsEma_${tag},1)) n++;
   if(BufferValue(hMsRsi_${tag},1) > 50) n++;
   double mm[]; double ss[];
   if(CopyBuffer(hMsMacd_${tag}, 0, 1, 1, mm) > 0 && CopyBuffer(hMsMacd_${tag}, 1, 1, 1, ss) > 0)
      if((mm[0] - ss[0]) > 0) n++;
   return n;
}
int MsBearCount_${tag}(){
   int n = 0;
   if(iClose(_Symbol,_Period,1) < BufferValue(hMsEma_${tag},1)) n++;
   if(BufferValue(hMsRsi_${tag},1) < 50) n++;
   double mm[]; double ss[];
   if(CopyBuffer(hMsMacd_${tag}, 0, 1, 1, mm) > 0 && CopyBuffer(hMsMacd_${tag}, 1, 1, 1, ss) > 0)
      if((mm[0] - ss[0]) < 0) n++;
   return n;
}`,
    ],
    entryConditions: [
      { direction: "long", expr: `(MsBullCount_${tag}() >= InpMsMin_${tag})` },
      { direction: "short", expr: `(MsBearCount_${tag}() >= InpMsMin_${tag})` },
    ],
    summaryFragments: [`Composite ≥ ${p.minRequired}/3`],
  };
};
