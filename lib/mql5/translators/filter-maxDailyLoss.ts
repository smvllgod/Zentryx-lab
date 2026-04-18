import type { Translator } from "../types";

export const translate_filter_maxDailyLoss: Translator = (node) => {
  const p = node.params as { maxLossPercent: number };
  const v = `InpMaxDailyLossPct_${sid(node.id)}`;

  return {
    inputs: [
      { name: v, type: "double", defaultExpr: String(p.maxLossPercent), label: "Max daily loss (%)" },
    ],
    helpers: [
      `// Accumulated closed-trade P/L today as a % of the day-start balance.
double ZxDailyPnlPercent()
{
   datetime start = iTime(_Symbol, PERIOD_D1, 0);
   HistorySelect(start, TimeCurrent());
   double pnl = 0.0;
   for(int i = 0; i < HistoryDealsTotal(); i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;
      if(HistoryDealGetInteger(ticket, DEAL_MAGIC) != InpMagic) continue;
      if((ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;
      pnl += HistoryDealGetDouble(ticket, DEAL_PROFIT)
           + HistoryDealGetDouble(ticket, DEAL_SWAP)
           + HistoryDealGetDouble(ticket, DEAL_COMMISSION);
   }
   double balance = AccountInfoDouble(ACCOUNT_BALANCE) - pnl;
   return (balance > 0 ? pnl / balance * 100.0 : 0.0);
}`,
    ],
    gates: [{ expr: `(ZxDailyPnlPercent() > -${v})`, reason: "daily loss limit hit" }],
    summaryFragments: [`stop trading after −${p.maxLossPercent}% daily loss`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
