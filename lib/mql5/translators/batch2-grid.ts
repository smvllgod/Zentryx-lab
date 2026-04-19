// Batch 2 — grid family (9 blocks).
// Grid blocks add orders beyond the standard single-entry ZxOpen path.
// We emit positionManagement hooks that read the current worst-open-position
// of this EA's magic number and add orders when the spacing criterion trips.

import type { Translator } from "../types";

const sid = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);

// ── grid.basic
export const translate_grid_basic: Translator = (node) => {
  const p = node.params as { stepPips: number; maxOrders: number; lotMultiplier: number };
  const tag = sid(node.id);
  return {
    inputs: [
      { name: `InpGbStep_${tag}`, type: "double", defaultExpr: String(p.stepPips ?? 30), label: "Grid step (pips)" },
      { name: `InpGbMax_${tag}`, type: "int", defaultExpr: String(p.maxOrders ?? 5), label: "Grid max orders" },
      { name: `InpGbMul_${tag}`, type: "double", defaultExpr: String(p.lotMultiplier ?? 1), label: "Grid lot ×" },
    ],
    positionManagement: [
      `// Basic grid (${node.id})
{
   int count = 0; double worstOpen = 0.0; long side = 0; double lastLot = 0.0;
   for(int i=PositionsTotal()-1; i>=0; i--) {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      count++;
      double o = PositionGetDouble(POSITION_PRICE_OPEN);
      long dir = PositionGetInteger(POSITION_TYPE);
      side = dir;
      lastLot = PositionGetDouble(POSITION_VOLUME);
      if(dir == POSITION_TYPE_BUY  && (worstOpen == 0 || o < worstOpen)) worstOpen = o;
      if(dir == POSITION_TYPE_SELL && (worstOpen == 0 || o > worstOpen)) worstOpen = o;
   }
   if(count > 0 && count < InpGbMax_${tag}) {
      double pip = ZxPipSize();
      double step = InpGbStep_${tag} * pip;
      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double addLot = NormalizeLots(lastLot * InpGbMul_${tag});
      if(side == POSITION_TYPE_BUY  && bid <= worstOpen - step) Trade.Buy(addLot, _Symbol);
      if(side == POSITION_TYPE_SELL && ask >= worstOpen + step) Trade.Sell(addLot, _Symbol);
   }
}`,
    ],
    summaryFragments: [`Grid ${p.stepPips}p × ${p.maxOrders}`],
  };
};

