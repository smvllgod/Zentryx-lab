// Batch 2 — candle-pattern family (14 blocks).
// All contribute entryConditions (the canvas models candle patterns as filters
// that narrow the tradeable direction).

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

const CANDLE_HELPERS = `double _CandleBody(int s)  { return MathAbs(iClose(_Symbol,_Period,s) - iOpen(_Symbol,_Period,s)); }
double _CandleRange(int s) { return iHigh(_Symbol,_Period,s) - iLow(_Symbol,_Period,s); }
bool   _CandleBull(int s)  { return iClose(_Symbol,_Period,s) > iOpen(_Symbol,_Period,s); }
bool   _CandleBear(int s)  { return iClose(_Symbol,_Period,s) < iOpen(_Symbol,_Period,s); }
double _UpWick(int s)      { return iHigh(_Symbol,_Period,s) - MathMax(iOpen(_Symbol,_Period,s), iClose(_Symbol,_Period,s)); }
double _LowWick(int s)     { return MathMin(iOpen(_Symbol,_Period,s), iClose(_Symbol,_Period,s)) - iLow(_Symbol,_Period,s); }`;

const HELPER_KEY = "__zx_candle_helpers__";

function withHelpers(extra: string[] = []): string[] {
  return [CANDLE_HELPERS, ...extra];
}

// ── candle.pinBar
export const translate_candle_pinBar: Translator = (node) => {
  const p = node.params as { wickRatio: number; maxBodyPct: number; direction?: string };
  const tag = sid(node.id);
  return {
    inputs: [
      { name: `InpPinR_${tag}`, type: "double", defaultExpr: String(p.wickRatio ?? 2), label: "Pin wick/body ratio" },
      { name: `InpPinB_${tag}`, type: "double", defaultExpr: String(p.maxBodyPct ?? 35), label: "Pin max body %" },
    ],
    helpers: withHelpers([
      `bool PinBull_${tag}(double wr, double bp){
   double body = _CandleBody(1); double rng = _CandleRange(1);
   if(rng <= 0 || body <= 0) return false;
   double lw = _LowWick(1);
   return (lw >= body * wr) && (body / rng * 100.0 <= bp);
}
bool PinBear_${tag}(double wr, double bp){
   double body = _CandleBody(1); double rng = _CandleRange(1);
   if(rng <= 0 || body <= 0) return false;
   double uw = _UpWick(1);
   return (uw >= body * wr) && (body / rng * 100.0 <= bp);
}`,
    ]),
    entryConditions: dirConds(p.direction, `PinBull_${tag}(InpPinR_${tag}, InpPinB_${tag})`, `PinBear_${tag}(InpPinR_${tag}, InpPinB_${tag})`),
    summaryFragments: [`Pin bar (${p.wickRatio}× body)`],
  };
};

// ── candle.doji
export const translate_candle_doji: Translator = (node) => {
  const p = node.params as { maxBodyPct: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpDojiB_${tag}`, type: "double", defaultExpr: String(p.maxBodyPct ?? 10), label: "Doji max body %" }],
    helpers: withHelpers(),
    entryConditions: [
      { direction: "long", expr: `(_CandleRange(1) > 0 && _CandleBody(1) / _CandleRange(1) * 100.0 <= InpDojiB_${tag})` },
      { direction: "short", expr: `(_CandleRange(1) > 0 && _CandleBody(1) / _CandleRange(1) * 100.0 <= InpDojiB_${tag})` },
    ],
    summaryFragments: [`Doji (≤${p.maxBodyPct}% body)`],
  };
};

// ── candle.marubozu
export const translate_candle_marubozu: Translator = (node) => {
  const p = node.params as { maxWickPct: number; direction?: string };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpMrbW_${tag}`, type: "double", defaultExpr: String(p.maxWickPct ?? 5), label: "Marubozu max wick %" }],
    helpers: withHelpers(),
    entryConditions: dirConds(
      p.direction,
      `(_CandleBull(1) && _CandleRange(1) > 0 && (_UpWick(1) + _LowWick(1)) / _CandleRange(1) * 100.0 <= InpMrbW_${tag})`,
      `(_CandleBear(1) && _CandleRange(1) > 0 && (_UpWick(1) + _LowWick(1)) / _CandleRange(1) * 100.0 <= InpMrbW_${tag})`,
    ),
    summaryFragments: [`Marubozu (≤${p.maxWickPct}% wicks)`],
  };
};

