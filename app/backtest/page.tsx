"use client";

// @ts-nocheck — Supabase v2 generic resolution issue (PostgrestVersion 12).

import { useEffect, useMemo, useState } from "react";
import {
  Play, Upload, AlertTriangle, Info, Loader2, FileText, Sparkles,
  Database, FileUp, Settings2, BarChart3, Wallet, Gauge,
} from "lucide-react";
import { AppShell } from "@/components/app/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/context";
import { listStrategies, getStrategy, type StrategyRow } from "@/lib/strategies/store";
import type { Timeframe, StrategyGraph } from "@/lib/strategies/types";
import type { Bar, BacktestResult } from "@/lib/backtest/types";
import { runBacktest } from "@/lib/backtest/runner";
import {
  BUILTIN_SYMBOLS, BUILTIN_TIMEFRAMES, SYMBOL_GROUPS, generateSampleOhlc,
} from "@/lib/backtest/sample-data";
import { parseOhlcCsv } from "@/lib/backtest/data";
import { EquityChart } from "@/components/backtest/EquityChart";
import { MetricsGrid } from "@/components/backtest/MetricsGrid";
import { TradesTable } from "@/components/backtest/TradesTable";
import { cn } from "@/lib/utils/cn";

type DataSource = "sample" | "csv";

