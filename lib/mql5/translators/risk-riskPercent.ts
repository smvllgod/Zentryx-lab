import type { Translator } from "../types";

export const translate_risk_riskPercent: Translator = (node) => {
  const p = node.params as { riskPercent: number };
  const v = `InpRiskPercent_${shortId(node.id)}`;
  return {
    inputs: [
      { name: v, type: "double", defaultExpr: String(p.riskPercent), label: "Risk per trade (%)" },
    ],
    helpers: [
      `// Lot size sized to risk a percentage of equity vs. distance entry-stop.
double ZxLotForRisk(double riskPct, double entryPrice, double slPrice)
{
   double equity      = AccountInfoDouble(ACCOUNT_EQUITY);
   double riskMoney   = equity * riskPct / 100.0;
   double pointValue  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double point       = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   double tickSize    = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double stopPoints  = MathAbs(entryPrice - slPrice) / point;
   if(stopPoints <= 0 || pointValue <= 0 || tickSize <= 0) return 0.0;
   double lossPerLot  = stopPoints * (point / tickSize) * pointValue;
   if(lossPerLot <= 0) return 0.0;
   return NormalizeLots(riskMoney / lossPerLot);
}`,
    ],
    lotExpr: `ZxLotForRisk(${v}, entryPrice, slPrice)`,
    summaryFragments: [`risk ${p.riskPercent}% per trade`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
