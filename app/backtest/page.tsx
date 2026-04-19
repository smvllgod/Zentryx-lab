"use client";

// @ts-nocheck — Supabase v2 generic resolution issue (PostgrestVersion 12).

import { useEffect, useMemo, useState } from "react";
import { Play, Upload, AlertTriangle, Info, Loader2, FileText, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/context";
import { listStrategies, getStrategy, type StrategyRow } from "@/lib/strategies/store";
import type { Timeframe, StrategyGraph } from "@/lib/strategies/types";
import type { Bar, BacktestResult } from "@/lib/backtest/types";
import { runBacktest } from "@/lib/backtest/runner";
import { BUILTIN_SYMBOLS, BUILTIN_TIMEFRAMES, generateSampleOhlc } from "@/lib/backtest/sample-data";
import { parseOhlcCsv } from "@/lib/backtest/data";
import { EquityChart } from "@/components/backtest/EquityChart";
import { MetricsGrid } from "@/components/backtest/MetricsGrid";
import { TradesTable } from "@/components/backtest/TradesTable";

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
  const [csvText, setCsvText] = useState("");
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);
  const [uploadedBars, setUploadedBars] = useState<Bar[]>([]);
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
      setCsvText(text.slice(0, 200));
      const parsed = parseOhlcCsv(text);
      setUploadedBars(parsed.bars);
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

      // Run on next tick so the spinner shows.
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

  return (
    <AppShell
      title="Backtest"
      actions={
        <Button onClick={handleRun} disabled={running || !strategyId}>
          {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {running ? "Running…" : "Run backtest"}
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
        {/* ── Left: Config ─────────────────────────────────────── */}
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-700 text-emerald-600 uppercase tracking-widest">
              <Sparkles size={12} /> Configuration
            </div>

            <div>
              <Label htmlFor="bt-strategy">Strategy</Label>
              <NativeSelect
                id="bt-strategy"
                value={strategyId}
                onChange={(e) => setStrategyId(e.target.value)}
                disabled={strategies.length === 0}
              >
                {strategies.length === 0 && <option value="">No strategies — create one first</option>}
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </NativeSelect>
              {currentStrategy && (
                <p className="mt-1 text-[11px] text-gray-500">
                  {currentStrategy.graph && "nodes" in (currentStrategy.graph as object)
                    ? `${(currentStrategy.graph as unknown as { nodes: unknown[] }).nodes.length} nodes`
                    : ""}
                </p>
              )}
            </div>

            <div>
              <Label>Data source</Label>
              <div className="mt-1 inline-flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setDataSource("sample")}
                  className={`px-3 py-1.5 ${dataSource === "sample" ? "bg-gray-900 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  Demo data
                </button>
                <button
                  type="button"
                  onClick={() => setDataSource("csv")}
                  className={`px-3 py-1.5 border-l border-gray-200 ${dataSource === "csv" ? "bg-gray-900 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  Upload CSV
                </button>
              </div>
            </div>

            {dataSource === "sample" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="bt-symbol">Symbol</Label>
                    <NativeSelect id="bt-symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
                      {BUILTIN_SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </NativeSelect>
                  </div>
                  <div>
                    <Label htmlFor="bt-tf">Timeframe</Label>
                    <NativeSelect id="bt-tf" value={timeframe} onChange={(e) => setTimeframe(e.target.value as Timeframe)}>
                      {BUILTIN_TIMEFRAMES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </NativeSelect>
                  </div>
                </div>

                <div>
                  <Label htmlFor="bt-bars">Bars to generate</Label>
                  <Input
                    id="bt-bars"
                    type="number"
                    min={200}
                    max={20000}
                    step={100}
                    value={barCount}
                    onChange={(e) => setBarCount(Math.max(200, Math.min(20_000, parseInt(e.target.value || "2000", 10))))}
                  />
                  <p className="mt-1 text-[11px] text-gray-500">Demo data is synthesized for this run. Upload a CSV for real broker data.</p>
                </div>
              </>
            )}

            {dataSource === "csv" && (
              <div>
                <Label>OHLC CSV</Label>
                <label className="mt-1 flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-600">
                  <Upload size={14} />
                  <span>{uploadedBars.length > 0 ? `${uploadedBars.length} bars loaded` : "Choose .csv"}</span>
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
                </label>
                {csvWarnings.length > 0 && (
                  <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 space-y-0.5">
                    {csvWarnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
                  </div>
                )}
                <p className="mt-1 text-[11px] text-gray-500">
                  Accepts MT5 Strategy Tester export or standard OHLC CSV. See <a href="/docs" className="text-emerald-600">docs</a> for format details.
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="bt-sym2">Symbol label</Label>
                    <Input id="bt-sym2" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="bt-tf2">Timeframe</Label>
                    <NativeSelect id="bt-tf2" value={timeframe} onChange={(e) => setTimeframe(e.target.value as Timeframe)}>
                      {BUILTIN_TIMEFRAMES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </NativeSelect>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="bt-balance">Starting balance ($)</Label>
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
                <Label htmlFor="bt-spread">Spread (points)</Label>
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

            <div className="rounded-lg bg-blue-50/40 border border-blue-200 px-3 py-2 text-[11px] text-blue-700 flex gap-2">
              <Info size={12} className="shrink-0 mt-0.5" />
              <div>
                <strong>V1 runtime.</strong> Single-position sim, bar-close evaluation, flat spread,
                no slippage or swap. Grid / basket / news blocks are skipped.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Right: Results ──────────────────────────────────── */}
        <div className="space-y-4 min-w-0">
          {!result ? (
            <Card>
              <CardContent className="text-center py-20 text-gray-500">
                <Play size={28} className="mx-auto text-gray-300 mb-3" />
                <h3 className="text-sm font-700 text-gray-700">Configure, then run</h3>
                <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                  Pick a strategy, a data source, your balance and spread, then hit <em>Run backtest</em>.
                  The engine is 100% client-side — your graph never leaves this browser.
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
                        {result.input.symbol} · {result.input.timeframe} · {result.input.barCount} bars
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

          {/* MT5 disclaimer — always visible */}
          <Card className="border-dashed">
            <CardContent>
              <div className="flex items-start gap-3">
                <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
                <div className="text-xs text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Want a deeper analysis?</strong> This
                  in-browser backtest is a fast feedback loop, not a replacement for a
                  tick-level test. For walk-forward optimization, Monte Carlo, variable
                  spread / slippage / swap modeling, and multi-symbol portfolio testing,
                  export your strategy and re-run it in MT5 Strategy Tester.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
