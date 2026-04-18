import type { StrategyGraph } from "./types";

// Generate a human-readable, one-paragraph description of the strategy
// for previews, listings, and the builder header.

export function summarizeStrategy(graph: StrategyGraph): string {
  const parts: string[] = [];
  const find = (type: string) => graph.nodes.find((n) => n.type === type);
  const findAll = (type: string) => graph.nodes.filter((n) => n.type === type);

  // Entry
  const ema = find("entry.emaCross");
  if (ema) {
    const p = ema.params as Record<string, unknown>;
    const dir = String(p.direction ?? "both");
    const verb = dir === "long" ? "Buy" : dir === "short" ? "Sell" : "Trade";
    parts.push(
      `${verb} when EMA ${p.fastPeriod} crosses ${dir === "short" ? "below" : "above"} EMA ${p.slowPeriod}`
    );
  }

  const prev = find("entry.previousCandle");
  if (prev) {
    const p = prev.params as Record<string, unknown>;
    parts.push(`enter on previous-candle break (min ${p.minRangePips} pips)`);
  }

  // Filters
  const rsi = find("filter.rsi");
  if (rsi) {
    const p = rsi.params as Record<string, unknown>;
    parts.push(
      `only when RSI(${p.period}) keeps long < ${p.longBelow} or short > ${p.shortAbove}`
    );
  }

  const session = find("filter.session");
  if (session) {
    const p = session.params as Record<string, unknown>;
    parts.push(`during ${p.startHour}:00–${p.endHour}:00 server time`);
  }

  const spread = find("filter.spreadLimit");
  if (spread) {
    const p = spread.params as Record<string, unknown>;
    parts.push(`skip when spread > ${p.maxSpreadPoints} points`);
  }

  // Risk
  const fixedLot = find("risk.fixedLot");
  if (fixedLot) {
    const p = fixedLot.params as Record<string, unknown>;
    parts.push(`use fixed ${p.lots} lots`);
  }
  const riskPct = find("risk.riskPercent");
  if (riskPct) {
    const p = riskPct.params as Record<string, unknown>;
    parts.push(`risk ${p.riskPercent}% of equity per trade`);
  }

  // Exit
  const tp = find("exit.fixedTpSl");
  if (tp) {
    const p = tp.params as Record<string, unknown>;
    parts.push(`take profit ${p.takeProfitPips} pips, stop loss ${p.stopLossPips} pips`);
  }
  const trail = find("exit.trailingStop");
  if (trail) {
    const p = trail.params as Record<string, unknown>;
    parts.push(`trailing stop ${p.trailingPips} pips after ${p.activationPips} pips profit`);
  }
  const be = find("exit.breakEven");
  if (be) {
    const p = be.params as Record<string, unknown>;
    parts.push(`move to break-even after ${p.triggerPips} pips`);
  }

  // Utility
  if (findAll("utility.oneTradeAtTime").length > 0) {
    parts.push("one open position at a time");
  }

  if (parts.length === 0) {
    return "Empty strategy — drag nodes from the left to start.";
  }

  const sym = graph.metadata.symbol ?? "EURUSD";
  const tf = graph.metadata.timeframe ?? "M15";
  return `${sym} ${tf}: ${joinClauses(parts)}.`;
}

function joinClauses(parts: string[]): string {
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}
