// ──────────────────────────────────────────────────────────────────
// Backtest — main runner loop
// ──────────────────────────────────────────────────────────────────
// Iterates over bars, evaluates the strategy each bar, opens/closes
// simulated positions, and records trades + equity points.
//
// Fidelity notes:
// - Single open position at a time (cap = 1). Grid / basket strategies
//   will produce a warning in the result.
// - SL / TP evaluated against intrabar high/low. If both hit on the
//   same bar, we assume SL triggers first (conservative).
// - Trailing stop + break-even updated on bar close.
// - $10 per pip per lot is a broker-independent approximation. It's
//   correct for EURUSD / XAUUSD / GBPUSD / USDJPY at 1 lot.

import type {
  Bar,
  BacktestInput,
  BacktestResult,
  EquityPoint,
  Trade,
  CloseReason,
  TradeSide,
} from "./types";
import { buildEvaluator, type EvalContext } from "./evaluator";
import { pipSizeForSymbol, dollarPerPipPerLot } from "./sample-data";
import { computeMetrics } from "./metrics";

interface OpenPos {
  id: number;
  side: TradeSide;
  openTime: number;
  openPrice: number;
  openBarIdx: number;
  lots: number;
  slPrice: number;
  tpPrice: number;
  initialSlPips: number;
  initialRiskCash: number;
  beMoved: boolean;
  beTriggerPips: number;
  trailDistPips: number;
  trailActivatePips: number;
  timeExitBars: number;
  eodCutoffHour: number;
}