// ── grid.atrSpaced
export const translate_grid_atrSpaced: Translator = (node) => {
  const p = node.params as { atrPeriod: number; multiplier: number; maxOrders: number };
  const tag = sid(node.id);
  const h = `hGatr_${tag}`;
  return {
    inputs: [
      { name: `InpGaP_${tag}`, type: "int", defaultExpr: String(p.atrPeriod ?? 14), label: "ATR period (grid)" },
      { name: `InpGaM_${tag}`, type: "double", defaultExpr: String(p.multiplier ?? 1.5), label: "ATR multiplier" },
      { name: `InpGaMax_${tag}`, type: "int", defaultExpr: String(p.maxOrders ?? 5), label: "Grid max orders" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iATR(_Symbol, _Period, InpGaP_${tag});`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    positionManagement: [
      `// ATR-spaced grid (${node.id})
{
   int count = 0; double worstOpen = 0.0; long side = 0; double lastLot = 0.0;
   for(int i=PositionsTotal()-1; i>=0; i--) {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      count++;
      double o = PositionGetDouble(POSITION_PRICE_OPEN);
      long dir = PositionGetInteger(POSITION_TYPE);
      side = dir; lastLot = PositionGetDouble(POSITION_VOLUME);
      if(dir == POSITION_TYPE_BUY  && (worstOpen == 0 || o < worstOpen)) worstOpen = o;
      if(dir == POSITION_TYPE_SELL && (worstOpen == 0 || o > worstOpen)) worstOpen = o;
   }
   if(count > 0 && count < InpGaMax_${tag}) {
      double step = BufferValue(${h},1) * InpGaM_${tag};
      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      if(side == POSITION_TYPE_BUY  && bid <= worstOpen - step) Trade.Buy(NormalizeLots(lastLot), _Symbol);
      if(side == POSITION_TYPE_SELL && ask >= worstOpen + step) Trade.Sell(NormalizeLots(lastLot), _Symbol);
   }
}`,
    ],
    summaryFragments: [`ATR grid (${p.multiplier}× ATR${p.atrPeriod})`],
  };
};

// ── grid.martingaleGrid
export const translate_grid_martingaleGrid: Translator = (node) => {
  const p = node.params as { stepPips: number; multiplier: number; maxOrders: number };
  const tag = sid(node.id);
  return {
    inputs: [
      { name: `InpGmStep_${tag}`, type: "double", defaultExpr: String(p.stepPips ?? 30), label: "Martingale grid step (pips)" },
      { name: `InpGmMul_${tag}`, type: "double", defaultExpr: String(p.multiplier ?? 1.5), label: "Martingale lot ×" },
      { name: `InpGmMax_${tag}`, type: "int", defaultExpr: String(p.maxOrders ?? 4), label: "Martingale max orders" },
    ],
    positionManagement: [
      `// Martingale grid (${node.id})
{
   int count = 0; double worstOpen = 0.0; long side = 0; double lastLot = 0.0;
   for(int i=PositionsTotal()-1; i>=0; i--) {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      count++;
      double o = PositionGetDouble(POSITION_PRICE_OPEN);
      long dir = PositionGetInteger(POSITION_TYPE);
      side = dir; lastLot = PositionGetDouble(POSITION_VOLUME);
      if(dir == POSITION_TYPE_BUY  && (worstOpen == 0 || o < worstOpen)) worstOpen = o;
      if(dir == POSITION_TYPE_SELL && (worstOpen == 0 || o > worstOpen)) worstOpen = o;
   }
   if(count > 0 && count < InpGmMax_${tag}) {
      double pip = ZxPipSize();
      double step = InpGmStep_${tag} * pip;
      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double addLot = NormalizeLots(lastLot * InpGmMul_${tag});
      if(side == POSITION_TYPE_BUY  && bid <= worstOpen - step) Trade.Buy(addLot, _Symbol);
      if(side == POSITION_TYPE_SELL && ask >= worstOpen + step) Trade.Sell(addLot, _Symbol);
   }
}`,
    ],
    summaryFragments: [`Martingale grid ${p.stepPips}p × ${p.maxOrders}`],
  };
};

// ── grid.antiGrid (add in trend direction)
export const translate_grid_antiGrid: Translator = (node) => {
  const tag = sid(node.id);
  return {
    inputs: [
      { name: `InpAntiGrid_${tag}`, type: "double", defaultExpr: "20.0", label: "Anti-grid step (pips)" },
    ],
    positionManagement: [
      `// Anti-grid (add with trend) (${node.id})
{
   if(!PositionSelect(_Symbol)) return;
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double pip = ZxPipSize();
   double step = InpAntiGrid_${tag} * pip;
   long dir = PositionGetInteger(POSITION_TYPE);
   double open = PositionGetDouble(POSITION_PRICE_OPEN);
   double lot = PositionGetDouble(POSITION_VOLUME);
   if(dir == POSITION_TYPE_BUY  && bid - open >= step) Trade.Buy(NormalizeLots(lot), _Symbol);
   if(dir == POSITION_TYPE_SELL && open - ask >= step) Trade.Sell(NormalizeLots(lot), _Symbol);
}`,
    ],
    summaryFragments: [`Anti-grid (add on trend)`],
  };
};

// ── grid.pyramidGrid (add while in profit)
export const translate_grid_pyramidGrid: Translator = (node) => {
  const p = node.params as { stepPips: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpPgStep_${tag}`, type: "double", defaultExpr: String(p.stepPips ?? 15), label: "Pyramid step (pips)" }],
    positionManagement: [
      `// Pyramid grid (${node.id})
{
   if(!PositionSelect(_Symbol)) return;
   long dir = PositionGetInteger(POSITION_TYPE);
   double open = PositionGetDouble(POSITION_PRICE_OPEN);
   double vol  = PositionGetDouble(POSITION_VOLUME);
   double pip = ZxPipSize();
   double step = InpPgStep_${tag} * pip;
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   if(dir == POSITION_TYPE_BUY  && bid - open >= step) Trade.Buy(NormalizeLots(vol * 0.5), _Symbol);
   if(dir == POSITION_TYPE_SELL && open - ask >= step) Trade.Sell(NormalizeLots(vol * 0.5), _Symbol);
}`,
    ],
    summaryFragments: [`Pyramid grid ${p.stepPips}p`],
  };
};

