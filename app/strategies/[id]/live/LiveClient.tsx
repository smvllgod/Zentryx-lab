"use client";

// @ts-nocheck — Supabase v2 generic resolution issue (PostgrestVersion 12).

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Radio, RefreshCw, Copy, Check, Download, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/app/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/context";
import { getStrategy } from "@/lib/strategies/store";
import {
  listTelemetryEvents,
  fetchLiveStats,
  rotateTelemetryToken,
  type TelemetryEvent,
  type LiveStats,
} from "@/lib/telemetry/client";
import { formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * Reads the strategy id from the URL path: `/strategies/<id>/live/`.
 * On static export, Netlify rewrites any real id to the placeholder
 * `/strategies/_/live/index.html`, so the client extracts the real id
 * from `window.location.pathname`.
 */
function idFromPath(): string {
  if (typeof window === "undefined") return "";
  const m = window.location.pathname.match(/\/strategies\/([^/]+)\/live\/?$/);
  return m ? m[1] : "";
}

export default function LiveClient() {
  const [id, setId] = useState<string>("");
  useEffect(() => { setId(idFromPath()); }, []);

  if (!id || id === "_") {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading…</div>;
  }
  return <LiveInner id={id} />;
}

function LiveInner({ id }: { id: string }) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [strategyName, setStrategyName] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const row = await getStrategy(id);
      if (!row) { setLoading(false); return; }
      setStrategyName(row.name);
      setToken((row as unknown as { telemetry_token?: string | null }).telemetry_token ?? null);
      const [evs, s] = await Promise.all([
        listTelemetryEvents(id, 200),
        fetchLiveStats(id),
      ]);
      setEvents(evs);
      setStats(s);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  // Equity curve from telemetry (balance_after when present, else cumulative pnl).
  const equity = useMemo(() => {
    if (events.length === 0) return [] as { time: number; value: number }[];
    const sorted = [...events].sort((a, b) => +new Date(a.close_time) - +new Date(b.close_time));
    const firstBalance = sorted[0].balance_after ?? 10_000;
    const pts: { time: number; value: number }[] = [];
    let cum = firstBalance - sorted[0].pnl_cash;
    for (const e of sorted) {
      cum += e.pnl_cash;
      const value = e.equity_after ?? e.balance_after ?? cum;
      pts.push({ time: +new Date(e.close_time), value });
    }
    return pts;
  }, [events]);

  async function handleCopy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed — grab it manually.");
    }
  }

  async function handleRotate() {
    if (!id) return;
    if (!confirm("Rotating will break any EA copy still running on the old token. Continue?")) return;
    setRotating(true);
    try {
      const newToken = await rotateTelemetryToken(id);
      if (newToken) {
        setToken(newToken);
        toast.success("Token rotated. Re-export your EA to use the new one.");
      } else {
        toast.error("Rotate failed.");
      }
    } finally {
      setRotating(false);
    }
  }

  return (
    <AppShell
      title={strategyName ? `${strategyName} — Live` : "Live telemetry"}
      actions={
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw size={14} /> Refresh
        </Button>
      }
    >
      <a href="/strategies" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mb-4">
        <ArrowLeft size={12} /> Back to strategies
      </a>

      {loading ? (
        <div className="text-sm text-gray-400 text-center py-20">Loading live telemetry…</div>
      ) : !user ? (
        <Card><CardContent><EmptyState icon={<Radio size={18} />} title="Sign in" description="Sign in to see your live telemetry." /></CardContent></Card>
      ) : events.length === 0 ? (
        <EmptyStateBoard token={token} onCopy={handleCopy} copied={copied} onRotate={handleRotate} rotating={rotating} />
      ) : (
        <>
          {/* Top stats band */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatCard label="30-day P/L" value={stats ? fmtUsd(stats.pnl_30d) : "—"} tone={stats && stats.pnl_30d >= 0 ? "good" : "bad"} hint={stats ? `${stats.trades_30d} trades` : ""} />
            <StatCard label="30-day win rate" value={stats ? `${stats.win_rate_30d}%` : "—"} tone={stats && stats.win_rate_30d >= 50 ? "good" : "neutral"} />
            <StatCard label="Lifetime P/L" value={stats ? fmtUsd(stats.pnl_total) : "—"} tone={stats && stats.pnl_total >= 0 ? "good" : "bad"} hint={stats ? `${stats.trades_total} trades total` : ""} />
            <StatCard label="Last trade" value={stats?.last_trade_at ? formatRelative(stats.last_trade_at) : "—"} tone="neutral" />
          </div>

          {/* Equity curve */}
          <Card className="mb-4">
            <CardContent>
              <h3 className="text-sm font-700 text-gray-900 mb-3">Equity curve (live)</h3>
              <EquityTelemetryChart points={equity} />
            </CardContent>
          </Card>

          {/* Token block */}
          <Card className="mb-4">
            <CardContent>
              <TokenBlock token={token} onCopy={handleCopy} copied={copied} onRotate={handleRotate} rotating={rotating} />
            </CardContent>
          </Card>

          {/* Trade list */}
          <Card>
            <CardContent>
              <h3 className="text-sm font-700 text-gray-900 mb-3">Recent trades ({events.length})</h3>
              <TelemetryTable events={events} />
            </CardContent>
          </Card>
        </>
      )}
    </AppShell>
  );
}

function StatCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone: "good" | "bad" | "neutral" }) {
  return (
    <div className={cn(
      "rounded-xl border p-3 bg-white",
      tone === "good" && "border-emerald-200 bg-emerald-50/40",
      tone === "bad" && "border-red-200 bg-red-50/40",
      tone === "neutral" && "border-gray-200",
    )}>
      <div className="text-[10px] font-700 uppercase tracking-widest text-gray-400">{label}</div>
      <div className={cn(
        "mt-1 text-lg font-800 tabular-nums",
        tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-700" : "text-gray-900",
      )}>{value}</div>
      {hint && <div className="text-[10px] text-gray-500 mt-0.5">{hint}</div>}
    </div>
  );
}

function EquityTelemetryChart({ points }: { points: { time: number; value: number }[] }) {
  if (points.length < 2) {
    return <div className="h-[220px] flex items-center justify-center text-xs text-gray-400">Need at least two trades to draw a curve.</div>;
  }
  const width = 960;
  const height = 220;
  const pad = { top: 10, right: 20, bottom: 24, left: 54 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const minV = Math.min(...points.map((p) => p.value));
  const maxV = Math.max(...points.map((p) => p.value));
  const vRange = Math.max(1, maxV - minV);
  const t0 = points[0].time;
  const t1 = points[points.length - 1].time;
  const tRange = Math.max(1, t1 - t0);
  const xAt = (t: number) => pad.left + ((t - t0) / tRange) * plotW;
  const yAt = (v: number) => pad.top + plotH - ((v - minV) / vRange) * plotH;
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(p.time).toFixed(2)} ${yAt(p.value).toFixed(2)}`).join(" ");
  const areaD = `${d} L ${xAt(t1).toFixed(2)} ${(pad.top + plotH).toFixed(2)} L ${xAt(t0).toFixed(2)} ${(pad.top + plotH).toFixed(2)} Z`;
  const final = points[points.length - 1].value;
  const start = points[0].value;
  const color = final >= start ? "#10b981" : "#ef4444";
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[480px]">
      <path d={areaD} fill={color} opacity={0.12} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} />
      {[0, 1, 2, 3, 4].map((i) => {
        const v = minV + (i / 4) * vRange;
        const y = yAt(v);
        return (
          <g key={i}>
            <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#f3f4f6" strokeWidth={1} />
            <text x={pad.left - 6} y={y + 3} textAnchor="end" fontSize={10} fill="#9ca3af">${v.toFixed(0)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function TelemetryTable({ events }: { events: TelemetryEvent[] }) {
  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="text-[10px] font-700 uppercase tracking-widest text-gray-400">
            <th className="text-left px-3 py-2">Closed</th>
            <th className="text-left px-3 py-2">Symbol</th>
            <th className="text-left px-3 py-2">Side</th>
            <th className="text-right px-3 py-2">Lots</th>
            <th className="text-right px-3 py-2">Pips</th>
            <th className="text-right px-3 py-2">P/L</th>
            <th className="text-left px-3 py-2">Reason</th>
            <th className="text-left px-3 py-2">Broker</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className={cn(
              "border-t border-gray-100 tabular-nums",
              e.pnl_cash > 0 && "bg-emerald-50/30",
              e.pnl_cash < 0 && "bg-red-50/30",
            )}>
              <td className="px-3 py-1.5 text-gray-600">{new Date(e.close_time).toISOString().replace("T", " ").slice(0, 16)}</td>
              <td className="px-3 py-1.5">{e.symbol}</td>
              <td className="px-3 py-1.5">
                <span className={cn("inline-flex items-center gap-1", e.side === "long" ? "text-emerald-700" : "text-red-700")}>
                  {e.side === "long" ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {e.side}
                </span>
              </td>
              <td className="px-3 py-1.5 text-right">{e.lots.toFixed(2)}</td>
              <td className="px-3 py-1.5 text-right">{e.pnl_pips != null ? e.pnl_pips.toFixed(1) : "—"}</td>
              <td className={cn("px-3 py-1.5 text-right font-600", e.pnl_cash > 0 ? "text-emerald-700" : e.pnl_cash < 0 ? "text-red-700" : "")}>
                {fmtUsd(e.pnl_cash)}
              </td>
              <td className="px-3 py-1.5 text-gray-500 uppercase text-[10px] tracking-wider">{e.close_reason ?? "—"}</td>
              <td className="px-3 py-1.5 text-gray-500">{e.broker ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TokenBlock({ token, onCopy, copied, onRotate, rotating }: { token: string | null; onCopy: () => void; copied: boolean; onRotate: () => void; rotating: boolean }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-700 text-gray-900 flex items-center gap-2">
            <Radio size={14} className="text-emerald-500" />
            Your telemetry token
          </h3>
          <p className="mt-1 text-xs text-gray-500 max-w-lg">
            Already baked into the MQL5 you export — nothing to configure in MT5 beyond whitelisting the URL.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={onRotate} disabled={rotating}>
          <RefreshCw size={12} /> {rotating ? "Rotating…" : "Rotate"}
        </Button>
      </div>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 flex items-center justify-between gap-2">
        <code className="text-[11px] font-mono text-gray-800 truncate">{token ?? "— none yet —"}</code>
        <Button size="sm" variant="ghost" onClick={onCopy} disabled={!token}>
          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-[11px] text-amber-800 leading-relaxed flex gap-2">
        <AlertTriangle size={12} className="shrink-0 mt-0.5" />
        <div>
          <strong>Whitelist the URL in MT5 once:</strong> Tools → Options → Expert Advisors →
          tick <em>"Allow WebRequest for listed URL"</em> and add the endpoint shown below.
          Otherwise MT5 blocks outbound POSTs and telemetry silently fails.
        </div>
      </div>
    </div>
  );
}

function EmptyStateBoard({ token, onCopy, copied, onRotate, rotating }: { token: string | null; onCopy: () => void; copied: boolean; onRotate: () => void; rotating: boolean }) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-2 text-[10px] font-700 uppercase tracking-widest text-emerald-600">
          <Radio size={12} /> Waiting for trades
        </div>
        <h2 className="mt-1 text-lg font-700 text-gray-900">No live trades reported yet</h2>
        <p className="mt-1 text-sm text-gray-600 max-w-xl">
          Once you deploy the exported EA on MT5 and a trade closes, it shows up here within
          a few seconds. Each closed deal sends a single POST to our Netlify function — your
          token is already baked into the .mq5 you export.
        </p>

        <div className="mt-5">
          <TokenBlock token={token} onCopy={onCopy} copied={copied} onRotate={onRotate} rotating={rotating} />
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <Step num={1} label="Export" icon={<Download size={12} />} body="Open the builder, hit Export .mq5. Your telemetry token is embedded automatically." />
          <Step num={2} label="Whitelist" icon={<AlertTriangle size={12} />} body={`MT5 Tools → Options → Expert Advisors → Allow WebRequest + paste the endpoint URL.`} />
          <Step num={3} label="Run" icon={<Radio size={12} />} body="Drop the EA on a chart. Every closed trade is reported here within seconds." />
        </div>
      </CardContent>
    </Card>
  );
}

function Step({ num, label, icon, body }: { num: number; label: string; icon: React.ReactNode; body: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <div className="flex items-center gap-2 text-[10px] font-700 uppercase tracking-wider text-emerald-600">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100">{num}</span>
        {icon} {label}
      </div>
      <p className="mt-1.5 text-xs text-gray-600 leading-snug">{body}</p>
    </div>
  );
}

function fmtUsd(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v < 0 ? "−" : v > 0 ? "+" : "";
  return `${sign}$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
