"use client";

// ──────────────────────────────────────────────────────────────────
// /creator/[id]  — public creator profile
// ──────────────────────────────────────────────────────────────────
// Shows alias, avatar, bio, trust badge, listings, and recent reviews.
// Only works for creators with `is_public = true` (enforced by the
// public_profiles view RLS).

import { useEffect, useState } from "react";
import { Calendar, Download, Package, Star, User, ArrowLeft, Users } from "lucide-react";
import { PublicShell } from "@/components/app/public-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TrustBadge } from "@/components/profiles/TrustBadge";
import { FollowButton } from "@/components/profiles/FollowButton";
import { fetchPublicProfile, fetchCreatorStats, fetchFollowCounts, type PublicProfile, type CreatorStats, type FollowCounts } from "@/lib/profiles/client";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { formatRelative } from "@/lib/utils/format";

interface MarketplaceRow {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  tags: string[];
  presentation_image_url: string | null;
  downloads: number;
  rating: number | null;
  rating_count: number;
  created_at: string;
}

interface ReviewRow {
  id: string;
  listing_id: string;
  rating: number;
  body: string | null;
  created_at: string;
}

export default function CreatorProfileClient() {
  // Static export serves every /creator/* URL from /creator/_/index.html
  // (see netlify.toml redirect). We read the real id from the browser.
  const [id, setId] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    const match = path.match(/\/creator\/([^\/?#]+)/);
    const parsed = match?.[1] ?? "";
    setId(parsed === "_" ? "" : parsed);
  }, []);

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [followCounts, setFollowCounts] = useState<FollowCounts>({ followers_count: 0, following_count: 0 });
  const [listings, setListings] = useState<MarketplaceRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [p, s, fc] = await Promise.all([
          fetchPublicProfile(id),
          fetchCreatorStats(id),
          fetchFollowCounts(id),
        ]);
        if (!alive) return;
        if (!p) { setNotFound(true); return; }
        setProfile(p);
        setStats(s);
        setFollowCounts(fc);

        if (!isSupabaseConfigured()) return;
        const db = getSupabase();
        const [{ data: ls }, { data: rv }] = await Promise.all([
          db.from("marketplace_listings")
            .select("id,title,description,price_cents,tags,presentation_image_url,downloads,rating,rating_count,created_at")
            .eq("author_id", id)
            .eq("status", "published")
            .order("created_at", { ascending: false })
            .limit(24),
          db.from("reviews")
            .select("id,listing_id,rating,body,created_at")
            .in(
              "listing_id",
              ((await db.from("marketplace_listings").select("id").eq("author_id", id).eq("status", "published")).data ?? []).map((r: { id: string }) => r.id),
            )
            .order("created_at", { ascending: false })
            .limit(10),
        ]);
        if (!alive) return;
        setListings((ls ?? []) as unknown as MarketplaceRow[]);
        setReviews((rv ?? []) as unknown as ReviewRow[]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (loading) {
    return (
      <PublicShell>
        <div className="min-h-[50vh] flex items-center justify-center text-sm text-gray-400">Loading…</div>
      </PublicShell>
    );
  }

  if (notFound || !profile) {
    return (
      <PublicShell>
        <div className="max-w-2xl mx-auto py-20 text-center">
          <h1 className="text-xl font-700 text-gray-900">Creator not found</h1>
          <p className="text-sm text-gray-500 mt-2">This profile is private or doesn&apos;t exist.</p>
          <Button asChild variant="secondary" className="mt-6">
            <a href="/marketplace"><ArrowLeft size={12} /> Back to marketplace</a>
          </Button>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="max-w-6xl mx-auto px-5 lg:px-8 py-8">
        {/* Header */}
        <div className="rounded-2xl border border-gray-200/80 bg-gradient-to-br from-emerald-50/60 via-white to-white p-4 sm:p-6 md:p-8">
          <div className="flex items-start gap-3 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 md:w-24 sm:h-20 md:h-24 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={36} className="text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-700 text-gray-900 break-words min-w-0">{profile.display_name}</h1>
                  {stats && <TrustBadge level={stats.trust_level} size="md" />}
                </div>
                <FollowButton
                  creatorId={profile.id}
                  onChange={(following) => {
                    setFollowCounts((c) => ({
                      ...c,
                      followers_count: Math.max(0, c.followers_count + (following ? 1 : -1)),
                    }));
                  }}
                />
              </div>
              {profile.alias && profile.full_name && (
                <div className="mt-0.5 text-xs text-gray-500">{profile.full_name}</div>
              )}
              <div className="mt-3 flex items-center gap-2 sm:gap-3 text-[11px] text-gray-500 flex-wrap">
                <span className="inline-flex items-center gap-1"><Users size={11} /> <strong className="text-gray-700 tabular-nums">{followCounts.followers_count}</strong> follower{followCounts.followers_count === 1 ? "" : "s"}</span>
                <span className="inline-flex items-center gap-1 text-gray-400"><Users size={11} /> {followCounts.following_count} following</span>
                <span className="inline-flex items-center gap-1"><Calendar size={11} /> Joined {formatRelative(profile.created_at)}</span>
                <span className="inline-flex items-center gap-1"><Package size={11} /> {stats?.listing_count ?? 0} listing{(stats?.listing_count ?? 0) === 1 ? "" : "s"}</span>
                {(stats?.reviews_received ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1"><Star size={11} className="text-amber-500" /> {stats!.avg_rating.toFixed(2)} · {stats!.reviews_received} review{stats!.reviews_received === 1 ? "" : "s"}</span>
                )}
              </div>
              {profile.bio && (
                <p className="mt-4 text-sm text-gray-700 leading-relaxed max-w-2xl whitespace-pre-wrap">{profile.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Trust score" value={stats.trust_score} tone="emerald" />
            <StatBox label="Sales" value={stats.sales_count} />
            <StatBox label="Downloads" value={stats.total_downloads} />
            <StatBox label="Listings" value={stats.listing_count} />
          </div>
        )}

        {/* Listings */}
        <section className="mt-8">
          <h2 className="text-sm font-700 text-gray-900 mb-3">Listings</h2>
          {listings.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={<Package size={18} />}
                  title="No public listings yet"
                  description="When this creator publishes a strategy, it'll show up here."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {listings.map((l) => (
                <a key={l.id} href={`/marketplace/listing?id=${l.id}`} className="group block rounded-xl border border-gray-200/80 bg-white overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all">
                  <div className="aspect-[16/9] bg-gradient-to-br from-emerald-50 to-white overflow-hidden">
                    {l.presentation_image_url ? (
                      <img src={l.presentation_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid-bg opacity-70" />
                    )}
                  </div>
                  <div className="p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-700 text-gray-900 truncate group-hover:text-emerald-700">{l.title}</div>
                      <Badge tone={l.price_cents === 0 ? "emerald" : "default"}>{l.price_cents === 0 ? "Free" : `$${(l.price_cents / 100).toFixed(0)}`}</Badge>
                    </div>
                    <div className="mt-1.5 text-[11px] text-gray-500 line-clamp-2">{l.description}</div>
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-400">
                      <span className="inline-flex items-center gap-1"><Download size={10} /> {l.downloads}</span>
                      {l.rating != null && l.rating > 0 && (
                        <span className="inline-flex items-center gap-1"><Star size={10} className="text-amber-500 fill-amber-500" /> {l.rating.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* Recent reviews */}
        {reviews.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-700 text-gray-900 mb-3">Recent reviews received</h2>
            <div className="space-y-2">
              {reviews.map((r) => (
                <Card key={r.id}>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} size={11} className={n <= r.rating ? "text-amber-500 fill-amber-500" : "text-gray-200"} />
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-400">{formatRelative(r.created_at)}</span>
                    </div>
                    {r.body && <p className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{r.body}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10 flex items-center justify-between text-[11px] text-gray-400">
          <Button asChild variant="ghost" size="sm">
            <a href="/community"><ArrowLeft size={11} /> Back to community</a>
          </Button>
          <div>Profile auto-generated from listings + reviews.</div>
        </div>
      </div>
    </PublicShell>
  );
}

function StatBox({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "emerald" }) {
  return (
    <div className={tone === "emerald" ? "rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3.5" : "rounded-xl border border-gray-200/80 bg-white p-3.5"}>
      <div className="text-[10px] font-700 uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-700 text-gray-900 tabular-nums">{value}</div>
    </div>
  );
}
