import type { Translator } from "../types";

// lot = baseLot × (balance / 1000), floored to minLot.

export const translate_lot_perBalance: Translator = (node) => {
  const p = node.params as { baseLot: number; minLot: number };
  const bIn = `InpLotPerBal_${sid(node.id)}`;
  const mIn = `InpLotPerBalMin_${sid(node.id)}`;

  return {
    inputs: [
      { name: bIn, type: "double", defaultExpr: String(p.baseLot ?? 0.1), label: "Base lot per $1,000" },
      { name: mIn, type: "double", defaultExpr: String(p.minLot ?? 0.01), label: "Min lot" },
    ],
    helpers: [
      `double LotPerBalance_${sid(node.id)}()
{
   double bal = AccountInfoDouble(ACCOUNT_BALANCE);
   double raw = ${bIn} * (bal / 1000.0);
   double lot = NormalizeLots(raw);
   if(lot < ${mIn}) lot = ${mIn};
   return lot;
}`,
    ],
    lotExpr: `LotPerBalance_${sid(node.id)}()`,
    summaryFragments: [`lot = ${p.baseLot} × (balance / $1k)`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
