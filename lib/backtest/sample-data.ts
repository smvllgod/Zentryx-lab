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
  // ── FX majors ──
  EURUSD: { basePrice: 1.08,    dailyVolPct: 0.55, meanReversion: 0.15, longTermTrendBps: -0.02 },
  GBPUSD: { basePrice: 1.27,    dailyVolPct: 0.70, meanReversion: 0.10, longTermTrendBps: -0.04 },
  USDJPY: { basePrice: 150.0,   dailyVolPct: 0.60, meanReversion: 0.08, longTermTrendBps: 0.03 },
  USDCHF: { basePrice: 0.88,    dailyVolPct: 0.55, meanReversion: 0.18, longTermTrendBps: 0.00 },
  USDCAD: { basePrice: 1.36,    dailyVolPct: 0.55, meanReversion: 0.15, longTermTrendBps: 0.01 },
  AUDUSD: { basePrice: 0.66,    dailyVolPct: 0.75, meanReversion: 0.10, longTermTrendBps: -0.02 },
  NZDUSD: { basePrice: 0.61,    dailyVolPct: 0.75, meanReversion: 0.10, longTermTrendBps: -0.02 },
  // ── FX crosses ──
  EURGBP: { basePrice: 0.85,    dailyVolPct: 0.45, meanReversion: 0.25, longTermTrendBps: 0.01 },
  EURJPY: { basePrice: 163.0,   dailyVolPct: 0.75, meanReversion: 0.08, longTermTrendBps: 0.02 },
  GBPJPY: { basePrice: 190.0,   dailyVolPct: 0.95, meanReversion: 0.06, longTermTrendBps: 0.03 },
  EURCHF: { basePrice: 0.96,    dailyVolPct: 0.40, meanReversion: 0.30, longTermTrendBps: 0.00 },
  AUDJPY: { basePrice: 100.0,   dailyVolPct: 0.85, meanReversion: 0.07, longTermTrendBps: 0.02 },
  // ── Metals ──
  XAUUSD: { basePrice: 2050.0,  dailyVolPct: 1.20, meanReversion: 0.05, longTermTrendBps: 0.10 },
  XAGUSD: { basePrice: 24.0,    dailyVolPct: 2.00, meanReversion: 0.08, longTermTrendBps: 0.05 },
  // ── Indices (cash CFDs) ──
  US30:   { basePrice: 38000.0, dailyVolPct: 0.80, meanReversion: 0.05, longTermTrendBps: 0.20 },
  NAS100: { basePrice: 18000.0, dailyVolPct: 1.10, meanReversion: 0.05, longTermTrendBps: 0.28 },
  SPX500: { basePrice: 5200.0,  dailyVolPct: 0.85, meanReversion: 0.05, longTermTrendBps: 0.22 },
  GER40:  { basePrice: 18500.0, dailyVolPct: 0.90, meanReversion: 0.06, longTermTrendBps: 0.18 },
  UK100:  { basePrice: 7800.0,  dailyVolPct: 0.70, meanReversion: 0.08, longTermTrendBps: 0.10 },
  JPN225: { basePrice: 39000.0, dailyVolPct: 1.10, meanReversion: 0.05, longTermTrendBps: 0.25 },
  // ── Crypto ──
  BTCUSD: { basePrice: 65000.0, dailyVolPct: 3.50, meanReversion: 0.02, longTermTrendBps: 0.45 },
  ETHUSD: { basePrice: 3500.0,  dailyVolPct: 4.00, meanReversion: 0.03, longTermTrendBps: 0.40 },
  // ── Energy ──
  USOIL:  { basePrice: 78.0,    dailyVolPct: 1.80, meanReversion: 0.08, longTermTrendBps: 0.04 },
  UKOIL:  { basePrice: 82.0,    dailyVolPct: 1.70, meanReversion: 0.08, longTermTrendBps: 0.04 },
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

/** Pip size for a given symbol — broker-independent convention matching our MQL5 helper. */
export function pipSizeForSymbol(symbol: string): number {
  if (symbol.endsWith("JPY")) return 0.01;
  if (symbol.startsWith("XAU")) return 0.1;
  if (symbol.startsWith("XAG")) return 0.01;
  // Indices, crypto, oil — each unit counts as 1 "pip" for sizing purposes.
  if (["US30", "NAS100", "SPX500", "GER40", "UK100", "JPN225", "BTCUSD", "ETHUSD", "USOIL", "UKOIL"].includes(symbol)) return 1.0;
  return 0.0001;
}

/**
 * Approximate $ per pip per lot for the built-in symbols. Used by the
 * backtest runner's lot → P/L calculation. Real broker values vary
 * slightly by quote currency and contract size; we favour the common
 * MT5 defaults on 1.00 lot.
 */
export function dollarPerPipPerLot(symbol: string): number {
  if (symbol.endsWith("USD") && symbol.length === 6)                return 10;   // EURUSD, GBPUSD, etc.
  if (symbol.startsWith("USD") && symbol.length === 6)              return 10;   // USDJPY, USDCHF, etc. (approx at price ~1)
  if (symbol === "EURGBP" || symbol === "EURCHF")                   return 13;
  if (symbol === "EURJPY" || symbol === "GBPJPY" || symbol === "AUDJPY") return 10;
  if (symbol === "XAUUSD") return 10;
  if (symbol === "XAGUSD") return 50;
  // Indices: $1 per 1 point move on 1 lot (CFD convention).
  if (["US30", "NAS100", "SPX500", "GER40", "UK100", "JPN225"].includes(symbol)) return 1;
  // Crypto: 1 lot = 1 unit, so $1 per $1 move.
  if (symbol === "BTCUSD" || symbol === "ETHUSD") return 1;
  // Oil: $10 per $1 move on 1.00 lot (100 barrels).
  if (symbol === "USOIL" || symbol === "UKOIL") return 10;
  return 10;
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

/** Symbols with a bundled synthetic profile — rendered in the picker. */
export const BUILTIN_SYMBOLS = Object.keys(PROFILES);

/** Symbol groupings surfaced in the UI. */
export const SYMBOL_GROUPS: { label: string; symbols: string[] }[] = [
  { label: "FX majors",   symbols: ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "USDCAD", "AUDUSD", "NZDUSD"] },
  { label: "FX crosses",  symbols: ["EURGBP", "EURJPY", "GBPJPY", "EURCHF", "AUDJPY"] },
  { label: "Metals",      symbols: ["XAUUSD", "XAGUSD"] },
  { label: "Indices",     symbols: ["US30", "NAS100", "SPX500", "GER40", "UK100", "JPN225"] },
  { label: "Crypto",      symbols: ["BTCUSD", "ETHUSD"] },
  { label: "Energy",      symbols: ["USOIL", "UKOIL"] },
];

/** Timeframes exposed in the picker (M1 and MN1 excluded — noisy/slow). */
export const BUILTIN_TIMEFRAMES: Timeframe[] = ["M5", "M15", "M30", "H1", "H4", "D1", "W1"];
