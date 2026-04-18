import type { Translator } from "../types";

export const translate_utility_maxOpenPositions: Translator = (node) => {
  const p = node.params as { maxPositions: number };
  const v = `InpMaxOpenPositions_${sid(node.id)}`;

  return {
    inputs: [
      { name: v, type: "int", defaultExpr: String(p.maxPositions), label: "Max simultaneous positions" },
    ],
    helpers: [
      `int ZxOpenPositionCount()
{
   int n = 0;
   for(int i = PositionsTotal() - 1; i >= 0; --i)
   {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      n++;
   }
   return n;
}`,
    ],
    gates: [{ expr: `(ZxOpenPositionCount() < ${v})`, reason: "max open positions reached" }],
    summaryFragments: [`max ${p.maxPositions} open positions`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
