// Batch 2 — basket / portfolio family (10 blocks).
// Basket-level P/L is aggregated across all positions sharing the EA magic
// number. Some blocks are informational (scope, correlation cap, symbol
// group) and emit inputs but no runtime gate.

import type { Translator } from "../types";

const sid = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);

const BASKET_PL_HELPER = `double BasketProfit_()
{
   double total = 0.0;
   for(int i=PositionsTotal()-1; i>=0; i--) {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      total += PositionGetDouble(POSITION_PROFIT);
   }
   return total;
}
void BasketCloseAll_()
{
   for(int i=PositionsTotal()-1; i>=0; i--) {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      Trade.PositionClose(ticket);
   }
}`;

// ── basket.totalProfitTarget
export const translate_basket_totalProfitTarget: Translator = (node) => {
  const p = node.params as { targetDollars: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpBkTp_${tag}`, type: "double", defaultExpr: String(p.targetDollars ?? 50), label: "Basket TP ($)" }],
    helpers: [BASKET_PL_HELPER],
    positionManagement: [`if(BasketProfit_() >= InpBkTp_${tag}) BasketCloseAll_();`],
    summaryFragments: [`Basket TP $${p.targetDollars}`],
  };
};

// ── basket.totalLossStop
export const translate_basket_totalLossStop: Translator = (node) => {
  const p = node.params as { lossDollars: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpBkSl_${tag}`, type: "double", defaultExpr: String(p.lossDollars ?? 100), label: "Basket SL ($)" }],
    helpers: [BASKET_PL_HELPER],
    positionManagement: [`if(BasketProfit_() <= -InpBkSl_${tag}) BasketCloseAll_();`],
    summaryFragments: [`Basket SL -$${p.lossDollars}`],
  };
};

// ── basket.profitPct
export const translate_basket_profitPct: Translator = (node) => {
  const p = node.params as { targetPercent: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpBkTpPct_${tag}`, type: "double", defaultExpr: String(p.targetPercent ?? 1), label: "Basket TP (%)" }],
    helpers: [BASKET_PL_HELPER],
    positionManagement: [
      `{
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   if(eq > 0 && BasketProfit_() / eq * 100.0 >= InpBkTpPct_${tag}) BasketCloseAll_();
}`,
    ],
    summaryFragments: [`Basket TP ${p.targetPercent}%`],
  };
};

// ── basket.lossPct
export const translate_basket_lossPct: Translator = (node) => {
  const p = node.params as { lossPercent: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpBkSlPct_${tag}`, type: "double", defaultExpr: String(p.lossPercent ?? 2), label: "Basket SL (%)" }],
    helpers: [BASKET_PL_HELPER],
    positionManagement: [
      `{
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   if(eq > 0 && BasketProfit_() / eq * 100.0 <= -InpBkSlPct_${tag}) BasketCloseAll_();
}`,
    ],
    summaryFragments: [`Basket SL -${p.lossPercent}%`],
  };
};

// ── basket.lockInProfit (after +X% lock +Y%)
export const translate_basket_lockInProfit: Translator = (node) => {
  const p = node.params as { triggerPct: number; lockPct: number };
  const tag = sid(node.id);
  return {
    inputs: [
      { name: `InpLipTrg_${tag}`, type: "double", defaultExpr: String(p.triggerPct ?? 1), label: "Lock trigger (%)" },
      { name: `InpLipLck_${tag}`, type: "double", defaultExpr: String(p.lockPct ?? 0.4), label: "Lock value (%)" },
    ],
    globals: [`bool _zxLipArmed_${tag} = false;`],
    helpers: [BASKET_PL_HELPER],
    positionManagement: [
      `{
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   if(eq <= 0) return;
   double pct = BasketProfit_() / eq * 100.0;
   if(pct >= InpLipTrg_${tag}) _zxLipArmed_${tag} = true;
   if(_zxLipArmed_${tag} && pct < InpLipLck_${tag}) BasketCloseAll_();
}`,
    ],
    summaryFragments: [`Lock +${p.lockPct}% after +${p.triggerPct}%`],
  };
};

// ── basket.hedgedClose (close both sides on break-even)
export const translate_basket_hedgedClose: Translator = (node) => {
  const tag = sid(node.id);
  return {
    helpers: [BASKET_PL_HELPER,
      `int BasketLongCount_${tag}(){ int n=0; for(int i=PositionsTotal()-1;i>=0;i--){ ulong t=PositionGetTicket(i); if(!PositionSelectByTicket(t)) continue; if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue; if(PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_BUY) n++;} return n; }
int BasketShortCount_${tag}(){ int n=0; for(int i=PositionsTotal()-1;i>=0;i--){ ulong t=PositionGetTicket(i); if(!PositionSelectByTicket(t)) continue; if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue; if(PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_SELL) n++;} return n; }`,
    ],
    positionManagement: [
      `{
   if(BasketLongCount_${tag}() > 0 && BasketShortCount_${tag}() > 0 && BasketProfit_() >= 0)
      BasketCloseAll_();
}`,
    ],
    summaryFragments: [`Close hedged pair at BE`],
  };
};

// ── basket.symbolGroup (informational — multi-symbol baskets require the EA
// to run on each symbol; we expose the list as an input for user reference)
export const translate_basket_symbolGroup: Translator = (node) => {
  const p = node.params as { symbols: string };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpBkGrp_${tag}`, type: "string", defaultExpr: `"${(p.symbols ?? "EURUSD,GBPUSD").replace(/"/g,'\\"')}"`, label: "Basket symbol group (CSV)" }],
    summaryFragments: [`Symbol group: ${p.symbols ?? ""}`],
  };
};

// ── basket.correlationCap (limits open positions if other majors are open)
export const translate_basket_correlationCap: Translator = (node) => {
  const p = node.params as { maxCorrelated: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpCorrMax_${tag}`, type: "int", defaultExpr: String(p.maxCorrelated ?? 2), label: "Max correlated open" }],
    gates: [{
      expr: `((int)PositionsTotal() <= InpCorrMax_${tag})`,
      reason: "too many correlated trades",
    }],
    summaryFragments: [`Correlation cap ${p.maxCorrelated}`],
  };
};

// ── basket.magicScope (informational — magic is already a master input)
export const translate_basket_magicScope: Translator = (node) => {
  const p = node.params as { magic: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpMagicScope_${tag}`, type: "int", defaultExpr: String(p.magic ?? 20260418), label: "Magic scope hint" }],
    summaryFragments: [`Magic scope ${p.magic ?? "default"}`],
  };
};

// ── basket.emergencyBasket
export const translate_basket_emergencyBasket: Translator = (node) => {
  const p = node.params as { maxDdPercent: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpBkEmg_${tag}`, type: "double", defaultExpr: String(p.maxDdPercent ?? 5), label: "Basket emergency DD (%)" }],
    globals: [`double _zxBkPeak_${tag} = 0.0;`],
    helpers: [BASKET_PL_HELPER],
    positionManagement: [
      `{
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   if(eq > _zxBkPeak_${tag}) _zxBkPeak_${tag} = eq;
   if(_zxBkPeak_${tag} > 0) {
      double dd = (_zxBkPeak_${tag} - eq) / _zxBkPeak_${tag} * 100.0;
      if(dd >= InpBkEmg_${tag}) BasketCloseAll_();
   }
}`,
    ],
    summaryFragments: [`Basket emergency -${p.maxDdPercent}%`],
  };
};