// ── candle.engulfing
export const translate_candle_engulfing: Translator = (node) => {
  const p = node.params as { direction?: string };
  return {
    helpers: withHelpers([
      `bool CandleEngulfBull(){ return _CandleBear(2) && _CandleBull(1) && iClose(_Symbol,_Period,1) > iOpen(_Symbol,_Period,2) && iOpen(_Symbol,_Period,1) < iClose(_Symbol,_Period,2); }
bool CandleEngulfBear(){ return _CandleBull(2) && _CandleBear(1) && iClose(_Symbol,_Period,1) < iOpen(_Symbol,_Period,2) && iOpen(_Symbol,_Period,1) > iClose(_Symbol,_Period,2); }`,
    ]),
    entryConditions: dirConds(p.direction, `CandleEngulfBull()`, `CandleEngulfBear()`),
    summaryFragments: [`Engulfing`],
  };
};

// ── candle.harami (inside bar with opposite direction)
export const translate_candle_harami: Translator = (node) => {
  const p = node.params as { direction?: string };
  return {
    helpers: withHelpers([
      `bool CandleHaramiBull(){ return _CandleBear(2) && _CandleBull(1) && iHigh(_Symbol,_Period,1) < iHigh(_Symbol,_Period,2) && iLow(_Symbol,_Period,1) > iLow(_Symbol,_Period,2); }
bool CandleHaramiBear(){ return _CandleBull(2) && _CandleBear(1) && iHigh(_Symbol,_Period,1) < iHigh(_Symbol,_Period,2) && iLow(_Symbol,_Period,1) > iLow(_Symbol,_Period,2); }`,
    ]),
    entryConditions: dirConds(p.direction, `CandleHaramiBull()`, `CandleHaramiBear()`),
    summaryFragments: [`Harami`],
  };
};

// ── candle.insideBar (neutral — allows both sides)
export const translate_candle_insideBar: Translator = () => ({
  helpers: withHelpers([
    `bool CandleInside(){ return iHigh(_Symbol,_Period,1) < iHigh(_Symbol,_Period,2) && iLow(_Symbol,_Period,1) > iLow(_Symbol,_Period,2); }`,
  ]),
  entryConditions: [
    { direction: "long", expr: `CandleInside()` },
    { direction: "short", expr: `CandleInside()` },
  ],
  summaryFragments: [`Inside bar`],
});

// ── candle.outsideBar
export const translate_candle_outsideBar: Translator = () => ({
  helpers: withHelpers([
    `bool CandleOutside(){ return iHigh(_Symbol,_Period,1) > iHigh(_Symbol,_Period,2) && iLow(_Symbol,_Period,1) < iLow(_Symbol,_Period,2); }`,
  ]),
  entryConditions: [
    { direction: "long", expr: `(CandleOutside() && _CandleBull(1))` },
    { direction: "short", expr: `(CandleOutside() && _CandleBear(1))` },
  ],
  summaryFragments: [`Outside bar`],
});

// ── candle.morningStar
export const translate_candle_morningStar: Translator = () => ({
  helpers: withHelpers([
    `bool CandleMorningStar(){
   bool b3 = _CandleBear(3);
   bool small2 = _CandleBody(2) <= _CandleBody(3) * 0.5;
   bool b1 = _CandleBull(1) && _CandleBody(1) >= _CandleBody(3) * 0.6;
   return (b3 && small2 && b1);
}`,
  ]),
  entryConditions: [{ direction: "long", expr: `CandleMorningStar()` }],
  summaryFragments: [`Morning Star`],
});

// ── candle.eveningStar
export const translate_candle_eveningStar: Translator = () => ({
  helpers: withHelpers([
    `bool CandleEveningStar(){
   bool b3 = _CandleBull(3);
   bool small2 = _CandleBody(2) <= _CandleBody(3) * 0.5;
   bool b1 = _CandleBear(1) && _CandleBody(1) >= _CandleBody(3) * 0.6;
   return (b3 && small2 && b1);
}`,
  ]),
  entryConditions: [{ direction: "short", expr: `CandleEveningStar()` }],
  summaryFragments: [`Evening Star`],
});

