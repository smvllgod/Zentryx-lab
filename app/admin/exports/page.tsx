"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { DataTable, OwnerLink } from "@/components/admin/DataTable";
import { StatCard } from "@/components/admin/StatCard";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import { Download, ExternalLink } from "lucide-react";
import { listExportsAdmin } from "@/lib/admin/queries";
import { formatRelative } from "@/lib/utils/format";
import { downloadCsv } from "@/lib/admin/csv";

interface ExportRow {
  id: string;
  filename: string;
  user_id: string;
  strategy_id: string;
  created_at: string;
}

export default function AdminExportsPage() {
  const [rows, setRows] = useState<ExportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "24h" | "7d">("all");

  async function reload() {
    setLoading(true);
    try {
      const r = await listExportsAdmin(500);
      setRows(r as ExportRow[]);
    } finally { setLoading(false); }
  }
  useEffect(() => { void reload(); }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    if (filter === "all") return rows;
    const ms = filter === "24h" ? 24 * 3600e3 : 7 * 24 * 3600e3;
    return rows.filter((r) => now - new Date(r.created_at).getTime() < ms);
  }, [rows, filter]);

  const last24h = rows.filter((r) => Date.now() - new Date(r.created_at).getTime() < 24 * 3600e3).length;
  const last7d = rows.filter((r) => Date.now() - new Date(r.created_at).getTime() < 7 * 24 * 3600e3).length;

  return (
    <AdminShell
      title="Exports"
      subtitle="Every .mq5 download is logged here"
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Exports" }]}
      actions={
        <div className="flex items-center gap-2">
          <NativeSelect value={filter} onChange={(e) => setFilter(e.target.value as "all" | "24h" | "7d")}>
            <option value="all">All time</option>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7 days</option>
          </NativeSelect>
          <Button size="sm" variant="secondary" onClick={() => downloadCsv("exports.csv", filtered)}>
            <Download size={12} /> CSV
          </Button>
          <Button size="sm" variant="secondary" onClick={reload}>Refresh</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <StatCard label="Total exports" value={rows.length} />
        <StatCard label="Last 24h" value={last24h} tone="emerald" />
        <StatCard label="Last 7d" value={last7d} tone="emerald" />
      </div>

      <DataTable
        rows={filtered}
        rowKey={(r) => r.id}
        loading={loading}
        empty="No exports in the selected window."
        columns={[
          { header: "Filename", render: (r) => <code className="text-xs text-gray-700">{r.filename}</code> },
          { header: "User", width: "120px", render: (r) => <OwnerLink userId={r.user_id} /> },
          { header: "Strategy", width: "140px", render: (r) => (
            <a href={`/admin/strategies/${r.strategy_id}`} className="inline-flex items-center gap-1 text-[11px] font-600 text-emerald-600 hover:underline">
              <code className="font-mono">{r.strategy_id.slice(0, 8)}…</code>
              <ExternalLink size={10} />
            </a>
          ) },
          { header: "When", width: "140px", align: "right", render: (r) => <span className="text-xs text-gray-500">{formatRelative(r.created_at)}</span> },
        ]}
      />
    </AdminShell>
  );
}
