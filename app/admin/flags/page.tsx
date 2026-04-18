"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { listFeatureFlags, setFeatureFlag } from "@/lib/admin/queries";
import { KNOWN_FLAGS } from "@/lib/blocks";
import type { Tables } from "@/lib/supabase/types";
import { cn } from "@/lib/utils/cn";

type Flag = Tables<"feature_flags">;

export default function AdminFlagsPage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try { setFlags((await listFeatureFlags()) as Flag[]); }
    finally { setLoading(false); }
  }
  useEffect(() => { void reload(); }, []);

  async function toggle(slug: string, enabled: boolean) {
    try {
      await setFeatureFlag(slug, enabled);
      toast.success(`${slug}: ${enabled ? "ON" : "OFF"}`);
      void reload();
    } catch (err) {
      toast.error("Failed: " + (err as Error).message);
    }
  }

  // Merge DB flags with the registry's KNOWN_FLAGS so admins can see flags
  // declared in code even if no DB row exists yet.
  const merged = [...KNOWN_FLAGS].map((slug) => {
    const row = flags.find((f) => f.slug === slug);
    return {
      slug,
      enabled: row?.enabled ?? false,
      description: row?.description ?? null,
      updated_at: row?.updated_at ?? null,
    };
  });

  return (
    <AdminShell
      title="Feature flags & block control"
      subtitle="Toggle gated features and control which blocks appear in the builder."
      actions={<Button variant="secondary" size="sm" onClick={reload}>Refresh</Button>}
    >
      <Card>
        <CardContent>
          <h3 className="text-sm font-700 text-gray-900 mb-1">Global feature flags</h3>
          <p className="text-xs text-gray-500 mb-4">
            Flags are read by the block registry. Turning one ON exposes any blocks whose <code>flags</code> list contains it.
          </p>

          {loading && <div className="text-xs text-gray-400 text-center py-6">Loading…</div>}
          {!loading && (
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
                    onClick={() => toggle(f.slug, !f.enabled)}
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
            Per-block status, plan gating, and visibility toggles live on the{" "}
            <a href="/admin/blocks" className="text-emerald-600 font-600 hover:underline">Logic Blocks</a> page.
            Changes are written to the <code>block_registry_overrides</code> table and picked up by the builder on next page-load.
          </p>
          <a href="/admin/blocks" className="text-xs font-600 text-emerald-600 hover:underline">Open block control →</a>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
