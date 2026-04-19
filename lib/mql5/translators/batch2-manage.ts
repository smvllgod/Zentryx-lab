// Batch 2 — management family (9 blocks).

import type { Translator } from "../types";

const sid = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);

// ── manage.chandelierTrail (highest-high minus k × ATR)
export const translate_manage_chandelierTrail: Translator = (node) => {
  const p = node.params as { period: number; multiplier: number };
  const tag = sid(node.id);
  const h = `hCh_${tag}`;
  return {
    inputs: [
      { name: `InpChP_${tag}`, type: "int", defaultExpr: String(p.period ?? 22), label: "Chandelier lookback" },
      { name: `InpChM_${tag}`, type: "double", defaultExpr: String(p.multiplier ?? 3), label: "Chandelier × ATR" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iATR(_Symbol, _Period, 14);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    positionManagement: [
      `// Chandelier trailing (${node.id})
{
   int lb = InpChP_${tag};
   double atr = BufferValue(${h}, 1) * InpChM_${tag};
   int hiIdx = iHighest(_Symbol, _Period, MODE_HIGH, lb, 1);
   int loIdx = iLowest(_Symbol, _Period, MODE_LOW,  lb, 1);
   if(hiIdx < 0 || loIdx < 0) { /* skip */ }
   else {
      double longStop  = iHigh(_Symbol, _Period, hiIdx) - atr;
      double shortStop = iLow(_Symbol, _Period, loIdx) + atr;
      for(int i=PositionsTotal()-1; i>=0; i--) {
         ulong ticket = PositionGetTicket(i);
         if(!PositionSelectByTicket(ticket)) continue;
         if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
         long dir = PositionGetInteger(POSITION_TYPE);
         double sl = PositionGetDouble(POSITION_SL);
         double tp = PositionGetDouble(POSITION_TP);
         if(dir == POSITION_TYPE_BUY && longStop > sl)
            Trade.PositionModify(_Symbol, NormalizeDouble(longStop, _Digits), tp);
         if(dir == POSITION_TYPE_SELL && (sl == 0 || shortStop < sl))
            Trade.PositionModify(_Symbol, NormalizeDouble(shortStop, _Digits), tp);
      }
   }
}`,
    ],
    summaryFragments: [`Chandelier (${p.period}, ${p.multiplier}×ATR)`],
  };
};

// ── manage.percentTrail
export const translate_manage_percentTrail: Translator = (node) => {
  const p = node.params as { trailPct: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpPtPct_${tag}`, type: "double", defaultExpr: String(p.trailPct ?? 0.5), label: "Trail (%)" }],
    positionManagement: [
      `// Percent trailing (${node.id})
{
   double pct = InpPtPct_${tag} / 100.0;
   for(int i=PositionsTotal()-1; i>=0; i--) {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      long dir = PositionGetInteger(POSITION_TYPE);
      double sl = PositionGetDouble(POSITION_SL);
      double tp = PositionGetDouble(POSITION_TP);
      if(dir == POSITION_TYPE_BUY) {
         double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         double newSl = bid * (1.0 - pct);
         if(newSl > sl) Trade.PositionModify(_Symbol, NormalizeDouble(newSl, _Digits), tp);
      } else if(dir == POSITION_TYPE_SELL) {
         double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         double newSl = ask * (1.0 + pct);
         if(sl == 0 || newSl < sl) Trade.PositionModify(_Symbol, NormalizeDouble(newSl, _Digits), tp);
      }
   }
}`,
    ],
    summaryFragments: [`Percent trail ${p.trailPct}%`],
  };
};

// ── manage.stepTrail (ratchet every N pips)
export const translate_manage_stepTrail: Translator = (node) => {
  const p = node.params as { stepPips: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpStStep_${tag}`, type: "double", defaultExpr: String(p.stepPips ?? 10), label: "Step (pips)" }],
    positionManagement: [
      `// Step trailing (${node.id})
{
   double pip = ZxPipSize();
   double step = InpStStep_${tag} * pip;
   for(int i=PositionsTotal()-1; i>=0; i--) {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      long dir = PositionGetInteger(POSITION_TYPE);
      double open = PositionGetDouble(POSITION_PRICE_OPEN);
      double sl   = PositionGetDouble(POSITION_SL);
      double tp   = PositionGetDouble(POSITION_TP);
      if(dir == POSITION_TYPE_BUY) {
         double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         double steps = MathFloor((bid - open) / step);
         if(steps >= 1) {
            double newSl = open + (steps - 1) * step;
            if(newSl > sl) Trade.PositionModify(_Symbol, NormalizeDouble(newSl, _Digits), tp);
         }
      } else if(dir == POSITION_TYPE_SELL) {
         double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         double steps = MathFloor((open - ask) / step);
         if(steps >= 1) {
            double newSl = open - (steps - 1) * step;
            if(sl == 0 || newSl < sl) Trade.PositionModify(_Symbol, NormalizeDouble(newSl, _Digits), tp);
         }
      }
   }
}`,
    ],
    summaryFragments: [`Step trail ${p.stepPips}p`],
  };
};

