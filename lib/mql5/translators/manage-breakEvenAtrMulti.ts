import type { Translator } from "../types";

// Break-even when profit ≥ k × ATR (in price). Uses bar-1 ATR for stability.

export const translate_manage_breakEvenAtrMulti: Translator = (node) => {
  const p = node.params as { atrPeriod: number; multiplier: number };
  const aIn = `InpBeAtrP_${sid(node.id)}`;
  const mIn = `InpBeAtrM_${sid(node.id)}`;
  const h = `hBeAtr_${sid(node.id)}`;

  return {
    inputs: [
      { name: aIn, type: "int", defaultExpr: String(p.atrPeriod ?? 14), label: "ATR period (BE)" },
      { name: mIn, type: "double", defaultExpr: String(p.multiplier ?? 1), label: "ATR multiplier (BE trigger)" },
    ],
    indicators: [
      { handleVar: h, init: `${h} = iATR(_Symbol, _Period, ${aIn});`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` },
    ],
    positionManagement: [
      `// ATR-multiple break-even (${node.id})
{
   double atr = BufferValue(${h}, 1);
   double trig = atr * ${mIn};
   for(int i=PositionsTotal()-1; i>=0; i--) {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      long dir    = PositionGetInteger(POSITION_TYPE);
      double open = PositionGetDouble(POSITION_PRICE_OPEN);
      double sl   = PositionGetDouble(POSITION_SL);
      double tp   = PositionGetDouble(POSITION_TP);
      if(dir == POSITION_TYPE_BUY) {
         double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         if(bid - open >= trig && (sl == 0 || sl < open))
            Trade.PositionModify(_Symbol, NormalizeDouble(open, _Digits), tp);
      } else if(dir == POSITION_TYPE_SELL) {
         double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         if(open - ask >= trig && (sl == 0 || sl > open))
            Trade.PositionModify(_Symbol, NormalizeDouble(open, _Digits), tp);
      }
   }
}`,
    ],
    summaryFragments: [`BE at ${p.multiplier}× ATR(${p.atrPeriod})`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
