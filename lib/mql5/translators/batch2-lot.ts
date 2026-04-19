// Batch 2 — lot family (6 blocks). All contribute a single lotExpr helper.

import type { Translator } from "../types";

const sid = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);

// ── lot.fromCashRisk
export const translate_lot_fromCashRisk: Translator = (node) => {
  const tag = sid(node.id);
  return {
    inputs: [
      { name: `InpCashRisk_${tag}`, type: "double", defaultExpr: "50.0", label: "Cash risk per trade ($)" },
    ],
    helpers: [
      `double LotFromCashRisk_${tag}(double slPips)
{
   if(slPips <= 0) return 0.01;
   double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double point     = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   if(tickValue <= 0 || tickSize <= 0) return 0.01;
   double pipValue  = (tickValue / tickSize) * (10.0 * point);
   double raw       = InpCashRisk_${tag} / (slPips * pipValue);
   return NormalizeLots(raw);
}`,
    ],
    lotExpr: `LotFromCashRisk_${tag}(slPriceDistancePips)`,
    summaryFragments: [`Lot from fixed cash risk`],
  };
};

// ── lot.fixedRatio (Ryan Jones — scale by delta-dollars equity)
export const translate_lot_fixedRatio: Translator = (node) => {
  const p = node.params as { baseLot: number; deltaDollars: number };
  const tag = sid(node.id);
  return {
    inputs: [
      { name: `InpFrBase_${tag}`, type: "double", defaultExpr: String(p.baseLot ?? 0.1), label: "Base lot" },
      { name: `InpFrDelta_${tag}`, type: "double", defaultExpr: String(p.deltaDollars ?? 500), label: "Delta $/step" },
    ],
    helpers: [
      `double LotFixedRatio_${tag}()
{
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   double base = InpFrBase_${tag};
   double delta = InpFrDelta_${tag};
   if(delta <= 0) return NormalizeLots(base);
   double steps = MathFloor(eq / delta);
   double lot = base * (1.0 + steps * 0.1);
   return NormalizeLots(lot);
}`,
    ],
    lotExpr: `LotFixedRatio_${tag}()`,
    summaryFragments: [`Fixed-ratio lot (base ${p.baseLot})`],
  };
};

// ── lot.antiMartingale (scale up after wins)
export const translate_lot_antiMartingale: Translator = (node) => {
  const p = node.params as { baseLot: number; multiplier: number; maxLot: number };
  const tag = sid(node.id);
  return {
    inputs: [
      { name: `InpAmBase_${tag}`, type: "double", defaultExpr: String(p.baseLot ?? 0.1), label: "Base lot" },
      { name: `InpAmMult_${tag}`, type: "double", defaultExpr: String(p.multiplier ?? 1.5), label: "Multiplier per win" },
      { name: `InpAmMax_${tag}`, type: "double", defaultExpr: String(p.maxLot ?? 1.0), label: "Max lot" },
    ],
    globals: [`double _zxAmLast_${tag} = 0.0; bool _zxAmPrevWin_${tag} = false; double _zxAmCurr_${tag} = 0.0;`],
    helpers: [
      `double LotAntiMartingale_${tag}()
{
   if(_zxAmCurr_${tag} <= 0) _zxAmCurr_${tag} = InpAmBase_${tag};
   return NormalizeLots(MathMin(_zxAmCurr_${tag}, InpAmMax_${tag}));
}`,
    ],
    lotExpr: `LotAntiMartingale_${tag}()`,
    positionManagement: [
      `// Anti-martingale bookkeeping (${node.id})
{
   static double prevBal = 0.0;
   double bal = AccountInfoDouble(ACCOUNT_BALANCE);
   if(prevBal > 0 && bal != prevBal)
   {
      if(bal > prevBal) _zxAmCurr_${tag} *= InpAmMult_${tag};
      else              _zxAmCurr_${tag} = InpAmBase_${tag};
      if(_zxAmCurr_${tag} > InpAmMax_${tag}) _zxAmCurr_${tag} = InpAmMax_${tag};
   }
   prevBal = bal;
}`,
    ],
    summaryFragments: [`Anti-martingale (base ${p.baseLot}, ×${p.multiplier})`],
  };
};

