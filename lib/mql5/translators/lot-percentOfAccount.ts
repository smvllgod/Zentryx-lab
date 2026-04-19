import type { Translator } from "../types";

// lot = (equity × percent%) / contract-size. Simple percent-of-account sizing.

export const translate_lot_percentOfAccount: Translator = (node) => {
  const p = node.params as { percent: number };
  const pIn = `InpLotPct_${sid(node.id)}`;

  return {
    inputs: [
      { name: pIn, type: "double", defaultExpr: String(p.percent ?? 2), label: "% of account per trade" },
    ],
    helpers: [
      `double LotPercentOfAccount_${sid(node.id)}()
{
   double eq       = AccountInfoDouble(ACCOUNT_EQUITY);
   double contract = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_CONTRACT_SIZE);
   if(contract <= 0) contract = 100000.0;
   double raw = (eq * ${pIn} / 100.0) / contract;
   return NormalizeLots(raw);
}`,
    ],
    lotExpr: `LotPercentOfAccount_${sid(node.id)}()`,
    summaryFragments: [`lot = ${p.percent}% of account`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
