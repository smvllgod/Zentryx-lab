// ──────────────────────────────────────────────────────────────────
// Backtest — per-bar strategy evaluator
// ──────────────────────────────────────────────────────────────────
// Re-implements a large subset of our MQL5 translators as pure JS that
// runs over `Bar[]`. For each bar we compute:
//   - whether entry conditions fire (long / short)
//   - gate conditions (session, spread, daily cap, etc.)
//   - the lot size and initial SL/TP
//   - whether break-even / trailing stops should update an open pos
//
// Node types we don't implement in V1 get logged as diagnostics and
// skipped silently — they don't block the run.

import type { Bar, BacktestDiagnostic } from "./types";
import type { StrategyGraph, StrategyNode, NodeType } from "@/lib/strategies/types";
import { pipSizeForSymbol, dollarPerPipPerLot } from "./sample-data";

// ── indicator caches ───────────────────────────────────────────────
// All indicators are computed lazily and memoised per run.

interface IndicatorCache {
  ema: Map<string, number[]>;
  sma: Map<string, number[]>;
  rsi: Map<number, number[]>;
  atr: Map<number, number[]>;
  adx: Map<number, { adx: number[]; plusDi: number[]; minusDi: number[] }>;
  macd: Map<string, { main: number[]; signal: number[] }>;
  stoch: Map<string, number[]>;
  cci: Map<number, number[]>;
  bb: Map<string, { mid: number[]; up: number[]; lo: number[] }>;
  willR: Map<number, number[]>;
}

function makeCache(): IndicatorCache {
  return {
    ema: new Map(), sma: new Map(), rsi: new Map(), atr: new Map(),
    adx: new Map(), macd: new Map(), stoch: new Map(), cci: new Map(),
    bb: new Map(), willR: new Map(),
  };
}

