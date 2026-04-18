"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { DataTable } from "@/components/admin/DataTable";
import { StatCard } from "@/components/admin/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import {
  BLOCK_REGISTRY,
  FAMILY_META,
  type BlockDefinition,
  type BlockFamily,
} from "@/lib/blocks";
import { listBlockAnalytics, listBlockOverrides, setBlockOverride, clearBlockOverride } from "@/lib/admin/queries";
import { toast } from "@/components/ui/toast";
import type { Tables } from "@/lib/supabase/types";

type Override = Tables<"block_registry_overrides">;

export default function AdminBlocksPage() {
  const [analytics, setAnalytics] = useState<Map<string, { usage_count: number; unique_users: number; last_used_at: string | null }>>(new Map());
  const [overrides, setOverrides] = useState<Map<string, Override>>(new Map());
  const [familyFilter, setFamilyFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      const [a, o] = await Promise.all([listBlockAnalytics(), listBlockOverrides()]);
      setAnalytics(new Map(a.map((r) => [r.block_id, r])));
      setOverrides(new Map(o.map((r) => [r.block_id, r])));
    } catch (err) {
      toast.error("Failed: " + (err as Error).message);
    } finally { setLoading(false); }
  }
  useEffect(() => { void reload(); }, []);

  const rows = useMemo(() => {
    let out: BlockDefinition[] = [...BLOCK_REGISTRY];
    if (familyFilter) out = out.filter((b) => b.family === familyFilter);
    if (statusFilter) out = out.filter((b) => (overrides.get(b.id)?.force_status ?? b.status) === statusFilter);
    return out.sort((a, b) => (analytics.get(b.id)?.usage_count ?? 0) - (analytics.get(a.id)?.usage_count ?? 0));
  }, [familyFilter, statusFilter, analytics, overrides]);

  const totalActive = BLOCK_REGISTRY.filter((b) => (overrides.get(b.id)?.force_status ?? b.status) === "active").length;
  const totalBeta = BLOCK_REGISTRY.filter((b) => (overrides.get(b.id)?.force_status ?? b.status) === "beta").length;
  const totalPlanned = BLOCK_REGISTRY.filter((b) => (overrides.get(b.id)?.force_status ?? b.status) === "planned").length;
  const totalDisabled = BLOCK_REGISTRY.filter((b) => (overrides.get(b.id)?.force_status ?? b.status) === "disabled").length;

  async function patchOverride(id: string, patch: { force_status?: string; force_plan?: string; force_hidden?: boolean }) {
    try {
      await setBlockOverride(id, patch);
      toast.success("Saved");
      void reload();
    } catch (err) {
      toast.error("Failed: " + (err as Error).message);
    }
  }

  return (
    <AdminShell
      title="Logic blocks"
      subtitle="Registry, usage counts, status & plan overrides."
      actions={
        <div className="flex items-center gap-2">
          <NativeSelect value={familyFilter} onChange={(e) => setFamilyFilter(e.target.value)}>
            <option value="">All families</option>
            {(Object.keys(FAMILY_META) as BlockFamily[]).map((f) => (
              <option key={f} value={f}>{FAMILY_META[f].label}</option>
            ))}
          </NativeSelect>
          <NativeSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="beta">Beta</option>
            <option value="planned">Planned</option>
            <option value="disabled">Disabled</option>
          </NativeSelect>
          <Button variant="secondary" size="sm" onClick={reload}>Refresh</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total blocks" value={BLOCK_REGISTRY.length} hint={`${Object.keys(FAMILY_META).length} families`} />
        <StatCard label="Active" value={totalActive} tone="emerald" />
        <StatCard label="Beta" value={totalBeta} tone="purple" />
        <StatCard label="Planned / disabled" value={totalPlanned + totalDisabled} tone={totalDisabled > 0 ? "amber" : "default"} />
      </div>

      <DataTable
        rows={rows}
        rowKey={(b) => b.id}
        loading={loading}
        columns={[
          {
            header: "Block",
            render: (b) => (
              <div className="min-w-0">
                <div className="text-sm font-600 text-gray-900 truncate">{b.displayName}</div>
                <code className="text-[10px] text-gray-400">{b.id}</code>
              </div>
            ),
          },
          {
            header: "Family",
            width: "130px",
            render: (b) => (
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: FAMILY_META[b.family].color }} />
                {FAMILY_META[b.family].shortLabel}
              </span>
            ),
          },
          {
            header: "Plan",
            width: "130px",
            render: (b) => (
              <NativeSelect
                value={overrides.get(b.id)?.force_plan ?? b.plan}
                onChange={(e) => patchOverride(b.id, { force_plan: e.target.value })}
              >
                <option value="free">free</option>
                <option value="pro">pro</option>
                <option value="creator">creator</option>
              </NativeSelect>
            ),
          },
          {
            header: "Status",
            width: "140px",
            render: (b) => (
              <NativeSelect
                value={overrides.get(b.id)?.force_status ?? b.status}
                onChange={(e) => patchOverride(b.id, { force_status: e.target.value })}
              >
                <option value="active">active</option>
                <option value="beta">beta</option>
                <option value="planned">planned</option>
                <option value="disabled">disabled</option>
              </NativeSelect>
            ),
          },
          {
            header: "Usage",
            width: "100px",
            render: (b) => {
              const a = analytics.get(b.id);
              return (
                <div>
                  <div className="text-xs font-700 text-gray-900 tabular-nums">{a?.usage_count ?? 0}</div>
                  <div className="text-[10px] text-gray-400">{a?.unique_users ?? 0} users</div>
                </div>
              );
            },
          },
          {
            header: "Visible",
            width: "100px",
            render: (b) => {
              const hidden = overrides.get(b.id)?.force_hidden ?? false;
              return hidden ? (
                <Badge tone="amber">hidden</Badge>
              ) : (
                <Badge tone="emerald">visible</Badge>
              );
            },
          },
          {
            header: "",
            width: "180px",
            render: (b) => {
              const ov = overrides.get(b.id);
              const hidden = ov?.force_hidden ?? false;
              return (
                <div className="flex items-center gap-1.5 justify-end">
                  <Button size="sm" variant={hidden ? "primary" : "secondary"} onClick={() => patchOverride(b.id, { force_hidden: !hidden })}>
                    {hidden ? "Show" : "Hide"}
                  </Button>
                  {ov && (
                    <Button size="sm" variant="ghost" onClick={async () => { await clearBlockOverride(b.id); toast.success("Override cleared"); void reload(); }}>
                      Reset
                    </Button>
                  )}
                </div>
              );
            },
          },
        ]}
      />
    </AdminShell>
  );
}
