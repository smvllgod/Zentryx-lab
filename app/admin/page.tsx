"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, CreditCard, Workflow, Download, Store, AlertTriangle, DollarSign, TrendingUp, ExternalLink } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard } from "@/components/admin/StatCard";
import { DateRangePicker, rangeToSince, type DateRange } from "@/components/admin/DateRangePicker";
import { BlocksHeatmap } from "@/components/admin/BlocksHeatmap";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  fetchOverviewStats,
  fetchRecentErrors,
  listBlockAnalytics,
  listTopCreators,
  dailyCount,
  type OverviewStats,
  type CreatorRow,
} from "@/lib/admin/queries";
import { formatRelative } from "@/lib/utils/format";
import { getBlock } from "@/lib/blocks";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [errors, setErrors] = useState<{ id: string; level: string; source: string | null; message: string; created_at: string }[]>([]);
  const [topBlocks, setTopBlocks] = useState<{ block_id: string; usage_count: number; unique_users: number }[]>([]);
  const [blocksAnalyticsMap, setBlocksAnalyticsMap] = useState<Map<string, { usage_count: number }>>(new Map());
  const [topCreators, setTopCreators] = useState<CreatorRow[]>([]);
  const [range, setRange] = useState<DateRange>("30d");
  const [signups, setSignups] = useState<number[]>([]);
  const [strategies, setStrategies] = useState<number[]>([]);
  const [exports, setExports] = useState<number[]>([]);
  const [purchases, setPurchases] = useState<number[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const days = range === "24h" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 30;
        const [s, e, b, c, p, st, ex, pu] = await Promise.all([
          fetchOverviewStats(),
          fetchRecentErrors(8),
          listBlockAnalytics(),
          listTopCreators(5),
          dailyCount("profiles", days),
          dailyCount("strategies", days),
          dailyCount("exports", days),
          dailyCount("purchases", days),
        ]);
        if (!alive) return;
        setStats(s);
        setErrors(e as typeof errors);
        setTopBlocks(b.slice(0, 10));
        const map = new Map(b.map((r) => [r.block_id, { usage_count: r.usage_count }]));
        setBlocksAnalyticsMap(map);
        setTopCreators(c);
        setSignups(p.map((d) => d.count));
        setStrategies(st.map((d) => d.count));
        setExports(ex.map((d) => d.count));
        setPurchases(pu.map((d) => d.count));
      } catch (err) {
        console.error("[admin/overview]", err);
      }
    })();
    return () => { alive = false; };
  }, [range]);

  const since = rangeToSince(range);
  const signupsInRange = useMemo(() => signups.reduce((a, b) => a + b, 0), [signups]);
  const strategiesInRange = useMemo(() => strategies.reduce((a, b) => a + b, 0), [strategies]);
  const exportsInRange = useMemo(() => exports.reduce((a, b) => a + b, 0), [exports]);
  const purchasesInRange = useMemo(() => purchases.reduce((a, b) => a + b, 0), [purchases]);

  return (
    <AdminShell
      title="Platform overview"
      subtitle="Real-time snapshot"
      breadcrumbs={[{ label: "Admin" }, { label: "Overview" }]}
      actions={<DateRangePicker value={range} onChange={setRange} />}
    >
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Signups"
          value={signupsInRange}
          hint={`${stats?.totalUsers ?? 0} total users`}
          icon={<Users size={16} />}
          tone="emerald"
          trend={signups}
        />
        <StatCard
          label="Paying subscribers"
          value={stats?.payingSubscribers ?? "—"}
          hint={`${stats?.proSubs ?? 0} Pro · ${stats?.creatorSubs ?? 0} Creator`}
          icon={<CreditCard size={16} />}
          tone="emerald"
        />
        <StatCard
          label="Estimated MRR"
          value={`$${stats?.mrrUsd ?? 0}`}
          hint="USD · plan × active subs"
          icon={<DollarSign size={16} />}
          tone="emerald"
        />
        <StatCard
          label="Recent errors"
          value={stats?.recentErrors ?? "—"}
          hint="last 7d, client-reported"
          icon={<AlertTriangle size={16} />}
          tone={(stats?.recentErrors ?? 0) > 0 ? "red" : "default"}
        />
      </div>

      {/* KPI row 2 with trends */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <StatCard label="Strategies created" value={strategiesInRange} hint={`${stats?.totalStrategies ?? 0} total`} icon={<Workflow size={16} />} tone="blue" trend={strategies} />
        <StatCard label="Exports" value={exportsInRange} hint={`${stats?.totalExports ?? 0} total`} icon={<Download size={16} />} tone="blue" trend={exports} />
        <StatCard label="Listings" value={stats?.totalListings ?? "—"} hint="marketplace" icon={<Store size={16} />} tone="purple" />
        <StatCard label="Purchases (paid)" value={purchasesInRange} hint={`${stats?.totalPurchases ?? 0} total`} icon={<TrendingUp size={16} />} tone="purple" trend={purchases} />
      </div>

      {/* Blocks usage heatmap */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[12px] font-700 uppercase tracking-wider text-gray-500">Block usage by family</h2>
          <a href="/admin/blocks" className="text-[11px] text-emerald-600 font-600 hover:text-emerald-700 inline-flex items-center gap-1">
            Open registry <ExternalLink size={10} />
          </a>
        </div>
        <BlocksHeatmap analytics={blocksAnalyticsMap} />
      </div>

      {/* Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-700 text-gray-900">Top logic blocks</h2>
              <a href="/admin/blocks" className="text-xs text-emerald-600 font-600">View all →</a>
            </div>
            {topBlocks.length === 0 ? (
              <div className="text-xs text-gray-400 py-8 text-center">No usage events yet.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {topBlocks.map((b, i) => {
                  const def = getBlock(b.block_id);
                  return (
                    <li key={b.block_id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-5 text-[10px] font-700 text-gray-400 tabular-nums">{i + 1}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-600 text-gray-900 truncate">{def?.displayName ?? b.block_id}</div>
                          <div className="text-[10px] text-gray-400 truncate">{b.block_id} · {b.unique_users} users</div>
                        </div>
                      </div>
                      <div className="text-xs font-700 text-emerald-600 tabular-nums">{b.usage_count}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-700 text-gray-900">Top creators</h2>
              <a href="/admin/creators" className="text-xs text-emerald-600 font-600">View all →</a>
            </div>
            {topCreators.length === 0 ? (
              <div className="text-xs text-gray-400 py-8 text-center">No creators yet.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {topCreators.map((c, i) => (
                  <li key={c.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-5 text-[10px] font-700 text-gray-400 tabular-nums">{i + 1}</span>
                      <div className="min-w-0">
                        <a href={`/admin/users/${c.id}`} className="text-sm font-600 text-gray-900 hover:text-emerald-600 truncate block">
                          {c.full_name ?? c.email}
                        </a>
                        <div className="text-[10px] text-gray-400 truncate">{c.listings} listings · {c.purchases} sales</div>
                      </div>
                    </div>
                    <div className="text-xs font-700 text-gray-700 tabular-nums">${(c.revenue_cents / 100).toFixed(2)}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-700 text-gray-900">Recent system errors</h2>
              <a href="/admin/audit" className="text-xs text-emerald-600 font-600">Audit log →</a>
            </div>
            {errors.length === 0 ? (
              <div className="text-xs text-gray-400 py-6 text-center">No recent errors. 🎉</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {errors.map((e) => (
                  <li key={e.id} className="py-2.5 flex items-start gap-3">
                    <Badge tone={e.level === "error" ? "red" : e.level === "warn" ? "amber" : "blue"} className="shrink-0 mt-0.5 text-[8px] px-1.5 py-0">{e.level}</Badge>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-700 truncate">{e.message}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{e.source ?? "unknown"} · {formatRelative(e.created_at)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {since && (
        <div className="mt-4 text-[10px] text-gray-400 text-right">
          Range since {new Date(since).toLocaleString()} · autorefreshing on filter change
        </div>
      )}
    </AdminShell>
  );
}
