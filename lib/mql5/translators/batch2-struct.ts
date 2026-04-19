// Batch 2 — structure family (12 blocks).
// Simplified approximations — each emits MQL5 that compiles cleanly and
// behaviourally matches the block's intent without pulling in external indicators.

import type { Translator } from "../types";

const sid = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);

// ── struct.swingHigherHigh (HH/HL required for long)
export const translate_struct_swingHigherHigh: Translator = (node) => {
  const p = node.params as { lookback: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpShhL_${tag}`, type: "int", defaultExpr: String(p.lookback ?? 10), label: "Swing lookback" }],
    helpers: [
      `bool SwingHH_${tag}(int lb){
   int hi1 = iHighest(_Symbol,_Period, MODE_HIGH, lb, 1);
   int hi2 = iHighest(_Symbol,_Period, MODE_HIGH, lb, 1 + lb);
   int lo1 = iLowest(_Symbol,_Period,  MODE_LOW,  lb, 1);
   int lo2 = iLowest(_Symbol,_Period,  MODE_LOW,  lb, 1 + lb);
   if(hi1<0||hi2<0||lo1<0||lo2<0) return false;
   return iHigh(_Symbol,_Period,hi1) > iHigh(_Symbol,_Period,hi2) && iLow(_Symbol,_Period,lo1) > iLow(_Symbol,_Period,lo2);
}`,
    ],
    entryConditions: [{ direction: "long", expr: `SwingHH_${tag}(InpShhL_${tag})` }],
    summaryFragments: [`Swing HH/HL (${p.lookback})`],
  };
};

// ── struct.swingLowerLow
export const translate_struct_swingLowerLow: Translator = (node) => {
  const p = node.params as { lookback: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpSllL_${tag}`, type: "int", defaultExpr: String(p.lookback ?? 10), label: "Swing lookback" }],
    helpers: [
      `bool SwingLL_${tag}(int lb){
   int hi1 = iHighest(_Symbol,_Period, MODE_HIGH, lb, 1);
   int hi2 = iHighest(_Symbol,_Period, MODE_HIGH, lb, 1 + lb);
   int lo1 = iLowest(_Symbol,_Period,  MODE_LOW,  lb, 1);
   int lo2 = iLowest(_Symbol,_Period,  MODE_LOW,  lb, 1 + lb);
   if(hi1<0||hi2<0||lo1<0||lo2<0) return false;
   return iHigh(_Symbol,_Period,hi1) < iHigh(_Symbol,_Period,hi2) && iLow(_Symbol,_Period,lo1) < iLow(_Symbol,_Period,lo2);
}`,
    ],
    entryConditions: [{ direction: "short", expr: `SwingLL_${tag}(InpSllL_${tag})` }],
    summaryFragments: [`Swing LL/LH (${p.lookback})`],
  };
};

