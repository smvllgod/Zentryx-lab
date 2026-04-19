"use client";

import type { EquityPoint } from "@/lib/backtest/types";

/**
 * Minimal SVG equity curve. Handles any N points; auto-scales Y.
 * Highlights the peak + max-drawdown slice.
 */
export function EquityChart({
  points,
  startingBalance,
  height = 260,
}: {
  points: EquityPoint[];
  startingBalance: number;
  height?: number;
}) {
  if (points.length < 2) {
    return (
      <div className="h-[260px] flex items-center justify-center text-sm text-gray-400 border border-gray-100 rounded-xl">
        No equity data.
      </div>
    );
  }

  const width = 960;
  const pad = { top: 16, right: 24, bottom: 28, left: 56 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const minEq = Math.min(startingBalance, ...points.map((p) => p.equity));
  const maxEq = Math.max(startingBalance, ...points.map((p) => p.equity));
  const eqRange = Math.max(1, maxEq - minEq);
  const t0 = points[0].time;
  const t1 = points[points.length - 1].time;
  const tRange = Math.max(1, t1 - t0);

  const xAt = (t: number) => pad.left + ((t - t0) / tRange) * plotW;
  const yAt = (eq: number) => pad.top + plotH - ((eq - minEq) / eqRange) * plotH;

  let d = "";
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    d += `${i === 0 ? "M" : "L"} ${xAt(p.time).toFixed(2)} ${yAt(p.equity).toFixed(2)} `;
  }
  const areaD = `${d} L ${xAt(t1).toFixed(2)} ${(pad.top + plotH).toFixed(2)} L ${xAt(t0).toFixed(2)} ${(pad.top + plotH).toFixed(2)} Z`;

  // Peak + max-DD annotation.
  let peak = points[0].equity;
  let peakIdx = 0;
  let troughIdx = 0;
  let maxDd = 0;
  let runningPeak = points[0].equity;
  let runningPeakIdx = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].equity > runningPeak) {
      runningPeak = points[i].equity;
      runningPeakIdx = i;
    }
    const dd = runningPeak - points[i].equity;
    if (dd > maxDd) {
      maxDd = dd;
      peak = runningPeak;
      peakIdx = runningPeakIdx;
      troughIdx = i;
    }
  }

  // Y-axis ticks (4 evenly spaced).
  const ticks = [0, 1, 2, 3, 4].map((i) => {
    const v = minEq + (i / 4) * eqRange;
    return { v, y: yAt(v) };
  });

  const finalEquity = points[points.length - 1].equity;
  const profitable = finalEquity >= startingBalance;
  const lineColor = profitable ? "#10b981" : "#ef4444";

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[640px]">
        {/* Grid */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={t.y}
              y2={t.y}
              stroke="#f3f4f6"
              strokeWidth={1}
            />
            <text x={pad.left - 8} y={t.y + 3} textAnchor="end" fontSize={10} fill="#9ca3af">
              ${t.v.toFixed(0)}
            </text>
          </g>
        ))}

        {/* Starting balance line */}
        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={yAt(startingBalance)}
          y2={yAt(startingBalance)}
          stroke="#d1d5db"
          strokeDasharray="3 3"
          strokeWidth={1}
        />

        {/* Max-DD shaded region */}
        {maxDd > 0 && (
          <rect
            x={xAt(points[peakIdx].time)}
            y={pad.top}
            width={xAt(points[troughIdx].time) - xAt(points[peakIdx].time)}
            height={plotH}
            fill="#ef4444"
            opacity={0.06}
          />
        )}

        {/* Area */}
        <path d={areaD} fill={lineColor} opacity={0.12} />

        {/* Line */}
        <path d={d} fill="none" stroke={lineColor} strokeWidth={2} />

        {/* Endpoint */}
        <circle
          cx={xAt(points[points.length - 1].time)}
          cy={yAt(points[points.length - 1].equity)}
          r={4}
          fill={lineColor}
        />

        {/* X-axis labels (start / mid / end) */}
        {[0, 0.5, 1].map((f, i) => {
          const t = t0 + f * tRange;
          const label = new Date(t).toISOString().slice(0, 10);
          return (
            <text
              key={i}
              x={pad.left + f * plotW}
              y={height - 10}
              textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
              fontSize={10}
              fill="#9ca3af"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
