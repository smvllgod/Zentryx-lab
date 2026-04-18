"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { AppShell } from "@/components/app/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { listExports } from "@/lib/strategies/store";
import { formatRelative } from "@/lib/utils/format";

interface ExportRow {
  id: string;
  filename: string;
  source: string;
  created_at: string;
  strategy_id: string;
  strategies?: { name: string } | null;
}

export default function ExportsPage() {
  const [rows, setRows] = useState<ExportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = (await listExports()) as unknown as ExportRow[];
        if (alive) setRows(data);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function download(row: ExportRow) {
    const blob = new Blob([row.source], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = row.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell title="Exports">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent>
            <h2 className="text-sm font-700 text-gray-900 mb-3">Generated .mq5 files</h2>
            {loading ? (
              <div className="text-sm text-gray-400 py-6 text-center">Loading…</div>
            ) : rows.length === 0 ? (
              <EmptyState
                icon={<Download size={20} />}
                title="No exports yet"
                description="Generate and download a .mq5 from the builder. Each export is recorded here."
              />
            ) : (
              <ul className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-700 text-gray-900 truncate">{r.filename}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {r.strategies?.name ?? "Strategy"} · {formatRelative(r.created_at)}
                      </div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => download(r)}>
                      <Download size={12} /> Download
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="text-sm font-700 text-gray-900">How to import into MetaTrader 5</h2>
            <ol className="mt-3 space-y-3 text-sm text-gray-600 list-decimal pl-5">
              <li>Open MetaTrader 5 and press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 text-xs">F4</kbd> to launch MetaEditor.</li>
              <li>Choose <strong>File → Open Data Folder</strong> in MT5, then go to <code>MQL5/Experts</code>.</li>
              <li>Drop your downloaded <code>.mq5</code> file in that folder.</li>
              <li>Back in MetaEditor, double-click the file and press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 text-xs">F7</kbd> to compile to <code>.ex5</code>.</li>
              <li>In MT5, press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 text-xs">Ctrl+R</kbd> to open <strong>Strategy Tester</strong>, pick your EA and run a backtest.</li>
            </ol>
            <p className="mt-4 text-xs text-gray-400">
              Backtesting runs entirely inside MT5 — Zentryx Lab generates the source, MT5 does the historical simulation.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
