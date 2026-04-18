"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { DataTable } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import { listUsers, setUserSuspended, setUserPlan, type AdminUserRow } from "@/lib/admin/queries";
import { toast } from "@/components/ui/toast";
import { formatRelative } from "@/lib/utils/format";

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState("");
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      const r = await listUsers({ query, plan: plan || undefined, limit: 100 });
      setRows(r);
    } catch (err) {
      toast.error("Failed to load users: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  const filtered = useMemo(() => rows, [rows]);

  return (
    <AdminShell
      title="Users"
      subtitle={`${rows.length} shown`}
      actions={
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && reload()}
            placeholder="Search email or name…"
            className="h-9 w-64 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-300"
          />
          <NativeSelect value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="">All plans</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="creator">Creator</option>
          </NativeSelect>
          <Button variant="secondary" size="sm" onClick={reload}>Refresh</Button>
        </div>
      }
    >
      <DataTable
        rows={filtered}
        rowKey={(u) => u.id}
        loading={loading}
        empty="No users match the filter."
        columns={[
          {
            header: "User",
            render: (u) => (
              <div className="min-w-0">
                <a href={`/admin/users/${u.id}`} className="text-sm font-600 text-gray-900 hover:text-emerald-600 truncate block">
                  {u.full_name || u.email}
                </a>
                <div className="text-[10px] text-gray-400 truncate">{u.email}</div>
              </div>
            ),
          },
          {
            header: "Plan",
            width: "90px",
            render: (u) => (
              <Badge tone={u.plan === "creator" ? "purple" : u.plan === "pro" ? "emerald" : "default"}>{u.plan}</Badge>
            ),
          },
          {
            header: "Role",
            width: "80px",
            render: (u) => (
              <Badge tone={u.role === "admin" ? "red" : u.role === "staff" ? "amber" : "slate"}>{u.role}</Badge>
            ),
          },
          {
            header: "Status",
            width: "90px",
            render: (u) =>
              u.suspended ? <Badge tone="red">suspended</Badge> : <Badge tone="emerald">active</Badge>,
          },
          {
            header: "Joined",
            width: "120px",
            render: (u) => <span className="text-xs text-gray-500">{formatRelative(u.created_at)}</span>,
          },
          {
            header: "",
            width: "170px",
            render: (u) => (
              <div className="flex items-center gap-1.5 justify-end">
                <NativeSelect
                  value={u.plan}
                  onChange={async (e) => {
                    try {
                      await setUserPlan(u.id, e.target.value as "free" | "pro" | "creator");
                      toast.success(`Plan → ${e.target.value}`);
                      void reload();
                    } catch (err) {
                      toast.error("Failed: " + (err as Error).message);
                    }
                  }}
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="creator">Creator</option>
                </NativeSelect>
                <Button
                  size="sm"
                  variant={u.suspended ? "primary" : "destructive"}
                  onClick={async () => {
                    try {
                      await setUserSuspended(u.id, !u.suspended);
                      toast.success(u.suspended ? "Reactivated" : "Suspended");
                      void reload();
                    } catch (err) {
                      toast.error("Failed: " + (err as Error).message);
                    }
                  }}
                >
                  {u.suspended ? "Unsuspend" : "Suspend"}
                </Button>
              </div>
            ),
          },
        ]}
      />
    </AdminShell>
  );
}
