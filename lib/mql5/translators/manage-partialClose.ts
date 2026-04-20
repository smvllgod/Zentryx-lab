import type { Translator } from "../types";

export const translate_manage_partialClose: Translator = (node) => {
  const p = node.params as { firstTpPips: number; closePercent: number };
  const tpInput = `InpPartTp_${shortId(node.id)}`;
  const pctInput = `InpPartPct_${shortId(node.id)}`;

  return {
    inputs: [
      { name: tpInput, type: "double", defaultExpr: String(p.firstTpPips), label: "Partial-close TP (pips)" },
      { name: pctInput, type: "double", defaultExpr: String(p.closePercent), label: "Close portion (%)" },
    ],
    globals: [`bool g_Partial_${shortId(node.id)}_Done = false;`],
    positionManagement: [
      `// Partial close (${node.id})
{
  double pipSize = 10.0 * SymbolInfoDouble(_Symbol, SYMBOL_POINT);
  double tpDist = ${tpInput} * pipSize;
  for(int i=PositionsTotal()-1; i>=0; i--) {
    if(!PositionSelectByTicket(PositionGetTicket(i))) continue;
    if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
    long dir = PositionGetInteger(POSITION_TYPE);
    double op = PositionGetDouble(POSITION_PRICE_OPEN);
    double vol = PositionGetDouble(POSITION_VOLUME);
    double cur = (dir == POSITION_TYPE_BUY) ? SymbolInfoDouble(_Symbol, SYMBOL_BID) : SymbolInfoDouble(_Symbol, SYMBOL_ASK);
    double gain = (dir == POSITION_TYPE_BUY) ? (cur - op) : (op - cur);
    if(gain >= tpDist && vol > 0) {
      double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP); if(step<=0) step=0.01;
      double closeVol = MathFloor(vol * (${pctInput} / 100.0) / step) * step;
      if(closeVol > 0) {
        MqlTradeRequest r; MqlTradeResult rr; ZeroMemory(r); ZeroMemory(rr);
        r.action = TRADE_ACTION_DEAL;
        r.position = (ulong)PositionGetInteger(POSITION_TICKET);
        r.symbol = _Symbol;
        r.volume = closeVol;
        r.type = (dir == POSITION_TYPE_BUY) ? ORDER_TYPE_SELL : ORDER_TYPE_BUY;
        r.price = cur;
        r.deviation = 10;
        OrderSend(r, rr);
      }
    }
  }
}`,
    ],
    summaryFragments: [`Close ${p.closePercent}% at +${p.firstTpPips} pips`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
