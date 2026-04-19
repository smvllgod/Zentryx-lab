// ──────────────────────────────────────────────────────────────────
// Backtest — CSV loader
// ──────────────────────────────────────────────────────────────────
// Accepts a broadly compatible OHLC CSV. We try to be forgiving:
// - Header row detected by a "time"/"date" token in the first line.
// - Columns auto-mapped from headers; fallback to positional mapping.
// - Accepted separators: comma, semicolon, tab.
// - Times in either ISO 8601 ("2024-06-01 12:00"), unix seconds, or
//   unix millis. We also accept the MT5 Strategy Tester export format
//   "yyyy.mm.dd,hh:mm:ss".

import type { Bar } from "./types";

export interface CsvParseResult {
  bars: Bar[];
  warnings: string[];
}

export function parseOhlcCsv(text: string): CsvParseResult {
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { bars: [], warnings: ["empty file"] };

  // Detect separator.
  const sample = lines[0];
  const sep = sample.includes(",") ? "," : sample.includes(";") ? ";" : "\t";

  // Detect header row.
  const firstTokens = sample.split(sep).map((s) => s.trim().toLowerCase());
  const hasHeader =
    firstTokens.some((t) => ["time", "date", "datetime", "timestamp"].includes(t)) ||
    firstTokens.some((t) => ["open", "high", "low", "close"].includes(t));

  let headerMap: Record<string, number> = {};
  let dataStart = 0;
  if (hasHeader) {
    firstTokens.forEach((tok, i) => { headerMap[tok] = i; });
    dataStart = 1;
  } else {
    // Positional: we assume "time, open, high, low, close[, volume]" or MT5's
    // two-column "date,time,o,h,l,c,vol". We'll sniff by token count.
    headerMap = firstTokens.length >= 7
      ? { date: 0, time: 1, open: 2, high: 3, low: 4, close: 5, volume: 6 }
      : { time: 0, open: 1, high: 2, low: 3, close: 4, volume: 5 };
  }

  const bars: Bar[] = [];
  for (let i = dataStart; i < lines.length; i++) {
    const cells = lines[i].split(sep).map((s) => s.trim());
    try {
      const bar = parseRow(cells, headerMap);
      if (bar) bars.push(bar);
    } catch (err) {
      if (warnings.length < 5) {
        warnings.push(`line ${i + 1}: ${(err as Error).message}`);
      }
    }
  }

  bars.sort((a, b) => a.time - b.time);

  // Drop duplicate timestamps (keep last).
  const dedup: Bar[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i > 0 && bars[i].time === bars[i - 1].time) {
      dedup[dedup.length - 1] = bars[i];
    } else {
      dedup.push(bars[i]);
    }
  }

  return { bars: dedup, warnings };
}

function parseRow(cells: string[], map: Record<string, number>): Bar | null {
  const timeIdx = map["time"] ?? map["datetime"] ?? map["timestamp"] ?? -1;
  const dateIdx = map["date"] ?? -1;
  const openIdx = map["open"] ?? -1;
  const highIdx = map["high"] ?? -1;
  const lowIdx = map["low"] ?? -1;
  const closeIdx = map["close"] ?? -1;
  const volIdx = map["volume"] ?? map["vol"] ?? map["tickvol"] ?? -1;

  if (openIdx < 0 || highIdx < 0 || lowIdx < 0 || closeIdx < 0) {
    throw new Error("OHLC columns missing");
  }

  let timeStr: string;
  if (dateIdx >= 0 && timeIdx >= 0 && dateIdx !== timeIdx) {
    timeStr = `${cells[dateIdx]} ${cells[timeIdx]}`;
  } else if (timeIdx >= 0) {
    timeStr = cells[timeIdx];
  } else {
    timeStr = cells[0];
  }

  const time = parseTime(timeStr);
  if (!Number.isFinite(time)) throw new Error("bad timestamp");

  const open = parseFloat(cells[openIdx]);
  const high = parseFloat(cells[highIdx]);
  const low = parseFloat(cells[lowIdx]);
  const close = parseFloat(cells[closeIdx]);
  const volume = volIdx >= 0 ? parseFloat(cells[volIdx]) : 0;

  if (![open, high, low, close].every(Number.isFinite)) throw new Error("bad OHLC");

  return { time, open, high, low, close, volume: Number.isFinite(volume) ? volume : 0 };
}

function parseTime(raw: string): number {
  const t = raw.trim();
  if (!t) return NaN;

  // Unix seconds / millis (all digits).
  if (/^\d+$/.test(t)) {
    const n = parseInt(t, 10);
    return t.length >= 13 ? n : n * 1000;
  }

  // MT5 export: "yyyy.mm.dd hh:mm[:ss]" or "yyyy.mm.dd,hh:mm[:ss]".
  const mt5 = t.match(/^(\d{4})\.(\d{2})\.(\d{2})[ ,T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (mt5) {
    const [, y, mo, d, h, mi, s] = mt5;
    return Date.UTC(+y, +mo - 1, +d, +h, +mi, s ? +s : 0);
  }

  // ISO-ish without timezone: normalise to UTC.
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:Z)?$/);
  if (iso) {
    const [, y, mo, d, h, mi, s] = iso;
    return Date.UTC(+y, +mo - 1, +d, +h, +mi, s ? +s : 0);
  }

  const parsed = Date.parse(t);
  return Number.isFinite(parsed) ? parsed : NaN;
}