// ── grid.averagingDown
export const translate_grid_averagingDown: Translator = (node) => {
  const p = node.params as { stepPips: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpAvgStep_${tag}`, type: "double", defaultExpr: String(p.stepPips ?? 40), label: "Averaging step (pips)" }],
    positionManagement: [
      `// Averaging-down (${node.id})
{
   int count = 0; double worstOpen = 0.0; long side = 0; double firstLot = 0.0;
   for(int i=PositionsTotal()-1; i>=0; i--) {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      count++;
      double o = PositionGetDouble(POSITION_PRICE_OPEN);
      long dir = PositionGetInteger(POSITION_TYPE);
      side = dir;
      if(firstLot == 0) firstLot = PositionGetDouble(POSITION_VOLUME);
      if(dir == POSITION_TYPE_BUY  && (worstOpen == 0 || o < worstOpen)) worstOpen = o;
      if(dir == POSITION_TYPE_SELL && (worstOpen == 0 || o > worstOpen)) worstOpen = o;
   }
   if(count > 0 && count < 8) {
      double pip = ZxPipSize();
      double step = InpAvgStep_${tag} * pip;
      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      if(side == POSITION_TYPE_BUY  && bid <= worstOpen - step) Trade.Buy(NormalizeLots(firstLot), _Symbol);
      if(side == POSITION_TYPE_SELL && ask >= worstOpen + step) Trade.Sell(NormalizeLots(firstLot), _Symbol);
   }
}`,
    ],
    summaryFragments: [`Averaging-down ${p.stepPips}p`],
  };
};

// ── grid.recoveryOnOppositeSig (proxy via RSI-50 cross inverse)
export const translate_grid_recoveryOnOppositeSig: Translator = (node) => {
  const tag = sid(node.id);
  const h = `hRecRsi_${tag}`;
  return {
    indicators: [{ handleVar: h, init: `${h} = iRSI(_Symbol, _Period, 14, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    positionManagement: [
      `// Recovery on opposite signal (${node.id})
{
   if(!PositionSelect(_Symbol)) return;
   long dir = PositionGetInteger(POSITION_TYPE);
   double vol = PositionGetDouble(POSITION_VOLUME);
   double r1 = BufferValue(${h}, 1);
   double r2 = BufferValue(${h}, 2);
   bool flipL = (r1 > 50 && r2 <= 50);
   bool flipS = (r1 < 50 && r2 >= 50);
   if(dir == POSITION_TYPE_BUY  && flipS) Trade.Sell(NormalizeLots(vol), _Symbol);
   if(dir == POSITION_TYPE_SELL && flipL) Trade.Buy(NormalizeLots(vol), _Symbol);
}`,
    ],
    summaryFragments: [`Recovery on opposite`],
  };
};

// ── grid.hedgeRecovery
export const translate_grid_hedgeRecovery: Translator = (node) => {
  const p = node.params as { triggerDdPct: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpHrDd_${tag}`, type: "double", defaultExpr: String(p.triggerDdPct ?? 2), label: "Hedge DD trigger (%)" }],
    globals: [`bool _zxHrOn_${tag} = false;`],
    positionManagement: [
      `// Hedge recovery (${node.id})
{
   if(!PositionSelect(_Symbol)) _zxHrOn_${tag} = false;
   else if(!_zxHrOn_${tag}) {
      double eq = AccountInfoDouble(ACCOUNT_EQUITY);
      double profit = PositionGetDouble(POSITION_PROFIT);
      long dir = PositionGetInteger(POSITION_TYPE);
      double vol = PositionGetDouble(POSITION_VOLUME);
      if(eq > 0 && profit < 0 && (profit / eq) * 100.0 <= -InpHrDd_${tag}) {
         if(dir == POSITION_TYPE_BUY)  Trade.Sell(NormalizeLots(vol), _Symbol);
         else                          Trade.Buy(NormalizeLots(vol), _Symbol);
         _zxHrOn_${tag} = true;
      }
   }
}`,
    ],
    summaryFragments: [`Hedge recovery @ -${p.triggerDdPct}%`],
  };
};

// ── grid.smartClose (close entire grid at $ target)
export const translate_grid_smartClose: Translator = (node) => {
  const p = node.params as { targetDollars: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpSgcTgt_${tag}`, type: "double", defaultExpr: String(p.targetDollars ?? 30), label: "Grid target ($)" }],
    positionManagement: [
      `// Smart grid close (${node.id})
{
   double total = 0.0;
   for(int i=PositionsTotal()-1; i>=0; i--) {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      total += PositionGetDouble(POSITION_PROFIT);
   }
   if(total >= InpSgcTgt_${tag})
   {
      for(int i=PositionsTotal()-1; i>=0; i--) {
         ulong ticket = PositionGetTicket(i);
         if(!PositionSelectByTicket(ticket)) continue;
         if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
         Trade.PositionClose(ticket);
      }
   }
}`,
    ],
    summaryFragments: [`Smart close @ $${p.targetDollars}`],
  };
};
