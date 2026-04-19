// ──────────────────────────────────────────────────────────────────
// Backtest — types
// ──────────────────────────────────────────────────────────────────
// All types live here so the runner, evaluator, UI and metrics all
// agree on the shapes. Times are unix millis.

import type { StrategyGraph, Timeframe } from "@/lib/strategies/types";

export interface Bar {
  /** UTC bar-open time (ms). */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  /** Tick volume (approx). Not used by most blocks. */
  volume: number;
}

export interface BacktestInput {
  graph: StrategyGraph;
  /** Symbol shown in UI. Used to look up pip size and contract size. */
  symbol: string;
  timeframe: Timeframe;
  bars: Bar[];
  startingBalance: number;
  /** Broker spread in points (10ths of a pip on 5-digit brokers). */
  spreadPoints: number;
  /** Optional: limit the simulation to a sub-range of `bars`. */
  range?: { fromIdx: number; toIdx: number };
}

export type TradeSide = "long" | "short";
export type CloseReason = "tp" | "sl" | "trail" | "time-exit" | "eod" | "eow" | "be-hit" | "manual" | "end-of-data";

export interface Trade {
  id: number;
  side: TradeSide;
  openTime: number;
  openPrice: number;
  closeTime: number;
  closePrice: number;
  lots: number;
  /** Initial SL price (after BE updates, this is the *last* SL used). */
  slPrice: number;
  /** Initial TP price (0 = no TP). */
  tpPrice: number;
  /** Final P/L in account currency. */
  pnl: number;
  /** P/L in pips (signed). */
  pips: number;
  /** What caused the close. */
  reason: CloseReason;
  /** R multiple: pnl / initial risk. */
  rMultiple: number;
}

export interface EquityPoint {
  time: number;
  equity: number;
}

export interface BacktestMetrics {
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  totalTrades: number;
  wins: number;
  losses: number;
  breakEven: number;
  winRate: number;
  profitFactor: number;
  expectancyPerTrade: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  maxDrawdownAbs: number;
  maxDrawdownPct: number;
  recoveryFactor: number;
  sharpeRatio: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  averageTradeDurationBars: number;
  /** Ratio of winning R-multiples to losing R-multiples. */
  rExpectancy: number;
  /** Final equity. */
  endingEquity: number;
  startingBalance: number;
}

export interface BacktestResult {
  input: {
    symbol: string;
    timeframe: Timeframe;
    startingBalance: number;
    spreadPoints: number;
    fromTime: number;
    toTime: number;
    barCount: number;
  };
  trades: Trade[];
  equity: EquityPoint[];
  metrics: BacktestMetrics;
  /** Nodes we could not fully simulate — surfaced in UI as warnings. */
  diagnostics: BacktestDiagnostic[];
  /** Wall-clock run time in ms, for UX. */
  runtimeMs: number;
}

export type DiagnosticLevel = "info" | "warning" | "error";

export interface BacktestDiagnostic {
  level: DiagnosticLevel;
  code: string;
  message: string;
  nodeId?: string;
}