// ── lot.martingale (scale up after losses, hard-capped)
export const translate_lot_martingale: Translator = (node) => {
  const p = node.params as { baseLot: number; multiplier: number; maxSteps: number };
  const tag = sid(node.id);
  return {
    inputs: [
      { name: `InpMtBase_${tag}`, type: "double", defaultExpr: String(p.baseLot ?? 0.05), label: "Martingale base" },
      { name: `InpMtMult_${tag}`, type: "double", defaultExpr: String(p.multiplier ?? 2), label: "Mult after loss" },
      { name: `InpMtSteps_${tag}`, type: "int", defaultExpr: String(p.maxSteps ?? 3), label: "Max steps" },
    ],
    globals: [`double _zxMtCurr_${tag} = 0.0; int _zxMtSteps_${tag} = 0;`],
    helpers: [
      `double LotMartingale_${tag}()
{
   if(_zxMtCurr_${tag} <= 0) _zxMtCurr_${tag} = InpMtBase_${tag};
   return NormalizeLots(_zxMtCurr_${tag});
}`,
    ],
    lotExpr: `LotMartingale_${tag}()`,
    positionManagement: [
      `// Martingale bookkeeping
{
   static double prevBal = 0.0;
   double bal = AccountInfoDouble(ACCOUNT_BALANCE);
   if(prevBal > 0 && bal != prevBal)
   {
      if(bal < prevBal) {
         if(_zxMtSteps_${tag} < InpMtSteps_${tag}) {
            _zxMtCurr_${tag} *= InpMtMult_${tag};
            _zxMtSteps_${tag}++;
         } else {
            _zxMtCurr_${tag} = InpMtBase_${tag};
            _zxMtSteps_${tag} = 0;
         }
      } else {
         _zxMtCurr_${tag} = InpMtBase_${tag};
         _zxMtSteps_${tag} = 0;
      }
   }
   prevBal = bal;
}`,
    ],
    summaryFragments: [`Martingale (base ${p.baseLot}, cap ${p.maxSteps} steps)`],
  };
};

// ── lot.volatilityScaled (target constant cash risk via ATR)
export const translate_lot_volatilityScaled: Translator = (node) => {
  const p = node.params as { targetRiskPercent: number; atrPeriod: number };
  const tag = sid(node.id);
  const h = `hLotVs_${tag}`;
  return {
    inputs: [
      { name: `InpVsRisk_${tag}`, type: "double", defaultExpr: String(p.targetRiskPercent ?? 1), label: "Target risk (%)" },
      { name: `InpVsP_${tag}`, type: "int", defaultExpr: String(p.atrPeriod ?? 14), label: "ATR period (vol lot)" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iATR(_Symbol, _Period, InpVsP_${tag});`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    helpers: [
      `double LotVolScaled_${tag}()
{
   double atr = BufferValue(${h}, 1);
   if(atr <= 0) return 0.01;
   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   if(tickValue <= 0 || tickSize <= 0) return 0.01;
   double pipValue = (tickValue / tickSize) * (10.0 * point);
   double pipsAtr = atr / ZxPipSize();
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   double cashRisk = eq * InpVsRisk_${tag} / 100.0;
   double raw = cashRisk / (pipsAtr * pipValue);
   return NormalizeLots(raw);
}`,
    ],
    lotExpr: `LotVolScaled_${tag}()`,
    summaryFragments: [`Vol-scaled lot (${p.targetRiskPercent}% vs ATR${p.atrPeriod})`],
  };
};

// ── lot.equityTiered (tiers JSON string — simplified to 3 tiers)
// We expose three $ thresholds + three lots as inputs (JSON parsing inside MQL5
// is heavy; the simplified form covers 95% of user needs).
export const translate_lot_equityTiered: Translator = (node) => {
  const tag = sid(node.id);
  return {
    inputs: [
      { name: `InpEtT1_${tag}`, type: "double", defaultExpr: "1000",  label: "Tier 1 equity ($)" },
      { name: `InpEtL1_${tag}`, type: "double", defaultExpr: "0.01",  label: "Tier 1 lot" },
      { name: `InpEtT2_${tag}`, type: "double", defaultExpr: "5000",  label: "Tier 2 equity ($)" },
      { name: `InpEtL2_${tag}`, type: "double", defaultExpr: "0.05",  label: "Tier 2 lot" },
      { name: `InpEtT3_${tag}`, type: "double", defaultExpr: "20000", label: "Tier 3 equity ($)" },
      { name: `InpEtL3_${tag}`, type: "double", defaultExpr: "0.2",   label: "Tier 3 lot" },
    ],
    helpers: [
      `double LotEquityTiered_${tag}()
{
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   double lot;
   if(eq >= InpEtT3_${tag}) lot = InpEtL3_${tag};
   else if(eq >= InpEtT2_${tag}) lot = InpEtL2_${tag};
   else if(eq >= InpEtT1_${tag}) lot = InpEtL1_${tag};
   else lot = InpEtL1_${tag};
   return NormalizeLots(lot);
}`,
    ],
    lotExpr: `LotEquityTiered_${tag}()`,
    summaryFragments: [`Equity-tiered lot`],
  };
};