// ── struct.bosBreakOfStructure
export const translate_struct_bosBreakOfStructure: Translator = (node) => {
  const p = node.params as { lookback: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpBosL_${tag}`, type: "int", defaultExpr: String(p.lookback ?? 20), label: "BOS lookback" }],
    helpers: [
      `double _BosSwingHigh_${tag}(int lb){ int i = iHighest(_Symbol,_Period, MODE_HIGH, lb, 2); return (i<0)?0:iHigh(_Symbol,_Period,i); }
double _BosSwingLow_${tag}(int lb){ int i = iLowest(_Symbol,_Period, MODE_LOW, lb, 2); return (i<0)?0:iLow(_Symbol,_Period,i); }`,
    ],
    entryConditions: [
      { direction: "long", expr: `(iClose(_Symbol,_Period,1) > _BosSwingHigh_${tag}(InpBosL_${tag}))` },
      { direction: "short", expr: `(iClose(_Symbol,_Period,1) < _BosSwingLow_${tag}(InpBosL_${tag}))` },
    ],
    summaryFragments: [`BOS (${p.lookback})`],
  };
};

// ── struct.chochChange (Change of Character — we emit prior-trend break using EMA flip proxy)
export const translate_struct_chochChange: Translator = (node) => {
  const p = node.params as { lookback: number };
  const tag = sid(node.id);
  const h = `hChEma_${tag}`;
  return {
    inputs: [{ name: `InpChochL_${tag}`, type: "int", defaultExpr: String(p.lookback ?? 20), label: "CHoCH EMA period" }],
    indicators: [{ handleVar: h, init: `${h} = iMA(_Symbol, _Period, InpChochL_${tag}, 0, MODE_EMA, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    entryConditions: [
      { direction: "long", expr: `(iClose(_Symbol,_Period,1) > BufferValue(${h},1) && iClose(_Symbol,_Period,2) <= BufferValue(${h},2))` },
      { direction: "short", expr: `(iClose(_Symbol,_Period,1) < BufferValue(${h},1) && iClose(_Symbol,_Period,2) >= BufferValue(${h},2))` },
    ],
    summaryFragments: [`CHoCH proxy (EMA${p.lookback} flip)`],
  };
};

// ── struct.fractalFilter (Bill Williams fractal — require fresh within N bars)
export const translate_struct_fractalFilter: Translator = (node) => {
  const p = node.params as { maxAge: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpFrAge_${tag}`, type: "int", defaultExpr: String(p.maxAge ?? 10), label: "Max fractal age (bars)" }],
    helpers: [
      `bool HasFreshFractal_${tag}(int maxAge){
   for(int i=2; i<=maxAge; i++) {
      double hh = iHigh(_Symbol,_Period,i);
      double ll = iLow(_Symbol,_Period,i);
      bool isUp = (hh > iHigh(_Symbol,_Period,i-1) && hh > iHigh(_Symbol,_Period,i-2) && hh > iHigh(_Symbol,_Period,i+1) && hh > iHigh(_Symbol,_Period,i+2));
      bool isDn = (ll < iLow(_Symbol,_Period,i-1)  && ll < iLow(_Symbol,_Period,i-2)  && ll < iLow(_Symbol,_Period,i+1)  && ll < iLow(_Symbol,_Period,i+2));
      if(isUp || isDn) return true;
   }
   return false;
}`,
    ],
    gates: [{ expr: `HasFreshFractal_${tag}(InpFrAge_${tag})`, reason: "no fresh fractal" }],
    summaryFragments: [`Fractal within ${p.maxAge} bars`],
  };
};

// ── struct.supportResistance (S/R proximity gate — block within X pips)
export const translate_struct_supportResistance: Translator = (node) => {
  const p = node.params as { proximityPips: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpSrP_${tag}`, type: "double", defaultExpr: String(p.proximityPips ?? 15), label: "S/R proximity (pips)" }],
    helpers: [
      `bool SrClear_${tag}(double proxPips){
   double hi = 0; double lo = DBL_MAX;
   for(int i=2; i<=100; i++) { double h=iHigh(_Symbol,_Period,i); double l=iLow(_Symbol,_Period,i); if(h>hi) hi=h; if(l<lo) lo=l; }
   double px = iClose(_Symbol,_Period,1);
   double pip = ZxPipSize();
   return (MathAbs(px - hi) / pip > proxPips && MathAbs(px - lo) / pip > proxPips);
}`,
    ],
    gates: [{ expr: `SrClear_${tag}(InpSrP_${tag})`, reason: "too close to S/R" }],
    summaryFragments: [`S/R clearance ≥ ${p.proximityPips}p`],
  };
};

// ── struct.pivotPoint (classic daily pivot — zone check)
export const translate_struct_pivotPoint: Translator = (node) => {
  const p = node.params as { pivotType: string; zone: string };
  const tag = sid(node.id);
  const zone = p.zone ?? "pivot";
  const cmp =
    zone === "r1" ? `(iClose(_Symbol,_Period,1) > ClassicR1_${tag}())` :
    zone === "s1" ? `(iClose(_Symbol,_Period,1) < ClassicS1_${tag}())` :
                    `(MathAbs(iClose(_Symbol,_Period,1) - ClassicPivot_${tag}()) / ZxPipSize() <= 20)`;
  return {
    helpers: [
      `double ClassicPivot_${tag}(){
   double hi = iHigh(_Symbol, PERIOD_D1, 1);
   double lo = iLow(_Symbol, PERIOD_D1, 1);
   double cl = iClose(_Symbol, PERIOD_D1, 1);
   return (hi + lo + cl) / 3.0;
}
double ClassicR1_${tag}(){ return 2 * ClassicPivot_${tag}() - iLow(_Symbol, PERIOD_D1, 1); }
double ClassicS1_${tag}(){ return 2 * ClassicPivot_${tag}() - iHigh(_Symbol, PERIOD_D1, 1); }`,
    ],
    gates: [{ expr: cmp, reason: `wrong side of ${zone} pivot` }],
    summaryFragments: [`${p.pivotType ?? "classic"} pivot — ${zone}`],
  };
};

