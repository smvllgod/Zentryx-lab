import type { Translator } from "../types";

export const translate_exit_breakEven: Translator = (node) => {
  const p = node.params as { triggerPips: number; offsetPips: number };
  const trigVar = `InpBeTrigger_${shortId(node.id)}`;
  const offVar = `InpBeOffset_${shortId(node.id)}`;
  return {
    inputs: [
      { name: trigVar, type: "double", defaultExpr: String(p.triggerPips), label: "Break-even trigger (pips)" },
      { name: offVar, type: "double", defaultExpr: String(p.offsetPips), label: "Break-even offset (pips)" },
    ],
    positionManagement: [
      `// Break-even
{
   double pip   = ZxPipSize();
   double trig  = ${trigVar} * pip;
   double off   = ${offVar} * pip;
   double open  = PositionGetDouble(POSITION_PRICE_OPEN);
   if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY)
   {
      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      if(bid - open >= trig)
      {
         double newSl = open + off;
         if(newSl > PositionGetDouble(POSITION_SL))
            ZxModifySL(newSl);
      }
   }
   else if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL)
   {
      double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      if(open - ask >= trig)
      {
         double newSl = open - off;
         double curSl = PositionGetDouble(POSITION_SL);
         if(curSl == 0 || newSl < curSl)
            ZxModifySL(newSl);
      }
   }
}`,
    ],
    summaryFragments: [`break-even after ${p.triggerPips}p`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
