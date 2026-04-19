"use client";

// ──────────────────────────────────────────────────────────────────
// /community  — leaderboard + feed + forum index
// ──────────────────────────────────────────────────────────────────
// Three sections:
//   • Creator leaderboard (top by trust score).
//   • Forum — approved posts grouped by category.
//   • Recent activity feed (new listings, new reviews).
// ──────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import {
  MessageCircle, Plus, ShoppingBag, Star, Users, ArrowRight, Crown,
  TrendingUp, Sparkles, ShieldCheck,
} from "lucide-react";
import { PublicShell } from "@/components/app/public-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { NativeSelect } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TrustBadge } from "@/components/profiles/TrustBadge";
import { useAuth } from "@/lib/auth/context";
import { fetchLeaderboard, type CreatorStats } from "@/lib/profiles/client";
import { listCategories, listApprovedPosts, type ForumCategory, type PostWithAuthor } from "@/lib/forum/client";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface FeedItem {
  event_type: "listing" | "review";
  subject_id: string;
  actor_id: string;
  title: string;
  body: string | null;
  event_at: string;
}

export default function CommunityPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<CreatorStats[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [lb, cats, ps, fd] = await Promise.all([
          fetchLeaderboard(10),
          listCategories(),
          listApprovedPosts({ limit: 20 }),
          loadFeed(),
        ]);
        if (!alive) return;
        setLeaderboard(lb);
        setCategories(cats);
        setPosts(ps);
        setFeed(fd);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const ps = await listApprovedPosts({ limit: 30, category: category || undefined, search: search || undefined });
      if (alive) setPosts(ps);
    })();
    return () => { alive = false; };
  }, [category, search]);

  return (
    <PublicShell>
      <div className="max-w-6xl mx-auto px-5 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-700 uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5">
              <Users size={10} /> Community
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-700 text-gray-900">Trade ideas, systems, and setups</h1>
            <p className="mt-1.5 text-sm text-gray-500 max-w-xl">Creators, backtests, discussion. Posts are reviewed before publishing to keep the feed clean.</p>
          </div>
          <Button asChild>
            <a href={user ? "/community/new" : "/sign-in?returnTo=/community/new"}>
              <Plus size={14} /> New post
            </a>
          </Button>
        </div>

        <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4 lg:gap-6 items-start">
          {/* Main: forum + feed */}
          <div className="space-y-6 min-w-0">
            {/* Forum filters */}
            <Card>
              <CardContent>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="text-sm font-700 text-gray-900 inline-flex items-center gap-1.5">
                    <MessageCircle size={14} className="text-emerald-600" /> Forum
                  </h2>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)} className="min-w-0">
                      <option value="">All categories</option>
                      {categories.map((c) => (
                        <option key={c.slug} value={c.slug}>{c.label}</option>
                      ))}
                    </NativeSelect>
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search…"
                      className="flex-1 sm:w-56 sm:flex-initial"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  {loading ? (
                    <div className="py-10 text-center text-xs text-gray-400">Loading…</div>
                  ) : posts.length === 0 ? (
                    <EmptyState
                      icon={<MessageCircle size={18} />}
                      title="No posts yet"
                      description={search || category ? "Try a different filter." : "Be the first to start the conversation."}
                      action={
                        <Button asChild size="sm">
                          <a href={user ? "/community/new" : "/sign-in?returnTo=/community/new"}>
                            <Plus size={12} /> New post
                          </a>
                        </Button>
                      }
                    />
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {posts.map((p) => (
                        <PostPreview key={p.id} post={p} categories={categories} />
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent activity feed */}
            <Card>
              <CardContent>
                <h2 className="text-sm font-700 text-gray-900 inline-flex items-center gap-1.5">
                  <Sparkles size={14} className="text-emerald-600" /> Recent activity
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {feed.length === 0 && (
                    <li className="text-xs text-gray-400 py-3">Nothing yet — publish a listing or leave a review.</li>
                  )}
                  {feed.slice(0, 10).map((e) => (
                    <FeedRow key={e.event_type + e.subject_id + e.event_at} event={e} />
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: leaderboard */}
          <div className="space-y-4">
            <Card>
              <CardContent>
                <div className="flex items-center gap-1.5">
                  <Crown size={14} className="text-amber-500" />
                  <h2 className="text-sm font-700 text-gray-900">Top creators</h2>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">Ranked by trust score — sales, listings, reviews, and tenure.</p>
                <ul className="mt-3 space-y-1">
                  {leaderboard.length === 0 && (
                    <li className="text-[11px] text-gray-400 py-2">No creators yet.</li>
                  )}
                  {leaderboard.map((c, i) => <LeaderRow key={c.user_id} rank={i + 1} creator={c} />)}
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 via-white to-white border-emerald-200/80">
              <CardContent>
                <h3 className="text-sm font-700 text-gray-900 inline-flex items-center gap-1.5"><ShieldCheck size={13} className="text-emerald-600" /> Community guidelines</h3>
                <ul className="mt-3 space-y-1.5 text-[11px] text-gray-600 leading-snug">
                  <li>• Posts are manually reviewed before publishing. Expect a few minutes delay.</li>
                  <li>• Keep self-promotion inside your listings / showcase posts — no drive-by service ads.</li>
                  <li>• Be specific: share a setup, a backtest, a question with context.</li>
                  <li>• Moderators remove posts that violate the spirit (or the letter).</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

// ── Post preview row ──────────────────────────────────────────────

function PostPreview({ post, categories }: { post: PostWithAuthor; categories: ForumCategory[] }) {
  const cat = categories.find((c) => c.slug === post.category_slug);
  const imgs = (post as unknown as { image_urls?: string[] | null }).image_urls ?? [];
  const hasImages = Array.isArray(imgs) && imgs.length > 0;
  return (
    <li className="py-3.5">
      <a href={`/community/posts/${post.id}`} className="group flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center overflow-hidden shrink-0 text-[11px] font-700 text-white">
          {post.author?.avatar_url ? (
            <img src={post.author.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            (post.author?.display_name?.match(/\b\w/g) ?? []).slice(0, 2).join("").toUpperCase() || "?"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {post.pinned && <Badge tone="amber">Pinned</Badge>}
            {cat && <Badge tone="slate">{cat.label}</Badge>}
            <h3 className="text-sm font-700 text-gray-900 truncate group-hover:text-emerald-700">{post.title}</h3>
          </div>
          <p className="mt-1 text-[12px] text-gray-500 line-clamp-2 leading-snug">{post.body}</p>
          {hasImages && (
            <div className="mt-2 flex gap-1.5">
              {imgs.slice(0, 4).map((u, i) => (
                <div key={u} className="w-14 h-14 rounded-md overflow-hidden bg-gray-100 border border-gray-200 relative">
                  <img src={u} alt="" className="w-full h-full object-cover" />
                  {i === 3 && imgs.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-[10px] font-700 text-white">
                      +{imgs.length - 4}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="mt-1.5 flex items-center gap-3 text-[10px] text-gray-400">
            <span>by {post.author?.display_name ?? "Anonymous"}</span>
            <span>·</span>
            <span>{formatRelative(post.created_at)}</span>
            <span className="inline-flex items-center gap-1"><MessageCircle size={9} /> {post.comment_count}</span>
          </div>
        </div>
        <ArrowRight size={14} className="text-gray-300 group-hover:text-emerald-600 mt-2" />
      </a>
    </li>
  );
}

// ── Feed row ──────────────────────────────────────────────────────

function FeedRow({ event }: { event: FeedItem }) {
  const isReview = event.event_type === "review";
  return (
    <li className="flex items-start gap-2.5 text-[11px]">
      <div className={cn(
        "mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0",
        isReview ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600",
      )}>
        {isReview ? <Star size={11} /> : <ShoppingBag size={11} />}
      </div>
      <div className="flex-1 min-w-0">
        <a
          href={`/marketplace/listing?id=${event.subject_id}`}
          className="text-gray-800 hover:text-emerald-700 font-600 truncate block"
        >
          {isReview ? "New review on " : ""}
          {event.title}
        </a>
        {event.body && <p className="text-[11px] text-gray-500 line-clamp-1">{event.body}</p>}
        <div className="text-[10px] text-gray-400">{formatRelative(event.event_at)}</div>
      </div>
    </li>
  );
}

// ── Leaderboard row ───────────────────────────────────────────────

function LeaderRow({ rank, creator }: { rank: number; creator: CreatorStats }) {
  return (
    <li>
      <a href={`/creator/${creator.user_id}`} className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-gray-50">
        <span className={cn(
          "w-5 text-[10px] font-700 text-center tabular-nums",
          rank === 1 ? "text-amber-500" : rank === 2 ? "text-slate-400" : rank === 3 ? "text-orange-600" : "text-gray-400",
        )}>
          {rank}
        </span>
        <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-emerald-300 to-emerald-600 flex items-center justify-center text-[10px] font-700 text-white shrink-0">
          {creator.avatar_url ? (
            <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            (creator.display_name.match(/\b\w/g) ?? []).slice(0, 2).join("").toUpperCase() || "?"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-600 text-gray-900 truncate group-hover:text-emerald-700">{creator.display_name}</div>
          <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
            <TrustBadge level={creator.trust_level} size="sm" showLabel={false} />
            <span className="inline-flex items-center gap-0.5"><TrendingUp size={9} /> {creator.trust_score}</span>
          </div>
        </div>
      </a>
    </li>
  );
}

// ── Feed loader ───────────────────────────────────────────────────

async function loadFeed(): Promise<FeedItem[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await getSupabase()
    .from("community_feed")
    .select("*")
    .limit(40);
  if (error) return [];
  return ((data ?? []) as unknown) as FeedItem[];
}
