"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { DataTable, OwnerLink } from "@/components/admin/DataTable";
import { StatCard } from "@/components/admin/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import { Download } from "lucide-react";
import { listStrategiesAdmin } from "@/lib/admin/queries";
import { formatRelative } from "@/lib/utils/format";
import { downloadCsv } from "@/lib/admin/csv";
import { useRouter } from "next/navigation";

interface Row {
  id: string;
  user_id: string;
  name: string;
  status: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export default function AdminStrategiesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      const r = await listStrategiesAdmin({ status: status || undefined, query: query || undefined, limit: 200 });
      setRows(r as Row[]);
    } finally { setLoading(false); }
  }

  useEffect(() => { void reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [status]);

  const drafts    = rows.filter((r) => r.status === "draft").length;
  const exported  = rows.filter((r) => r.status === "exported").length;
  const published = rows.filter((r) => r.status === "published").length;

  return (
    <AdminShell
      title="Strategies"
      subtitle={`${rows.length} strategies across all users`}
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Strategies" }]}
      actions={
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && reload()}
            placeholder="Search name…"
            className="h-8 w-52 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-300"
          />
          <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="validated">Validated</option>
            <option value="exported">Exported</option>
            <option value="published">Published</option>
          </NativeSelect>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => downloadCsv("strategies.csv", rows, [
              { key: "id" }, { key: "user_id", header: "owner" },
              { key: "name" }, { key: "status" }, { key: "tags" },
              { key: "created_at" }, { key: "updated_at" },
            ])}
          >
            <Download size={12} /> CSV
          </Button>
          <Button size="sm" variant="secondary" onClick={reload}>Refresh</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total" value={rows.length} />
        <StatCard label="Drafts" value={drafts} />
        <StatCard label="Exported" value={exported} tone="emerald" />
        <StatCard label="Published" value={published} tone="purple" />
      </div>

      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        onRowClick={(r) => router.push(`/admin/strategies/${r.id}`)}
        empty="No strategies match the filter."
        columns={[
          { header: "Name", render: (r) => (
            <div className="min-w-0">
              <div className="text-sm font-600 text-gray-900 truncate group-hover:text-emerald-600 transition-colors">{r.name}</div>
              <code className="text-[10px] text-gray-400">{r.id.slice(0, 8)}…</code>
            </div>
          ) },
          { header: "Status", width: "110px", render: (r) => (
            <Badge tone={r.status === "published" ? "purple" : r.status === "exported" ? "emerald" : "slate"}>{r.status}</Badge>
          ) },
          { header: "Tags", hideOnSmall: true, render: (r) => (
            <div className="flex flex-wrap gap-1">
              {r.tags.slice(0, 3).map((t) => (
                <span key={t} className="text-[9px] font-600 uppercase tracking-wider text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{t}</span>
              ))}
              {r.tags.length === 0 && <span className="text-gray-400 text-xs">—</span>}
            </div>
          ) },
          { header: "Owner", width: "120px", render: (r) => <OwnerLink userId={r.user_id} /> },
          { header: "Updated", width: "120px", hideOnSmall: true, render: (r) => <span className="text-xs text-gray-500">{formatRelative(r.updated_at)}</span> },
        ]}
      />
    </AdminShell>
  );
}
