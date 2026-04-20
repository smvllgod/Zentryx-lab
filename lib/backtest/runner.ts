// ──────────────────────────────────────────────────────────────────
// Backtest — main runner loop (multi-position)
// ──────────────────────────────────────────────────────────────────
// Iterates over bars, evaluates the strategy each bar, opens / closes
// simulated positions, applies grid logic + basket caps, records
// trades + equity points.
//
// Fidelity notes:
// - Multi-position support — up to `grid.maxOrders` concurrent legs
//   when a grid block is present; capped at 1 otherwise (unchanged
//   behaviour for single-position strategies).
// - SL / TP evaluated intrabar against high/low. If both hit on the
//   same bar we assume SL first (conservative).
// - Trailing stop + break-even updated per position on bar close.
// - Basket caps (TP / SL in $ or %, emergency DD from peak) flatten
//   every open leg at once when hit.
// - Pip value per symbol — see dollarPerPipPerLot in sample-data.

import type {
  Bar,
  BacktestInput,
  BacktestResult,
  EquityPoint,
  Trade,
  CloseReason,
  TradeSide,
} from "./types";
import { buildEvaluator, type EvalContext, type Signal } from "./evaluator";
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
  const ppl = dollarPerPipPerLot(symbol);

  const { evaluateBar, diagnostics } = buildEvaluator(graph, bars, symbol);

  const trades: Trade[] = [];
  const equity: EquityPoint[] = [];
  let balance = startingBalance;
  let equityPeak = startingBalance;
  let tradeIdCounter = 0;
  const positions: OpenPos[] = [];

  const ctx: EvalContext = {
    bars,
    pipSize,
    balance,
    cache: (null as unknown) as never,
    dailyTradesOpened: 0,
    dailyPnl: 0,
    currentDayStart: 0,
    lastSlTime: null,
    consecutiveLosses: 0,
    diagnostics,
    warnedTypes: new Set(),
  };

  const halfSpread = (spreadPoints * pipSize) / 2 / 10;

  function rollDay(bar: Bar) {
    const d = new Date(bar.time);
    const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    if (dayStart !== ctx.currentDayStart) {
      ctx.currentDayStart = dayStart;
      ctx.dailyTradesOpened = 0;
      ctx.dailyPnl = 0;
    }
  }

  function closeOne(pos: OpenPos, bar: Bar, price: number, reason: CloseReason) {
    const priceMoved = pos.side === "long" ? price - pos.openPrice : pos.openPrice - price;
    const pips = priceMoved / pipSize;
    const pnl = pips * ppl * pos.lots;
    const rMultiple = pos.initialRiskCash > 0 ? pnl / pos.initialRiskCash : 0;

    trades.push({
      id: pos.id,
      side: pos.side,
      openTime: pos.openTime,
      openPrice: pos.openPrice,
      closeTime: bar.time,
      closePrice: price,
      lots: pos.lots,
      slPrice: pos.slPrice,
      tpPrice: pos.tpPrice,
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
    } else if (pnl > 0) {
      ctx.consecutiveLosses = 0;
    }
  }

  function floatingPnl(priceNow: number): number {
    let fp = 0;
    for (const pos of positions) {
      const pips = pos.side === "long"
        ? (priceNow - pos.openPrice) / pipSize
        : (pos.openPrice - priceNow) / pipSize;
      fp += pips * ppl * pos.lots;
    }
    return fp;
  }

  function flattenAll(bar: Bar, price: number, reason: CloseReason) {
    for (const pos of positions) closeOne(pos, bar, price, reason);
    positions.length = 0;
  }

  const start = input.range?.fromIdx ?? 20;
  const end = input.range?.toIdx ?? bars.length - 1;

  for (let i = start; i <= end; i++) {
    const bar = bars[i];
    rollDay(bar);

    // ── 1. Manage each open position (SL / TP intrabar) ──
    for (let p = positions.length - 1; p >= 0; p--) {
      const pos = positions[p];
      let hit: { price: number; reason: CloseReason } | null = null;
      if (pos.side === "long") {
        if (bar.low <= pos.slPrice) hit = { price: pos.slPrice, reason: "sl" };
        else if (pos.tpPrice > 0 && bar.high >= pos.tpPrice) hit = { price: pos.tpPrice, reason: "tp" };
      } else {
        if (bar.high >= pos.slPrice) hit = { price: pos.slPrice, reason: "sl" };
        else if (pos.tpPrice > 0 && bar.low <= pos.tpPrice) hit = { price: pos.tpPrice, reason: "tp" };
      }
      if (hit) {
        closeOne(pos, bar, hit.price, hit.reason);
        positions.splice(p, 1);
      }
    }

    // ── 2. Break-even + trailing + time/EOD exit per position ──
    for (let p = positions.length - 1; p >= 0; p--) {
      const pos = positions[p];
      const closeP = bar.close;

      if (!pos.beMoved && pos.beTriggerPips > 0) {
        const gainPips = pos.side === "long"
          ? (closeP - pos.openPrice) / pipSize
          : (pos.openPrice - closeP) / pipSize;
        if (gainPips >= pos.beTriggerPips) {
          pos.slPrice = pos.openPrice;
          pos.beMoved = true;
        }
      }
      if (pos.trailDistPips > 0) {
        const gainPips = pos.side === "long"
          ? (closeP - pos.openPrice) / pipSize
          : (pos.openPrice - closeP) / pipSize;
        if (gainPips >= pos.trailActivatePips) {
          if (pos.side === "long") {
            const newSl = closeP - pos.trailDistPips * pipSize;
            if (newSl > pos.slPrice) pos.slPrice = newSl;
          } else {
            const newSl = closeP + pos.trailDistPips * pipSize;
            if (pos.slPrice === 0 || newSl < pos.slPrice) pos.slPrice = newSl;
          }
        }
      }
      if (pos.timeExitBars > 0 && i - pos.openBarIdx >= pos.timeExitBars) {
        closeOne(pos, bar, bar.close, "time-exit");
        positions.splice(p, 1);
        continue;
      }
      if (pos.eodCutoffHour >= 0) {
        const h = new Date(bar.time).getUTCHours();
        if (h >= pos.eodCutoffHour) {
          closeOne(pos, bar, bar.close, "eod");
          positions.splice(p, 1);
        }
      }
    }

    // ── 3. Evaluate signal for this bar ──
    // Update ctx balance to include open floating P/L so equity-pct
    // gates (daily loss, emergency DD) react intrabar.
    const floating = floatingPnl(bar.close);
    ctx.balance = balance + floating;
    const mtm = balance + floating;
    if (mtm > equityPeak) equityPeak = mtm;

    const sig = evaluateBar(i, ctx);

    // ── 4. Basket caps (TP / SL / emergency DD) ──
    if (positions.length > 0 && sig.basket) {
      const b = sig.basket;
      let basketHit: CloseReason | null = null;
      if (b.tpCash && floating >= b.tpCash) basketHit = "manual";
      if (!basketHit && b.slCash && floating <= -b.slCash) basketHit = "manual";
      if (!basketHit && b.tpPct && balance > 0 && (floating / balance) * 100 >= b.tpPct) basketHit = "manual";
      if (!basketHit && b.slPct && balance > 0 && (floating / balance) * 100 <= -b.slPct) basketHit = "manual";
      if (!basketHit && b.emergencyDdPct && equityPeak > 0) {
        const ddPct = (equityPeak - mtm) / equityPeak * 100;
        if (ddPct >= b.emergencyDdPct) basketHit = "manual";
      }
      if (basketHit) {
        flattenAll(bar, bar.close, basketHit);
      }
    }

    // ── 5. Grid add-on (before new-signal entries) ──
    if (positions.length > 0 && sig.grid && sig.grid.spacingPips > 0) {
      const g = sig.grid;
      if (positions.length < g.maxOrders) {
        // Worst-priced open position of the same side as the first one.
        const side = positions[0].side;
        const worst = positions.reduce((w, pos) =>
          pos.side !== side ? w
          : side === "long"
            ? (pos.openPrice < w ? pos.openPrice : w)
            : (pos.openPrice > w ? pos.openPrice : w),
          side === "long" ? Infinity : -Infinity);

        const priceNow = bar.close;
        const dist = (side === "long" ? worst - priceNow : priceNow - worst) / pipSize;

        const add = g.direction === "with"
          ? (side === "long" ? (priceNow - worst) / pipSize >= g.spacingPips : (worst - priceNow) / pipSize >= g.spacingPips)
          : dist >= g.spacingPips;

        if (add) {
          // Lot sizing: last * multiplier.
          const last = positions[positions.length - 1];
          const newLots = Math.max(0.01, Math.round(last.lots * g.lotMultiplier * 100) / 100);
          const nextBar = bars[i + 1];
          if (nextBar) {
            const rawOpen = side === "long" ? nextBar.open + halfSpread : nextBar.open - halfSpread;
            const slPrice = side === "long"
              ? rawOpen - last.initialSlPips * pipSize
              : rawOpen + last.initialSlPips * pipSize;
            tradeIdCounter += 1;
            positions.push({
              id: tradeIdCounter,
              side,
              openTime: nextBar.time,
              openPrice: rawOpen,
              openBarIdx: i + 1,
              lots: newLots,
              slPrice,
              tpPrice: 0, // grid legs typically rely on basket TP
              initialSlPips: last.initialSlPips,
              initialRiskCash: last.initialSlPips * ppl * newLots,
              beMoved: false,
              beTriggerPips: 0,
              trailDistPips: 0,
              trailActivatePips: 0,
              timeExitBars: 0,
              eodCutoffHour: -1,
            });
          }
        }
      }
    }

    // ── 6. New entry (only if no positions OR grid accepts concurrent new entries) ──
    // By default, a strategy with no grid config is single-position:
    // we only open a new trade when `positions.length === 0`.
    // With a grid config, the grid add-on above handles additional legs —
    // we still require the signal to re-fire to open a fresh initial leg.
    if (positions.length === 0 && sig.gatesOk && (sig.wantLong || sig.wantShort) && sig.lots > 0 && sig.slPips > 0) {
      const side: TradeSide = sig.wantLong ? "long" : "short";
      const nextBar = bars[i + 1];
      if (nextBar) {
        const rawOpen = side === "long" ? nextBar.open + halfSpread : nextBar.open - halfSpread;
        const slPrice = side === "long"
          ? rawOpen - sig.slPips * pipSize
          : rawOpen + sig.slPips * pipSize;
        const tpPrice = sig.tpPips > 0
          ? (side === "long" ? rawOpen + sig.tpPips * pipSize : rawOpen - sig.tpPips * pipSize)
          : 0;
        tradeIdCounter += 1;
        positions.push({
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
        });
        ctx.dailyTradesOpened += 1;
      }
    }

    // ── 7. Equity point mark-to-market ──
    const finalFloating = floatingPnl(bar.close);
    const mtm2 = balance + finalFloating;
    if (mtm2 > equityPeak) equityPeak = mtm2;
    equity.push({ time: bar.time, equity: mtm2 });
  }

  // Close any remaining positions at the last bar.
  if (positions.length > 0) {
    const lastBar = bars[end];
    flattenAll(lastBar, lastBar.close, "end-of-data");
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
    // Return the active slice so the UI can render a chart of exactly
    // what the engine saw. Cap at 5000 to keep the payload reasonable.
    bars: bars.slice(start, Math.min(end + 1, start + 5000)),
  };
}

// Keep a public re-export of Signal so other modules can type the evaluator return.
export type { Signal } from "./evaluator";
