import type { Translator } from "../types";

export const translate_utility_oneTradeAtTime: Translator = () => ({
  gates: [
    { expr: "(!ZxHasOpenPosition())", reason: "another position is open" },
  ],
  helpers: [
    `// True when the EA already has an open position on _Symbol matching its magic number.
bool ZxHasOpenPosition()
{
   for(int i = PositionsTotal() - 1; i >= 0; --i)
   {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      return true;
   }
   return false;
}`,
  ],
  summaryFragments: ["one trade at a time"],
});