// ── candle.threeWhiteSoldiers
export const translate_candle_threeWhiteSoldiers: Translator = () => ({
  helpers: withHelpers([
    `bool CandleThreeWhite(){
   return _CandleBull(1) && _CandleBull(2) && _CandleBull(3)
       && iClose(_Symbol,_Period,1) > iClose(_Symbol,_Period,2)
       && iClose(_Symbol,_Period,2) > iClose(_Symbol,_Period,3);
}`,
  ]),
  entryConditions: [{ direction: "long", expr: `CandleThreeWhite()` }],
  summaryFragments: [`Three White Soldiers`],
});

// ── candle.threeBlackCrows
export const translate_candle_threeBlackCrows: Translator = () => ({
  helpers: withHelpers([
    `bool CandleThreeBlack(){
   return _CandleBear(1) && _CandleBear(2) && _CandleBear(3)
       && iClose(_Symbol,_Period,1) < iClose(_Symbol,_Period,2)
       && iClose(_Symbol,_Period,2) < iClose(_Symbol,_Period,3);
}`,
  ]),
  entryConditions: [{ direction: "short", expr: `CandleThreeBlack()` }],
  summaryFragments: [`Three Black Crows`],
});

// ── candle.piercing (Piercing bull / Dark Cloud bear)
export const translate_candle_piercing: Translator = (node) => {
  const p = node.params as { direction?: string };
  return {
    helpers: withHelpers([
      `bool CandlePiercingBull(){
   if(!_CandleBear(2) || !_CandleBull(1)) return false;
   double mid2 = (iOpen(_Symbol,_Period,2) + iClose(_Symbol,_Period,2)) / 2.0;
   return (iOpen(_Symbol,_Period,1) < iClose(_Symbol,_Period,2) && iClose(_Symbol,_Period,1) > mid2 && iClose(_Symbol,_Period,1) < iOpen(_Symbol,_Period,2));
}
bool CandleDarkCloudBear(){
   if(!_CandleBull(2) || !_CandleBear(1)) return false;
   double mid2 = (iOpen(_Symbol,_Period,2) + iClose(_Symbol,_Period,2)) / 2.0;
   return (iOpen(_Symbol,_Period,1) > iClose(_Symbol,_Period,2) && iClose(_Symbol,_Period,1) < mid2 && iClose(_Symbol,_Period,1) > iOpen(_Symbol,_Period,2));
}`,
    ]),
    entryConditions: dirConds(p.direction, `CandlePiercingBull()`, `CandleDarkCloudBear()`),
    summaryFragments: [`Piercing / Dark Cloud`],
  };
};

// ── candle.tweezer
export const translate_candle_tweezer: Translator = (node) => {
  const p = node.params as { direction?: string };
  return {
    helpers: withHelpers([
      `bool CandleTweezerTop(){ return MathAbs(iHigh(_Symbol,_Period,1) - iHigh(_Symbol,_Period,2)) < ZxPipSize() && _CandleBull(2) && _CandleBear(1); }
bool CandleTweezerBot(){ return MathAbs(iLow(_Symbol,_Period,1) - iLow(_Symbol,_Period,2))  < ZxPipSize() && _CandleBear(2) && _CandleBull(1); }`,
    ]),
    entryConditions: dirConds(p.direction, `CandleTweezerBot()`, `CandleTweezerTop()`),
    summaryFragments: [`Tweezer`],
  };
};

// ── candle.rangeFilter
export const translate_candle_rangeFilter: Translator = (node) => {
  const p = node.params as { minRangePips: number; maxRangePips: number };
  const tag = sid(node.id);
  return {
    inputs: [
      { name: `InpRfMin_${tag}`, type: "double", defaultExpr: String(p.minRangePips ?? 5), label: "Min range (pips)" },
      { name: `InpRfMax_${tag}`, type: "double", defaultExpr: String(p.maxRangePips ?? 300), label: "Max range (pips)" },
    ],
    helpers: withHelpers(),
    gates: [{
      expr: `((_CandleRange(1) / ZxPipSize()) >= InpRfMin_${tag} && (_CandleRange(1) / ZxPipSize()) <= InpRfMax_${tag})`,
      reason: "bar range outside band",
    }],
    summaryFragments: [`Bar range ∈ [${p.minRangePips}, ${p.maxRangePips}] pips`],
  };
};
