"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { toast } from "@/components/ui/toast";
import { listFeatureFlags, setFeatureFlag } from "@/lib/admin/queries";
import { KNOWN_FLAGS } from "@/lib/blocks";
import type { Tables } from "@/lib/supabase/types";
import { cn } from "@/lib/utils/cn";

type Flag = Tables<"feature_flags">;

export default function AdminFlagsPage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<null | { slug: string; enable: boolean; description: string | null }>(null);

  async function reload() {
    setLoading(true);
    try { setFlags((await listFeatureFlags()) as Flag[]); }
    finally { setLoading(false); }
  }
  useEffect(() => { void reload(); }, []);

  const merged = [...KNOWN_FLAGS].map((slug) => {
    const row = flags.find((f) => f.slug === slug);
    return {
      slug,
      enabled: row?.enabled ?? false,
      description: row?.description ?? null,
    };
  });

  return (
    <AdminShell
      title="Feature flags & block control"
      subtitle="Global toggles · per-block overrides"
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Flags" }]}
      actions={<Button size="sm" variant="secondary" onClick={reload}>Refresh</Button>}
    >
      <Card>
        <CardContent>
          <h3 className="text-sm font-700 text-gray-900 mb-1">Global feature flags</h3>
          <p className="text-xs text-gray-500 mb-4">
            When ON, exposes any blocks whose <code>flags</code> list contains this slug. Changes are audited.
          </p>

          {loading ? (
            <div className="text-xs text-gray-400 text-center py-6">Loading…</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {merged.map((f) => (
                <li key={f.slug} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-600 text-gray-900">{f.slug}</code>
                      {f.enabled ? <Badge tone="emerald">on</Badge> : <Badge tone="slate">off</Badge>}
                    </div>
                    {f.description && <div className="text-[11px] text-gray-500 mt-0.5">{f.description}</div>}
                  </div>
                  <button
                    onClick={() => setPending({ slug: f.slug, enable: !f.enabled, description: f.description })}
                    className={cn(
                      "relative inline-flex h-6 w-10 items-center rounded-full transition-colors",
                      f.enabled ? "bg-emerald-500" : "bg-gray-300",
                    )}
                    aria-label={`Toggle ${f.slug}`}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                        f.enabled ? "translate-x-5" : "translate-x-1",
                      )}
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent>
          <h3 className="text-sm font-700 text-gray-900 mb-1">Block-level control</h3>
          <p className="text-xs text-gray-500 mb-3">
            Per-block status, plan gating and visibility live on the{" "}
            <a href="/admin/blocks" className="text-emerald-600 font-600 hover:underline">Logic Blocks</a> page. Changes are audited to <a href="/admin/audit" className="text-emerald-600 font-600 hover:underline">Audit log</a>.
          </p>
          <a href="/admin/blocks" className="text-xs font-600 text-emerald-600 hover:underline">Open block control →</a>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(v) => !v && setPending(null)}
        title={pending?.enable ? `Enable "${pending.slug}"?` : `Disable "${pending?.slug}"?`}
        body={pending?.enable
          ? "Blocks depending on this flag become visible to users on the matching plan."
          : "Blocks depending on this flag become hidden. Existing strategies keep working."}
        destructive={!pending?.enable}
        onConfirm={async () => {
          if (!pending) return;
          try { await setFeatureFlag(pending.slug, pending.enable); toast.success(`${pending.slug}: ${pending.enable ? "ON" : "OFF"}`); await reload(); }
          catch (err) { toast.error("Failed: " + (err as Error).message); }
        }}
      />
    </AdminShell>
  );
}
