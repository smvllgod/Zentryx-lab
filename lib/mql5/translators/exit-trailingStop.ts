import type { Translator } from "../types";

export const translate_exit_trailingStop: Translator = (node) => {
  const p = node.params as { activationPips: number; trailingPips: number };
  const actVar = `InpTrailAct_${shortId(node.id)}`;
  const trailVar = `InpTrailDist_${shortId(node.id)}`;
  return {
    inputs: [
      { name: actVar, type: "double", defaultExpr: String(p.activationPips), label: "Trail activation (pips)" },
      { name: trailVar, type: "double", defaultExpr: String(p.trailingPips), label: "Trail distance (pips)" },
    ],
    positionManagement: [
      `// Trailing stop
{
   double pip   = ZxPipSize();
   double act   = ${actVar} * pip;
   double trail = ${trailVar} * pip;
   if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY)
   {
      double price = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      if(price - PositionGetDouble(POSITION_PRICE_OPEN) >= act)
      {
         double newSl = price - trail;
         if(newSl > PositionGetDouble(POSITION_SL))
            ZxModifySL(newSl);
      }
   }
   else if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL)
   {
      double price = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      if(PositionGetDouble(POSITION_PRICE_OPEN) - price >= act)
      {
         double newSl = price + trail;
         double curSl = PositionGetDouble(POSITION_SL);
         if(curSl == 0 || newSl < curSl)
            ZxModifySL(newSl);
      }
   }
}`,
    ],
    summaryFragments: [`trailing ${p.trailingPips}p after ${p.activationPips}p`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
