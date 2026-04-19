"use client";

// ──────────────────────────────────────────────────────────────────
// /admin/licenses — platform-wide license management
// ──────────────────────────────────────────────────────────────────
// Shows every license issued across the platform. Admins can:
//   • search by key prefix / label / buyer email
//   • filter by revoked / active
//   • view per-license activation count (via license_usage view)
//   • revoke any license with a reason (written to license.revoke_reason +
//     admin_actions audit log)
// ──────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { DataTable, OwnerLink } from "@/components/admin/DataTable";
import { StatCard } from "@/components/admin/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { toast } from "@/components/ui/toast";
import { listLicensesAdmin, adminRevokeLicense } from "@/lib/licenses/client";
import { logAdminAction } from "@/lib/admin/queries";
import type { LicenseRow } from "@/lib/licenses/types";

export default function AdminLicensesPage() {
  const [rows, setRows] = useState<LicenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | "active" | "revoked">("");

  const [revokeTarget, setRevokeTarget] = useState<LicenseRow | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const out = await listLicensesAdmin({
        query: query || undefined,
        revoked: status === "" ? undefined : status === "revoked",
        limit: 300,
      });
      setRows(out);
    } catch (err) {
      toast.error("Failed to load: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => { void reload(); }, [reload]);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => !r.revoked && !isExpired(r)).length;
    const revoked = rows.filter((r) => r.revoked).length;
    const expired = rows.filter((r) => !r.revoked && isExpired(r)).length;
    return { total, active, revoked, expired };
  }, [rows]);

  async function doRevoke() {
    if (!revokeTarget) return;
    try {
      await adminRevokeLicense(revokeTarget.id, revokeReason || "Revoked by admin");
      void logAdminAction({
        action: "license.revoke",
        targetType: "license",
        targetId: revokeTarget.id,
        before: { revoked: revokeTarget.revoked, reason: revokeTarget.revoke_reason },
        after: { revoked: true, reason: revokeReason },
      });
      toast.success("License revoked");
      setRevokeTarget(null);
      setRevokeReason("");
      void reload();
    } catch (err) {
      toast.error("Revoke failed: " + (err as Error).message);
    }
  }

  return (
    <AdminShell
      title="Licenses"
      subtitle={`${rows.length} record${rows.length === 1 ? "" : "s"}`}
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Licenses" }]}
      actions={
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search key / label / email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-56"
          />
          <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as "" | "active" | "revoked")}>
            <option value="">All statuses</option>
            <option value="active">Active only</option>
            <option value="revoked">Revoked only</option>
          </NativeSelect>
          <Button size="sm" variant="secondary" onClick={reload}>Refresh</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Active" value={stats.active} tone="emerald" />
        <StatCard label="Revoked" value={stats.revoked} tone="red" />
        <StatCard label="Expired" value={stats.expired} tone="amber" />
      </div>

      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        empty="No licenses match your filters."
        columns={[
          {
            header: "Key",
            render: (r) => (
              <div className="min-w-0">
                <code className="text-sm font-700 text-gray-900 font-mono">{r.key_prefix}-••••-••••-••••</code>
                {r.label && <div className="text-[11px] text-gray-500 truncate mt-0.5">{r.label}</div>}
              </div>
            ),
          },
          {
            header: "Issuer",
            width: "120px",
            render: (r) => <OwnerLink userId={r.user_id} />,
          },
          {
            header: "Buyer",
            hideOnSmall: true,
            render: (r) => (
              <div className="text-xs">
                {r.buyer_id ? <OwnerLink userId={r.buyer_id} /> : r.buyer_email ? <span className="text-gray-700">{r.buyer_email}</span> : <span className="text-gray-400">—</span>}
              </div>
            ),
          },
          {
            header: "Binding",
            hideOnSmall: true,
            render: (r) => (
              <div className="text-[11px] text-gray-600">
                {r.bound_account != null && <div>acct: {r.bound_account}</div>}
                {r.bound_broker && <div>broker: {r.bound_broker}</div>}
                {!r.bound_account && !r.bound_broker && <span className="text-gray-400">—</span>}
              </div>
            ),
          },
          {
            header: "Expires",
            width: "110px",
            hideOnSmall: true,
            render: (r) => (
              <span className="text-[11px] text-gray-600">{r.expires_at ? new Date(r.expires_at).toISOString().slice(0, 10) : "—"}</span>
            ),
          },
          {
            header: "Status",
            width: "110px",
            render: (r) => {
              if (r.revoked) return <Badge tone="red">revoked</Badge>;
              if (isExpired(r)) return <Badge tone="amber">expired</Badge>;
              return <Badge tone="emerald">active</Badge>;
            },
          },
          {
            header: "",
            width: "100px",
            align: "right",
            render: (r) =>
              r.revoked ? (
                <span className="text-[11px] text-gray-400">—</span>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => { setRevokeTarget(r); setRevokeReason(""); }}>
                  Revoke
                </Button>
              ),
          },
        ]}
      />

      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(v) => !v && setRevokeTarget(null)}
        title={`Revoke license ${revokeTarget?.key_prefix}?`}
        body={
          <div>
            <p className="mb-3 text-sm text-gray-600">
              Any EA still running with this key will fail its next re-check within 24 hours. The buyer will see the reason in the MT5 Journal.
            </p>
            <label className="text-[10px] font-700 uppercase tracking-wider text-gray-500">Reason</label>
            <Input
              className="mt-1"
              placeholder="Chargeback / fraud / etc."
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
            />
          </div>
        }
        destructive
        onConfirm={doRevoke}
      />
    </AdminShell>
  );
}

function isExpired(r: LicenseRow): boolean {
  if (!r.expires_at) return false;
  const t = new Date(r.expires_at).getTime();
  return Number.isFinite(t) && t <= Date.now();
}
