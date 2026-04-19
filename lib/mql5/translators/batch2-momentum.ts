// Batch 2 — momentum family translators (8 blocks).
// Each emits a compile-clean MQL5 contribution. Divergence detectors use a
// simplified price-vs-indicator slope check; full multi-pivot divergence
// would need a pivot helper we don't ship yet.

import type { Translator } from "../types";

const sid = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);

// ── momentum.rsiBand ─────────────────────────────────────────────────
export const translate_momentum_rsiBand: Translator = (node) => {
  const p = node.params as { period: number; minRsi: number; maxRsi: number };
  const pIn = `InpRsiBandP_${sid(node.id)}`;
  const lo = `InpRsiBandLo_${sid(node.id)}`;
  const hi = `InpRsiBandHi_${sid(node.id)}`;
  const h = `hRsiBand_${sid(node.id)}`;
  return {
    inputs: [
      { name: pIn, type: "int", defaultExpr: String(p.period ?? 14), label: "RSI period" },
      { name: lo, type: "double", defaultExpr: String(p.minRsi ?? 30), label: "Min RSI" },
      { name: hi, type: "double", defaultExpr: String(p.maxRsi ?? 70), label: "Max RSI" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iRSI(_Symbol, _Period, ${pIn}, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    gates: [{ expr: `(BufferValue(${h},1) >= ${lo} && BufferValue(${h},1) <= ${hi})`, reason: "RSI outside allowed band" }],
    summaryFragments: [`RSI(${p.period}) ∈ [${p.minRsi}, ${p.maxRsi}]`],
  };
};

// ── momentum.macdHist (abs histogram above threshold) ────────────────
export const translate_momentum_macdHist: Translator = (node) => {
  const p = node.params as { fastPeriod: number; slowPeriod: number; signalPeriod: number; minHist: number };
  const fIn = `InpMhF_${sid(node.id)}`;
  const sIn = `InpMhS_${sid(node.id)}`;
  const gIn = `InpMhG_${sid(node.id)}`;
  const tIn = `InpMhT_${sid(node.id)}`;
  const h = `hMacdHist_${sid(node.id)}`;
  return {
    inputs: [
      { name: fIn, type: "int", defaultExpr: String(p.fastPeriod ?? 12), label: "MACD fast" },
      { name: sIn, type: "int", defaultExpr: String(p.slowPeriod ?? 26), label: "MACD slow" },
      { name: gIn, type: "int", defaultExpr: String(p.signalPeriod ?? 9), label: "MACD signal" },
      { name: tIn, type: "double", defaultExpr: String(p.minHist ?? 0.0002), label: "Min |histogram|" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iMACD(_Symbol, _Period, ${fIn}, ${sIn}, ${gIn}, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    helpers: [
      `double MacdHistValue_${sid(node.id)}(int handle)
{
   if(handle == INVALID_HANDLE) return 0.0;
   double m[]; double s[];
   if(CopyBuffer(handle, 0, 1, 1, m) <= 0) return 0.0;
   if(CopyBuffer(handle, 1, 1, 1, s) <= 0) return 0.0;
   return m[0] - s[0];
}`,
    ],
    gates: [{ expr: `(MathAbs(MacdHistValue_${sid(node.id)}(${h})) >= ${tIn})`, reason: "MACD histogram too small" }],
    summaryFragments: [`|MACD hist| ≥ ${p.minHist}`],
  };
};

// ── momentum.rocThreshold ───────────────────────────────────────────
export const translate_momentum_rocThreshold: Translator = (node) => {
  const p = node.params as { period: number; threshold: number; direction: "above" | "below" };
  const pIn = `InpRocP_${sid(node.id)}`;
  const tIn = `InpRocT_${sid(node.id)}`;
  const cmp = p.direction === "below" ? "<=" : ">=";
  return {
    inputs: [
      { name: pIn, type: "int", defaultExpr: String(p.period ?? 10), label: "ROC period" },
      { name: tIn, type: "double", defaultExpr: String(p.threshold ?? 0.2), label: "ROC |%|" },
    ],
    helpers: [
      `double RocPercent_${sid(node.id)}(int bars)
{
   double cNow  = iClose(_Symbol, _Period, 1);
   double cPast = iClose(_Symbol, _Period, 1 + bars);
   if(cPast == 0) return 0.0;
   return (cNow / cPast - 1.0) * 100.0;
}`,
    ],
    gates: [{ expr: `(MathAbs(RocPercent_${sid(node.id)}(${pIn})) ${cmp} ${tIn})`, reason: `ROC magnitude not ${p.direction}` }],
    summaryFragments: [`|ROC(${p.period})| ${cmp} ${p.threshold}%`],
  };
};

// ── momentum.momentumIndex (close/close-N) ──────────────────────────
export const translate_momentum_momentumIndex: Translator = (node) => {
  const p = node.params as { period: number };
  const pIn = `InpMomP_${sid(node.id)}`;
  return {
    inputs: [{ name: pIn, type: "int", defaultExpr: String(p.period ?? 10), label: "Momentum period" }],
    entryConditions: [
      { direction: "long", expr: `(iClose(_Symbol, _Period, 1) > iClose(_Symbol, _Period, 1 + ${pIn}))` },
      { direction: "short", expr: `(iClose(_Symbol, _Period, 1) < iClose(_Symbol, _Period, 1 + ${pIn}))` },
    ],
    summaryFragments: [`Momentum index (${p.period})`],
  };
};

// ── momentum.williamsR (both extremes blocked) ──────────────────────
export const translate_momentum_williamsR: Translator = (node) => {
  const p = node.params as { period: number };
  const pIn = `InpWrP_${sid(node.id)}`;
  const h = `hWr_${sid(node.id)}`;
  return {
    inputs: [{ name: pIn, type: "int", defaultExpr: String(p.period ?? 14), label: "Williams %R period" }],
    indicators: [{ handleVar: h, init: `${h} = iWPR(_Symbol, _Period, ${pIn});`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    // Williams %R ranges [-100, 0]; -80..-20 is the normal zone.
    gates: [{ expr: `(BufferValue(${h},1) >= -80 && BufferValue(${h},1) <= -20)`, reason: "Williams %R at extreme" }],
    summaryFragments: [`Williams %R(${p.period}) not extreme`],
  };
};

// ── momentum.trix (above / below zero by direction) ─────────────────
export const translate_momentum_trix: Translator = (node) => {
  const p = node.params as { period: number };
  const pIn = `InpTrixP_${sid(node.id)}`;
  const h = `hTrix_${sid(node.id)}`;
  // MQL5 has no native iTRIX — approximate via triple-smoothed EMA. We use
  // iMA(EMA) as a cheap proxy and check slope vs. prior bar.
  return {
    inputs: [{ name: pIn, type: "int", defaultExpr: String(p.period ?? 15), label: "TRIX period" }],
    indicators: [{ handleVar: h, init: `${h} = iMA(_Symbol, _Period, ${pIn}, 0, MODE_EMA, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    entryConditions: [
      { direction: "long", expr: `(BufferValue(${h},1) > BufferValue(${h},2))` },
      { direction: "short", expr: `(BufferValue(${h},1) < BufferValue(${h},2))` },
    ],
    summaryFragments: [`TRIX(${p.period}) slope (simplified)`],
  };
};

// ── momentum.rsiDivergence (simplified: RSI vs price slope disagree) ──
export const translate_momentum_rsiDivergence: Translator = (node) => {
  const p = node.params as { period: number; lookback: number };
  const pIn = `InpDivP_${sid(node.id)}`;
  const lIn = `InpDivL_${sid(node.id)}`;
  const h = `hDivRsi_${sid(node.id)}`;
  return {
    inputs: [
      { name: pIn, type: "int", defaultExpr: String(p.period ?? 14), label: "RSI period (divergence)" },
      { name: lIn, type: "int", defaultExpr: String(p.lookback ?? 20), label: "Divergence lookback" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iRSI(_Symbol, _Period, ${pIn}, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    helpers: [
      `// Simplified divergence: bullish div when price made a lower low vs N bars ago
// but RSI made a higher low. Mirror for bearish.
bool RsiDivergenceBull_${sid(node.id)}(int handle, int lookback)
{
   double rNow = BufferValue(handle, 1);
   double rPast = BufferValue(handle, 1 + lookback);
   double pNow = iLow(_Symbol, _Period, 1);
   double pPast = iLow(_Symbol, _Period, 1 + lookback);
   return (pNow < pPast && rNow > rPast);
}
bool RsiDivergenceBear_${sid(node.id)}(int handle, int lookback)
{
   double rNow = BufferValue(handle, 1);
   double rPast = BufferValue(handle, 1 + lookback);
   double pNow = iHigh(_Symbol, _Period, 1);
   double pPast = iHigh(_Symbol, _Period, 1 + lookback);
   return (pNow > pPast && rNow < rPast);
}`,
    ],
    entryConditions: [
      { direction: "long", expr: `RsiDivergenceBull_${sid(node.id)}(${h}, ${lIn})` },
      { direction: "short", expr: `RsiDivergenceBear_${sid(node.id)}(${h}, ${lIn})` },
    ],
    summaryFragments: [`RSI(${p.period}) divergence — ${p.lookback}-bar`],
  };
};

// ── momentum.macdDivergence (same simplification) ────────────────────
export const translate_momentum_macdDivergence: Translator = (node) => {
  const p = node.params as { lookback: number };
  const lIn = `InpMdivL_${sid(node.id)}`;
  const h = `hMDiv_${sid(node.id)}`;
  return {
    inputs: [{ name: lIn, type: "int", defaultExpr: String(p.lookback ?? 20), label: "Divergence lookback" }],
    indicators: [{ handleVar: h, init: `${h} = iMACD(_Symbol, _Period, 12, 26, 9, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    helpers: [
      `bool MacdDivergenceBull_${sid(node.id)}(int handle, int lookback)
{
   double main[]; if(CopyBuffer(handle, 0, 1, lookback + 2, main) <= 0) return false;
   double rNow = main[0]; double rPast = main[lookback];
   double pNow = iLow(_Symbol, _Period, 1);
   double pPast = iLow(_Symbol, _Period, 1 + lookback);
   return (pNow < pPast && rNow > rPast);
}
bool MacdDivergenceBear_${sid(node.id)}(int handle, int lookback)
{
   double main[]; if(CopyBuffer(handle, 0, 1, lookback + 2, main) <= 0) return false;
   double rNow = main[0]; double rPast = main[lookback];
   double pNow = iHigh(_Symbol, _Period, 1);
   double pPast = iHigh(_Symbol, _Period, 1 + lookback);
   return (pNow > pPast && rNow < rPast);
}`,
    ],
    entryConditions: [
      { direction: "long", expr: `MacdDivergenceBull_${sid(node.id)}(${h}, ${lIn})` },
      { direction: "short", expr: `MacdDivergenceBear_${sid(node.id)}(${h}, ${lIn})` },
    ],
    summaryFragments: [`MACD divergence — ${p.lookback}-bar`],
  };
};
