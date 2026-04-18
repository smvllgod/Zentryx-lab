"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { DataTable } from "@/components/admin/DataTable";
import { StatCard } from "@/components/admin/StatCard";
import { Button } from "@/components/ui/button";
import { listExportsAdmin } from "@/lib/admin/queries";
import { formatRelative } from "@/lib/utils/format";

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

  async function reload() {
    setLoading(true);
    try {
      const r = await listExportsAdmin(200);
      setRows(r as ExportRow[]);
    } finally { setLoading(false); }
  }
  useEffect(() => { void reload(); }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last24h = rows.filter((r) => new Date(r.created_at) >= new Date(Date.now() - 24 * 60 * 60 * 1000)).length;
  const last7d = rows.filter((r) => new Date(r.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;

  return (
    <AdminShell
      title="Exports"
      subtitle="Every .mq5 download is tracked here."
      actions={<Button variant="secondary" size="sm" onClick={reload}>Refresh</Button>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <StatCard label="Total exports" value={rows.length} />
        <StatCard label="Last 24h" value={last24h} tone="emerald" />
        <StatCard label="Last 7d" value={last7d} tone="emerald" />
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 mb-4 text-[11px] text-amber-700">
        Download-count tracking per export requires a <code>downloads</code> counter on the <code>exports</code> table. Placeholder: count is the number of rows in <code>exports</code>. Protected-export usage flows through <code>protection.*</code> config on each generated file — visible under each user detail page.
      </div>

      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        columns={[
          { header: "Filename", render: (r) => <code className="text-xs text-gray-700">{r.filename}</code> },
          { header: "User", width: "130px", render: (r) => <a href={`/admin/users/${r.user_id}`} className="text-[10px] font-600 text-emerald-600 hover:underline">{r.user_id.slice(0, 8)}…</a> },
          { header: "Strategy", width: "130px", render: (r) => <code className="text-[10px] text-gray-400">{r.strategy_id.slice(0, 8)}…</code> },
          { header: "When", width: "140px", render: (r) => <span className="text-xs text-gray-500">{formatRelative(r.created_at)}</span> },
        ]}
      />
    </AdminShell>
  );
}
