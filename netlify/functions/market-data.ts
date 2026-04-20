import type { Context } from "@netlify/functions";

// ──────────────────────────────────────────────────────────────────
// Zentryx Lab — Market data proxy
// ──────────────────────────────────────────────────────────────────
// Returns historical OHLC bars for a symbol + timeframe. Routes
// different asset classes to different free public APIs so the
// client doesn't have to juggle CORS and provider quirks:
//
//   Crypto (BTCUSD, ETHUSD)    → Binance spot klines (no key, CORS-safe anyway).
//   FX / Metals / Oil          → Yahoo Finance v8 chart API.
//   Indices (US30, NAS, SPX…)  → Yahoo Finance with ^ prefix.
//
// Response shape matches our internal Bar type:
//   { bars: Array<{time:number, open, high, low, close, volume:number}> }
// Times are unix millis, UTC bar-open.
//
// Usage:
//   GET /.netlify/functions/market-data?symbol=EURUSD&timeframe=H1&bars=2000

const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const BINANCE_BASE = "https://api.binance.com/api/v3/klines";

const TF_TO_YAHOO_INTERVAL: Record<string, string> = {
  M1:  "1m",
  M5:  "5m",
  M15: "15m",
  M30: "30m",
  H1:  "60m",
  H4:  "1h", // Yahoo free tier has no 4h — we aggregate (see below).
  D1:  "1d",
  W1:  "1wk",
  MN1: "1mo",
};

const TF_TO_YAHOO_RANGE: Record<string, string> = {
  M1:  "7d",    // intraday minute data capped at 7 days by Yahoo.
  M5:  "60d",
  M15: "60d",
  M30: "60d",
  H1:  "730d",  // ~2 years of hourly.
  H4:  "730d",
  D1:  "max",
  W1:  "max",
  MN1: "max",
};

const TF_TO_BINANCE_INTERVAL: Record<string, string> = {
  M1:  "1m",
  M5:  "5m",
  M15: "15m",
  M30: "30m",
  H1:  "1h",
  H4:  "4h",
  D1:  "1d",
  W1:  "1w",
  MN1: "1M",
};

const YAHOO_SYMBOL_MAP: Record<string, string> = {
  // FX majors + crosses — append "=X" for Yahoo.
  EURUSD: "EURUSD=X",
  GBPUSD: "GBPUSD=X",
  USDJPY: "USDJPY=X",
  USDCHF: "USDCHF=X",
  USDCAD: "USDCAD=X",
  AUDUSD: "AUDUSD=X",
  NZDUSD: "NZDUSD=X",
  EURGBP: "EURGBP=X",
  EURJPY: "EURJPY=X",
  GBPJPY: "GBPJPY=X",
  EURCHF: "EURCHF=X",
  AUDJPY: "AUDJPY=X",
  // Metals — Yahoo uses the futures continuous contract.
  XAUUSD: "GC=F",
  XAGUSD: "SI=F",
  // Oil
  USOIL:  "CL=F",
  UKOIL:  "BZ=F",
  // Indices — Yahoo "^" notation.
  US30:   "^DJI",
  NAS100: "^NDX",
  SPX500: "^GSPC",
  GER40:  "^GDAXI",
  UK100:  "^FTSE",
  JPN225: "^N225",
};

const CRYPTO_SYMBOLS = new Set(["BTCUSD", "ETHUSD"]);

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": status === 200 ? "public, max-age=300" : "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "GET,OPTIONS",
      ...extraHeaders,
    },
  });
}

interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Aggregate an ordered bar array into a higher-timeframe series by
 * collapsing every `groupSize` consecutive bars into one bar.
 */
function aggregate(bars: Bar[], groupSize: number): Bar[] {
  if (groupSize <= 1) return bars;
  const out: Bar[] = [];
  for (let i = 0; i < bars.length; i += groupSize) {
    const chunk = bars.slice(i, i + groupSize);
    if (chunk.length === 0) continue;
    const open = chunk[0].open;
    const close = chunk[chunk.length - 1].close;
    let high = -Infinity, low = Infinity, volume = 0;
    for (const b of chunk) {
      if (b.high > high) high = b.high;
      if (b.low < low) low = b.low;
      volume += b.volume;
    }
    out.push({ time: chunk[0].time, open, high, low, close, volume });
  }
  return out;
}