function ema(bars: Bar[], period: number): number[] {
  const out = new Array(bars.length).fill(0);
  const k = 2 / (period + 1);
  out[0] = bars[0].close;
  for (let i = 1; i < bars.length; i++) {
    out[i] = bars[i].close * k + out[i - 1] * (1 - k);
  }
  return out;
}
function sma(bars: Bar[], period: number): number[] {
  const out = new Array(bars.length).fill(0);
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    sum += bars[i].close;
    if (i >= period) sum -= bars[i - period].close;
    out[i] = i >= period - 1 ? sum / period : bars[i].close;
  }
  return out;
}
function rsi(bars: Bar[], period: number): number[] {
  const out = new Array(bars.length).fill(50);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i < bars.length; i++) {
    const delta = bars[i].close - bars[i - 1].close;
    const gain = Math.max(0, delta);
    const loss = Math.max(0, -delta);
    if (i <= period) {
      avgGain += gain;
      avgLoss += loss;
      if (i === period) {
        avgGain /= period; avgLoss /= period;
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    if (i >= period) {
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      out[i] = 100 - 100 / (1 + rs);
    }
  }
  return out;
}
function atr(bars: Bar[], period: number): number[] {
  const out = new Array(bars.length).fill(0);
  const trs: number[] = [];
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const tr = i === 0 ? b.high - b.low : Math.max(b.high - b.low, Math.abs(b.high - bars[i - 1].close), Math.abs(b.low - bars[i - 1].close));
    trs.push(tr);
    if (i < period) out[i] = trs.slice(0, i + 1).reduce((s, x) => s + x, 0) / (i + 1);
    else out[i] = (out[i - 1] * (period - 1) + tr) / period;
  }
  return out;
}
function adx(bars: Bar[], period: number): { adx: number[]; plusDi: number[]; minusDi: number[] } {
  const len = bars.length;
  const plusDm = new Array(len).fill(0);
  const minusDm = new Array(len).fill(0);
  const tr = new Array(len).fill(0);
  for (let i = 1; i < len; i++) {
    const upMove = bars[i].high - bars[i - 1].high;
    const downMove = bars[i - 1].low - bars[i].low;
    plusDm[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDm[i] = downMove > upMove && downMove > 0 ? downMove : 0;
    tr[i] = Math.max(bars[i].high - bars[i].low, Math.abs(bars[i].high - bars[i - 1].close), Math.abs(bars[i].low - bars[i - 1].close));
  }
  const smPlus = new Array(len).fill(0);
  const smMinus = new Array(len).fill(0);
  const smTr = new Array(len).fill(0);
  for (let i = 1; i < len; i++) {
    if (i <= period) {
      smPlus[i] = smPlus[i - 1] + plusDm[i];
      smMinus[i] = smMinus[i - 1] + minusDm[i];
      smTr[i] = smTr[i - 1] + tr[i];
    } else {
      smPlus[i] = smPlus[i - 1] - smPlus[i - 1] / period + plusDm[i];
      smMinus[i] = smMinus[i - 1] - smMinus[i - 1] / period + minusDm[i];
      smTr[i] = smTr[i - 1] - smTr[i - 1] / period + tr[i];
    }
  }
  const plusDi = smPlus.map((v, i) => (smTr[i] === 0 ? 0 : (v / smTr[i]) * 100));
  const minusDi = smMinus.map((v, i) => (smTr[i] === 0 ? 0 : (v / smTr[i]) * 100));
  const dx = plusDi.map((p, i) => {
    const sum = p + minusDi[i];
    return sum === 0 ? 0 : (Math.abs(p - minusDi[i]) / sum) * 100;
  });
  const adxArr = new Array(len).fill(0);
  for (let i = period; i < len; i++) {
    if (i === period) {
      let s = 0; for (let j = 1; j <= period; j++) s += dx[j];
      adxArr[i] = s / period;
    } else {
      adxArr[i] = (adxArr[i - 1] * (period - 1) + dx[i]) / period;
    }
  }
  return { adx: adxArr, plusDi, minusDi };
}
function macd(bars: Bar[], fast: number, slow: number, signal: number): { main: number[]; signal: number[] } {
  const ef = ema(bars, fast);
  const es = ema(bars, slow);
  const main = ef.map((v, i) => v - es[i]);
  const sig = new Array(bars.length).fill(0);
  const k = 2 / (signal + 1);
  sig[0] = main[0];
  for (let i = 1; i < bars.length; i++) sig[i] = main[i] * k + sig[i - 1] * (1 - k);
  return { main, signal: sig };
}
function stochK(bars: Bar[], period: number): number[] {
  const out = new Array(bars.length).fill(50);
  for (let i = period - 1; i < bars.length; i++) {
    let hh = -Infinity, ll = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (bars[j].high > hh) hh = bars[j].high;
      if (bars[j].low < ll) ll = bars[j].low;
    }
    const range = hh - ll;
    out[i] = range === 0 ? 50 : ((bars[i].close - ll) / range) * 100;
  }
  return out;
}
function cci(bars: Bar[], period: number): number[] {
  const out = new Array(bars.length).fill(0);
  const tp = bars.map((b) => (b.high + b.low + b.close) / 3);
  for (let i = period - 1; i < bars.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += tp[j];
    const mean = sum / period;
    let md = 0;
    for (let j = i - period + 1; j <= i; j++) md += Math.abs(tp[j] - mean);
    md /= period;
    out[i] = md === 0 ? 0 : (tp[i] - mean) / (0.015 * md);
  }
  return out;
}
function bollinger(bars: Bar[], period: number, dev: number): { mid: number[]; up: number[]; lo: number[] } {
  const mid = sma(bars, period);
  const up = new Array(bars.length).fill(0);
  const lo = new Array(bars.length).fill(0);
  for (let i = period - 1; i < bars.length; i++) {
    let sq = 0;
    for (let j = i - period + 1; j <= i; j++) sq += Math.pow(bars[j].close - mid[i], 2);
    const std = Math.sqrt(sq / period);
    up[i] = mid[i] + dev * std;
    lo[i] = mid[i] - dev * std;
  }
  return { mid, up, lo };
}
function williamsR(bars: Bar[], period: number): number[] {
  const out = new Array(bars.length).fill(-50);
  for (let i = period - 1; i < bars.length; i++) {
    let hh = -Infinity, ll = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (bars[j].high > hh) hh = bars[j].high;
      if (bars[j].low < ll) ll = bars[j].low;
    }
    const range = hh - ll;
    out[i] = range === 0 ? -50 : ((hh - bars[i].close) / range) * -100;
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────
// Cached accessors
// ──────────────────────────────────────────────────────────────────
function getEma(cache: IndicatorCache, bars: Bar[], period: number, source: "close" = "close") {
  const key = `${source}|${period}`;
  const h = cache.ema.get(key);
  if (h) return h;
  const v = ema(bars, period);
  cache.ema.set(key, v);
  return v;
}
function getSma(cache: IndicatorCache, bars: Bar[], period: number) {
  const key = String(period);
  const h = cache.sma.get(key);
  if (h) return h;
  const v = sma(bars, period);
  cache.sma.set(key, v);
  return v;
}
function getRsi(cache: IndicatorCache, bars: Bar[], period: number) {
  const h = cache.rsi.get(period);
  if (h) return h;
  const v = rsi(bars, period);
  cache.rsi.set(period, v);
  return v;
}
function getAtr(cache: IndicatorCache, bars: Bar[], period: number) {
  const h = cache.atr.get(period);
  if (h) return h;
  const v = atr(bars, period);
  cache.atr.set(period, v);
  return v;
}
function getAdx(cache: IndicatorCache, bars: Bar[], period: number) {
  const h = cache.adx.get(period);
  if (h) return h;
  const v = adx(bars, period);
  cache.adx.set(period, v);
  return v;
}
function getMacd(cache: IndicatorCache, bars: Bar[], fast: number, slow: number, signal: number) {
  const key = `${fast}|${slow}|${signal}`;
  const h = cache.macd.get(key);
  if (h) return h;
  const v = macd(bars, fast, slow, signal);
  cache.macd.set(key, v);
  return v;
}
function getStoch(cache: IndicatorCache, bars: Bar[], period: number) {
  const key = String(period);
  const h = cache.stoch.get(key);
  if (h) return h;
  const v = stochK(bars, period);
  cache.stoch.set(key, v);
  return v;
}
function getCci(cache: IndicatorCache, bars: Bar[], period: number) {
  const h = cache.cci.get(period);
  if (h) return h;
  const v = cci(bars, period);
  cache.cci.set(period, v);
  return v;
}
function getBb(cache: IndicatorCache, bars: Bar[], period: number, dev: number) {
  const key = `${period}|${dev}`;
  const h = cache.bb.get(key);
  if (h) return h;
  const v = bollinger(bars, period, dev);
  cache.bb.set(key, v);
  return v;
}
function getWillR(cache: IndicatorCache, bars: Bar[], period: number) {
  const h = cache.willR.get(period);
  if (h) return h;
  const v = williamsR(bars, period);
  cache.willR.set(period, v);
  return v;
}

// ──────────────────────────────────────────────────────────────────
// Per-bar evaluation
// ──────────────────────────────────────────────────────────────────

export type Dir = "long" | "short" | "both";

export interface GridConfig {
  /** Spacing between grid orders in pips. 0 = no grid. */
  spacingPips: number;
  /** Max simultaneous positions (including the initial one). */
  maxOrders: number;
  /** Lot multiplier applied to each subsequent order (1 = flat, >1 = martingale). */
  lotMultiplier: number;
  /** "against" = classic DD-averaging grid. "with" = anti-grid / pyramid. */
  direction: "against" | "with";
}

export interface BasketConfig {
  /** Close all positions at +$X floating profit. */
  tpCash?: number;
  /** Close all positions at -$X floating loss. */
  slCash?: number;
  /** Close all at +X% of equity. */
  tpPct?: number;
  /** Close all at -X% of equity. */
  slPct?: number;
  /** Flatten everything when equity drops X% from peak. */
  emergencyDdPct?: number;
}

export interface Signal {
  wantLong: boolean;
  wantShort: boolean;
  gatesOk: boolean;
  slPips: number;
  tpPips: number;
  lots: number;
  beTriggerPips: number;
  trailDistPips: number;
  trailActivatePips: number;
  timeExitBars: number;
  eodCutoffHour: number;
  /** Grid config, populated by grid.* blocks. Absent = no grid. */
  grid?: GridConfig;
  /** Basket config, populated by basket.* blocks. Absent = no basket caps. */
  basket?: BasketConfig;
}

export interface EvalContext {
  bars: Bar[];
  pipSize: number;
  balance: number;      // current equity
  cache: IndicatorCache;
  /** Running trade counters used by max-daily-trades + daily-loss blocks. */
  dailyTradesOpened: number;
  dailyPnl: number;
  currentDayStart: number;
  /** Time of last SL hit, for cooldownAfterSl. */
  lastSlTime: number | null;
  /** Consecutive losses counter (for maxConsecutiveLosses). */
  consecutiveLosses: number;
  diagnostics: BacktestDiagnostic[];
  /** Flag set once per node type so we don't log the same warning 1000×. */
  warnedTypes: Set<string>;
}

/** Resolve all nodes by category for quick access. */
function indexGraph(graph: StrategyGraph) {
  const by: Record<string, StrategyNode[]> = {
    entry: [], filter: [], session: [], news: [], risk: [], lot: [], management: [], exit: [], utility: [], grid: [],
  };
  for (const n of graph.nodes) (by[n.category] ??= []).push(n);
  return by;
}

type Supported =
  | "entry" | "trend" | "confirm" | "momentum" | "vol" | "session" | "exec" | "mtf" | "candle" | "struct"
  | "news" | "risk" | "lot" | "exit" | "manage" | "utility" | "grid" | "basket" | "filter";
function nodeFamily(type: NodeType): Supported | null {
  const prefix = type.split(".")[0];
  return prefix as Supported;
}

/**
 * Build a reusable evaluator closure for the whole run.
 * The closure captures indicator caches so we compute each indicator once.
 */
export function buildEvaluator(graph: StrategyGraph, bars: Bar[], symbol: string) {
  const cache = makeCache();
  const pipSize = pipSizeForSymbol(symbol);
  const ppl = dollarPerPipPerLot(symbol);
  const byCat = indexGraph(graph);
  const diagnostics: BacktestDiagnostic[] = [];
  const warnedTypes = new Set<string>();

  // Per-run state for entry.randomPosition. The node is one-shot per
  // EA lifetime (first bar → open → mute), so each simulation reuses
  // the same rolled direction across every bar.
  const randomState = new Map<string, { dir: 0 | 1; fired: boolean }>();

  function warnUnsupported(node: StrategyNode, reason: string) {
    if (warnedTypes.has(node.type)) return;
    warnedTypes.add(node.type);
    diagnostics.push({
      level: "warning",
      code: "unsupported_in_backtest",
      message: `${node.type} — ${reason}`,
      nodeId: node.id,
    });
  }

  /** Evaluate per-bar. Returns a Signal. */
  function evaluateBar(i: number, ctx: EvalContext): Signal {
    const bar = bars[i];

    // Default signal. Entries must push true into these.
    let wantLong = false;
    let wantShort = false;
    let gatesOk = true;
    let slPips = 0;
    let tpPips = 0;
    let lots = 0;
    let beTriggerPips = 0;
    let trailDistPips = 0;
    let trailActivatePips = 0;
    let timeExitBars = 0;
    let eodCutoffHour = -1;

    // Risk percent (used by lot.fromRisk) — read from risk.* node.
    let riskPct = 1;
    let riskCashFixed = 0;
    let fixedLots = 0;
    let lotFromPerBalance = 0;
    let lotPctOfAccount = 0;
    let lotMode: "fromRisk" | "fixed" | "perBalance" | "pctAccount" = "fromRisk";
    let atrSlPips = 0; // used by risk.atrRisk to define SL

    // ── Entries ────────────────────────────────────────────────
    for (const n of byCat.entry ?? []) {
      const fam = nodeFamily(n.type);
      if (fam !== "entry") continue;
      const p = n.params as Record<string, unknown>;
      const dir = (p.direction as Dir) ?? "both";
      let fireL = false, fireS = false;
      switch (n.type) {
        case "entry.emaCross": {
          const fast = (p.fastPeriod as number) ?? 20;
          const slow = (p.slowPeriod as number) ?? 50;
          const ef = getEma(cache, bars, fast);
          const es = getEma(cache, bars, slow);
          if (i > 1) {
            fireL = ef[i - 1] > es[i - 1] && ef[i - 2] <= es[i - 2];
            fireS = ef[i - 1] < es[i - 1] && ef[i - 2] >= es[i - 2];
          }
          break;
        }
        case "entry.smaCross": {
          const fast = (p.fastPeriod as number) ?? 20;
          const slow = (p.slowPeriod as number) ?? 50;
          const sf = getSma(cache, bars, fast);
          const ss = getSma(cache, bars, slow);
          if (i > 1) {
            fireL = sf[i - 1] > ss[i - 1] && sf[i - 2] <= ss[i - 2];
            fireS = sf[i - 1] < ss[i - 1] && sf[i - 2] >= ss[i - 2];
          }
          break;
        }
        case "entry.macdCross": {
          const f = (p.fastPeriod as number) ?? 12;
          const s = (p.slowPeriod as number) ?? 26;
          const sg = (p.signalPeriod as number) ?? 9;
          const m = getMacd(cache, bars, f, s, sg);
          if (i > 1) {
            fireL = m.main[i - 1] > m.signal[i - 1] && m.main[i - 2] <= m.signal[i - 2];
            fireS = m.main[i - 1] < m.signal[i - 1] && m.main[i - 2] >= m.signal[i - 2];
          }
          break;
        }
        case "entry.macdZeroCross": {
          const f = (p.fastPeriod as number) ?? 12;
          const s = (p.slowPeriod as number) ?? 26;
          const m = getMacd(cache, bars, f, s, 9);
          if (i > 1) {
            fireL = m.main[i - 1] > 0 && m.main[i - 2] <= 0;
            fireS = m.main[i - 1] < 0 && m.main[i - 2] >= 0;
          }
          break;
        }
        case "entry.rsiCross": {
          const per = (p.period as number) ?? 14;
          const r = getRsi(cache, bars, per);
          if (i > 1) {
            fireL = r[i - 1] > 50 && r[i - 2] <= 50;
            fireS = r[i - 1] < 50 && r[i - 2] >= 50;
          }
          break;
        }
        case "entry.rsiExtreme": {
          const per = (p.period as number) ?? 14;
          const ob = (p.overbought as number) ?? 70;
          const os = (p.oversold as number) ?? 30;
          const r = getRsi(cache, bars, per);
          if (i > 1) {
            fireL = r[i - 1] > os && r[i - 2] <= os;
            fireS = r[i - 1] < ob && r[i - 2] >= ob;
          }
          break;
        }
        case "entry.stochCross": {
          const kp = (p.kPeriod as number) ?? 14;
          const k = getStoch(cache, bars, kp);
          if (i > 1) {
            fireL = k[i - 1] > 20 && k[i - 2] <= 20;
            fireS = k[i - 1] < 80 && k[i - 2] >= 80;
          }
          break;
        }
        case "entry.donchianBreakout": {
          const per = (p.period as number) ?? 20;
          if (i > per) {
            let hh = -Infinity, ll = Infinity;
            for (let j = i - per; j < i; j++) {
              if (bars[j].high > hh) hh = bars[j].high;
              if (bars[j].low < ll) ll = bars[j].low;
            }
            fireL = bars[i - 1].close > hh;
            fireS = bars[i - 1].close < ll;
          }
          break;
        }
        case "entry.nBarBreakout": {
          const per = (p.period as number) ?? 10;
          if (i > per + 1) {
            let hh = -Infinity, ll = Infinity;
            for (let j = i - per - 1; j < i - 1; j++) {
              if (bars[j].high > hh) hh = bars[j].high;
              if (bars[j].low < ll) ll = bars[j].low;
            }
            fireL = bars[i - 1].close > hh;
            fireS = bars[i - 1].close < ll;
          }
          break;
        }
        case "entry.bollingerBreak": {
          const per = (p.period as number) ?? 20;
          const dev = (p.deviation as number) ?? 2;
          const bb = getBb(cache, bars, per, dev);
          if (i > 1) {
            fireL = bars[i - 1].close > bb.up[i - 1];
            fireS = bars[i - 1].close < bb.lo[i - 1];
          }
          break;
        }
        case "entry.atrBreakout": {
          const ap = (p.atrPeriod as number) ?? 14;
          const mul = (p.multiplier as number) ?? 1.0;
          const a = getAtr(cache, bars, ap);
          if (i > 1) {
            fireL = bars[i - 1].close > bars[i - 1].open + mul * a[i - 1];
            fireS = bars[i - 1].close < bars[i - 1].open - mul * a[i - 1];
          }
          break;
        }
        case "entry.previousCandle": {
          if (i > 1) {
            fireL = bars[i - 1].close > bars[i - 2].high;
            fireS = bars[i - 1].close < bars[i - 2].low;
          }
          break;
        }
        case "entry.candleOpen": {
          // Bullish-candle → long, bearish-candle → short, on the
          // first tick of the new bar. i=0 skipped (no prev bar).
          if (i >= 1) {
            const prev = bars[i - 1];
            const body = Math.abs(prev.close - prev.open);
            const minBody = ((p.minBodyPips as number) ?? 0) * pipSize;
            if (body >= minBody) {
              fireL = prev.close > prev.open;
              fireS = prev.close < prev.open;
            }
          }
          break;
        }
        case "entry.randomPosition": {
          // One-shot: roll on first evaluation, cache, and stop firing
          // once the trade has been dispatched (runner flips fired when
          // it sees wantLong/Short translate into an open).
          const mode = (p.mode as string) ?? "random";
          let state = randomState.get(n.id);
          if (!state) {
            // Deterministic seed based on node id so the same backtest
            // rerun produces the same direction — essential for
            // comparable strategy metrics.
            const dir: 0 | 1 =
              mode === "long" ? 0
              : mode === "short" ? 1
              : (hashString(n.id) & 1) as 0 | 1;
            state = { dir, fired: false };
            randomState.set(n.id, state);
          }
          if (!state.fired) {
            fireL = state.dir === 0;
            fireS = state.dir === 1;
            // Optimistically mark fired — if the trade doesn't actually
            // open (e.g. insufficient margin), we still don't want to
            // keep re-attempting every bar. Matches the MQL5 helper's
            // behaviour.
            state.fired = true;
          }
          break;
        }
        default:
          warnUnsupported(n, "entry not simulated — strategy may not produce trades");
      }
      if (dir === "long") fireS = false;
      if (dir === "short") fireL = false;
      if (fireL) wantLong = true;
      if (fireS) wantShort = true;
    }

    // ── Filters (confirmation / trend / momentum / vol / mtf / candle / exec) ──
    for (const n of byCat.filter ?? []) {
      const fam = nodeFamily(n.type);
      const p = n.params as Record<string, unknown>;
      let keepL = true, keepS = true;
      switch (n.type) {
        case "confirm.priceAboveMa": {
          const per = (p.period as number) ?? 50;
          const mode = (p.maType as string) ?? "ema";
          const ma = mode === "sma" ? getSma(cache, bars, per) : getEma(cache, bars, per);
          keepL = bars[i - 1]?.close > ma[i - 1];
          keepS = bars[i - 1]?.close < ma[i - 1];
          break;
        }
        case "confirm.macdSide": {
          const m = getMacd(cache, bars, (p.fastPeriod as number) ?? 12, (p.slowPeriod as number) ?? 26, (p.signalPeriod as number) ?? 9);
          const h = m.main[i - 1] - m.signal[i - 1];
          keepL = h >= 0; keepS = h <= 0;
          break;
        }
        case "confirm.rsiSide": {
          const per = (p.period as number) ?? 14;
          const la = (p.longAbove as number) ?? 50;
          const sb = (p.shortBelow as number) ?? 50;
          const r = getRsi(cache, bars, per);
          keepL = r[i - 1] > la; keepS = r[i - 1] < sb;
          break;
        }
        case "confirm.emaAlignment": {
          const ef = getEma(cache, bars, (p.fastPeriod as number) ?? 20);
          const em = getEma(cache, bars, (p.midPeriod as number) ?? 50);
          const es = getEma(cache, bars, (p.slowPeriod as number) ?? 200);
          keepL = ef[i - 1] > em[i - 1] && em[i - 1] > es[i - 1];
          keepS = ef[i - 1] < em[i - 1] && em[i - 1] < es[i - 1];
          break;
        }
        case "confirm.barColor": {
          const off = (p.candleOffset as number) ?? 1;
          if (i >= off) {
            keepL = bars[i - off].close > bars[i - off].open;
            keepS = bars[i - off].close < bars[i - off].open;
          }
          break;
        }
        case "trend.adxStrength": {
          const per = (p.period as number) ?? 14;
          const min = (p.minAdx as number) ?? 20;
          const a = getAdx(cache, bars, per);
          const ok = a.adx[i - 1] >= min;
          keepL = keepS = ok;
          break;
        }
        case "trend.adxNonTrend": {
          const per = (p.period as number) ?? 14;
          const max = (p.maxAdx as number) ?? 20;
          const a = getAdx(cache, bars, per);
          const ok = a.adx[i - 1] <= max;
          keepL = keepS = ok;
          break;
        }
        case "trend.emaSlope":
        case "filter.emaSlope": {
          const per = (p.period as number) ?? 50;
          const lb = (p.lookback as number) ?? 5;
          const e = getEma(cache, bars, per);
          keepL = i - 1 - lb > 0 && e[i - 1] > e[i - 1 - lb];
          keepS = i - 1 - lb > 0 && e[i - 1] < e[i - 1 - lb];
          break;
        }
        case "trend.smaDirection": {
          const per = (p.period as number) ?? 100;
          const lb = (p.lookback as number) ?? 5;
          const s = getSma(cache, bars, per);
          keepL = i - 1 - lb > 0 && s[i - 1] > s[i - 1 - lb];
          keepS = i - 1 - lb > 0 && s[i - 1] < s[i - 1 - lb];
          break;
        }
        case "momentum.rsiBand":
        case "filter.rsiBand": {
          const per = (p.period as number) ?? 14;
          const mn = (p.minRsi as number) ?? 30;
          const mx = (p.maxRsi as number) ?? 70;
          const r = getRsi(cache, bars, per);
          const ok = r[i - 1] >= mn && r[i - 1] <= mx;
          keepL = keepS = ok;
          break;
        }
        case "momentum.stochBand": {
          const k = getStoch(cache, bars, (p.kPeriod as number) ?? 14);
          const mn = (p.minK as number) ?? 20;
          const mx = (p.maxK as number) ?? 80;
          const ok = k[i - 1] >= mn && k[i - 1] <= mx;
          keepL = keepS = ok;
          break;
        }
        case "momentum.cciBand": {
          const c = getCci(cache, bars, (p.period as number) ?? 20);
          const mn = (p.minCci as number) ?? -100;
          const mx = (p.maxCci as number) ?? 100;
          const ok = c[i - 1] >= mn && c[i - 1] <= mx;
          keepL = keepS = ok;
          break;
        }
        case "momentum.williamsR": {
          const w = getWillR(cache, bars, (p.period as number) ?? 14);
          const ok = w[i - 1] >= -80 && w[i - 1] <= -20;
          keepL = keepS = ok;
          break;
        }
        case "vol.atrBand":
        case "filter.atr":
        case "filter.atrBand": {
          const per = (p.period as number) ?? 14;
          const a = getAtr(cache, bars, per);
          const pips = a[i - 1] / pipSize;
          const mn = (p.minAtrPips as number) ?? 0;
          const mx = (p.maxAtrPips as number) ?? 10_000;
          const ok = pips >= mn && pips <= mx;
          keepL = keepS = ok;
          break;
        }
        case "vol.atrAboveAverage": {
          const ap = (p.atrPeriod as number) ?? 14;
          const mp = (p.maPeriod as number) ?? 50;
          const a = getAtr(cache, bars, ap);
          let avg = 0, count = 0;
          for (let j = Math.max(0, i - mp); j < i; j++) { avg += a[j]; count++; }
          if (count > 0) avg /= count;
          const ok = a[i - 1] > avg;
          keepL = keepS = ok;
          break;
        }
        case "vol.bbWidth": {
          const per = (p.period as number) ?? 20;
          const dev = (p.deviation as number) ?? 2;
          const th = (p.widthThreshold as number) ?? 0.004;
          const mode = (p.mode as string) ?? "above";
          const bb = getBb(cache, bars, per, dev);
          const mid = bb.mid[i - 1];
          const w = mid === 0 ? 0 : (bb.up[i - 1] - bb.lo[i - 1]) / mid;
          const ok = mode === "below" ? w <= th : w >= th;
          keepL = keepS = ok;
          break;
        }
        // Session filters (alias under filter.*):
        case "filter.session":
        case "filter.londonSession":
        case "session.london":
        case "session.newYork":
        case "session.asia":
        case "session.overlap":
        case "session.customWindow": {
          const hour = new Date(bar.time).getUTCHours();
          let range: [number, number];
          switch (n.type) {
            case "session.london": case "filter.londonSession": range = [7, 16]; break;
            case "session.newYork": range = [12, 21]; break;
            case "session.asia": range = [23, 8]; break;
            case "session.overlap": range = [12, 16]; break;
            default: range = [(p.startHour as number) ?? 7, (p.endHour as number) ?? 19];
          }
          const [sH, eH] = range;
          const ok = sH < eH ? hour >= sH && hour < eH : hour >= sH || hour < eH;
          if (!ok) gatesOk = false;
          break;
        }
        case "session.dayOfWeek":
        case "filter.dayOfWeek": {
          const days = (p.days as string[]) ?? ["mon","tue","wed","thu","fri"];
          const map: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
          const dow = new Date(bar.time).getUTCDay();
          const ok = days.some((d) => map[d] === dow);
          if (!ok) gatesOk = false;
          break;
        }
        case "utility.maxSpread":
        case "exec.spreadLimit":
        case "filter.spreadLimit": {
          // In backtest we don't simulate variable spreads per bar, so we
          // assume the user-supplied fixed spread passes the cap. This is
          // documented as a V1 limitation.
          break;
        }
        case "mtf.dailyBias": {
          // Use yesterday's candle on the current timeframe (approximation
          // — true daily-bar requires a separate D1 data pull which we
          // don't have in V1).
          if (i > 24) {
            const past = bars[i - 24];
            const now = bar;
            const longOk = now.close > past.close;
            keepL = longOk; keepS = !longOk;
          }
          break;
        }
        default:
          warnUnsupported(n, "filter not simulated in V1 — block is ignored during backtest");
      }
      if (!keepL) wantLong = false;
      if (!keepS) wantShort = false;
      void fam;
    }

    // ── Session nodes under the "session" category ──
    for (const n of byCat.session ?? []) {
      const p = n.params as Record<string, unknown>;
      const hour = new Date(bar.time).getUTCHours();
      let range: [number, number] | null = null;
      switch (n.type) {
        case "session.customWindow": range = [(p.startHour as number) ?? 7, (p.endHour as number) ?? 19]; break;
        case "session.london":  range = [7, 16]; break;
        case "session.newYork": range = [12, 21]; break;
        case "session.asia":    range = [23, 8]; break;
        case "session.overlap": range = [12, 16]; break;
        default:
          warnUnsupported(n, "session variant not simulated");
      }
      if (range) {
        const [sH, eH] = range;
        const ok = sH < eH ? hour >= sH && hour < eH : hour >= sH || hour < eH;
        if (!ok) gatesOk = false;
      }
    }

    // ── News / utility gates ──
    for (const n of byCat.utility ?? []) {
      const p = n.params as Record<string, unknown>;
      switch (n.type) {
        case "utility.onlyNewBar": break; // bar-based sim — always true
        case "utility.oneTradeAtTime": break; // enforced in runner
        case "utility.maxOpenPositions": break; // enforced in runner (cap=1)
        case "utility.maxDailyTrades": {
          const cap = (p.maxTrades as number) ?? 5;
          if (ctx.dailyTradesOpened >= cap) gatesOk = false;
          break;
        }
        case "utility.maxDailyLoss":
        case "filter.maxDailyLoss": {
          const cap = (p.maxLossPercent as number) ?? 3;
          const startEq = ctx.balance - ctx.dailyPnl;
          if (startEq > 0 && (ctx.dailyPnl / startEq) * 100 <= -cap) gatesOk = false;
          break;
        }
        case "utility.cooldownAfterSl": {
          const min = (p.minutes as number) ?? 30;
          if (ctx.lastSlTime && bar.time - ctx.lastSlTime < min * 60_000) gatesOk = false;
          break;
        }
        case "utility.maxConsecutiveLosses": {
          const n2 = (p.maxLosses as number) ?? 3;
          if (ctx.consecutiveLosses >= n2) gatesOk = false;
          break;
        }
        case "utility.emergencyStop": {
          const mode = (p.mode as string) ?? "drawdown";
          if (mode === "floor") {
            const floor = (p.equityFloor as number) ?? 0;
            if (ctx.balance <= floor) gatesOk = false;
          }
          // Drawdown tracked outside in runner.
          break;
        }
        default:
          warnUnsupported(n, "utility not simulated in V1");
      }
    }

    // ── Risk → seeds lot-sizing + SL pip distance ──
    for (const n of byCat.risk ?? []) {
      const p = n.params as Record<string, unknown>;
      switch (n.type) {
        case "risk.fixedRisk":
        case "risk.riskPercent":
          riskPct = (p.riskPercent as number) ?? 1;
          break;
        case "risk.atrRisk": {
          riskPct = (p.riskPercent as number) ?? 1;
          const ap = (p.atrPeriod as number) ?? 14;
          // Canonical key per the block registry is `atrMultiplier`; earlier
          // templates set `slMultiplier` — accept both for back-compat with
          // strategies already saved against the old schema.
          const mul = (p.atrMultiplier as number) ?? (p.slMultiplier as number) ?? 1.5;
          const a = getAtr(cache, bars, ap);
          atrSlPips = (a[i - 1] * mul) / pipSize;
          break;
        }
        case "risk.fixedCashRisk":
          riskCashFixed = (p.floor as number) ?? 50;
          break;
        case "risk.fixedLot":
          fixedLots = (p.lots as number) ?? 0.1;
          break;
        default:
          warnUnsupported(n, "risk variant not simulated");
      }
    }

    // ── Lot → pick sizing mode ──
    for (const n of byCat.lot ?? []) {
      const p = n.params as Record<string, unknown>;
      switch (n.type) {
        case "lot.fixed":
          fixedLots = (p.lots as number) ?? 0.1;
          lotMode = "fixed";
          break;
        case "lot.fromRisk":
        case "lot.fromCashRisk":
          lotMode = "fromRisk";
          break;
        case "lot.perBalance":
          lotFromPerBalance = (p.baseLot as number) ?? 0.1;
          lotMode = "perBalance";
          break;
        case "lot.percentOfAccount":
          lotPctOfAccount = (p.percent as number) ?? 2;
          lotMode = "pctAccount";
          break;
        default:
          warnUnsupported(n, "lot variant not simulated — fallback to fixed 0.01");
      }
    }

    // ── Exits → SL/TP + management hints ──
    for (const n of byCat.exit ?? []) {
      const p = n.params as Record<string, unknown>;
      switch (n.type) {
        case "exit.fixedTpSl":
          slPips = (p.stopLossPips as number) ?? slPips;
          tpPips = (p.takeProfitPips as number) ?? tpPips;
          break;
        case "exit.rrBased": {
          const sl = (p.stopLossPips as number) ?? 20;
          const rr = (p.rr as number) ?? 2;
          slPips = sl; tpPips = sl * rr;
          break;
        }
        case "exit.atrBased": {
          const ap = (p.atrPeriod as number) ?? 14;
          const slM = (p.slMultiplier as number) ?? 1.5;
          const tpM = (p.tpMultiplier as number) ?? 3;
          const a = getAtr(cache, bars, ap);
          slPips = (a[i - 1] * slM) / pipSize;
          tpPips = (a[i - 1] * tpM) / pipSize;
          break;
        }
        case "exit.trailingStop":
          trailActivatePips = (p.activationPips as number) ?? 15;
          trailDistPips = (p.trailingPips as number) ?? 10;
          break;
        case "exit.breakEven":
          beTriggerPips = (p.triggerPips as number) ?? 10;
          break;
        case "exit.timeExit": {
          const unit = (p.unit as string) ?? "bars";
          const n2 = (p.n as number) ?? 12;
          if (unit === "bars") timeExitBars = n2;
          break;
        }
        case "exit.endOfDay":
          eodCutoffHour = (p.cutoffHour as number) ?? 22;
          break;
        default:
          warnUnsupported(n, "exit variant not simulated in V1 — may miss TP/SL/management");
      }
    }

    // ── Management overrides ──
    for (const n of byCat.management ?? []) {
      const p = n.params as Record<string, unknown>;
      switch (n.type) {
        case "manage.trailingStop":
          trailActivatePips = (p.activationPips as number) ?? trailActivatePips;
          trailDistPips = (p.trailingPips as number) ?? trailDistPips;
          break;
        case "manage.trailingStopAtr": {
          const ap = (p.period as number) ?? 14;
          const mul = (p.multiplier as number) ?? 2.5;
          const a = getAtr(cache, bars, ap);
          trailActivatePips = Math.max(trailActivatePips, (a[i - 1] * mul) / pipSize);
          trailDistPips = (a[i - 1] * mul) / pipSize;
          break;
        }
        case "manage.breakEven":
          beTriggerPips = (p.triggerPips as number) ?? beTriggerPips;
          break;
        case "manage.breakEvenAtrMulti": {
          const ap = (p.atrPeriod as number) ?? 14;
          const mul = (p.multiplier as number) ?? 1;
          const a = getAtr(cache, bars, ap);
          beTriggerPips = Math.max(beTriggerPips, (a[i - 1] * mul) / pipSize);
          break;
        }
        default:
          warnUnsupported(n, "management variant not simulated");
      }
    }

    // If no exit block set SL, inherit from risk.atrRisk if present.
    if (slPips === 0 && atrSlPips > 0) {
      slPips = atrSlPips;
      if (tpPips === 0) tpPips = atrSlPips * 2;
    }

    // Compute lot size.
    if (slPips > 0) {
      switch (lotMode) {
        case "fromRisk": {
          // pip value is per-symbol — see dollarPerPipPerLot() for the
          // broker-independent approximation.
          const cash = riskCashFixed > 0 ? riskCashFixed : ctx.balance * (riskPct / 100);
          lots = cash / (slPips * ppl);
          break;
        }
        case "fixed":
          lots = fixedLots;
          break;
        case "perBalance":
          lots = lotFromPerBalance * (ctx.balance / 1000);
          break;
        case "pctAccount":
          lots = (ctx.balance * (lotPctOfAccount / 100)) / 100_000;
          break;
      }
    } else {
      lots = fixedLots || 0.01;
    }
    lots = Math.max(0.01, Math.min(10, Math.round(lots * 100) / 100));

    // ── Grid config ───────────────────────────────────────────
    let grid: GridConfig | undefined;
    for (const n of byCat.grid ?? []) {
      const p = n.params as Record<string, unknown>;
      switch (n.type) {
        case "grid.basic":
          grid = {
            spacingPips: (p.stepPips as number) ?? 30,
            maxOrders: (p.maxOrders as number) ?? 5,
            lotMultiplier: (p.lotMultiplier as number) ?? 1,
            direction: "against",
          };
          break;
        case "grid.atrSpaced": {
          const ap = (p.atrPeriod as number) ?? 14;
          const mul = (p.multiplier as number) ?? 1.5;
          const a = getAtr(cache, bars, ap);
          grid = {
            spacingPips: (a[i - 1] * mul) / pipSize,
            maxOrders: (p.maxOrders as number) ?? 5,
            lotMultiplier: 1,
            direction: "against",
          };
          break;
        }
        case "grid.martingaleGrid":
          grid = {
            spacingPips: (p.stepPips as number) ?? 30,
            maxOrders: (p.maxOrders as number) ?? 4,
            lotMultiplier: (p.multiplier as number) ?? 1.5,
            direction: "against",
          };
          break;
        case "grid.antiGrid":
        case "grid.pyramidGrid":
          grid = {
            spacingPips: (p.stepPips as number) ?? 20,
            maxOrders: 5,
            lotMultiplier: 1,
            direction: "with",
          };
          break;
        case "grid.averagingDown":
          grid = {
            spacingPips: (p.stepPips as number) ?? 40,
            maxOrders: 8,
            lotMultiplier: 1,
            direction: "against",
          };
          break;
        default:
          warnUnsupported(n, "grid variant approximated as basic grid");
      }
    }

    // ── Basket config ─────────────────────────────────────────
    let basket: BasketConfig | undefined;
    for (const n of byCat.utility ?? []) {
      // Some basket blocks live under the utility category (basket.*).
      if (!n.type.startsWith("basket.") && !n.type.startsWith("grid.smartClose") && n.type !== "utility.emergencyStop") continue;
      const p = n.params as Record<string, unknown>;
      basket ??= {};
      switch (n.type) {
        case "basket.totalProfitTarget": basket.tpCash = (p.targetDollars as number) ?? 50; break;
        case "basket.totalLossStop":     basket.slCash = (p.lossDollars as number) ?? 100; break;
        case "basket.profitPct":         basket.tpPct  = (p.targetPercent as number) ?? 1; break;
        case "basket.lossPct":           basket.slPct  = (p.lossPercent as number) ?? 2; break;
        case "basket.emergencyBasket":   basket.emergencyDdPct = (p.maxDdPercent as number) ?? 5; break;
        case "grid.smartClose":          basket.tpCash = (p.targetDollars as number) ?? 30; break;
        case "utility.emergencyStop":
          if ((p.mode as string) !== "floor") basket.emergencyDdPct = (p.maxDrawdownPercent as number) ?? 10;
          break;
      }
    }
    // Management category also hosts some basket blocks.
    for (const n of byCat.management ?? []) {
      if (!n.type.startsWith("basket.")) continue;
      const p = n.params as Record<string, unknown>;
      basket ??= {};
      switch (n.type) {
        case "basket.totalProfitTarget": basket.tpCash = (p.targetDollars as number) ?? 50; break;
        case "basket.totalLossStop":     basket.slCash = (p.lossDollars as number) ?? 100; break;
        case "basket.profitPct":         basket.tpPct  = (p.targetPercent as number) ?? 1; break;
        case "basket.lossPct":           basket.slPct  = (p.lossPercent as number) ?? 2; break;
        case "basket.emergencyBasket":   basket.emergencyDdPct = (p.maxDdPercent as number) ?? 5; break;
      }
    }

    return {
      wantLong,
      wantShort,
      gatesOk,
      slPips,
      tpPips,
      lots,
      beTriggerPips,
      trailDistPips,
      trailActivatePips,
      timeExitBars,
      eodCutoffHour,
      grid,
      basket,
    };
  }

  return { evaluateBar, diagnostics, cache };
}

// Tiny deterministic string → int hash (djb2). Used by
// entry.randomPosition to seed its direction from the node id so the
// same backtest rerun always produces the same direction.
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return h >>> 0;
}
