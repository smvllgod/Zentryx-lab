import type { Trade, EquityPoint, BacktestMetrics } from "./types";

export function computeMetrics(
  trades: Trade[],
  equity: EquityPoint[],
  startingBalance: number,
): BacktestMetrics {
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const breakEvenTrades = trades.filter((t) => t.pnl === 0);

  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const netProfit = grossProfit - grossLoss;

  const winRate = totalTrades > 0 ? wins.length / totalTrades : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  const expectancyPerTrade = totalTrades > 0 ? netProfit / totalTrades : 0;
  const averageWin = wins.length > 0 ? grossProfit / wins.length : 0;
  const averageLoss = losses.length > 0 ? grossLoss / losses.length : 0;
  const largestWin = wins.reduce((m, t) => Math.max(m, t.pnl), 0);
  const largestLoss = losses.reduce((m, t) => Math.max(m, Math.abs(t.pnl)), 0);

  // Max drawdown on equity curve.
  let peak = startingBalance;
  let maxDdAbs = 0;
  let maxDdPct = 0;
  for (const p of equity) {
    if (p.equity > peak) peak = p.equity;
    const dd = peak - p.equity;
    if (dd > maxDdAbs) maxDdAbs = dd;
    const ddPct = peak > 0 ? (dd / peak) * 100 : 0;
    if (ddPct > maxDdPct) maxDdPct = ddPct;
  }

  // Sharpe (daily-proxied via per-trade returns; crude but MT5-comparable).
  let sharpe = 0;
  if (trades.length > 1) {
    const returns = trades.map((t) => t.pnl / startingBalance);
    const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
    const variance = returns.reduce((s, v) => s + (v - mean) ** 2, 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    sharpe = stdDev > 0 ? (mean / stdDev) * Math.sqrt(returns.length) : 0;
  }

  const recoveryFactor = maxDdAbs > 0 ? netProfit / maxDdAbs : netProfit > 0 ? Infinity : 0;

  // Streaks.
  let curW = 0, curL = 0, maxW = 0, maxL = 0;
  for (const t of trades) {
    if (t.pnl > 0) { curW++; curL = 0; if (curW > maxW) maxW = curW; }
    else if (t.pnl < 0) { curL++; curW = 0; if (curL > maxL) maxL = curL; }
    else { curW = 0; curL = 0; }
  }

  // Avg duration (in bars, proxied via time delta / chosen timeframe).
  let avgDur = 0;
  if (trades.length > 0) {
    const totalMs = trades.reduce((s, t) => s + (t.closeTime - t.openTime), 0);
    avgDur = totalMs / trades.length;
  }

  // R-expectancy: mean of R multiples.
  const rExpectancy = trades.length > 0
    ? trades.reduce((s, t) => s + t.rMultiple, 0) / trades.length
    : 0;

  const endingEquity = equity.length > 0 ? equity[equity.length - 1].equity : startingBalance;

  return {
    netProfit,
    grossProfit,
    grossLoss,
    totalTrades,
    wins: wins.length,
    losses: losses.length,
    breakEven: breakEvenTrades.length,
    winRate,
    profitFactor,
    expectancyPerTrade,
    averageWin,
    averageLoss,
    largestWin,
    largestLoss,
    maxDrawdownAbs: maxDdAbs,
    maxDrawdownPct: maxDdPct,
    recoveryFactor,
    sharpeRatio: sharpe,
    maxConsecutiveWins: maxW,
    maxConsecutiveLosses: maxL,
    averageTradeDurationBars: avgDur, // in ms here; UI converts to bars
    rExpectancy,
    endingEquity,
    startingBalance,
  };
}
