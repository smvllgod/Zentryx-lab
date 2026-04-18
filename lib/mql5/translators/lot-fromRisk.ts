import type { Translator } from "../types";

// Converts `riskPercent × equity` into a lot using the SL distance in pips.
// Assumes another node (`risk.fixedRisk`) emits `RiskPercentPerTrade()`; falls
// back to 1.0 if the helper isn't present.

export const translate_lot_fromRisk: Translator = (node) => {
  return {
    helpers: [
      `double LotFromRisk(double slPips) {
  double riskPct = RiskPercentPerTrade();
  double equity = AccountInfoDouble(ACCOUNT_EQUITY);
  double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
  double tickSize  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
  double point     = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
  if(tickValue <= 0 || tickSize <= 0 || slPips <= 0) return 0.01;
  double moneyRisk = equity * riskPct / 100.0;
  double pipValue  = (tickValue / tickSize) * (10.0 * point);
  double rawLot    = moneyRisk / (slPips * pipValue);
  double step      = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
  if(step <= 0) step = 0.01;
  double minLot    = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
  double maxLot    = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
  double lot       = MathMax(minLot, MathMin(maxLot, MathFloor(rawLot/step)*step));
  return lot;
}`,
    ],
    lotExpr: "LotFromRisk(slPriceDistancePips)",
    summaryFragments: ["Lot from risk% (via SL distance)"],
  };
};
