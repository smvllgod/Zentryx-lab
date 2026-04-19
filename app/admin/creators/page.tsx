"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { DataTable } from "@/components/admin/DataTable";
import { StatCard } from "@/components/admin/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download } from "lucide-react";
import { listTopCreators, type CreatorRow } from "@/lib/admin/queries";
import { downloadCsv } from "@/lib/admin/csv";

export default function AdminCreatorsPage() {
  const [rows, setRows] = useState<CreatorRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try { setRows(await listTopCreators(100)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void reload(); }, []);

  const totalRevenue = rows.reduce((sum, c) => sum + c.revenue_cents, 0);
  const totalListings = rows.reduce((sum, c) => sum + c.listings, 0);
  const totalSales = rows.reduce((sum, c) => sum + c.purchases, 0);

  return (
    <AdminShell
      title="Creators"
      subtitle="Marketplace performance"
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Creators" }]}
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => downloadCsv("creators.csv", rows)}>
            <Download size={12} /> CSV
          </Button>
          <Button size="sm" variant="secondary" onClick={reload}>Refresh</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
        <StatCard label="Creators" value={rows.length} tone="purple" />
        <StatCard label="Listings" value={totalListings} />
        <StatCard label="Paid sales" value={totalSales} />
        <StatCard label="Gross revenue" value={`$${(totalRevenue / 100).toFixed(2)}`} tone="emerald" />
      </div>

      <Card className="mb-4">
        <CardContent>
          <div className="flex items-start gap-3">
            <div className="text-[10px] font-700 uppercase tracking-[0.12em] text-emerald-600 shrink-0 mt-0.5">Payouts</div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Payout-ready architecture placeholder. Hook Stripe Connect or manual payout workflow here — <code>revenue_cents</code> per creator is the payable amount. Expected flow: (1) monthly batch, (2) Stripe transfer, (3) entry in a future <code>payouts</code> table.
            </p>
          </div>
        </CardContent>
      </Card>

      <DataTable
        rows={rows}
        rowKey={(c) => c.id}
        loading={loading}
        empty="No creators yet."
        columns={[
          { header: "Creator", render: (c) => (
            <div className="min-w-0">
              <a href={`/admin/users/${c.id}`} className="text-sm font-600 text-gray-900 hover:text-emerald-600 truncate block">
                {c.full_name || c.email}
              </a>
              <div className="text-[10px] text-gray-400 truncate">{c.email}</div>
            </div>
          ) },
          { header: "Listings", width: "100px", align: "right", render: (c) => <span className="text-xs font-700 text-gray-900">{c.listings}</span> },
          { header: "Paid sales", width: "100px", align: "right", render: (c) => <span className="text-xs font-700 text-gray-900">{c.purchases}</span> },
          { header: "Conversion", width: "100px", align: "right", render: (c) => <span className="text-xs text-gray-700">{c.listings === 0 ? "—" : (c.purchases / c.listings).toFixed(1)}</span> },
          { header: "Revenue", width: "110px", align: "right", render: (c) => <span className="text-xs font-700 text-emerald-600">${(c.revenue_cents / 100).toFixed(2)}</span> },
        ]}
      />
    </AdminShell>
  );
}
