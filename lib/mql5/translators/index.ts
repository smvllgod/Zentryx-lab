import type { NodeType, StrategyNode } from "@/lib/strategies/types";
import type { Translator } from "../types";

import { translate_entry_emaCross } from "./entry-emaCross";
import { translate_entry_smaCross } from "./entry-smaCross";
import { translate_entry_previousCandle } from "./entry-previousCandle";
import { translate_entry_macdCross } from "./entry-macdCross";
import { translate_entry_stochCross } from "./entry-stochCross";
import { translate_entry_rsiExtreme } from "./entry-rsiExtreme";
import { translate_entry_donchianBreakout } from "./entry-donchianBreakout";

import { translate_filter_rsi } from "./filter-rsi";
import { translate_filter_rsiBand } from "./filter-rsiBand";
import { translate_filter_priceAboveMa } from "./filter-priceAboveMa";
import { translate_filter_emaSlope } from "./filter-emaSlope";
import { translate_filter_rocThreshold } from "./filter-rocThreshold";
import { translate_filter_atrBand } from "./filter-atrBand";
import { translate_filter_londonSession } from "./filter-londonSession";
import { translate_filter_session } from "./filter-session";
import { translate_filter_spreadLimit } from "./filter-spreadLimit";
import { translate_filter_atr } from "./filter-atr";
import { translate_filter_maxDailyTrades } from "./filter-maxDailyTrades";
import { translate_filter_maxDailyLoss } from "./filter-maxDailyLoss";

import { translate_risk_fixedLot } from "./risk-fixedLot";
import { translate_risk_riskPercent } from "./risk-riskPercent";
import { translate_risk_fixedRisk } from "./risk-fixedRisk";
import { translate_risk_dailyRiskBudget } from "./risk-dailyRiskBudget";
import { translate_lot_fixed } from "./lot-fixed";
import { translate_lot_fromRisk } from "./lot-fromRisk";

import { translate_exit_fixedTpSl } from "./exit-fixedTpSl";
import { translate_exit_trailingStop } from "./exit-trailingStop";
import { translate_exit_breakEven } from "./exit-breakEven";
import { translate_exit_rrBased } from "./exit-rrBased";
import { translate_exit_atrBased } from "./exit-atrBased";

import { translate_manage_trailingStopAtr } from "./manage-trailingStopAtr";
import { translate_manage_partialClose } from "./manage-partialClose";

import { translate_utility_oneTradeAtTime } from "./utility-oneTradeAtTime";
import { translate_utility_maxOpenPositions } from "./utility-maxOpenPositions";
import { translate_utility_onlyNewBar } from "./utility-onlyNewBar";

// Any node type not present here is treated as a "stub": the compiler
// emits a warning diagnostic and skips code generation for that node,
// but the rest of the strategy still compiles. This lets the library
// carry preview-only nodes without breaking exports.
export const TRANSLATORS: Partial<Record<NodeType, Translator>> = {
  // Entry
  "entry.emaCross": translate_entry_emaCross,
  "entry.smaCross": translate_entry_smaCross,
  "entry.previousCandle": translate_entry_previousCandle,
  "entry.macdCross": translate_entry_macdCross,
  "entry.stochCross": translate_entry_stochCross,
  "entry.rsiExtreme": translate_entry_rsiExtreme,
  "entry.donchianBreakout": translate_entry_donchianBreakout,

  // Filters / confirmations / session / exec / vol
  "filter.rsi": translate_filter_rsi,
  "filter.rsiBand": translate_filter_rsiBand,
  "filter.priceAboveMa": translate_filter_priceAboveMa,
  "filter.emaSlope": translate_filter_emaSlope,
  "filter.rocThreshold": translate_filter_rocThreshold,
  "filter.atrBand": translate_filter_atrBand,
  "filter.londonSession": translate_filter_londonSession,
  "filter.session": translate_filter_session,
  "filter.spreadLimit": translate_filter_spreadLimit,
  "filter.atr": translate_filter_atr,
  "filter.maxDailyTrades": translate_filter_maxDailyTrades,
  "filter.maxDailyLoss": translate_filter_maxDailyLoss,
  // utility.* aliases
  "utility.maxDailyTrades": translate_filter_maxDailyTrades,
  "utility.maxDailyLoss": translate_filter_maxDailyLoss,

  // Risk / lot
  "risk.fixedRisk": translate_risk_fixedRisk,
  "risk.dailyRiskBudget": translate_risk_dailyRiskBudget,
  "risk.fixedLot": translate_risk_fixedLot,        // legacy
  "risk.riskPercent": translate_risk_riskPercent,  // legacy
  "lot.fixed": translate_lot_fixed,
  "lot.fromRisk": translate_lot_fromRisk,

  // Exit / management
  "exit.fixedTpSl": translate_exit_fixedTpSl,
  "exit.rrBased": translate_exit_rrBased,
  "exit.atrBased": translate_exit_atrBased,
  "exit.trailingStop": translate_exit_trailingStop,
  "exit.breakEven": translate_exit_breakEven,
  "manage.trailingStop": translate_exit_trailingStop,
  "manage.breakEven": translate_exit_breakEven,
  "manage.trailingStopAtr": translate_manage_trailingStopAtr,
  "manage.partialClose": translate_manage_partialClose,

  // Utility
  "utility.oneTradeAtTime": translate_utility_oneTradeAtTime,
  "utility.maxOpenPositions": translate_utility_maxOpenPositions,
  "utility.onlyNewBar": translate_utility_onlyNewBar,
};

export function hasTranslator(node: StrategyNode): boolean {
  return Boolean(TRANSLATORS[node.type]);
}
