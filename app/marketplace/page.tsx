"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Tag, Sparkles, Plus } from "lucide-react";
import { AppShell } from "@/components/app/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { listPublishedListings, listTags, type ListingRow } from "@/lib/marketplace/store";
import { formatPrice } from "@/lib/utils/format";
import { canPublishToMarketplace } from "@/lib/billing/gating";
import { useAuth } from "@/lib/auth/context";
import { toast } from "@/components/ui/toast";

export default function MarketplacePage() {
  const { profile } = useAuth();
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [tags, setTags] = useState<{ slug: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [items, t] = await Promise.all([listPublishedListings(), listTags()]);
        if (!alive) return;
        setListings(items);
        setTags(t);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (activeTag && !l.tags.includes(activeTag)) return false;
      if (search && !l.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [listings, activeTag, search]);

  function tryPublish() {
    const plan = profile?.plan ?? "free";
    const gate = canPublishToMarketplace(plan);
    if (!gate.ok) {
      toast.error(gate.reason ?? "Publishing requires Creator plan.");
      return;
    }
    window.location.href = "/marketplace/listings";
  }

  return (
    <AppShell
      title="Marketplace"
      actions={
        <Button size="sm" onClick={tryPublish}>
          <Plus size={14} /> Publish a strategy
        </Button>
      }
    >
      <Card className="mb-5">
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search strategies…"
                className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/15"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setActiveTag(null)}
                className={`text-xs px-2.5 py-1 rounded-full border ${activeTag === null ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"}`}
              >
                All
              </button>
              {tags.map((t) => (
                <button
                  key={t.slug}
                  onClick={() => setActiveTag(t.slug)}
                  className={`text-xs px-2.5 py-1 rounded-full border whitespace-nowrap ${activeTag === t.slug ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"}`}
                >
                  <Tag size={10} className="inline mr-1" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-sm text-gray-400">Loading marketplace…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={20} />}
          title="No listings yet"
          description="Marketplace launches with the first strategies published by Creator-tier users."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function ListingCard({ listing }: { listing: ListingRow }) {
  const free = listing.price_cents === 0;
  return (
    <a href={`/marketplace/listing?id=${listing.id}`} className="block group">
      <Card className="hover:shadow-md transition-all group-hover:-translate-y-0.5">
        <div className="aspect-video rounded-t-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent grid-bg" />
        <CardContent>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-700 text-gray-900 line-clamp-1">{listing.title}</h3>
            <Badge tone={free ? "emerald" : "amber"}>
              {free ? "Free" : formatPrice(listing.price_cents, listing.currency)}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-gray-500 line-clamp-2">{listing.description}</p>
          <div className="mt-3 flex items-center gap-1 flex-wrap">
            {listing.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[10px] uppercase tracking-wider font-600 text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                {t}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
