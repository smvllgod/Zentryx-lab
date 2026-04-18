"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { DataTable } from "@/components/admin/DataTable";
import { StatCard } from "@/components/admin/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import {
  listListingsAdmin,
  setListingStatus,
  listListingFlags,
  resolveListingFlag,
} from "@/lib/admin/queries";
import { toast } from "@/components/ui/toast";
import { formatRelative } from "@/lib/utils/format";
import type { Tables } from "@/lib/supabase/types";

type Listing = Tables<"marketplace_listings">;
type Flag = Tables<"listing_flags">;

export default function AdminMarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

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
  useEffect(() => { void reload(); }, [status]);   // eslint-disable-line react-hooks/exhaustive-deps

  const published = listings.filter((l) => l.status === "published").length;
  const drafts = listings.filter((l) => l.status === "draft").length;
  const archived = listings.filter((l) => l.status === "archived").length;

  return (
    <AdminShell
      title="Marketplace"
      subtitle="Listings moderation, flags, featured picks."
      actions={
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && reload()}
            placeholder="Search title…"
            className="h-9 w-56 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-300"
          />
          <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </NativeSelect>
          <Button variant="secondary" size="sm" onClick={reload}>Refresh</Button>
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
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50/30 p-4">
          <h3 className="text-sm font-700 text-red-700 mb-2">Open moderation flags ({flags.length})</h3>
          <ul className="divide-y divide-red-100">
            {flags.map((f) => (
              <li key={f.id} className="py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm text-gray-900 truncate">{f.reason}</div>
                  <div className="text-[10px] text-gray-400">listing {f.listing_id.slice(0, 8)} · {formatRelative(f.created_at)}</div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await resolveListingFlag(f.id);
                      toast.success("Resolved");
                      void reload();
                    } catch (err) {
                      toast.error("Failed: " + (err as Error).message);
                    }
                  }}
                >
                  Resolve
                </Button>
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
          {
            header: "Listing",
            render: (l) => (
              <div className="min-w-0">
                <div className="text-sm font-600 text-gray-900 truncate">{l.title}</div>
                <div className="text-[10px] text-gray-400 truncate">{l.description}</div>
              </div>
            ),
          },
          { header: "Price", width: "90px", render: (l) => <span className="text-sm text-gray-700">${(l.price_cents / 100).toFixed(2)}</span> },
          { header: "Downloads", width: "110px", render: (l) => <span className="text-xs text-gray-700 tabular-nums">{l.downloads}</span> },
          { header: "Rating", width: "90px", render: (l) => <span className="text-xs text-gray-700">{l.rating ? l.rating.toFixed(1) : "—"}</span> },
          { header: "Status", width: "110px", render: (l) => <Badge tone={l.status === "published" ? "emerald" : l.status === "archived" ? "slate" : "default"}>{l.status}</Badge> },
          {
            header: "",
            width: "200px",
            render: (l) => (
              <div className="flex items-center gap-1.5 justify-end">
                <NativeSelect
                  value={l.status}
                  onChange={async (e) => {
                    try {
                      await setListingStatus(l.id, e.target.value as "draft" | "published" | "archived");
                      toast.success(`→ ${e.target.value}`);
                      void reload();
                    } catch (err) {
                      toast.error("Failed: " + (err as Error).message);
                    }
                  }}
                >
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                  <option value="archived">archived</option>
                </NativeSelect>
                <Button size="sm" variant="secondary" onClick={() => toast.info("Featured listings coming in next release.")}>
                  Feature
                </Button>
              </div>
            ),
          },
        ]}
      />
    </AdminShell>
  );
}
