import type { Translator } from "../types";

export const translate_manage_trailingStopAtr: Translator = (node) => {
  const p = node.params as { period: number; multiplier: number };
  const periodInput = `InpAtrTrailP_${shortId(node.id)}`;
  const multInput = `InpAtrTrailM_${shortId(node.id)}`;
  const h = `hAtrTrail_${shortId(node.id)}`;

  return {
    inputs: [
      { name: periodInput, type: "int", defaultExpr: String(p.period), label: "ATR period" },
      { name: multInput, type: "double", defaultExpr: String(p.multiplier), label: "ATR multiplier" },
    ],
    indicators: [
      { handleVar: h, init: `${h} = iATR(_Symbol, _Period, ${periodInput});`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` },
    ],
    positionManagement: [
      `// ATR trailing (${node.id})
{
  double atr = BufferValue(${h}, 1);
  double trailDist = atr * ${multInput};
  double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
  double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
  for(int i=PositionsTotal()-1; i>=0; i--) {
    if(!PositionSelectByTicket(PositionGetTicket(i))) continue;
    if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
    long dir = PositionGetInteger(POSITION_TYPE);
    double sl = PositionGetDouble(POSITION_SL);
    if(dir == POSITION_TYPE_BUY) {
      double newSl = bid - trailDist;
      if(newSl > sl) { MqlTradeRequest r; MqlTradeResult rr; ZeroMemory(r); ZeroMemory(rr); r.action=TRADE_ACTION_SLTP; r.position=(ulong)PositionGetInteger(POSITION_TICKET); r.symbol=_Symbol; r.sl=newSl; r.tp=PositionGetDouble(POSITION_TP); OrderSend(r, rr); }
    } else if(dir == POSITION_TYPE_SELL) {
      double newSl = ask + trailDist;
      if(sl == 0 || newSl < sl) { MqlTradeRequest r; MqlTradeResult rr; ZeroMemory(r); ZeroMemory(rr); r.action=TRADE_ACTION_SLTP; r.position=(ulong)PositionGetInteger(POSITION_TICKET); r.symbol=_Symbol; r.sl=newSl; r.tp=PositionGetDouble(POSITION_TP); OrderSend(r, rr); }
    }
  }
}`,
    ],
    summaryFragments: [`ATR(${p.period}) × ${p.multiplier} trailing`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
