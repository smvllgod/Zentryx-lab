// Batch 2 — MTF family (6 blocks).

import type { Translator } from "../types";

const sid = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);

const TF_ENUM: Record<string, string> = {
  M1: "PERIOD_M1", M5: "PERIOD_M5", M15: "PERIOD_M15", M30: "PERIOD_M30",
  H1: "PERIOD_H1", H4: "PERIOD_H4", D1: "PERIOD_D1", W1: "PERIOD_W1", MN1: "PERIOD_MN1",
};

// ── mtf.higherTfAlignment
export const translate_mtf_higherTfAlignment: Translator = (node) => {
  const p = node.params as { timeframe: string; maType: "ema" | "sma"; period: number };
  const pIn = `InpHtfAlP_${sid(node.id)}`;
  const h = `hHtfAl_${sid(node.id)}`;
  const tf = TF_ENUM[p.timeframe ?? "H4"] ?? "PERIOD_H4";
  const mode = p.maType === "sma" ? "MODE_SMA" : "MODE_EMA";
  return {
    inputs: [{ name: pIn, type: "int", defaultExpr: String(p.period ?? 50), label: "HTF MA period" }],
    indicators: [{ handleVar: h, init: `${h} = iMA(_Symbol, ${tf}, ${pIn}, 0, ${mode}, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    entryConditions: [
      { direction: "long", expr: `(BufferValue(${h},1) > BufferValue(${h},2))` },
      { direction: "short", expr: `(BufferValue(${h},1) < BufferValue(${h},2))` },
    ],
    summaryFragments: [`${p.timeframe ?? "H4"} ${(p.maType ?? "ema").toUpperCase()}(${p.period}) slope`],
  };
};

// ── mtf.higherTfMacd
export const translate_mtf_higherTfMacd: Translator = (node) => {
  const p = node.params as { timeframe: string; fastPeriod: number; slowPeriod: number; signalPeriod: number };
  const fIn = `InpHtfMacdF_${sid(node.id)}`;
  const sIn = `InpHtfMacdS_${sid(node.id)}`;
  const gIn = `InpHtfMacdG_${sid(node.id)}`;
  const h = `hHtfMacd_${sid(node.id)}`;
  const tf = TF_ENUM[p.timeframe ?? "H4"] ?? "PERIOD_H4";
  return {
    inputs: [
      { name: fIn, type: "int", defaultExpr: String(p.fastPeriod ?? 12), label: "HTF MACD fast" },
      { name: sIn, type: "int", defaultExpr: String(p.slowPeriod ?? 26), label: "HTF MACD slow" },
      { name: gIn, type: "int", defaultExpr: String(p.signalPeriod ?? 9), label: "HTF MACD signal" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iMACD(_Symbol, ${tf}, ${fIn}, ${sIn}, ${gIn}, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    helpers: [
      `double HtfMacdHist_${sid(node.id)}(int handle)
{
   double m[]; double s[];
   if(CopyBuffer(handle, 0, 1, 1, m) <= 0) return 0.0;
   if(CopyBuffer(handle, 1, 1, 1, s) <= 0) return 0.0;
   return m[0] - s[0];
}`,
    ],
    entryConditions: [
      { direction: "long", expr: `(HtfMacdHist_${sid(node.id)}(${h}) >= 0)` },
      { direction: "short", expr: `(HtfMacdHist_${sid(node.id)}(${h}) <= 0)` },
    ],
    summaryFragments: [`${p.timeframe ?? "H4"} MACD sign`],
  };
};

// ── mtf.lowerTfTrigger — checks lower TF RSI crossed 50 (simple proxy trigger)
export const translate_mtf_lowerTfTrigger: Translator = (node) => {
  const p = node.params as { timeframe: string };
  const h = `hLtfRsi_${sid(node.id)}`;
  const tf = TF_ENUM[p.timeframe ?? "M5"] ?? "PERIOD_M5";
  return {
    indicators: [{ handleVar: h, init: `${h} = iRSI(_Symbol, ${tf}, 14, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    entryConditions: [
      { direction: "long", expr: `(BufferValue(${h},1) > 50 && BufferValue(${h},2) <= 50)` },
      { direction: "short", expr: `(BufferValue(${h},1) < 50 && BufferValue(${h},2) >= 50)` },
    ],
    summaryFragments: [`${p.timeframe ?? "M5"} RSI cross 50 trigger`],
  };
};

// ── mtf.weeklyBias
export const translate_mtf_weeklyBias: Translator = () => {
  return {
    entryConditions: [
      { direction: "long", expr: `(iClose(_Symbol, PERIOD_W1, 1) >= iOpen(_Symbol, PERIOD_W1, 1))` },
      { direction: "short", expr: `(iClose(_Symbol, PERIOD_W1, 1) <= iOpen(_Symbol, PERIOD_W1, 1))` },
    ],
    summaryFragments: [`Weekly bias (prior-week candle)`],
  };
};

// ── mtf.htfStructure (HTF HH/LL required — simplified)
export const translate_mtf_htfStructure: Translator = (node) => {
  const p = node.params as { timeframe: string };
  const tf = TF_ENUM[p.timeframe ?? "H4"] ?? "PERIOD_H4";
  return {
    helpers: [
      `bool HtfStructureBull_${sid(node.id)}()
{
   return (iHigh(_Symbol, ${tf}, 1) > iHigh(_Symbol, ${tf}, 2)
        && iLow(_Symbol, ${tf}, 1)  > iLow(_Symbol, ${tf}, 2));
}
bool HtfStructureBear_${sid(node.id)}()
{
   return (iHigh(_Symbol, ${tf}, 1) < iHigh(_Symbol, ${tf}, 2)
        && iLow(_Symbol, ${tf}, 1)  < iLow(_Symbol, ${tf}, 2));
}`,
    ],
    entryConditions: [
      { direction: "long", expr: `HtfStructureBull_${sid(node.id)}()` },
      { direction: "short", expr: `HtfStructureBear_${sid(node.id)}()` },
    ],
    summaryFragments: [`${p.timeframe ?? "H4"} structure (HH/HL)`],
  };
};

// ── mtf.htfVolatility (ATR on HTF within band — simplified as non-zero ATR)
export const translate_mtf_htfVolatility: Translator = (node) => {
  const p = node.params as { timeframe: string; period: number };
  const pIn = `InpHtfVolP_${sid(node.id)}`;
  const h = `hHtfVol_${sid(node.id)}`;
  const tf = TF_ENUM[p.timeframe ?? "H4"] ?? "PERIOD_H4";
  return {
    inputs: [{ name: pIn, type: "int", defaultExpr: String(p.period ?? 14), label: "HTF ATR period" }],
    indicators: [{ handleVar: h, init: `${h} = iATR(_Symbol, ${tf}, ${pIn});`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    gates: [{ expr: `(BufferValue(${h},1) > 0.0)`, reason: "HTF ATR not ready" }],
    summaryFragments: [`${p.timeframe ?? "H4"} ATR(${p.period}) ready`],
  };
};
