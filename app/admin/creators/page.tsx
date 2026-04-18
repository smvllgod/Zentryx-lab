"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { DataTable } from "@/components/admin/DataTable";
import { StatCard } from "@/components/admin/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listTopCreators, type CreatorRow } from "@/lib/admin/queries";

export default function AdminCreatorsPage() {
  const [rows, setRows] = useState<CreatorRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      const r = await listTopCreators(50);
      setRows(r);
    } finally { setLoading(false); }
  }
  useEffect(() => { void reload(); }, []);

  const totalRevenue = rows.reduce((sum, c) => sum + c.revenue_cents, 0);
  const totalListings = rows.reduce((sum, c) => sum + c.listings, 0);
  const totalSales = rows.reduce((sum, c) => sum + c.purchases, 0);

  return (
    <AdminShell
      title="Creators"
      subtitle="Top creators and their marketplace performance."
      actions={<Button variant="secondary" size="sm" onClick={reload}>Refresh</Button>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total creators" value={rows.length} tone="purple" />
        <StatCard label="Listings" value={totalListings} />
        <StatCard label="Paid sales" value={totalSales} />
        <StatCard label="Gross revenue" value={`$${(totalRevenue / 100).toFixed(2)}`} tone="emerald" />
      </div>

      <Card className="mb-4">
        <CardContent>
          <div className="flex items-start gap-3">
            <div className="text-[11px] font-700 uppercase tracking-wider text-emerald-600 shrink-0">Payouts</div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Payout-ready architecture placeholder. Plug Stripe Connect or manual payout workflow here — the per-creator <code>revenue_cents</code> above is the payable amount.
              <br />Expected flow: (1) payout batch created monthly, (2) Stripe transfer to each creator&apos;s connected account, (3) entry written to a future <code>payouts</code> table.
            </p>
          </div>
        </CardContent>
      </Card>

      <DataTable
        rows={rows}
        rowKey={(c) => c.id}
        loading={loading}
        columns={[
          {
            header: "Creator",
            render: (c) => (
              <div className="min-w-0">
                <a href={`/admin/users/${c.id}`} className="text-sm font-600 text-gray-900 hover:text-emerald-600 truncate block">
                  {c.full_name || c.email}
                </a>
                <div className="text-[10px] text-gray-400 truncate">{c.email}</div>
              </div>
            ),
          },
          { header: "Listings", width: "110px", render: (c) => <span className="text-xs font-700 text-gray-900 tabular-nums">{c.listings}</span> },
          { header: "Paid sales", width: "110px", render: (c) => <span className="text-xs font-700 text-gray-900 tabular-nums">{c.purchases}</span> },
          {
            header: "Conversion",
            width: "110px",
            render: (c) => {
              const conv = c.listings > 0 ? (c.purchases / c.listings) : 0;
              return <span className="text-xs text-gray-700 tabular-nums">{c.listings === 0 ? "—" : conv.toFixed(1)}</span>;
            },
          },
          { header: "Revenue", width: "110px", render: (c) => <span className="text-xs font-700 text-emerald-600 tabular-nums">${(c.revenue_cents / 100).toFixed(2)}</span> },
        ]}
      />
    </AdminShell>
  );
}
