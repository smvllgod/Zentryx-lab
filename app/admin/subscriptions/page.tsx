"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { DataTable } from "@/components/admin/DataTable";
import { StatCard } from "@/components/admin/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import { listSubscriptions, overrideSubscription } from "@/lib/admin/queries";
import { toast } from "@/components/ui/toast";
import { formatRelative } from "@/lib/utils/format";
import type { Tables } from "@/lib/supabase/types";

type SubRow = Tables<"subscriptions">;

export default function AdminSubscriptionsPage() {
  const [rows, setRows] = useState<SubRow[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      const r = await listSubscriptions({ status: status || undefined, limit: 200 });
      setRows(r as SubRow[]);
    } catch (err) {
      toast.error("Failed to load subscriptions: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, [status]);   // eslint-disable-line react-hooks/exhaustive-deps

  const byPlan = useMemo(() => {
    const out = { free: 0, pro: 0, creator: 0 };
    for (const r of rows) if (r.status === "active" || r.status === "trialing") out[r.plan]++;
    return out;
  }, [rows]);

  const failed = useMemo(() => rows.filter((r) => r.status === "past_due" || r.status === "incomplete").length, [rows]);

  return (
    <AdminShell
      title="Subscriptions"
      subtitle="Plan distribution, billing state, manual overrides."
      actions={
        <div className="flex items-center gap-2">
          <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past due</option>
            <option value="incomplete">Incomplete</option>
            <option value="canceled">Canceled</option>
          </NativeSelect>
          <Button variant="secondary" size="sm" onClick={reload}>Refresh</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
        <StatCard label="Free-tier" value={byPlan.free} hint="active + trialing" />
        <StatCard label="Pro" value={byPlan.pro} tone="emerald" />
        <StatCard label="Creator" value={byPlan.creator} tone="purple" />
        <StatCard label="Failed payments" value={failed} tone={failed > 0 ? "red" : "default"} />
      </div>

      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        columns={[
          { header: "User", render: (r) => <a href={`/admin/users/${r.user_id}`} className="text-xs font-600 text-emerald-600 hover:underline">{r.user_id.slice(0, 8)}…</a>, width: "120px" },
          { header: "Plan", width: "90px", render: (r) => <Badge tone={r.plan === "creator" ? "purple" : r.plan === "pro" ? "emerald" : "default"}>{r.plan}</Badge> },
          { header: "Status", width: "110px", render: (r) => <Badge tone={r.status === "active" ? "emerald" : r.status === "past_due" ? "red" : "slate"}>{r.status}</Badge> },
          { header: "Period end", width: "140px", render: (r) => <span className="text-xs text-gray-500">{r.current_period_end ? formatRelative(r.current_period_end) : "—"}</span> },
          { header: "Stripe sub", render: (r) => <code className="text-[10px] text-gray-400">{r.stripe_subscription_id ?? "—"}</code> },
          {
            header: "",
            width: "140px",
            render: (r) => (
              <NativeSelect
                value={r.status}
                onChange={async (e) => {
                  try {
                    await overrideSubscription(r.id, { status: e.target.value });
                    toast.success(`Status → ${e.target.value}`);
                    void reload();
                  } catch (err) {
                    toast.error("Failed: " + (err as Error).message);
                  }
                }}
              >
                <option value="active">active</option>
                <option value="trialing">trialing</option>
                <option value="past_due">past_due</option>
                <option value="incomplete">incomplete</option>
                <option value="canceled">canceled</option>
              </NativeSelect>
            ),
          },
        ]}
      />
    </AdminShell>
  );
}
