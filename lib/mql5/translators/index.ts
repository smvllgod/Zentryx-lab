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

// ── Batch 2 (2026-04): remaining 155 blocks ─────────────────────────
import * as B2Mom from "./batch2-momentum";
import * as B2Conf from "./batch2-confirm";
import * as B2Trend from "./batch2-trend";
import * as B2Vol from "./batch2-vol";
import * as B2Sess from "./batch2-session";
import * as B2Mtf from "./batch2-mtf";
import * as B2Exec from "./batch2-exec";
import * as B2Exit from "./batch2-exit";
import * as B2Lot from "./batch2-lot";
import * as B2Risk from "./batch2-risk";
import * as B2Mng from "./batch2-manage";
import * as B2Util from "./batch2-utility";
import * as B2Entry from "./batch2-entry";
import * as B2Candle from "./batch2-candle";
import * as B2Struct from "./batch2-struct";
import * as B2News from "./batch2-news";
import * as B2Grid from "./batch2-grid";
import * as B2Bskt from "./batch2-basket";

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

  // ── Batch 2: remaining 155 blocks ───────────────────────────────
  // momentum
  "momentum.rsiBand": B2Mom.translate_momentum_rsiBand,
  "momentum.macdHist": B2Mom.translate_momentum_macdHist,
  "momentum.rocThreshold": B2Mom.translate_momentum_rocThreshold,
  "momentum.momentumIndex": B2Mom.translate_momentum_momentumIndex,
  "momentum.williamsR": B2Mom.translate_momentum_williamsR,
  "momentum.trix": B2Mom.translate_momentum_trix,
  "momentum.rsiDivergence": B2Mom.translate_momentum_rsiDivergence,
  "momentum.macdDivergence": B2Mom.translate_momentum_macdDivergence,

  // confirmation
  "confirm.rsiSide": B2Conf.translate_confirm_rsiSide,
  "confirm.stochSlope": B2Conf.translate_confirm_stochSlope,
  "confirm.priceVsVwap": B2Conf.translate_confirm_priceVsVwap,
  "confirm.higherHigh": B2Conf.translate_confirm_higherHigh,
  "confirm.atrAboveMa": B2Conf.translate_confirm_atrAboveMa,
  "confirm.tickVolume": B2Conf.translate_confirm_tickVolume,
  "confirm.obvSlope": B2Conf.translate_confirm_obvSlope,
  "confirm.minBarsSinceSignal": B2Conf.translate_confirm_minBarsSinceSignal,

  // trend
  "trend.emaSlope": B2Trend.translate_trend_emaSlope,
  "trend.adxStrength": B2Trend.translate_trend_adxStrength,
  "trend.adxNonTrend": B2Trend.translate_trend_adxNonTrend,
  "trend.higherTfEma": B2Trend.translate_trend_higherTfEma,
  "trend.ichimokuCloudSide": B2Trend.translate_trend_ichimokuCloudSide,
  "trend.hullDirection": B2Trend.translate_trend_hullDirection,
  "trend.supertrend": B2Trend.translate_trend_supertrend,
  "trend.aroon": B2Trend.translate_trend_aroon,
  "trend.dmiDirection": B2Trend.translate_trend_dmiDirection,
  "trend.linearRegression": B2Trend.translate_trend_linearRegression,

  // volatility
  "vol.atrBand": B2Vol.translate_vol_atrBand,
  "vol.atrBelowAverage": B2Vol.translate_vol_atrBelowAverage,
  "vol.keltnerInside": B2Vol.translate_vol_keltnerInside,
  "vol.stdDevThreshold": B2Vol.translate_vol_stdDevThreshold,
  "vol.dailyRange": B2Vol.translate_vol_dailyRange,
  "vol.volatilityRatio": B2Vol.translate_vol_volatilityRatio,
  "vol.gapFilter": B2Vol.translate_vol_gapFilter,
  "vol.weekendCarry": B2Vol.translate_vol_weekendCarry,

  // session
  "session.customWindow": B2Sess.translate_session_customWindow,
  "session.london": B2Sess.translate_session_london,
  "session.overlap": B2Sess.translate_session_overlap,
  "session.monthOfYear": B2Sess.translate_session_monthOfYear,
  "session.holidayCalendar": B2Sess.translate_session_holidayCalendar,

  // mtf
  "mtf.higherTfAlignment": B2Mtf.translate_mtf_higherTfAlignment,
  "mtf.higherTfMacd": B2Mtf.translate_mtf_higherTfMacd,
  "mtf.lowerTfTrigger": B2Mtf.translate_mtf_lowerTfTrigger,
  "mtf.weeklyBias": B2Mtf.translate_mtf_weeklyBias,
  "mtf.htfStructure": B2Mtf.translate_mtf_htfStructure,
  "mtf.htfVolatility": B2Mtf.translate_mtf_htfVolatility,

  // execution
  "exec.spreadLimit": B2Exec.translate_exec_spreadLimit,
  "exec.slippageControl": B2Exec.translate_exec_slippageControl,
  "exec.minStopsLevel": B2Exec.translate_exec_minStopsLevel,
  "exec.freezeLevel": B2Exec.translate_exec_freezeLevel,
  "exec.minEquity": B2Exec.translate_exec_minEquity,
  "exec.marginLevelFloor": B2Exec.translate_exec_marginLevelFloor,
  "exec.symbolWhitelist": B2Exec.translate_exec_symbolWhitelist,

  // exit
  "exit.fixedTpSlPrice": B2Exit.translate_exit_fixedTpSlPrice,
  "exit.timeExit": B2Exit.translate_exit_timeExit,
  "exit.endOfWeek": B2Exit.translate_exit_endOfWeek,
  "exit.oppositeSignal": B2Exit.translate_exit_oppositeSignal,
  "exit.indicatorReversal": B2Exit.translate_exit_indicatorReversal,
  "exit.takeProfitLadder": B2Exit.translate_exit_takeProfitLadder,
  "exit.drawdownExit": B2Exit.translate_exit_drawdownExit,
  "exit.equityDDExit": B2Exit.translate_exit_equityDDExit,
  "exit.ichimokuKijunExit": B2Exit.translate_exit_ichimokuKijunExit,

  // lot
  "lot.fromCashRisk": B2Lot.translate_lot_fromCashRisk,
  "lot.fixedRatio": B2Lot.translate_lot_fixedRatio,
  "lot.antiMartingale": B2Lot.translate_lot_antiMartingale,
  "lot.martingale": B2Lot.translate_lot_martingale,
  "lot.volatilityScaled": B2Lot.translate_lot_volatilityScaled,
  "lot.equityTiered": B2Lot.translate_lot_equityTiered,

  // risk
  "risk.atrRisk": B2Risk.translate_risk_atrRisk,
  "risk.fixedCashRisk": B2Risk.translate_risk_fixedCashRisk,
  "risk.drawdownScale": B2Risk.translate_risk_drawdownScale,
  "risk.equityCurveStop": B2Risk.translate_risk_equityCurveStop,
  "risk.kellyFraction": B2Risk.translate_risk_kellyFraction,
  "risk.weeklyRiskBudget": B2Risk.translate_risk_weeklyRiskBudget,

  // management
  "manage.chandelierTrail": B2Mng.translate_manage_chandelierTrail,
  "manage.percentTrail": B2Mng.translate_manage_percentTrail,
  "manage.stepTrail": B2Mng.translate_manage_stepTrail,
  "manage.partialCloseAtr": B2Mng.translate_manage_partialCloseAtr,
  "manage.pyramiding": B2Mng.translate_manage_pyramiding,
  "manage.antiPyramiding": B2Mng.translate_manage_antiPyramiding,
  "manage.reentryCooldown": B2Mng.translate_manage_reentryCooldown,
  "manage.hedgeAgainstDd": B2Mng.translate_manage_hedgeAgainstDd,
  "manage.convertToBreakEven": B2Mng.translate_manage_convertToBreakEven,

  // utility
  "utility.maxWeeklyLoss": B2Util.translate_utility_maxWeeklyLoss,
  "utility.maxConsecutiveLosses": B2Util.translate_utility_maxConsecutiveLosses,
  "utility.maxSpread": B2Util.translate_utility_maxSpread,
  "utility.minBalance": B2Util.translate_utility_minBalance,
  "utility.cooldownAfterSl": B2Util.translate_utility_cooldownAfterSl,
  "utility.cooldownAfterTp": B2Util.translate_utility_cooldownAfterTp,

  // entry
  "entry.macdZeroCross": B2Entry.translate_entry_macdZeroCross,
  "entry.rsiCross": B2Entry.translate_entry_rsiCross,
  "entry.adxCross": B2Entry.translate_entry_adxCross,
  "entry.ichimokuKijun": B2Entry.translate_entry_ichimokuKijun,
  "entry.bollingerBreak": B2Entry.translate_entry_bollingerBreak,
  "entry.nBarBreakout": B2Entry.translate_entry_nBarBreakout,
  "entry.atrBreakout": B2Entry.translate_entry_atrBreakout,
  "entry.sessionBreakout": B2Entry.translate_entry_sessionBreakout,
  "entry.stochExtreme": B2Entry.translate_entry_stochExtreme,
  "entry.bollingerMeanRev": B2Entry.translate_entry_bollingerMeanRev,
  "entry.supportResistance": B2Entry.translate_entry_supportResistance,
  "entry.trendlineBreak": B2Entry.translate_entry_trendlineBreak,
  "entry.priceActionPinbar": B2Entry.translate_entry_priceActionPinbar,
  "entry.engulfingTrigger": B2Entry.translate_entry_engulfingTrigger,
  "entry.multiSignal": B2Entry.translate_entry_multiSignal,

  // candle patterns
  "candle.pinBar": B2Candle.translate_candle_pinBar,
  "candle.doji": B2Candle.translate_candle_doji,
  "candle.marubozu": B2Candle.translate_candle_marubozu,
  "candle.engulfing": B2Candle.translate_candle_engulfing,
  "candle.harami": B2Candle.translate_candle_harami,
  "candle.insideBar": B2Candle.translate_candle_insideBar,
  "candle.outsideBar": B2Candle.translate_candle_outsideBar,
  "candle.morningStar": B2Candle.translate_candle_morningStar,
  "candle.eveningStar": B2Candle.translate_candle_eveningStar,
  "candle.threeWhiteSoldiers": B2Candle.translate_candle_threeWhiteSoldiers,
  "candle.threeBlackCrows": B2Candle.translate_candle_threeBlackCrows,
  "candle.piercing": B2Candle.translate_candle_piercing,
  "candle.tweezer": B2Candle.translate_candle_tweezer,
  "candle.rangeFilter": B2Candle.translate_candle_rangeFilter,

  // structure
  "struct.swingHigherHigh": B2Struct.translate_struct_swingHigherHigh,
  "struct.swingLowerLow": B2Struct.translate_struct_swingLowerLow,
  "struct.bosBreakOfStructure": B2Struct.translate_struct_bosBreakOfStructure,
  "struct.chochChange": B2Struct.translate_struct_chochChange,
  "struct.fractalFilter": B2Struct.translate_struct_fractalFilter,
  "struct.supportResistance": B2Struct.translate_struct_supportResistance,
  "struct.pivotPoint": B2Struct.translate_struct_pivotPoint,
  "struct.supplyDemandZone": B2Struct.translate_struct_supplyDemandZone,
  "struct.orderBlock": B2Struct.translate_struct_orderBlock,
  "struct.fairValueGap": B2Struct.translate_struct_fairValueGap,
  "struct.roundNumber": B2Struct.translate_struct_roundNumber,
  "struct.priorDayExtreme": B2Struct.translate_struct_priorDayExtreme,

  // news
  "news.pauseAround": B2News.translate_news_pauseAround,
  "news.highImpactOnly": B2News.translate_news_highImpactOnly,
  "news.currencyScope": B2News.translate_news_currencyScope,
  "news.closeBeforeNews": B2News.translate_news_closeBeforeNews,
  "news.dailyMacroBlock": B2News.translate_news_dailyMacroBlock,
  "news.csvFeed": B2News.translate_news_csvFeed,
  "news.sentimentFilter": B2News.translate_news_sentimentFilter,

  // grid
  "grid.basic": B2Grid.translate_grid_basic,
  "grid.atrSpaced": B2Grid.translate_grid_atrSpaced,
  "grid.martingaleGrid": B2Grid.translate_grid_martingaleGrid,
  "grid.antiGrid": B2Grid.translate_grid_antiGrid,
  "grid.pyramidGrid": B2Grid.translate_grid_pyramidGrid,
  "grid.averagingDown": B2Grid.translate_grid_averagingDown,
  "grid.recoveryOnOppositeSig": B2Grid.translate_grid_recoveryOnOppositeSig,
  "grid.hedgeRecovery": B2Grid.translate_grid_hedgeRecovery,
  "grid.smartClose": B2Grid.translate_grid_smartClose,

  // basket
  "basket.totalProfitTarget": B2Bskt.translate_basket_totalProfitTarget,
  "basket.totalLossStop": B2Bskt.translate_basket_totalLossStop,
  "basket.profitPct": B2Bskt.translate_basket_profitPct,
  "basket.lossPct": B2Bskt.translate_basket_lossPct,
  "basket.lockInProfit": B2Bskt.translate_basket_lockInProfit,
  "basket.hedgedClose": B2Bskt.translate_basket_hedgedClose,
  "basket.symbolGroup": B2Bskt.translate_basket_symbolGroup,
  "basket.correlationCap": B2Bskt.translate_basket_correlationCap,
  "basket.magicScope": B2Bskt.translate_basket_magicScope,
  "basket.emergencyBasket": B2Bskt.translate_basket_emergencyBasket,
};

export function hasTranslator(node: StrategyNode): boolean {
  return Boolean(TRANSLATORS[node.type]);
}
