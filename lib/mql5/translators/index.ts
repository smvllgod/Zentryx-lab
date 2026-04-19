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
import { translate_utility_emergencyStop } from "./utility-emergencyStop";

// ── Batch 1 (2026-04): high-value promotions ────────────────────────
import { translate_trend_smaDirection } from "./trend-smaDirection";
import { translate_trend_parabolicSar } from "./trend-parabolicSar";
import { translate_confirm_macdSide } from "./confirm-macdSide";
import { translate_confirm_priceAboveMa } from "./confirm-priceAboveMa";
import { translate_confirm_emaAlignment } from "./confirm-emaAlignment";
import { translate_confirm_barColor } from "./confirm-barColor";
import { translate_momentum_stochBand } from "./momentum-stochBand";
import { translate_momentum_cciBand } from "./momentum-cciBand";
import { translate_vol_atrAboveAverage } from "./vol-atrAboveAverage";
import { translate_vol_bbWidth } from "./vol-bbWidth";
import { translate_session_newYork } from "./session-newYork";
import { translate_session_asia } from "./session-asia";
import { translate_session_dayOfWeek } from "./session-dayOfWeek";
import { translate_exec_spreadRatio } from "./exec-spreadRatio";
import { translate_exit_endOfDay } from "./exit-endOfDay";
import { translate_exit_equityTargetExit } from "./exit-equityTargetExit";
import { translate_lot_perBalance } from "./lot-perBalance";
import { translate_lot_percentOfAccount } from "./lot-percentOfAccount";
import { translate_manage_breakEvenAtrMulti } from "./manage-breakEvenAtrMulti";
import { translate_mtf_higherTfRsi } from "./mtf-higherTfRsi";
import { translate_mtf_dailyBias } from "./mtf-dailyBias";

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
  "utility.emergencyStop": translate_utility_emergencyStop,

  // ── Batch 1: newly-live translators ─────────────────────────────
  "trend.smaDirection": translate_trend_smaDirection,
  "trend.parabolicSar": translate_trend_parabolicSar,
  "confirm.macdSide": translate_confirm_macdSide,
  "confirm.priceAboveMa": translate_confirm_priceAboveMa,
  "confirm.emaAlignment": translate_confirm_emaAlignment,
  "confirm.barColor": translate_confirm_barColor,
  "momentum.stochBand": translate_momentum_stochBand,
  "momentum.cciBand": translate_momentum_cciBand,
  "vol.atrAboveAverage": translate_vol_atrAboveAverage,
  "vol.bbWidth": translate_vol_bbWidth,
  "session.newYork": translate_session_newYork,
  "session.asia": translate_session_asia,
  "session.dayOfWeek": translate_session_dayOfWeek,
  "exec.spreadRatio": translate_exec_spreadRatio,
  "exit.endOfDay": translate_exit_endOfDay,
  "exit.equityTargetExit": translate_exit_equityTargetExit,
  "lot.perBalance": translate_lot_perBalance,
  "lot.percentOfAccount": translate_lot_percentOfAccount,
  "manage.breakEvenAtrMulti": translate_manage_breakEvenAtrMulti,
  "mtf.higherTfRsi": translate_mtf_higherTfRsi,
  "mtf.dailyBias": translate_mtf_dailyBias,
};

export function hasTranslator(node: StrategyNode): boolean {
  return Boolean(TRANSLATORS[node.type]);
}