// ── manage.partialCloseAtr
export const translate_manage_partialCloseAtr: Translator = (node) => {
  const p = node.params as { atrPeriod: number; multiplier: number; closePercent: number };
  const tag = sid(node.id);
  const h = `hPcAtr_${tag}`;
  return {
    inputs: [
      { name: `InpPcaP_${tag}`, type: "int", defaultExpr: String(p.atrPeriod ?? 14), label: "ATR period (partial)" },
      { name: `InpPcaM_${tag}`, type: "double", defaultExpr: String(p.multiplier ?? 1), label: "ATR trigger ×" },
      { name: `InpPcaPct_${tag}`, type: "double", defaultExpr: String(p.closePercent ?? 50), label: "Close portion (%)" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iATR(_Symbol, _Period, InpPcaP_${tag});`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    globals: [`bool _zxPcaDone_${tag} = false;`],
    positionManagement: [
      `// ATR partial close (${node.id})
{
   double atr = BufferValue(${h}, 1);
   double trig = atr * InpPcaM_${tag};
   for(int i=PositionsTotal()-1; i>=0; i--) {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      long dir    = PositionGetInteger(POSITION_TYPE);
      double open = PositionGetDouble(POSITION_PRICE_OPEN);
      double vol  = PositionGetDouble(POSITION_VOLUME);
      double px   = (dir == POSITION_TYPE_BUY) ? SymbolInfoDouble(_Symbol, SYMBOL_BID) : SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double gain = (dir == POSITION_TYPE_BUY) ? (px - open) : (open - px);
      if(gain >= trig) {
         Trade.PositionClosePartial(ticket, NormalizeLots(vol * InpPcaPct_${tag} / 100.0));
      }
   }
}`,
    ],
    summaryFragments: [`ATR partial (${p.multiplier}× ATR${p.atrPeriod})`],
  };
};

// ── manage.pyramiding (add every N pips in-profit, capped)
export const translate_manage_pyramiding: Translator = (node) => {
  const p = node.params as { stepPips: number; maxAdds: number };
  const tag = sid(node.id);
  return {
    inputs: [
      { name: `InpPyStep_${tag}`, type: "double", defaultExpr: String(p.stepPips ?? 20), label: "Pyramid step (pips)" },
      { name: `InpPyMax_${tag}`, type: "int", defaultExpr: String(p.maxAdds ?? 3), label: "Max adds" },
    ],
    globals: [`int _zxPyAdds_${tag} = 0; double _zxPyLastLevel_${tag} = 0.0;`],
    positionManagement: [
      `// Pyramiding (${node.id})
{
   if(!PositionSelect(_Symbol)) { _zxPyAdds_${tag} = 0; _zxPyLastLevel_${tag} = 0.0; }
   else {
      double pip = ZxPipSize();
      long dir = PositionGetInteger(POSITION_TYPE);
      double open = PositionGetDouble(POSITION_PRICE_OPEN);
      double px = (dir == POSITION_TYPE_BUY) ? SymbolInfoDouble(_Symbol, SYMBOL_BID) : SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double gain = (dir == POSITION_TYPE_BUY) ? (px - open) : (open - px);
      if(_zxPyAdds_${tag} < InpPyMax_${tag} && gain >= (_zxPyAdds_${tag} + 1) * InpPyStep_${tag} * pip)
      {
         double lot = PositionGetDouble(POSITION_VOLUME) / (1.0 + _zxPyAdds_${tag});
         if(dir == POSITION_TYPE_BUY)  Trade.Buy(NormalizeLots(lot), _Symbol);
         else                          Trade.Sell(NormalizeLots(lot), _Symbol);
         _zxPyAdds_${tag}++;
      }
   }
}`,
    ],
    summaryFragments: [`Pyramid every ${p.stepPips}p × ${p.maxAdds}`],
  };
};

// ── manage.antiPyramiding (scale-out on weakness) — proxy: close 25% if RSI flips
export const translate_manage_antiPyramiding: Translator = (node) => {
  const tag = sid(node.id);
  const h = `hApRsi_${tag}`;
  return {
    indicators: [{ handleVar: h, init: `${h} = iRSI(_Symbol, _Period, 14, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    positionManagement: [
      `// Anti-pyramiding scale-out (${node.id})
{
   double r1 = BufferValue(${h}, 1);
   double r2 = BufferValue(${h}, 2);
   for(int i=PositionsTotal()-1; i>=0; i--) {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      long dir = PositionGetInteger(POSITION_TYPE);
      double vol = PositionGetDouble(POSITION_VOLUME);
      bool weakenBuy  = (dir == POSITION_TYPE_BUY  && r1 < r2 && r1 < 55);
      bool weakenSell = (dir == POSITION_TYPE_SELL && r1 > r2 && r1 > 45);
      if(weakenBuy || weakenSell) {
         Trade.PositionClosePartial(ticket, NormalizeLots(vol * 0.25));
      }
   }
}`,
    ],
    summaryFragments: [`Scale-out on momentum weakness`],
  };
};

// ── manage.reentryCooldown
export const translate_manage_reentryCooldown: Translator = (node) => {
  const p = node.params as { minutes: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpRcMin_${tag}`, type: "int", defaultExpr: String(p.minutes ?? 15), label: "Cooldown (min)" }],
    globals: [`datetime _zxLastClose_${tag} = 0;`],
    helpers: [
      `void RcOnClose_${tag}() { _zxLastClose_${tag} = TimeCurrent(); }
bool RcOk_${tag}() {
   if(_zxLastClose_${tag} == 0) return true;
   return (TimeCurrent() - _zxLastClose_${tag}) / 60 >= InpRcMin_${tag};
}`,
    ],
    gates: [{ expr: `RcOk_${tag}()`, reason: "within reentry cooldown" }],
    positionManagement: [
      `// Track last close time for cooldown
{
   static int prevPositions = -1;
   int cur = (int)PositionsTotal();
   if(prevPositions > 0 && cur < prevPositions) RcOnClose_${tag}();
   prevPositions = cur;
}`,
    ],
    summaryFragments: [`Reentry cooldown ${p.minutes}m`],
  };
};

// ── manage.hedgeAgainstDd
export const translate_manage_hedgeAgainstDd: Translator = (node) => {
  const p = node.params as { ddPercent: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpHdgDd_${tag}`, type: "double", defaultExpr: String(p.ddPercent ?? 3), label: "Hedge DD trigger (%)" }],
    globals: [`bool _zxHedged_${tag} = false;`],
    positionManagement: [
      `// Hedge against DD (${node.id})
{
   if(!PositionSelect(_Symbol)) _zxHedged_${tag} = false;
   else if(!_zxHedged_${tag}) {
      double open = PositionGetDouble(POSITION_PRICE_OPEN);
      double vol  = PositionGetDouble(POSITION_VOLUME);
      long dir    = PositionGetInteger(POSITION_TYPE);
      double px   = (dir == POSITION_TYPE_BUY) ? SymbolInfoDouble(_Symbol, SYMBOL_BID) : SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double ddCash = PositionGetDouble(POSITION_PROFIT);
      double eq = AccountInfoDouble(ACCOUNT_EQUITY);
      if(eq > 0 && ddCash < 0 && (ddCash / eq) * 100.0 <= -InpHdgDd_${tag}) {
         if(dir == POSITION_TYPE_BUY)  Trade.Sell(NormalizeLots(vol), _Symbol);
         else                          Trade.Buy(NormalizeLots(vol), _Symbol);
         _zxHedged_${tag} = true;
      }
   }
}`,
    ],
    summaryFragments: [`Hedge at -${p.ddPercent}% DD`],
  };
};

// ── manage.convertToBreakEven (move SL to BE + offset on opposing signal)
export const translate_manage_convertToBreakEven: Translator = (node) => {
  const p = node.params as { offsetPips: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpSmartOff_${tag}`, type: "double", defaultExpr: String(p.offsetPips ?? 1), label: "Smart BE offset (pips)" }],
    positionManagement: [
      `// Smart BE on opposite signal (proxy: price vs EMA(20) flips)
{
   int h = iMA(_Symbol, _Period, 20, 0, MODE_EMA, PRICE_CLOSE);
   if(h != INVALID_HANDLE) {
      double ma = BufferValue(h, 1);
      IndicatorRelease(h);
      double pip = ZxPipSize();
      double off = InpSmartOff_${tag} * pip;
      for(int i=PositionsTotal()-1; i>=0; i--) {
         ulong ticket = PositionGetTicket(i);
         if(!PositionSelectByTicket(ticket)) continue;
         if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
         long dir  = PositionGetInteger(POSITION_TYPE);
         double open = PositionGetDouble(POSITION_PRICE_OPEN);
         double sl  = PositionGetDouble(POSITION_SL);
         double tp  = PositionGetDouble(POSITION_TP);
         double c   = iClose(_Symbol, _Period, 1);
         if(dir == POSITION_TYPE_BUY && c < ma && (sl == 0 || sl < open))
            Trade.PositionModify(_Symbol, NormalizeDouble(open + off, _Digits), tp);
         if(dir == POSITION_TYPE_SELL && c > ma && (sl == 0 || sl > open))
            Trade.PositionModify(_Symbol, NormalizeDouble(open - off, _Digits), tp);
      }
   }
}`,
    ],
    summaryFragments: [`Smart BE +${p.offsetPips}p on opposite`],
  };
};
