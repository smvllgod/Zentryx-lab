"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { DataTable } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import { DateRangePicker, rangeToSince, type DateRange } from "@/components/admin/DateRangePicker";
import { listAuditLog } from "@/lib/admin/queries";
import { toast } from "@/components/ui/toast";
import { formatRelative } from "@/lib/utils/format";
import { downloadCsv } from "@/lib/admin/csv";
import { Download } from "lucide-react";
import type { Tables } from "@/lib/supabase/types";

type Row = Tables<"admin_actions">;

const ACTION_OPTIONS = [
  "user.suspend",
  "user.reactivate",
  "user.plan_change",
  "user.role_change",
  "subscription.override",
  "listing.status_change",
  "flag.resolve",
  "block.override_set",
  "block.override_clear",
  "feature_flag.toggle",
  "setting.update",
  "user.impersonate",
];

export default function AdminAuditPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [range, setRange] = useState<DateRange>("30d");
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      const since = rangeToSince(range) ?? undefined;
      const r = await listAuditLog({
        action: action || undefined,
        targetType: targetType || undefined,
        since,
        limit: 500,
      });
      setRows(r);
    } catch (err) {
      toast.error("Failed to load audit log: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [range, action, targetType]);

  const counts = useMemo(() => {
    const byActor = new Map<string, number>();
    const byAction = new Map<string, number>();
    for (const r of rows) {
      byActor.set(r.actor_email ?? r.actor_id ?? "unknown", (byActor.get(r.actor_email ?? r.actor_id ?? "unknown") ?? 0) + 1);
      byAction.set(r.action, (byAction.get(r.action) ?? 0) + 1);
    }
    return { byActor, byAction };
  }, [rows]);

  return (
    <AdminShell
      title="Audit log"
      subtitle={`${rows.length} events`}
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Audit log" }]}
      actions={
        <div className="flex items-center gap-2">
          <DateRangePicker value={range} onChange={setRange} />
          <NativeSelect value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All actions</option>
            {ACTION_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </NativeSelect>
          <NativeSelect value={targetType} onChange={(e) => setTargetType(e.target.value)}>
            <option value="">All targets</option>
            <option value="user">User</option>
            <option value="subscription">Subscription</option>
            <option value="listing">Listing</option>
            <option value="block">Block</option>
            <option value="flag">Flag</option>
            <option value="setting">Setting</option>
          </NativeSelect>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => downloadCsv(`audit-${range}.csv`, rows, [
              { key: "created_at", header: "When" },
              { key: "actor_email", header: "Actor" },
              { key: "action", header: "Action" },
              { key: "target_type", header: "Target type" },
              { key: "target_id", header: "Target id" },
              { key: "before", header: "Before" },
              { key: "after", header: "After" },
            ])}
          >
            <Download size={12} /> CSV
          </Button>
          <Button size="sm" variant="secondary" onClick={reload}>Refresh</Button>
        </div>
      }
    >
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        empty="No audit events in this range."
        columns={[
          { header: "When", width: "150px", render: (r) => <span className="text-xs text-gray-500">{formatRelative(r.created_at)}</span> },
          { header: "Actor", render: (r) => (
            <div className="min-w-0">
              <div className="text-xs font-600 text-gray-900 truncate">{r.actor_email ?? "—"}</div>
              <code className="text-[10px] text-gray-400">{r.actor_id?.slice(0, 8) ?? "—"}</code>
            </div>
          ) },
          { header: "Action", width: "200px", render: (r) => <code className="text-[11px] text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5">{r.action}</code> },
          { header: "Target", width: "180px", render: (r) => (
            <div className="min-w-0">
              <Badge tone="slate" className="text-[8px] px-1.5 py-0">{r.target_type}</Badge>
              {r.target_id && <code className="ml-2 text-[10px] text-gray-400">{r.target_id.slice(0, 10)}…</code>}
            </div>
          ) },
          { header: "Δ Before → After", render: (r) => (
            <div className="flex items-center gap-2 text-[10px] font-mono text-gray-600">
              <span className="text-red-500">{r.before ? compact(r.before) : "∅"}</span>
              <span className="text-gray-400">→</span>
              <span className="text-emerald-600">{r.after ? compact(r.after) : "∅"}</span>
            </div>
          ) },
        ]}
        footer={
          <div className="flex gap-6">
            <span><span className="font-600 text-gray-700">{counts.byActor.size}</span> actors</span>
            <span><span className="font-600 text-gray-700">{counts.byAction.size}</span> distinct actions</span>
          </div>
        }
      />
    </AdminShell>
  );
}

function compact(v: unknown): string {
  if (v === null || v === undefined) return "∅";
  try {
    const s = JSON.stringify(v);
    return s.length > 60 ? s.slice(0, 60) + "…" : s;
  } catch { return String(v); }
}
