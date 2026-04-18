"use client";

import { useEffect, useState } from "react";
import { Users, CreditCard, Workflow, Download, Store, AlertTriangle, DollarSign, TrendingUp } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard } from "@/components/admin/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchOverviewStats, fetchRecentErrors, listBlockAnalytics, listTopCreators, type OverviewStats, type CreatorRow } from "@/lib/admin/queries";
import { formatRelative } from "@/lib/utils/format";
import { getBlock } from "@/lib/blocks";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [errors, setErrors] = useState<{ id: string; level: string; source: string | null; message: string; created_at: string }[]>([]);
  const [topBlocks, setTopBlocks] = useState<{ block_id: string; usage_count: number }[]>([]);
  const [topCreators, setTopCreators] = useState<CreatorRow[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [s, e, b, c] = await Promise.all([
          fetchOverviewStats(),
          fetchRecentErrors(8),
          listBlockAnalytics(),
          listTopCreators(5),
        ]);
        if (!alive) return;
        setStats(s);
        setErrors(e as typeof errors);
        setTopBlocks(b.slice(0, 8));
        setTopCreators(c);
      } catch (err) {
        console.error("[admin/overview]", err);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <AdminShell title="Platform overview" subtitle="Real-time snapshot of Zentryx Lab.">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total users" value={stats?.totalUsers ?? "—"} hint={`${stats?.newSignups7d ?? 0} new in 7d`} icon={<Users size={16} />} tone="emerald" />
        <StatCard label="Paying subs" value={stats?.payingSubscribers ?? "—"} hint={`${stats?.proSubs ?? 0} Pro · ${stats?.creatorSubs ?? 0} Creator`} icon={<CreditCard size={16} />} tone="emerald" />
        <StatCard label="MRR (estimated)" value={`$${stats?.mrrUsd ?? 0}`} hint="USD · from plan × active subs" icon={<DollarSign size={16} />} tone="emerald" />
        <StatCard label="Recent errors (7d)" value={stats?.recentErrors ?? "—"} hint="client-reported" icon={<AlertTriangle size={16} />} tone={(stats?.recentErrors ?? 0) > 0 ? "red" : "default"} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <StatCard label="Strategies" value={stats?.totalStrategies ?? "—"} icon={<Workflow size={16} />} />
        <StatCard label="Exports" value={stats?.totalExports ?? "—"} icon={<Download size={16} />} />
        <StatCard label="Listings" value={stats?.totalListings ?? "—"} icon={<Store size={16} />} />
        <StatCard label="Purchases" value={stats?.totalPurchases ?? "—"} icon={<TrendingUp size={16} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-700 text-gray-900">Top used logic blocks</h2>
              <a href="/admin/blocks" className="text-xs text-emerald-600 font-600">View all →</a>
            </div>
            {topBlocks.length === 0 ? (
              <div className="text-xs text-gray-400 py-8 text-center">No usage events yet.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {topBlocks.map((b) => {
                  const def = getBlock(b.block_id);
                  return (
                    <li key={b.block_id} className="flex items-center justify-between py-2.5">
                      <div className="min-w-0">
                        <div className="text-sm font-600 text-gray-900 truncate">
                          {def?.displayName ?? b.block_id}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">{b.block_id}</div>
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
                {topCreators.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <div className="text-sm font-600 text-gray-900 truncate">{c.full_name ?? c.email}</div>
                      <div className="text-[10px] text-gray-400 truncate">{c.listings} listings · {c.purchases} sales</div>
                    </div>
                    <div className="text-xs font-700 text-gray-700 tabular-nums">${(c.revenue_cents / 100).toFixed(2)}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-700 text-gray-900">Recent system errors</h2>
              <span className="text-[10px] text-gray-400">Last 8</span>
            </div>
            {errors.length === 0 ? (
              <div className="text-xs text-gray-400 py-6 text-center">No recent errors. 🎉</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {errors.map((e) => (
                  <li key={e.id} className="py-2.5 flex items-start gap-3">
                    <Badge tone={e.level === "error" ? "red" : e.level === "warn" ? "amber" : "blue"} className="shrink-0 mt-0.5">
                      {e.level}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-700 truncate">{e.message}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {e.source ?? "unknown"} · {formatRelative(e.created_at)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
