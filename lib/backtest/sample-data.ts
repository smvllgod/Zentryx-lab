// ──────────────────────────────────────────────────────────────────
// Backtest — synthetic demo OHLC
// ──────────────────────────────────────────────────────────────────
// Deterministic, realistic-looking OHLC for demo purposes.
// Uses geometric Brownian motion + trending bias + regime shifts so
// the bars look like real FX, without us having to bundle (and license)
// actual broker data.
//
// For real backtests, users should upload their own CSV via the
// BacktestForm — that's the honest path and it's documented in the UI.

import type { Bar } from "./types";
import type { Timeframe } from "@/lib/strategies/types";

// ── profiles per symbol ──
interface SymbolProfile {
  basePrice: number;
  dailyVolPct: number;      // typical 1D move in %
  meanReversion: number;    // 0 = pure random walk, 1 = strong mean revert
  longTermTrendBps: number; // bps per bar drift
}

const PROFILES: Record<string, SymbolProfile> = {
  EURUSD: { basePrice: 1.08,   dailyVolPct: 0.55, meanReversion: 0.15, longTermTrendBps: -0.02 },
  GBPUSD: { basePrice: 1.27,   dailyVolPct: 0.70, meanReversion: 0.10, longTermTrendBps: -0.04 },
  USDJPY: { basePrice: 150.0,  dailyVolPct: 0.60, meanReversion: 0.08, longTermTrendBps: 0.03 },
  XAUUSD: { basePrice: 2050.0, dailyVolPct: 1.20, meanReversion: 0.05, longTermTrendBps: 0.10 },
};

const TF_MS: Record<Timeframe, number> = {
  M1: 60_000, M5: 300_000, M15: 900_000, M30: 1_800_000,
  H1: 3_600_000, H4: 14_400_000, D1: 86_400_000, W1: 604_800_000, MN1: 2_592_000_000,
};

const TF_BARS_PER_DAY: Record<Timeframe, number> = {
  M1: 1440, M5: 288, M15: 96, M30: 48, H1: 24, H4: 6, D1: 1, W1: 1 / 5, MN1: 1 / 22,
};

/** Deterministic PRNG (mulberry32) seeded from a string. */
function seededRng(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let t = h >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller normal sample from a uniform PRNG. */
function randn(rng: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export interface GenerateOpts {
  symbol: string;
  timeframe: Timeframe;
  /** End time (default: last completed bar before now). */
  endTime?: number;
  /** Number of bars to generate. Capped at 20,000 for perf. */
  bars: number;
}

/** Pip size for a given symbol (crude heuristic — matches our MQL5 helper). */
export function pipSizeForSymbol(symbol: string): number {
  if (symbol.endsWith("JPY")) return 0.01;
  if (symbol.startsWith("XAU") || symbol.startsWith("XAG")) return 0.1;
  return 0.0001;
}

export function generateSampleOhlc({ symbol, timeframe, endTime, bars }: GenerateOpts): Bar[] {
  const n = Math.min(Math.max(50, bars), 20_000);
  const profile = PROFILES[symbol] ?? PROFILES.EURUSD;
  const tfMs = TF_MS[timeframe];
  const barsPerDay = TF_BARS_PER_DAY[timeframe];
  // Per-bar vol derived from daily vol.
  const perBarVolPct = profile.dailyVolPct / Math.sqrt(Math.max(1, barsPerDay));

  const end = endTime ?? Math.floor(Date.now() / tfMs) * tfMs;
  const start = end - n * tfMs;

  const rng = seededRng(`${symbol}|${timeframe}|${n}|${Math.floor(start / (86_400_000 * 30))}`);

  const out: Bar[] = [];
  let price = profile.basePrice;
  // Trending regimes: every ~300 bars flip the drift sign with some memory.
  let regimeDrift = profile.longTermTrendBps / 10_000;
  let regimeSwitchCountdown = 150 + Math.floor(rng() * 250);

  for (let i = 0; i < n; i++) {
    const time = start + i * tfMs;
    if (--regimeSwitchCountdown <= 0) {
      regimeDrift = (profile.longTermTrendBps / 10_000) * (rng() > 0.5 ? 1 : -1) * (0.5 + rng());
      regimeSwitchCountdown = 150 + Math.floor(rng() * 250);
    }

    // Mean-reversion pull towards base.
    const deviation = (price - profile.basePrice) / profile.basePrice;
    const mrDrift = -profile.meanReversion * deviation * 0.0005;

    // Per-bar return = drift + vol * N(0,1)
    const eps = randn(rng) * (perBarVolPct / 100);
    const ret = regimeDrift + mrDrift + eps;
    const newClose = price * (1 + ret);

    // Build the OHLC around open (=prev close) and newClose.
    const open = price;
    const close = newClose;
    const bodyHigh = Math.max(open, close);
    const bodyLow = Math.min(open, close);
    const wickSize = Math.abs(eps) * price * (0.3 + rng() * 0.6);
    const high = bodyHigh + wickSize * rng();
    const low = bodyLow - wickSize * rng();
    // Tick volume: higher when move is larger.
    const volume = Math.round(100 + Math.abs(eps) * 100_000 * (0.5 + rng()));

    out.push({ time, open, high, low, close, volume });
    price = close;
  }
  return out;
}

/** Supported built-in symbol/TF pairs for the quick-pick dropdowns. */
export const BUILTIN_SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD"];
export const BUILTIN_TIMEFRAMES: Timeframe[] = ["M15", "M30", "H1", "H4", "D1"];