export function runBacktest(input: BacktestInput): BacktestResult {
  const t0 = performance.now();
  const { graph, bars, symbol, timeframe, startingBalance, spreadPoints } = input;
  const pipSize = pipSizeForSymbol(symbol);
  const ppl = dollarPerPipPerLot(symbol); // $ per pip per lot, per-symbol

  const { evaluateBar, diagnostics } = buildEvaluator(graph, bars, symbol);

  const trades: Trade[] = [];
  const equity: EquityPoint[] = [];
  let balance = startingBalance;
  let tradeIdCounter = 0;
  let open: OpenPos | null = null;

  // Context buckets maintained across bars.
  const ctx: EvalContext = {
    bars,
    pipSize,
    balance,
    cache: (null as unknown) as never, // unused here; evaluator owns its cache
    dailyTradesOpened: 0,
    dailyPnl: 0,
    currentDayStart: 0,
    lastSlTime: null,
    consecutiveLosses: 0,
    diagnostics,
    warnedTypes: new Set(),
  };

  // Half-spread in price units (we apply one-side at entry and other at exit).
  const halfSpread = (spreadPoints * pipSize) / 2 / 10; // spreadPoints is in 10ths of pips

  function rollDay(bar: Bar) {
    const d = new Date(bar.time);
    const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    if (dayStart !== ctx.currentDayStart) {
      ctx.currentDayStart = dayStart;
      ctx.dailyTradesOpened = 0;
      ctx.dailyPnl = 0;
    }
  }

  function closePosition(bar: Bar, price: number, reason: CloseReason, exitTime?: number) {
    if (!open) return;
    const priceMoved = open.side === "long" ? price - open.openPrice : open.openPrice - price;
    const pips = priceMoved / pipSize;
    const pnl = pips * ppl * open.lots;
    const rMultiple = open.initialRiskCash > 0 ? pnl / open.initialRiskCash : 0;

    trades.push({
      id: open.id,
      side: open.side,
      openTime: open.openTime,
      openPrice: open.openPrice,
      closeTime: exitTime ?? bar.time,
      closePrice: price,
      lots: open.lots,
      slPrice: open.slPrice,
      tpPrice: open.tpPrice,
      pnl,
      pips,
      reason,
      rMultiple,
    });
    balance += pnl;
    ctx.balance = balance;
    ctx.dailyPnl += pnl;
    if (pnl < 0) {
      ctx.consecutiveLosses++;
      if (reason === "sl") ctx.lastSlTime = bar.time;
    } else {
      ctx.consecutiveLosses = 0;
    }
    open = null;
  }

  const start = input.range?.fromIdx ?? 20;
  const end = input.range?.toIdx ?? bars.length - 1;

  for (let i = start; i <= end; i++) {
    const bar = bars[i];
    rollDay(bar);

    // ── Manage open position ──
    if (open) {
      // Intrabar SL / TP hit check (conservative: SL first).
      if (open.side === "long") {
        if (bar.low <= open.slPrice) { closePosition(bar, open.slPrice, "sl"); }
        else if (open.tpPrice > 0 && bar.high >= open.tpPrice) { closePosition(bar, open.tpPrice, "tp"); }
      } else {
        if (bar.high >= open.slPrice) { closePosition(bar, open.slPrice, "sl"); }
        else if (open.tpPrice > 0 && bar.low <= open.tpPrice) { closePosition(bar, open.tpPrice, "tp"); }
      }
    }

    // Break-even + trailing update on bar close.
    if (open) {
      const closeP = bar.close;
      if (!open.beMoved && open.beTriggerPips > 0) {
        const gainPips = open.side === "long"
          ? (closeP - open.openPrice) / pipSize
          : (open.openPrice - closeP) / pipSize;
        if (gainPips >= open.beTriggerPips) {
          open.slPrice = open.openPrice;
          open.beMoved = true;
        }
      }
      if (open.trailDistPips > 0) {
        const gainPips = open.side === "long"
          ? (closeP - open.openPrice) / pipSize
          : (open.openPrice - closeP) / pipSize;
        if (gainPips >= open.trailActivatePips) {
          if (open.side === "long") {
            const newSl = closeP - open.trailDistPips * pipSize;
            if (newSl > open.slPrice) open.slPrice = newSl;
          } else {
            const newSl = closeP + open.trailDistPips * pipSize;
            if (open.slPrice === 0 || newSl < open.slPrice) open.slPrice = newSl;
          }
        }
      }
      // Time exit.
      if (open.timeExitBars > 0 && i - open.openBarIdx >= open.timeExitBars) {
        closePosition(bar, bar.close, "time-exit");
      }
      // End-of-day exit.
      if (open && open.eodCutoffHour >= 0) {
        const h = new Date(bar.time).getUTCHours();
        if (h >= open.eodCutoffHour) closePosition(bar, bar.close, "eod");
      }
    }

    // ── Evaluate signal and open new pos ──
    if (!open) {
      const sig = evaluateBar(i, ctx);
      if (sig.gatesOk && (sig.wantLong || sig.wantShort) && sig.lots > 0 && sig.slPips > 0) {
        const side: TradeSide = sig.wantLong ? "long" : "short";
        // Execute at next bar open for realism; if no next bar, skip.
        const nextBar = bars[i + 1];
        if (nextBar) {
          const rawOpen = side === "long" ? nextBar.open + halfSpread : nextBar.open - halfSpread;
          const slPrice = side === "long"
            ? rawOpen - sig.slPips * pipSize
            : rawOpen + sig.slPips * pipSize;
          const tpPrice = sig.tpPips > 0
            ? (side === "long"
                ? rawOpen + sig.tpPips * pipSize
                : rawOpen - sig.tpPips * pipSize)
            : 0;
          tradeIdCounter += 1;
          open = {
            id: tradeIdCounter,
            side,
            openTime: nextBar.time,
            openPrice: rawOpen,
            openBarIdx: i + 1,
            lots: sig.lots,
            slPrice,
            tpPrice,
            initialSlPips: sig.slPips,
            initialRiskCash: sig.slPips * ppl * sig.lots,
            beMoved: false,
            beTriggerPips: sig.beTriggerPips,
            trailDistPips: sig.trailDistPips,
            trailActivatePips: sig.trailActivatePips,
            timeExitBars: sig.timeExitBars,
            eodCutoffHour: sig.eodCutoffHour,
          };
          ctx.dailyTradesOpened += 1;
        }
      }
    }

    // Equity point — mark-to-market open position.
    let mtm = balance;
    if (open) {
      const priceNow = bar.close;
      const pips = open.side === "long"
        ? (priceNow - open.openPrice) / pipSize
        : (open.openPrice - priceNow) / pipSize;
      mtm += pips * ppl * open.lots;
    }
    equity.push({ time: bar.time, equity: mtm });
  }

  // Close any remaining open position at the last bar.
  if (open) {
    const lastBar = bars[end];
    closePosition(lastBar, lastBar.close, "end-of-data");
    equity.push({ time: lastBar.time, equity: balance });
  }

  const metrics = computeMetrics(trades, equity, startingBalance);
  const runtimeMs = performance.now() - t0;

  return {
    input: {
      symbol,
      timeframe,
      startingBalance,
      spreadPoints,
      fromTime: bars[start]?.time ?? 0,
      toTime: bars[end]?.time ?? 0,
      barCount: end - start + 1,
    },
    trades,
    equity,
    metrics,
    diagnostics,
    runtimeMs,
  };
}
