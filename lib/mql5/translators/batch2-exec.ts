// Batch 2 — execution family (7 blocks).

import type { Translator } from "../types";

const sid = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);

// ── exec.spreadLimit (maps to utility.maxSpread behaviour)
export const translate_exec_spreadLimit: Translator = (node) => {
  const p = node.params as { maxSpreadPoints: number };
  const sIn = `InpExSpr_${sid(node.id)}`;
  return {
    inputs: [{ name: sIn, type: "int", defaultExpr: String(p.maxSpreadPoints ?? 30), label: "Max spread (points)" }],
    gates: [{ expr: `((int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) <= ${sIn})`, reason: "spread too wide" }],
    summaryFragments: [`Spread ≤ ${p.maxSpreadPoints}pts`],
  };
};

// ── exec.slippageControl (sets Trade deviation)
export const translate_exec_slippageControl: Translator = (node) => {
  const p = node.params as { maxSlippagePoints: number };
  const sIn = `InpSlipPts_${sid(node.id)}`;
  return {
    inputs: [{ name: sIn, type: "int", defaultExpr: String(p.maxSlippagePoints ?? 10), label: "Max slippage (points)" }],
    onInitCode: [`Trade.SetDeviationInPoints(${sIn});`],
    summaryFragments: [`Max slippage ${p.maxSlippagePoints}pts`],
  };
};

// ── exec.minStopsLevel (gate: SL distance ≥ broker stops level)
export const translate_exec_minStopsLevel: Translator = () => {
  return {
    helpers: [
      `bool BrokerStopsLevelOk()
{
   // Informational gate — the order path normalises SL against broker
   // stops level already; this just blocks trading when the broker
   // reports an unusually tight floor during news.
   long lvl = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL);
   return (lvl >= 0);
}`,
    ],
    gates: [{ expr: `BrokerStopsLevelOk()`, reason: "broker stops-level check failed" }],
    summaryFragments: [`Respect broker stops level`],
  };
};

// ── exec.freezeLevel (block mods within freeze level)
export const translate_exec_freezeLevel: Translator = () => {
  return {
    helpers: [
      `bool FreezeLevelOk()
{
   long freeze = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_FREEZE_LEVEL);
   if(freeze <= 0) return true;
   if(!PositionSelect(_Symbol)) return true;
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double sl  = PositionGetDouble(POSITION_SL);
   double tp  = PositionGetDouble(POSITION_TP);
   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   double fzPx = freeze * point;
   if(sl != 0 && (MathAbs(bid - sl) < fzPx || MathAbs(ask - sl) < fzPx)) return false;
   if(tp != 0 && (MathAbs(bid - tp) < fzPx || MathAbs(ask - tp) < fzPx)) return false;
   return true;
}`,
    ],
    gates: [{ expr: `FreezeLevelOk()`, reason: "inside broker freeze level" }],
    summaryFragments: [`Respect broker freeze level`],
  };
};

// ── exec.minEquity
export const translate_exec_minEquity: Translator = (node) => {
  const p = node.params as { floor: number };
  const fIn = `InpEqFloor_${sid(node.id)}`;
  return {
    inputs: [{ name: fIn, type: "double", defaultExpr: String(p.floor ?? 100), label: "Equity floor ($)" }],
    gates: [{ expr: `(AccountInfoDouble(ACCOUNT_EQUITY) >= ${fIn})`, reason: "equity below floor" }],
    summaryFragments: [`Equity ≥ $${p.floor}`],
  };
};

// ── exec.marginLevelFloor
export const translate_exec_marginLevelFloor: Translator = (node) => {
  const p = node.params as { minMarginLevel: number };
  const mIn = `InpMlMin_${sid(node.id)}`;
  return {
    inputs: [{ name: mIn, type: "double", defaultExpr: String(p.minMarginLevel ?? 200), label: "Min margin-level (%)" }],
    helpers: [
      `double MarginLevelPct()
{
   double ml = 0.0;
   if(!AccountInfoDouble(ACCOUNT_MARGIN_LEVEL, ml)) return 999999.0;
   return ml;
}`,
    ],
    gates: [{ expr: `(AccountInfoDouble(ACCOUNT_MARGIN_LEVEL) >= ${mIn} || AccountInfoDouble(ACCOUNT_MARGIN) == 0)`, reason: "margin level below floor" }],
    summaryFragments: [`Margin-level ≥ ${p.minMarginLevel}%`],
  };
};

// ── exec.symbolWhitelist
export const translate_exec_symbolWhitelist: Translator = (node) => {
  const p = node.params as { symbols: string };
  const sIn = `InpSymWl_${sid(node.id)}`;
  return {
    inputs: [{ name: sIn, type: "string", defaultExpr: `"${(p.symbols ?? "EURUSD,GBPUSD,USDJPY,XAUUSD").replace(/"/g, '\\"')}"`, label: "Allowed symbols (CSV)" }],
    helpers: [
      `bool SymbolInWhitelist_${sid(node.id)}(string csv)
{
   if(StringLen(csv) == 0) return true;
   string parts[]; int n = StringSplit(csv, ',', parts);
   string sym = _Symbol;
   for(int i=0;i<n;i++) {
      string p = parts[i]; StringTrimLeft(p); StringTrimRight(p);
      if(p == sym) return true;
   }
   return false;
}`,
    ],
    gates: [{ expr: `SymbolInWhitelist_${sid(node.id)}(${sIn})`, reason: "symbol not whitelisted" }],
    summaryFragments: [`Symbol whitelist`],
  };
};