// ── struct.supplyDemandZone (recent consolidation)
export const translate_struct_supplyDemandZone: Translator = (node) => {
  const p = node.params as { lookback: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpSdL_${tag}`, type: "int", defaultExpr: String(p.lookback ?? 100), label: "S/D lookback" }],
    helpers: [
      `bool InSDZone_${tag}(int lb){
   int hiIdx = iHighest(_Symbol,_Period, MODE_HIGH, lb, 2);
   int loIdx = iLowest(_Symbol,_Period, MODE_LOW, lb, 2);
   if(hiIdx < 0 || loIdx < 0) return false;
   double hi = iHigh(_Symbol,_Period,hiIdx);
   double lo = iLow(_Symbol,_Period,loIdx);
   double px = iClose(_Symbol,_Period,1);
   return (px >= lo && px <= hi);
}`,
    ],
    gates: [{ expr: `InSDZone_${tag}(InpSdL_${tag})`, reason: "outside supply/demand envelope" }],
    summaryFragments: [`S/D zone (${p.lookback} bars)`],
  };
};

// ── struct.orderBlock (ICT-style — simplified as last opposite candle before BOS)
export const translate_struct_orderBlock: Translator = (node) => {
  const p = node.params as { lookback: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpObL_${tag}`, type: "int", defaultExpr: String(p.lookback ?? 50), label: "Order block lookback" }],
    helpers: [
      `double ObBull_${tag}(int lb){
   for(int i=2; i<=lb; i++) if(iClose(_Symbol,_Period,i) < iOpen(_Symbol,_Period,i)) return iHigh(_Symbol,_Period,i);
   return 0;
}
double ObBear_${tag}(int lb){
   for(int i=2; i<=lb; i++) if(iClose(_Symbol,_Period,i) > iOpen(_Symbol,_Period,i)) return iLow(_Symbol,_Period,i);
   return 0;
}`,
    ],
    entryConditions: [
      { direction: "long", expr: `(ObBull_${tag}(InpObL_${tag}) > 0 && iClose(_Symbol,_Period,1) > ObBull_${tag}(InpObL_${tag}))` },
      { direction: "short", expr: `(ObBear_${tag}(InpObL_${tag}) > 0 && iClose(_Symbol,_Period,1) < ObBear_${tag}(InpObL_${tag}))` },
    ],
    summaryFragments: [`Order block (${p.lookback})`],
  };
};

// ── struct.fairValueGap (3-bar FVG)
export const translate_struct_fairValueGap: Translator = (node) => {
  const p = node.params as { lookback: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpFvgL_${tag}`, type: "int", defaultExpr: String(p.lookback ?? 50), label: "FVG lookback" }],
    helpers: [
      `bool FvgRevisitedBull_${tag}(int lb){
   for(int i=3; i<=lb; i++) {
      double l1 = iLow(_Symbol,_Period,i-1);
      double h3 = iHigh(_Symbol,_Period,i+1);
      if(l1 > h3) {
         double gapHi = l1; double gapLo = h3;
         double px = iClose(_Symbol,_Period,1);
         if(px >= gapLo && px <= gapHi) return true;
      }
   }
   return false;
}
bool FvgRevisitedBear_${tag}(int lb){
   for(int i=3; i<=lb; i++) {
      double h1 = iHigh(_Symbol,_Period,i-1);
      double l3 = iLow(_Symbol,_Period,i+1);
      if(h1 < l3) {
         double gapHi = l3; double gapLo = h1;
         double px = iClose(_Symbol,_Period,1);
         if(px >= gapLo && px <= gapHi) return true;
      }
   }
   return false;
}`,
    ],
    entryConditions: [
      { direction: "long", expr: `FvgRevisitedBull_${tag}(InpFvgL_${tag})` },
      { direction: "short", expr: `FvgRevisitedBear_${tag}(InpFvgL_${tag})` },
    ],
    summaryFragments: [`FVG revisit (${p.lookback})`],
  };
};

// ── struct.roundNumber (avoid / require proximity to 00/50 levels)
export const translate_struct_roundNumber: Translator = (node) => {
  const p = node.params as { proximityPips: number; mode: "avoid" | "require" };
  const tag = sid(node.id);
  const mode = p.mode ?? "avoid";
  return {
    inputs: [{ name: `InpRnP_${tag}`, type: "double", defaultExpr: String(p.proximityPips ?? 10), label: "Round-number proximity (pips)" }],
    helpers: [
      `double NearestRound_${tag}(){
   double px = iClose(_Symbol,_Period,1);
   double pip = ZxPipSize();
   double step = 50 * pip;
   double rounded = MathRound(px / step) * step;
   return rounded;
}
bool NearRound_${tag}(double proxPips){
   return (MathAbs(iClose(_Symbol,_Period,1) - NearestRound_${tag}()) / ZxPipSize() <= proxPips);
}`,
    ],
    gates: [{
      expr: mode === "avoid" ? `(!NearRound_${tag}(InpRnP_${tag}))` : `NearRound_${tag}(InpRnP_${tag})`,
      reason: mode === "avoid" ? "too close to round number" : "not near round number",
    }],
    summaryFragments: [`${mode === "avoid" ? "Avoid" : "Require"} rounds (${p.proximityPips}p)`],
  };
};

// ── struct.priorDayExtreme
export const translate_struct_priorDayExtreme: Translator = (node) => {
  const p = node.params as { side: "above-high" | "below-low" };
  const side = p.side ?? "above-high";
  return {
    helpers: [],
    entryConditions:
      side === "above-high"
        ? [{ direction: "long", expr: `(iClose(_Symbol,_Period,1) > iHigh(_Symbol, PERIOD_D1, 1))` }]
        : [{ direction: "short", expr: `(iClose(_Symbol,_Period,1) < iLow(_Symbol, PERIOD_D1, 1))` }],
    summaryFragments: [`Prior-day ${side.replace("-", " ")}`],
  };
};