export default function BacktestPage() {
  const { user } = useAuth();
  const [strategies, setStrategies] = useState<StrategyRow[]>([]);
  const [strategyId, setStrategyId] = useState<string>("");
  const [symbol, setSymbol] = useState("EURUSD");
  const [timeframe, setTimeframe] = useState<Timeframe>("H1");
  const [barCount, setBarCount] = useState(2000);
  const [startingBalance, setStartingBalance] = useState(10000);
  const [spreadPoints, setSpreadPoints] = useState(15);
  const [dataSource, setDataSource] = useState<DataSource>("sample");
  const [uploadedBars, setUploadedBars] = useState<Bar[]>([]);
  const [uploadedName, setUploadedName] = useState<string>("");
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const rows = await listStrategies();
        setStrategies(rows);
        if (rows.length > 0 && !strategyId) setStrategyId(rows[0].id);
      } catch (err) {
        toast.error((err as Error).message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseOhlcCsv(text);
      setUploadedBars(parsed.bars);
      setUploadedName(file.name);
      setCsvWarnings(parsed.warnings);
      if (parsed.bars.length < 50) {
        toast.error(`Only ${parsed.bars.length} bars parsed — need ≥ 50.`);
      } else {
        toast.success(`${parsed.bars.length} bars loaded from ${file.name}.`);
        setDataSource("csv");
      }
    } catch (err) {
      toast.error("CSV parse failed: " + (err as Error).message);
    }
  }

  async function handleRun() {
    if (!strategyId) { toast.error("Pick a strategy first."); return; }
    setRunning(true);
    setResult(null);
    try {
      const row = await getStrategy(strategyId);
      if (!row) throw new Error("Strategy not found");
      const graph = row.graph as unknown as StrategyGraph;

      const bars = dataSource === "csv"
        ? uploadedBars
        : generateSampleOhlc({ symbol, timeframe, bars: barCount });

      if (bars.length < 50) throw new Error("Not enough bars to backtest (need ≥ 50).");

      await new Promise((r) => setTimeout(r, 20));
      const r = runBacktest({
        graph,
        symbol,
        timeframe,
        bars,
        startingBalance,
        spreadPoints,
      });
      setResult(r);
      toast.success(`Backtest finished — ${r.trades.length} trades in ${r.runtimeMs.toFixed(0)}ms.`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRunning(false);
    }
  }

  const currentStrategy = useMemo(
    () => strategies.find((s) => s.id === strategyId) ?? null,
    [strategies, strategyId],
  );

  const nodeCount = useMemo(() => {
    const g = currentStrategy?.graph as unknown as { nodes: unknown[] } | null;
    return g && Array.isArray(g.nodes) ? g.nodes.length : 0;
  }, [currentStrategy]);

  return (
    <AppShell
      title="Backtest"
      actions={
        <Button onClick={handleRun} disabled={running || !strategyId} size="lg">
          {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {running ? "Running…" : "Run backtest"}
        </Button>
      }
    >
      {/* Intro band */}
      <Card className="mb-4 bg-gradient-to-br from-emerald-50/40 via-white to-white border-emerald-200/60">
        <CardContent>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <BarChart3 size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-700 uppercase tracking-widest text-emerald-600">In-browser backtest</div>
              <h2 className="text-base font-700 text-gray-900">
                Test any of your strategies on {BUILTIN_SYMBOLS.length} symbols, zero infra
              </h2>
              <p className="mt-1 text-xs text-gray-600 max-w-3xl">
                Every EA you build here is runnable: pick a symbol + timeframe, your balance, your spread, hit <em>Run</em>.
                Sample data is synthesized and deterministic; upload an MT5-format CSV for broker-grade numbers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
        {/* ── Left: Config ─────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Step 1 — Strategy */}
          <Card>
            <CardContent>
              <SectionHeader step={1} icon={<Settings2 size={12} />} title="Strategy" />
              <CustomSelect
                value={strategyId}
                onChange={setStrategyId}
                disabled={strategies.length === 0}
                placeholder={strategies.length === 0 ? "No strategies — create one first" : "Pick a strategy…"}
                options={strategies.map((s) => ({ value: s.id, label: s.name, hint: s.status }))}
              />
              {currentStrategy && (
                <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500">
                  <Badge tone="default">{nodeCount} nodes</Badge>
                  <Badge tone={currentStrategy.status === "published" ? "purple" : currentStrategy.status === "exported" ? "emerald" : "default"}>
                    {currentStrategy.status}
                  </Badge>
                </div>
              )}
              {strategies.length === 0 && (
                <Button asChild size="sm" variant="secondary" className="mt-3 w-full">
                  <a href="/templates">Start from a template</a>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Step 2 — Data source */}
          <Card>
            <CardContent>
              <SectionHeader step={2} icon={<Database size={12} />} title="Market data" />
              <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-xs w-full">
                <button
                  type="button"
                  onClick={() => setDataSource("sample")}
                  className={cn(
                    "flex-1 px-3 py-2 font-600 inline-flex items-center justify-center gap-1.5",
                    dataSource === "sample" ? "bg-gray-900 text-white" : "bg-white text-gray-700 hover:bg-gray-50",
                  )}
                >
                  <Database size={11} /> Demo data
                </button>
                <button
                  type="button"
                  onClick={() => setDataSource("csv")}
                  className={cn(
                    "flex-1 px-3 py-2 font-600 border-l border-gray-200 inline-flex items-center justify-center gap-1.5",
                    dataSource === "csv" ? "bg-gray-900 text-white" : "bg-white text-gray-700 hover:bg-gray-50",
                  )}
                >
                  <FileUp size={11} /> Upload CSV
                </button>
              </div>

              {dataSource === "sample" ? (
                <div className="mt-3 space-y-3">
                  <div>
                    <Label htmlFor="bt-symbol">Symbol</Label>
                    <CustomSelect
                      id="bt-symbol"
                      value={symbol}
                      onChange={setSymbol}
                      groups={SYMBOL_GROUPS.map((g) => ({
                        label: g.label,
                        options: g.symbols.map((s) => ({ value: s, label: s })),
                      }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="bt-tf">Timeframe</Label>
                      <CustomSelect
                        id="bt-tf"
                        value={timeframe}
                        onChange={(v) => setTimeframe(v as Timeframe)}
                        options={BUILTIN_TIMEFRAMES.map((t) => ({ value: t, label: t }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="bt-bars">Bars</Label>
                      <Input
                        id="bt-bars"
                        type="number"
                        min={200}
                        max={20000}
                        step={100}
                        value={barCount}
                        onChange={(e) => setBarCount(Math.max(200, Math.min(20_000, parseInt(e.target.value || "2000", 10))))}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-snug">
                    Deterministic synthetic OHLC — realistic but <strong>not real broker data</strong>.
                    Good for sanity-checking a strategy fires. For real results, upload a CSV.
                  </p>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <label className={cn(
                    "flex items-center justify-center gap-2 px-3 py-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                    uploadedBars.length > 0 ? "border-emerald-300 bg-emerald-50/40 text-emerald-700" : "border-gray-300 text-gray-600 hover:bg-gray-50",
                  )}>
                    <Upload size={16} />
                    <div className="text-sm">
                      {uploadedBars.length > 0 ? (
                        <>
                          <div className="font-700">{uploadedName}</div>
                          <div className="text-[11px] text-emerald-700">{uploadedBars.length.toLocaleString()} bars loaded</div>
                        </>
                      ) : (
                        <>
                          <div className="font-700">Choose .csv</div>
                          <div className="text-[11px] text-gray-500">MT5 export or OHLC CSV</div>
                        </>
                      )}
                    </div>
                    <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
                  </label>
                  {csvWarnings.length > 0 && (
                    <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 space-y-0.5">
                      {csvWarnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="bt-sym2">Symbol label</Label>
                      <Input id="bt-sym2" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="bt-tf2">Timeframe</Label>
                      <CustomSelect
                        id="bt-tf2"
                        value={timeframe}
                        onChange={(v) => setTimeframe(v as Timeframe)}
                        options={BUILTIN_TIMEFRAMES.map((t) => ({ value: t, label: t }))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 3 — Account */}
          <Card>
            <CardContent>
              <SectionHeader step={3} icon={<Wallet size={12} />} title="Account" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="bt-balance">Balance ($)</Label>
                  <Input
                    id="bt-balance"
                    type="number"
                    min={100}
                    step={100}
                    value={startingBalance}
                    onChange={(e) => setStartingBalance(Math.max(100, parseInt(e.target.value || "10000", 10)))}
                  />
                </div>
                <div>
                  <Label htmlFor="bt-spread" className="flex items-center gap-1">
                    <Gauge size={10} /> Spread (pts)
                  </Label>
                  <Input
                    id="bt-spread"
                    type="number"
                    min={0}
                    max={500}
                    step={1}
                    value={spreadPoints}
                    onChange={(e) => setSpreadPoints(Math.max(0, parseInt(e.target.value || "15", 10)))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Run CTA (in addition to topbar one) */}
          <Button onClick={handleRun} disabled={running || !strategyId} className="w-full" size="lg">
            {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {running ? "Running backtest…" : "Run backtest"}
          </Button>

          {/* V1 limits */}
          <div className="rounded-lg bg-blue-50/40 border border-blue-200 px-3 py-2 text-[11px] text-blue-700 flex gap-2">
            <Info size={12} className="shrink-0 mt-0.5" />
            <div>
              <strong>V1 runtime.</strong> Single-position sim, bar-close evaluation, flat spread,
              no slippage or swap. Grid / basket / news blocks are skipped with a warning.
            </div>
          </div>
        </div>

        {/* ── Right: Results ──────────────────────────────────── */}
        <div className="space-y-4 min-w-0">
          {!result ? (
            <Card>
              <CardContent className="text-center py-24">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                  <Play size={22} className="text-gray-400" />
                </div>
                <h3 className="text-sm font-700 text-gray-700">Configure, then run</h3>
                <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                  Pick a strategy, a data source, your balance and spread, then hit <em>Run backtest</em>.
                  The engine is 100% client-side — your graph never leaves the browser.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary band */}
              <Card>
                <CardContent>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-700 uppercase tracking-widest text-emerald-600">
                        <Sparkles size={10} /> Backtest result
                      </div>
                      <h2 className="text-lg font-800 text-gray-900">
                        {result.input.symbol} · {result.input.timeframe} · {result.input.barCount.toLocaleString()} bars
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(result.input.fromTime).toISOString().slice(0, 10)} →{" "}
                        {new Date(result.input.toTime).toISOString().slice(0, 10)}
                        {"  ·  "}runtime {result.runtimeMs.toFixed(0)}ms
                      </p>
                    </div>
                    <Badge tone={result.metrics.netProfit >= 0 ? "emerald" : "red"}>
                      {result.metrics.netProfit >= 0 ? "Profitable" : "Unprofitable"}
                    </Badge>
                  </div>
                  <MetricsGrid m={result.metrics} />
                </CardContent>
              </Card>

              {/* Equity curve */}
              <Card>
                <CardContent>
                  <h3 className="text-sm font-700 text-gray-900 mb-3">Equity curve</h3>
                  <EquityChart points={result.equity} startingBalance={result.metrics.startingBalance} />
                </CardContent>
              </Card>

              {/* Diagnostics */}
              {result.diagnostics.length > 0 && (
                <Card>
                  <CardContent>
                    <h3 className="text-sm font-700 text-gray-900 mb-2 flex items-center gap-2">
                      <AlertTriangle size={14} className="text-amber-500" />
                      Simulation notes ({result.diagnostics.length})
                    </h3>
                    <ul className="space-y-1 text-xs text-gray-600">
                      {result.diagnostics.slice(0, 15).map((d, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className={`shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full ${d.level === "error" ? "bg-red-500" : d.level === "warning" ? "bg-amber-500" : "bg-blue-500"}`} />
                          <span>{d.message}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Trades table */}
              <Card>
                <CardContent>
                  <h3 className="text-sm font-700 text-gray-900 mb-3 flex items-center gap-2">
                    <FileText size={14} />
                    Trades ({result.trades.length})
                  </h3>
                  <TradesTable trades={result.trades} />
                </CardContent>
              </Card>
            </>
          )}

          {/* MT5 disclaimer — always visible at bottom */}
          <Card className="border-dashed">
            <CardContent>
              <div className="flex items-start gap-3">
                <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
                <div className="text-xs text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Want a deeper analysis?</strong> This
                  in-browser backtest is a fast feedback loop, not a replacement for a
                  tick-level test. For walk-forward optimization, Monte Carlo, variable
                  spread / slippage / swap modeling, and multi-symbol portfolio testing,
                  export your strategy and re-run it in <strong>MT5 Strategy Tester</strong>.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function SectionHeader({ step, icon, title }: { step: number; icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-700">
        {step}
      </span>
      <span className="inline-flex items-center gap-1 text-[10px] font-700 uppercase tracking-widest text-gray-500">
        {icon} {title}
      </span>
    </div>
  );
}
