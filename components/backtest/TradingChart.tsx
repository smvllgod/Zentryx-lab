"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  createSeriesMarkers,
  LineStyle,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import type { Bar, Trade } from "@/lib/backtest/types";

/**
 * MT5-style trading chart — candlesticks + trade entry/exit markers +
 * active-position SL/TP horizontal lines. Built on lightweight-charts
 * (30KB, TradingView OSS). Theme, grid, and price-axis tuned to match
 * the rest of the app.
 */
export function TradingChart({
  bars,
  trades,
  height = 420,
}: {
  bars: Bar[];
  trades: Trade[];
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || bars.length === 0) return;

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#6b7280",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "#f3f4f6", style: LineStyle.Dotted },
        horzLines: { color: "#f3f4f6", style: LineStyle.Dotted },
      },
      rightPriceScale: {
        borderColor: "#e5e7eb",
      },
      timeScale: {
        borderColor: "#e5e7eb",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { mode: 1 },
      handleScroll: true,
      handleScale: true,
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
      priceFormat: { type: "price", precision: 5, minMove: 0.00001 },
    });

    // lightweight-charts wants ascending + unique UTC timestamps.
    const candleData = bars.map((b) => ({
      time: Math.floor(b.time / 1000) as UTCTimestamp,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));
    candleSeries.setData(candleData);

    // ── Markers — one entry + one exit per trade ──
    const markers: SeriesMarker<Time>[] = [];
    for (const t of trades) {
      markers.push({
        time: Math.floor(t.openTime / 1000) as UTCTimestamp,
        position: t.side === "long" ? "belowBar" : "aboveBar",
        color: t.side === "long" ? "#10b981" : "#ef4444",
        shape: t.side === "long" ? "arrowUp" : "arrowDown",
        text: t.side === "long" ? "BUY" : "SELL",
      });
      markers.push({
        time: Math.floor(t.closeTime / 1000) as UTCTimestamp,
        position: t.side === "long" ? "aboveBar" : "belowBar",
        color: t.pnl >= 0 ? "#10b981" : "#ef4444",
        shape: "circle",
        text: `${t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(0)}`,
      });
    }
    // Sort + dedupe by time (multi-entry bars get stacked markers).
    markers.sort((a, b) => (a.time as number) - (b.time as number));
    createSeriesMarkers(candleSeries, markers);

    // ── SL / TP bands — one line series per trade, visible only inside
    // the trade's open window (render as a flat 2-point line from open→close).
    for (const t of trades) {
      if (t.slPrice > 0) {
        const slSeries = chart.addSeries(LineSeries, {
          color: "rgba(239,68,68,0.45)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        slSeries.setData([
          { time: Math.floor(t.openTime / 1000) as UTCTimestamp, value: t.slPrice },
          { time: Math.floor(t.closeTime / 1000) as UTCTimestamp, value: t.slPrice },
        ]);
      }
      if (t.tpPrice > 0) {
        const tpSeries = chart.addSeries(LineSeries, {
          color: "rgba(16,185,129,0.5)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        tpSeries.setData([
          { time: Math.floor(t.openTime / 1000) as UTCTimestamp, value: t.tpPrice },
          { time: Math.floor(t.closeTime / 1000) as UTCTimestamp, value: t.tpPrice },
        ]);
      }
    }

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [bars, trades, height]);

  if (bars.length === 0) {
    return (
      <div className="h-[420px] flex items-center justify-center text-sm text-gray-400 border border-gray-100 rounded-xl">
        No bars to chart.
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border border-gray-100 overflow-hidden">
      <div ref={containerRef} style={{ height }} />
      <div className="absolute top-2 left-3 flex items-center gap-3 text-[10px] font-700 text-gray-500 pointer-events-none">
        <LegendDot color="#10b981" label="Buy / Up candle" />
        <LegendDot color="#ef4444" label="Sell / Down candle" />
        <LegendDot color="rgba(239,68,68,0.6)" label="SL" dashed />
        <LegendDot color="rgba(16,185,129,0.65)" label="TP" dashed />
      </div>
    </div>
  );
}

function LegendDot({ color, label, dashed = false }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block"
        style={{
          width: 14,
          height: 2,
          background: dashed ? `repeating-linear-gradient(to right, ${color} 0 4px, transparent 4px 7px)` : color,
        }}
      />
      <span>{label}</span>
    </span>
  );
}

// We still export this for callers that want the native type.
export type { Trade, Bar } from "@/lib/backtest/types";

// lightweight-charts typings use `UTCTimestamp` as branded number.
// Re-exporting so callers can construct their own markers if needed.
export type LCTime = UTCTimestamp;
// Preserve ISeriesApi export for potential future use in custom overlays.
export type LCCandleSeries = ISeriesApi<"Candlestick">;
