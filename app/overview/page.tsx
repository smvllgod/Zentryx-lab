"use client";

import { useEffect, useState } from "react";
import { Workflow, Download, Store, Plus } from "lucide-react";
import { AppShell } from "@/components/app/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { listStrategies, type StrategyRow } from "@/lib/strategies/store";
import { useAuth } from "@/lib/auth/context";
import { formatRelative } from "@/lib/utils/format";
import { PLANS } from "@/lib/billing/plans";

export default function OverviewPage() {
  const { user, profile } = useAuth();
  const [strategies, setStrategies] = useState<StrategyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        const rows = await listStrategies();
        if (alive) setStrategies(rows);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const plan = profile?.plan ?? "free";
  const planMeta = PLANS[plan];
  const drafts = strategies.filter((s) => s.status === "draft").length;
  const exports = strategies.filter((s) => s.status === "exported" || s.status === "published").length;

  return (
    <AppShell title="Overview" actions={
      <Button asChild size="sm">
        <a href="/builder"><Plus size={14} /> New strategy</a>
      </Button>
    }>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Strategies" value={strategies.length} icon={<Workflow size={16} />} hint={`${drafts} drafts`} />
        <StatCard label="Exports" value={exports} icon={<Download size={16} />} hint="ready for MT5" />
        <StatCard label="Current plan" value={planMeta.name} icon={<Store size={16} />} hint={planMeta.tagline} />
      </div>

      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-700 text-gray-900">Recent strategies</h2>
            <a href="/strategies" className="text-xs text-emerald-600 font-600">View all →</a>
          </div>
          {loading ? (
            <div className="text-sm text-gray-400 py-6 text-center">Loading…</div>
          ) : strategies.length === 0 ? (
            <EmptyState
              title="No strategies yet"
              description="Create your first strategy and export your first .mq5 in minutes."
              action={
                <Button asChild>
                  <a href="/builder"><Plus size={14} /> Create strategy</a>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-gray-100">
              {strategies.slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <a href={`/builder?id=${s.id}`} className="text-sm font-600 text-gray-900 hover:text-emerald-600">
                      {s.name}
                    </a>
                    <div className="text-xs text-gray-400 mt-0.5">Updated {formatRelative(s.updated_at)}</div>
                  </div>
                  <Badge tone={s.status === "published" ? "purple" : s.status === "exported" ? "emerald" : "default"}>
                    {s.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-600 uppercase tracking-wider text-gray-400">{label}</div>
            <div className="mt-2 text-2xl font-700 text-gray-900">{value}</div>
            {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
