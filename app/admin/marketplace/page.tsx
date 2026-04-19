"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { DataTable, OwnerLink } from "@/components/admin/DataTable";
import { StatCard } from "@/components/admin/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Download } from "lucide-react";
import {
  listListingsAdmin,
  setListingStatus,
  listListingFlags,
  resolveListingFlag,
} from "@/lib/admin/queries";
import { toast } from "@/components/ui/toast";
import { formatRelative } from "@/lib/utils/format";
import { downloadCsv } from "@/lib/admin/csv";
import type { Tables } from "@/lib/supabase/types";

type Listing = Tables<"marketplace_listings">;
type Flag = Tables<"listing_flags">;

export default function AdminMarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<null | { id: string; title: string; to: "draft" | "published" | "archived" }>(null);

  async function reload() {
    setLoading(true);
    try {
      const [l, f] = await Promise.all([
        listListingsAdmin({ status: status || undefined, query: query || undefined, limit: 200 }),
        listListingFlags({ resolved: false }),
      ]);
      setListings(l as Listing[]);
      setFlags(f as Flag[]);
    } finally { setLoading(false); }
  }
  useEffect(() => { void reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [status]);

  const published = listings.filter((l) => l.status === "published").length;
  const drafts = listings.filter((l) => l.status === "draft").length;
  const archived = listings.filter((l) => l.status === "archived").length;

  return (
    <AdminShell
      title="Marketplace"
      subtitle="Listings moderation, flags, featured picks"
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Marketplace" }]}
      actions={
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && reload()}
            placeholder="Search title…"
            className="h-8 w-52 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-300"
          />
          <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </NativeSelect>
          <Button size="sm" variant="secondary" onClick={() => downloadCsv("listings.csv", listings)}>
            <Download size={12} /> CSV
          </Button>
          <Button size="sm" variant="secondary" onClick={reload}>Refresh</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
        <StatCard label="Published" value={published} tone="emerald" />
        <StatCard label="Drafts" value={drafts} />
        <StatCard label="Archived" value={archived} />
        <StatCard label="Open flags" value={flags.length} tone={flags.length > 0 ? "red" : "default"} />
      </div>

      {flags.length > 0 && (
        <div className="mb-5 rounded-2xl border border-red-200/60 bg-red-50/30 p-4">
          <h3 className="text-sm font-700 text-red-700 mb-2">Open moderation flags ({flags.length})</h3>
          <ul className="divide-y divide-red-100">
            {flags.map((f) => (
              <li key={f.id} className="py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm text-gray-900 truncate">{f.reason}</div>
                  <div className="text-[10px] text-gray-400">listing {f.listing_id.slice(0, 8)} · {formatRelative(f.created_at)}</div>
                </div>
                <Button size="sm" variant="secondary" onClick={async () => {
                  try { await resolveListingFlag(f.id); toast.success("Resolved"); await reload(); }
                  catch (err) { toast.error("Failed: " + (err as Error).message); }
                }}>Resolve</Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <DataTable
        rows={listings}
        rowKey={(l) => l.id}
        loading={loading}
        columns={[
          { header: "Listing", render: (l) => (
            <div className="min-w-0">
              <div className="text-sm font-600 text-gray-900 truncate">{l.title}</div>
              <div className="text-[10px] text-gray-400 truncate">{l.description}</div>
            </div>
          ) },
          { header: "Price", width: "90px", align: "right", render: (l) => <span className="text-sm text-gray-700">${(l.price_cents / 100).toFixed(2)}</span> },
          { header: "DL", width: "70px", hideOnSmall: true, align: "right", render: (l) => <span className="text-xs text-gray-700">{l.downloads}</span> },
          { header: "Rating", width: "80px", hideOnSmall: true, align: "right", render: (l) => <span className="text-xs text-gray-700">{l.rating ? l.rating.toFixed(1) : "—"}</span> },
          { header: "Author", width: "120px", render: (l) => <OwnerLink userId={l.author_id} /> },
          { header: "Status", width: "110px", render: (l) => <Badge tone={l.status === "published" ? "emerald" : l.status === "archived" ? "slate" : "default"}>{l.status}</Badge> },
          { header: "Override", width: "170px", align: "right", render: (l) => (
            <NativeSelect
              value={l.status}
              onChange={(e) => setPending({ id: l.id, title: l.title, to: e.target.value as "draft" | "published" | "archived" })}
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </NativeSelect>
          ) },
        ]}
      />

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(v) => !v && setPending(null)}
        title={`Move "${pending?.title}" → ${pending?.to}?`}
        body={pending?.to === "published"
          ? "This listing becomes visible on the marketplace immediately."
          : pending?.to === "archived"
          ? "Archived listings are hidden from all buyers. Purchases remain."
          : "Listing returns to the creator's draft state."}
        destructive={pending?.to === "archived"}
        onConfirm={async () => {
          if (!pending) return;
          try { await setListingStatus(pending.id, pending.to); toast.success(`→ ${pending.to}`); await reload(); }
          catch (err) { toast.error("Failed: " + (err as Error).message); }
        }}
      />
    </AdminShell>
  );
}
