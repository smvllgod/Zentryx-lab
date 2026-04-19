// Batch 2 — utility family (6 blocks).

import type { Translator } from "../types";

const sid = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);

// ── utility.maxWeeklyLoss
export const translate_utility_maxWeeklyLoss: Translator = (node) => {
  const p = node.params as { maxLossPercent: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpWkLoss_${tag}`, type: "double", defaultExpr: String(p.maxLossPercent ?? 8), label: "Max weekly loss (%)" }],
    globals: [`double _zxWkLossStart_${tag} = 0.0; int _zxWkLossWeek_${tag} = -1; int _zxWkLossYear_${tag} = 0; bool _zxWkLossLatch_${tag} = false;`],
    helpers: [
      `void ZxWkLossRoll_${tag}()
{
   MqlDateTime t; TimeToStruct(TimeTradeServer(), t);
   int w = t.day_of_year / 7;
   if(t.year != _zxWkLossYear_${tag} || w != _zxWkLossWeek_${tag})
   {
      _zxWkLossYear_${tag} = t.year; _zxWkLossWeek_${tag} = w;
      _zxWkLossStart_${tag} = AccountInfoDouble(ACCOUNT_EQUITY);
      _zxWkLossLatch_${tag} = false;
   }
}`,
    ],
    gates: [{ expr: `(!_zxWkLossLatch_${tag})`, reason: "weekly max-loss latched" }],
    positionManagement: [
      `ZxWkLossRoll_${tag}();
if(_zxWkLossStart_${tag} > 0 && !_zxWkLossLatch_${tag})
{
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   double pct = (eq / _zxWkLossStart_${tag} - 1.0) * 100.0;
   if(pct <= -InpWkLoss_${tag}) _zxWkLossLatch_${tag} = true;
}`,
    ],
    summaryFragments: [`Weekly max loss ≤ -${p.maxLossPercent}%`],
  };
};

// ── utility.maxConsecutiveLosses
export const translate_utility_maxConsecutiveLosses: Translator = (node) => {
  const p = node.params as { maxLosses: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpMclN_${tag}`, type: "int", defaultExpr: String(p.maxLosses ?? 3), label: "Max consecutive losses" }],
    globals: [`int _zxLossStreak_${tag} = 0;`],
    helpers: [
      `void ZxLossTrack_${tag}()
{
   HistorySelect(TimeCurrent() - 7*24*3600, TimeCurrent());
   int total = HistoryDealsTotal();
   int streak = 0;
   for(int i = total - 1; i >= 0 && streak < 32; i--) {
      ulong d = HistoryDealGetTicket(i);
      if(d == 0) continue;
      if(HistoryDealGetInteger(d, DEAL_MAGIC) != InpMagic) continue;
      if(HistoryDealGetInteger(d, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;
      double p = HistoryDealGetDouble(d, DEAL_PROFIT);
      if(p < 0) streak++; else break;
   }
   _zxLossStreak_${tag} = streak;
}`,
    ],
    gates: [{ expr: `(_zxLossStreak_${tag} < InpMclN_${tag})`, reason: "max consecutive losses hit" }],
    positionManagement: [`ZxLossTrack_${tag}();`],
    summaryFragments: [`Pause after ${p.maxLosses} losses`],
  };
};

// ── utility.maxSpread (global)
export const translate_utility_maxSpread: Translator = (node) => {
  const p = node.params as { maxSpreadPoints: number };
  const sIn = `InpUmSpr_${sid(node.id)}`;
  return {
    inputs: [{ name: sIn, type: "int", defaultExpr: String(p.maxSpreadPoints ?? 40), label: "Global max spread (points)" }],
    gates: [{ expr: `((int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) <= ${sIn})`, reason: "spread above global cap" }],
    summaryFragments: [`Global spread ≤ ${p.maxSpreadPoints}pts`],
  };
};

// ── utility.minBalance
export const translate_utility_minBalance: Translator = (node) => {
  const p = node.params as { floor: number };
  const fIn = `InpMinBal_${sid(node.id)}`;
  return {
    inputs: [{ name: fIn, type: "double", defaultExpr: String(p.floor ?? 100), label: "Balance floor ($)" }],
    gates: [{ expr: `(AccountInfoDouble(ACCOUNT_BALANCE) >= ${fIn})`, reason: "balance below floor" }],
    summaryFragments: [`Balance ≥ $${p.floor}`],
  };
};

// ── utility.cooldownAfterSl
export const translate_utility_cooldownAfterSl: Translator = (node) => {
  const p = node.params as { minutes: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpCdSlM_${tag}`, type: "int", defaultExpr: String(p.minutes ?? 30), label: "SL cooldown (min)" }],
    globals: [`datetime _zxLastSl_${tag} = 0;`],
    helpers: [
      `void CdSlTrack_${tag}()
{
   HistorySelect(TimeCurrent() - 24*3600, TimeCurrent());
   int total = HistoryDealsTotal();
   for(int i = total - 1; i >= 0; i--) {
      ulong d = HistoryDealGetTicket(i);
      if(d == 0) continue;
      if(HistoryDealGetInteger(d, DEAL_MAGIC) != InpMagic) continue;
      if(HistoryDealGetInteger(d, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;
      long reason = HistoryDealGetInteger(d, DEAL_REASON);
      if(reason == DEAL_REASON_SL) {
         _zxLastSl_${tag} = (datetime)HistoryDealGetInteger(d, DEAL_TIME);
         return;
      }
   }
}`,
    ],
    gates: [{ expr: `(_zxLastSl_${tag} == 0 || (TimeCurrent() - _zxLastSl_${tag}) / 60 >= InpCdSlM_${tag})`, reason: "within SL cooldown" }],
    positionManagement: [`CdSlTrack_${tag}();`],
    summaryFragments: [`Cooldown ${p.minutes}m after SL`],
  };
};

// ── utility.cooldownAfterTp
export const translate_utility_cooldownAfterTp: Translator = (node) => {
  const p = node.params as { minutes: number };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpCdTpM_${tag}`, type: "int", defaultExpr: String(p.minutes ?? 15), label: "TP cooldown (min)" }],
    globals: [`datetime _zxLastTp_${tag} = 0;`],
    helpers: [
      `void CdTpTrack_${tag}()
{
   HistorySelect(TimeCurrent() - 24*3600, TimeCurrent());
   int total = HistoryDealsTotal();
   for(int i = total - 1; i >= 0; i--) {
      ulong d = HistoryDealGetTicket(i);
      if(d == 0) continue;
      if(HistoryDealGetInteger(d, DEAL_MAGIC) != InpMagic) continue;
      if(HistoryDealGetInteger(d, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;
      long reason = HistoryDealGetInteger(d, DEAL_REASON);
      if(reason == DEAL_REASON_TP) {
         _zxLastTp_${tag} = (datetime)HistoryDealGetInteger(d, DEAL_TIME);
         return;
      }
   }
}`,
    ],
    gates: [{ expr: `(_zxLastTp_${tag} == 0 || (TimeCurrent() - _zxLastTp_${tag}) / 60 >= InpCdTpM_${tag})`, reason: "within TP cooldown" }],
    positionManagement: [`CdTpTrack_${tag}();`],
    summaryFragments: [`Cooldown ${p.minutes}m after TP`],
  };
};
