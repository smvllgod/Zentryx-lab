"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search, Sparkles, Plus, Star, Download, TrendingUp, Crown, Filter,
  DollarSign, Zap, ShoppingBag, Flame,
} from "lucide-react";
import { PublicShell } from "@/components/app/public-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listPublishedListingsWithAuthors,
  listTags,
  type ListingWithAuthor,
} from "@/lib/marketplace/store";
import { canPublishToMarketplace } from "@/lib/billing/gating";
import { useAuth } from "@/lib/auth/context";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import { formatRelative } from "@/lib/utils/format";

type SortKey = "featured" | "newest" | "top-rated" | "most-downloaded" | "price-low" | "price-high";
type PriceFilter = "all" | "free" | "paid";

export default function MarketplacePage() {
  const { user, profile } = useAuth();
  const [listings, setListings] = useState<ListingWithAuthor[]>([]);
  const [tags, setTags] = useState<{ slug: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [price, setPrice] = useState<PriceFilter>("all");
  const [sort, setSort] = useState<SortKey>("featured");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [items, t] = await Promise.all([listPublishedListingsWithAuthors(), listTags()]);
        if (!alive) return;
        setListings(items);
        setTags(t);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    let out = [...listings];
    if (search) {
      const q = search.toLowerCase();
      out = out.filter((l) =>
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (activeTags.size) {
      out = out.filter((l) => l.tags.some((t) => activeTags.has(t)));
    }
    if (price === "free") out = out.filter((l) => l.price_cents === 0);
    if (price === "paid") out = out.filter((l) => l.price_cents > 0);
    switch (sort) {
      case "newest":
        out.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case "top-rated":
        out.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break;
      case "most-downloaded":
        out.sort((a, b) => b.downloads - a.downloads); break;
      case "price-low":
        out.sort((a, b) => a.price_cents - b.price_cents); break;
      case "price-high":
        out.sort((a, b) => b.price_cents - a.price_cents); break;
      case "featured":
      default:
        out.sort((a, b) => (b.downloads * 2 + (b.rating ?? 0) * 20) - (a.downloads * 2 + (a.rating ?? 0) * 20));
    }
    return out;
  }, [listings, search, activeTags, price, sort]);

  const featured = useMemo(
    () => listings.slice().sort((a, b) => b.downloads - a.downloads).slice(0, 3),
    [listings],
  );

  function toggleTag(slug: string) {
    const next = new Set(activeTags);
    next.has(slug) ? next.delete(slug) : next.add(slug);
    setActiveTags(next);
  }

  function onPublishClick() {
    if (!user) { window.location.href = "/sign-in?returnTo=/marketplace"; return; }
    const plan = profile?.plan ?? "free";
    const gate = canPublishToMarketplace(plan);
    if (!gate.ok) {
      toast.error(gate.reason ?? "Publishing requires Creator plan.");
      return;
    }
    window.location.href = "/marketplace/listings";
  }

  return (
    <PublicShell>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50/60 via-white to-white border-b border-gray-100">
        <div className="absolute inset-0 grid-bg opacity-[0.5]" aria-hidden="true" />
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-14 relative">
          <div className="flex items-center gap-2 text-[10px] font-700 uppercase tracking-[0.18em] text-emerald-700 mb-3">
            <Sparkles size={12} /> <span>Zentryx Marketplace</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-700 text-gray-900 tracking-tight max-w-3xl">
            Production-ready MT5 strategies. <span className="text-emerald-600">Download and run.</span>
          </h1>
          <p className="mt-4 text-base text-gray-600 max-w-2xl">
            Community-built Expert Advisors — built visually in Zentryx Lab, exported as native .mq5 files.
            Browse freely; sign in to buy.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 max-w-2xl">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, style, asset, or author…"
                className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm text-gray-900 shadow-[0_2px_8px_rgba(15,23,42,0.04)] focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
              />
            </div>
            <Button size="lg" onClick={onPublishClick} className="whitespace-nowrap">
              <Plus size={15} /> Publish a strategy
            </Button>
          </div>
          <div className="mt-6 flex items-center gap-5 text-[11px] text-gray-500">
            <div className="flex items-center gap-1.5"><Download size={12} /> <span>{listings.reduce((s, l) => s + l.downloads, 0)} total downloads</span></div>
            <div className="flex items-center gap-1.5"><ShoppingBag size={12} /> <span>{listings.length} live listings</span></div>
            <div className="flex items-center gap-1.5"><Crown size={12} /> <span>{new Set(listings.map((l) => l.author_id)).size} creators</span></div>
          </div>
        </div>
      </section>

      {/* Featured strip */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-5 lg:px-8 pt-10">
          <div className="flex items-center gap-2 text-[10px] font-700 uppercase tracking-[0.18em] text-gray-500 mb-3">
            <Flame size={12} className="text-amber-500" /> Featured this week
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {featured.map((l) => <FeaturedCard key={l.id} listing={l} />)}
          </div>
        </section>
      )}

      {/* Browse */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 pt-12 pb-14">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-60 shrink-0 space-y-6 lg:sticky lg:top-20 self-start">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-700 uppercase tracking-[0.14em] text-gray-500 mb-2">
                <Filter size={11} /> Filters
              </div>
              <div className="space-y-1">
                {(["all", "free", "paid"] as PriceFilter[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPrice(p)}
                    className={cn(
                      "w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors",
                      price === p ? "bg-emerald-50 text-emerald-700 font-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    )}
                  >
                    {p === "all" ? "All listings" : p === "free" ? "Free" : "Paid"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-700 uppercase tracking-[0.14em] text-gray-500 mb-2">Styles</div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <button
                    key={t.slug}
                    onClick={() => toggleTag(t.slug)}
                    className={cn(
                      "text-[11px] rounded-full border px-2.5 py-1 transition-colors",
                      activeTags.has(t.slug)
                        ? "bg-gray-900 border-gray-900 text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {(activeTags.size > 0 || price !== "all") && (
              <button
                onClick={() => { setActiveTags(new Set()); setPrice("all"); }}
                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-600"
              >
                Clear filters
              </button>
            )}
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="text-[11px] text-gray-500">
                <span className="font-700 text-gray-900">{filtered.length}</span>{" "}
                {filtered.length === 1 ? "listing" : "listings"}
                {(activeTags.size > 0 || search || price !== "all") && " match your filters"}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-700 uppercase tracking-wider text-gray-400">Sort</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="h-8 rounded-lg border border-gray-200 bg-white px-2.5 text-xs text-gray-900 focus:outline-none focus:border-emerald-300"
                >
                  <option value="featured">Featured</option>
                  <option value="newest">Newest</option>
                  <option value="top-rated">Top rated</option>
                  <option value="most-downloaded">Most downloaded</option>
                  <option value="price-low">Price: low → high</option>
                  <option value="price-high">Price: high → low</option>
                </select>
              </div>
            </div>

            {loading ? (
              <LoadingGrid />
            ) : filtered.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((l) => <ListingCard key={l.id} listing={l} signedIn={!!user} />)}
              </div>
            )}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

function FeaturedCard({ listing: l }: { listing: ListingWithAuthor }) {
  return (
    <a href={`/marketplace/listing?id=${l.id}`} className="group relative block rounded-2xl overflow-hidden border border-gray-200/80 bg-gradient-to-br from-gray-900 to-gray-800 text-white p-5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
      <div className="absolute inset-0 opacity-40 grid-bg" aria-hidden="true" />
      <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden="true" />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[9px] font-700 uppercase tracking-[0.18em] text-emerald-400">
            <TrendingUp size={10} /> {l.tags[0] ?? "strategy"}
          </div>
          <h3 className="mt-2 text-lg font-700 leading-tight line-clamp-2">{l.title}</h3>
        </div>
        <Badge tone={l.price_cents === 0 ? "emerald" : "amber"} className="shrink-0">
          {l.price_cents === 0 ? "Free" : `$${(l.price_cents / 100).toFixed(0)}`}
        </Badge>
      </div>
      <p className="relative mt-3 text-xs text-white/70 line-clamp-2 leading-relaxed">{l.description}</p>
      <div className="relative mt-4 flex items-center gap-3 text-[10px] text-white/70">
        <span className="inline-flex items-center gap-1"><Download size={10} /> {l.downloads}</span>
        {l.rating != null && <span className="inline-flex items-center gap-1"><Star size={10} className="text-amber-400 fill-amber-400" /> {l.rating.toFixed(1)}</span>}
        {l.author && <span className="truncate">by {l.author.full_name ?? l.author.email}</span>}
      </div>
    </a>
  );
}

function ListingCard({ listing: l, signedIn }: { listing: ListingWithAuthor; signedIn: boolean }) {
  const free = l.price_cents === 0;
  const price = free ? "Free" : `$${(l.price_cents / 100).toFixed(2)}`;
  const authorLabel = l.author?.full_name ?? l.author?.email ?? "Anonymous";

  return (
    <article className="group relative flex flex-col rounded-2xl border border-gray-200/80 bg-white hover:border-gray-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 transition-all overflow-hidden">
      <a href={`/marketplace/listing?id=${l.id}`} className="block">
        <div className="relative aspect-[16/9] bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-70" aria-hidden="true" />
          <div className="absolute inset-0 flex items-center justify-center">
            {l.thumbnail_url
              ? <img src={l.thumbnail_url} alt="" className="w-full h-full object-cover" />
              : <Zap size={32} className="text-emerald-500/60" />}
          </div>
          <div className="absolute top-3 left-3">
            <Badge tone={free ? "emerald" : "default"} className="shadow-sm">{price}</Badge>
          </div>
          {l.rating != null && l.rating >= 4.5 && (
            <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-amber-500 text-white text-[9px] font-700 uppercase tracking-wider px-2 py-0.5 shadow-sm">
              <Star size={9} className="fill-white" /> Top rated
            </div>
          )}
        </div>
      </a>

      <div className="p-4 flex-1 flex flex-col">
        <a href={`/marketplace/listing?id=${l.id}`}>
          <h3 className="text-[14px] font-700 text-gray-900 line-clamp-1 group-hover:text-emerald-700">{l.title}</h3>
          <p className="mt-1.5 text-[12px] text-gray-500 line-clamp-2 leading-relaxed">{l.description}</p>
        </a>
        <div className="mt-2.5 flex flex-wrap gap-1">
          {l.tags.slice(0, 3).map((t) => (
            <span key={t} className="text-[9px] font-600 uppercase tracking-wider text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{t}</span>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3 text-[10px] text-gray-400">
          <span className="inline-flex items-center gap-1"><Download size={10} /> {l.downloads}</span>
          {l.rating != null && <span className="inline-flex items-center gap-1"><Star size={10} className="text-amber-500 fill-amber-500" /> {l.rating.toFixed(1)}</span>}
          <span className="ml-auto truncate">{formatRelative(l.created_at)}</span>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-[9px] font-700 flex items-center justify-center shrink-0">
              {(authorLabel.match(/\b\w/g) ?? []).slice(0, 2).join("").toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-600 text-gray-900 truncate">{authorLabel}</div>
              <div className="text-[9px] text-gray-400">Creator</div>
            </div>
          </div>
          {signedIn ? (
            <a href={`/marketplace/listing?id=${l.id}`} className="inline-flex items-center gap-1 text-[11px] font-700 text-emerald-600 hover:text-emerald-700">
              {free ? "Get" : "Buy"} →
            </a>
          ) : (
            <a href={`/sign-in?returnTo=/marketplace/listing?id=${l.id}`} className="inline-flex items-center gap-1 text-[11px] font-700 text-gray-700 hover:text-emerald-700">
              <DollarSign size={10} /> Sign in to {free ? "download" : "buy"}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-100 bg-white overflow-hidden animate-pulse">
          <div className="aspect-[16/9] bg-gray-100" />
          <div className="p-4 space-y-2">
            <div className="h-3 bg-gray-100 rounded w-3/4" />
            <div className="h-2.5 bg-gray-100 rounded w-full" />
            <div className="h-2.5 bg-gray-100 rounded w-5/6" />
            <div className="pt-2 flex items-center justify-between">
              <div className="h-6 bg-gray-100 rounded-full w-24" />
              <div className="h-3 bg-gray-100 rounded w-10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
      <div className="mx-auto w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
        <Sparkles size={18} />
      </div>
      <h3 className="text-sm font-700 text-gray-900">No listings yet</h3>
      <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
        The marketplace launches with the first strategies published by Creator-tier users.
        Check back soon — or be the first.
      </p>
    </div>
  );
}
