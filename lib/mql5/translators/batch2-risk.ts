// Batch 2 — risk family (6 blocks). Risk blocks typically emit a
// RiskPercentPerTrade() helper that `lot.fromRisk` reads.

import type { Translator } from "../types";

const sid = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);

// ── risk.atrRisk (ATR-based risk with risk%)
export const translate_risk_atrRisk: Translator = (node) => {
  // Canonical key is `atrMultiplier` per the block registry; older
  // strategies / templates set `slMultiplier` — accept both.
  const p = node.params as { riskPercent: number; atrPeriod: number; atrMultiplier?: number; slMultiplier?: number };
  const mulValue = p.atrMultiplier ?? p.slMultiplier ?? 1.5;
  const tag = sid(node.id);
  const h = `hRiskAtr_${tag}`;
  return {
    inputs: [
      { name: `InpArRisk_${tag}`, type: "double", defaultExpr: String(p.riskPercent ?? 1), label: "Risk %" },
      { name: `InpArP_${tag}`, type: "int", defaultExpr: String(p.atrPeriod ?? 14), label: "ATR period (risk)" },
      { name: `InpArM_${tag}`, type: "double", defaultExpr: String(mulValue), label: "ATR multiplier (SL distance)" },
    ],
    indicators: [{ handleVar: h, init: `${h} = iATR(_Symbol, _Period, InpArP_${tag});`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    helpers: [
      `double RiskPercentPerTrade() { return InpArRisk_${tag}; }`,
    ],
    stopLevels: {
      body: `// ATR-based SL with risk contribution
{
   double atr = BufferValue(${h}, 1);
   double slDist = atr * InpArM_${tag};
   if(isLong) { slPrice = entryPrice - slDist; tpPrice = entryPrice + slDist * 2.0; }
   else       { slPrice = entryPrice + slDist; tpPrice = entryPrice - slDist * 2.0; }
   slPriceDistancePips = slDist / ZxPipSize();
}`,
    },
    summaryFragments: [`ATR(${p.atrPeriod}) × ${mulValue} @ ${p.riskPercent}% risk`],
  };
};

// ── risk.fixedCashRisk (exposes RiskCashPerTrade)
export const translate_risk_fixedCashRisk: Translator = (node) => {
  const tag = sid(node.id);
  return {
    inputs: [
      { name: `InpFcCash_${tag}`, type: "double", defaultExpr: "50.0", label: "Fixed cash risk ($)" },
    ],
    helpers: [
      `double RiskCashPerTrade() { return InpFcCash_${tag}; }
double RiskPercentPerTrade()
{
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   if(eq <= 0) return 1.0;
   return (InpFcCash_${tag} / eq) * 100.0;
}`,
    ],
    summaryFragments: [`Fixed cash risk $${"≈"}RiskCashPerTrade`],
  };
};

// ── risk.drawdownScale (reduce risk after drawdown)
export const translate_risk_drawdownScale: Translator = (node) => {
  const tag = sid(node.id);
  return {
    inputs: [
      { name: `InpDsBase_${tag}`, type: "double", defaultExpr: "1.0", label: "Base risk (%)" },
      { name: `InpDsFloor_${tag}`, type: "double", defaultExpr: "0.25", label: "Floor risk (%)" },
      { name: `InpDsDd_${tag}`, type: "double", defaultExpr: "5.0", label: "DD threshold (%)" },
    ],
    globals: [`double _zxDsPeak_${tag} = 0.0;`],
    helpers: [
      `double RiskPercentPerTrade()
{
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   if(eq > _zxDsPeak_${tag}) _zxDsPeak_${tag} = eq;
   if(_zxDsPeak_${tag} <= 0) return InpDsBase_${tag};
   double ddPct = (_zxDsPeak_${tag} - eq) / _zxDsPeak_${tag} * 100.0;
   if(ddPct < InpDsDd_${tag}) return InpDsBase_${tag};
   // Halve for each DD threshold exceeded, floored.
   double factor = MathPow(0.5, MathFloor(ddPct / InpDsDd_${tag}));
   double r = InpDsBase_${tag} * factor;
   return MathMax(r, InpDsFloor_${tag});
}`,
    ],
    summaryFragments: [`DD-scaled risk`],
  };
};

// ── risk.equityCurveStop (pause when equity curve declines)
export const translate_risk_equityCurveStop: Translator = (node) => {
  const tag = sid(node.id);
  return {
    inputs: [
      { name: `InpEcMa_${tag}`, type: "int", defaultExpr: "10", label: "Equity MA bars" },
    ],
    globals: [`double _zxEcSamples_${tag}[32]; int _zxEcIdx_${tag} = 0; int _zxEcN_${tag} = 0;`],
    helpers: [
      `void EqSample_${tag}()
{
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   _zxEcSamples_${tag}[_zxEcIdx_${tag}] = eq;
   _zxEcIdx_${tag} = (_zxEcIdx_${tag} + 1) % 32;
   if(_zxEcN_${tag} < 32) _zxEcN_${tag}++;
}
double EqMa_${tag}(int n)
{
   if(_zxEcN_${tag} < n) return AccountInfoDouble(ACCOUNT_EQUITY);
   double s = 0.0;
   for(int i=0;i<n;i++) {
      int idx = (_zxEcIdx_${tag} - 1 - i + 32) % 32;
      s += _zxEcSamples_${tag}[idx];
   }
   return s / n;
}`,
    ],
    gates: [{ expr: `(AccountInfoDouble(ACCOUNT_EQUITY) >= EqMa_${tag}(InpEcMa_${tag}))`, reason: "equity below its MA" }],
    positionManagement: [`EqSample_${tag}();`],
    summaryFragments: [`Equity-curve stop (MA${"${"}p.maBars${"}"})`],
  };
};

// ── risk.kellyFraction (fractional Kelly based on recent wins/losses)
// Simplified: reads last N closed deals, computes expectancy, fraction × equity.
export const translate_risk_kellyFraction: Translator = (node) => {
  const tag = sid(node.id);
  return {
    inputs: [
      { name: `InpKelly_${tag}`, type: "double", defaultExpr: "0.5", label: "Kelly fraction (0.5 = half)" },
      { name: `InpKellyLook_${tag}`, type: "int", defaultExpr: "30", label: "Kelly lookback trades" },
    ],
    helpers: [
      `double RiskPercentPerTrade()
{
   HistorySelect(0, TimeCurrent());
   int total = HistoryDealsTotal();
   if(total < 10) return 1.0;
   int n = MathMin(InpKellyLook_${tag}, total);
   int wins = 0; int losses = 0;
   double sumWin = 0.0; double sumLoss = 0.0;
   for(int i = total - 1; i >= total - n; i--) {
      ulong d = HistoryDealGetTicket(i);
      if(d == 0) continue;
      double p = HistoryDealGetDouble(d, DEAL_PROFIT);
      if(p > 0) { wins++; sumWin += p; }
      else if(p < 0) { losses++; sumLoss -= p; }
   }
   if(wins == 0 || losses == 0) return 1.0;
   double winRate = (double)wins / (wins + losses);
   double avgWin = sumWin / wins;
   double avgLoss = sumLoss / losses;
   if(avgLoss <= 0) return 1.0;
   double payoff = avgWin / avgLoss;
   double kelly = (winRate * payoff - (1.0 - winRate)) / payoff;
   if(kelly < 0) kelly = 0.01;
   return MathMin(5.0, kelly * InpKelly_${tag} * 100.0);
}`,
    ],
    summaryFragments: [`Kelly-fraction risk`],
  };
};

// ── risk.weeklyRiskBudget (cap cumulative risk across week)
export const translate_risk_weeklyRiskBudget: Translator = (node) => {
  const tag = sid(node.id);
  return {
    inputs: [
      { name: `InpWkBud_${tag}`, type: "double", defaultExpr: "5.0", label: "Weekly risk budget (%)" },
    ],
    globals: [
      `double   _zxWkStart_${tag} = 0.0;
int      _zxWkYear_${tag} = 0;
int      _zxWkWeek_${tag} = -1;`,
    ],
    helpers: [
      `int ZxIsoWeek_${tag}()
{
   MqlDateTime t; TimeToStruct(TimeTradeServer(), t);
   // Simple week-of-year (0-based): start of year = week 0.
   int doy = t.day_of_year; return doy / 7;
}
void ZxWkRoll_${tag}()
{
   MqlDateTime t; TimeToStruct(TimeTradeServer(), t);
   int w = ZxIsoWeek_${tag}();
   if(t.year != _zxWkYear_${tag} || w != _zxWkWeek_${tag})
   {
      _zxWkYear_${tag} = t.year;
      _zxWkWeek_${tag} = w;
      _zxWkStart_${tag} = AccountInfoDouble(ACCOUNT_EQUITY);
   }
}`,
    ],
    gates: [{
      expr: `(_zxWkStart_${tag} == 0 || (AccountInfoDouble(ACCOUNT_EQUITY) / _zxWkStart_${tag} - 1.0) * 100.0 > -InpWkBud_${tag})`,
      reason: "weekly risk budget exhausted",
    }],
    positionManagement: [`ZxWkRoll_${tag}();`],
    summaryFragments: [`Weekly risk budget ≤ X%`],
  };
};