async function fetchYahoo(symbol: string, timeframe: string, maxBars: number): Promise<Bar[]> {
  const yahooSymbol = YAHOO_SYMBOL_MAP[symbol];
  if (!yahooSymbol) throw new Error(`unsupported_symbol:${symbol}`);

  // H4 isn't a native Yahoo interval — fetch H1 and aggregate 4-to-1.
  const aggregateH4 = timeframe === "H4";
  const interval = aggregateH4 ? "60m" : TF_TO_YAHOO_INTERVAL[timeframe];
  const range = TF_TO_YAHOO_RANGE[timeframe];
  if (!interval || !range) throw new Error(`unsupported_timeframe:${timeframe}`);

  const url = `${YAHOO_BASE}/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`;
  const res = await fetch(url, {
    headers: {
      // Yahoo is finicky about the UA — browser-like string works reliably.
      "user-agent": "Mozilla/5.0 (compatible; ZentryxLab/1.0)",
      "accept": "application/json",
    },
  });
  if (!res.ok) throw new Error(`yahoo_http_${res.status}`);
  const body = await res.json() as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: { quote?: Array<{ open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[]; volume?: (number | null)[] }> };
      }>;
      error?: { description?: string };
    };
  };

  const result = body.chart?.result?.[0];
  if (!result) {
    const desc = body.chart?.error?.description ?? "no_data";
    throw new Error(`yahoo:${desc}`);
  }

  const ts = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0];
  if (!q || !ts.length) throw new Error("yahoo_empty_payload");

  const bars: Bar[] = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i];
    // Yahoo sends null entries during non-trading hours — skip them.
    if (o == null || h == null || l == null || c == null) continue;
    bars.push({
      time: ts[i] * 1000,
      open: o,
      high: h,
      low: l,
      close: c,
      volume: q.volume?.[i] ?? 0,
    });
  }

  const final = aggregateH4 ? aggregate(bars, 4) : bars;
  return maxBars > 0 ? final.slice(-maxBars) : final;
}

async function fetchBinance(symbol: string, timeframe: string, maxBars: number): Promise<Bar[]> {
  const interval = TF_TO_BINANCE_INTERVAL[timeframe];
  if (!interval) throw new Error(`unsupported_timeframe:${timeframe}`);

  // BTCUSD → BTCUSDT, ETHUSD → ETHUSDT.
  const pair = symbol.replace(/USD$/, "USDT");
  const limit = Math.min(1000, Math.max(50, maxBars || 1000));
  const url = `${BINANCE_BASE}?symbol=${encodeURIComponent(pair)}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`binance_http_${res.status}`);
  const rows = await res.json() as Array<[number, string, string, string, string, string, ...unknown[]]>;
  if (!Array.isArray(rows)) throw new Error("binance_bad_payload");

  return rows.map((r) => ({
    time: r[0],
    open: parseFloat(r[1]),
    high: parseFloat(r[2]),
    low: parseFloat(r[3]),
    close: parseFloat(r[4]),
    volume: parseFloat(r[5]),
  }));
}

export default async (req: Request, _ctx: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "content-type",
        "access-control-allow-methods": "GET,OPTIONS",
      },
    });
  }
  if (req.method !== "GET") return json({ ok: false, error: "bad_method" }, 405);

  const url = new URL(req.url);
  const symbol = (url.searchParams.get("symbol") ?? "").toUpperCase().trim();
  const timeframe = (url.searchParams.get("timeframe") ?? "H1").toUpperCase().trim();
  const barsParam = parseInt(url.searchParams.get("bars") ?? "2000", 10);
  const maxBars = Math.min(5000, Math.max(50, Number.isFinite(barsParam) ? barsParam : 2000));

  if (!/^[A-Z0-9]{3,12}$/.test(symbol)) return json({ ok: false, error: "bad_symbol" }, 400);

  try {
    let bars: Bar[];
    if (CRYPTO_SYMBOLS.has(symbol)) {
      bars = await fetchBinance(symbol, timeframe, maxBars);
    } else if (symbol in YAHOO_SYMBOL_MAP) {
      bars = await fetchYahoo(symbol, timeframe, maxBars);
    } else {
      return json({ ok: false, error: "unsupported_symbol", symbol }, 400);
    }

    if (bars.length < 50) {
      return json({
        ok: false,
        error: "insufficient_bars",
        got: bars.length,
        hint: "Upstream returned very few bars — try a shorter timeframe or a different symbol.",
      }, 502);
    }

    return json({
      ok: true,
      symbol,
      timeframe,
      source: CRYPTO_SYMBOLS.has(symbol) ? "binance" : "yahoo",
      bars,
    });
  } catch (err) {
    return json({ ok: false, error: "upstream_failed", detail: (err as Error).message }, 502);
  }
};
