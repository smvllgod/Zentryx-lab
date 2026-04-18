import type { Translator } from "../types";

export const translate_filter_maxDailyTrades: Translator = (node) => {
  const p = node.params as { maxTrades: number };
  const v = `InpMaxDailyTrades_${sid(node.id)}`;

  return {
    inputs: [
      { name: v, type: "int", defaultExpr: String(p.maxTrades), label: "Max trades per day" },
    ],
    helpers: [
      `// Count trades opened today from history matching this EA's magic.
int ZxTradesToday()
{
   datetime start = iTime(_Symbol, PERIOD_D1, 0);
   HistorySelect(start, TimeCurrent());
   int opened = 0;
   for(int i = HistoryDealsTotal() - 1; i >= 0; --i)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;
      if(HistoryDealGetInteger(ticket, DEAL_MAGIC) != InpMagic) continue;
      if((ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket, DEAL_ENTRY) == DEAL_ENTRY_IN) opened++;
   }
   return opened;
}`,
    ],
    gates: [{ expr: `(ZxTradesToday() < ${v})`, reason: "daily trade limit reached" }],
    summaryFragments: [`≤ ${p.maxTrades} trades/day`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
