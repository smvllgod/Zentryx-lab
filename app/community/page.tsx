"use client";

// ──────────────────────────────────────────────────────────────────
// /community  —  Feed  |  Forum  |  Leaderboard
// ──────────────────────────────────────────────────────────────────
// Two distinct surfaces:
//
//  • FEED    — short social posts with images / reactions / comments.
//              Public, no moderation queue, soft-delete by author.
//              Use for setups, screenshots, quick thoughts, updates.
//  • FORUM   — long-form threaded discussions organized by category
//              (Strategy, MQL5, Marketplace, Off-topic, etc.) with
//              admin moderation. Use for specific topics that need
//              structure, context, and search-ability over time.
//
// The sidebar keeps the creator leaderboard + guidelines.

import { useEffect, useMemo, useState } from "react";
import {
  MessageCircle, Plus, ShoppingBag, Star, Users, ArrowRight, Crown,
  TrendingUp, Sparkles, ShieldCheck, Rss, MessagesSquare, Info,
} from "lucide-react";
import { PublicShell } from "@/components/app/public-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CustomSelect } from "@/components/ui/custom-select";
import { Input } from "@/components/ui/input";
import { TrustBadge } from "@/components/profiles/TrustBadge";
import { FeedList } from "@/components/community/FeedList";
import { useAuth } from "@/lib/auth/context";
import { fetchLeaderboard, type CreatorStats } from "@/lib/profiles/client";
import { listCategories, listApprovedPosts, type ForumCategory, type PostWithAuthor } from "@/lib/forum/client";
import { formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Tab = "feed" | "forum";

export default function CommunityPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("feed");

  return (
    <PublicShell>
      <div className="max-w-6xl mx-auto px-5 lg:px-8 py-6 lg:py-8">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-700 uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5">
              <Users size={10} /> Community
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-800 text-gray-900 tracking-tight">
              Where Zentryx creators gather
            </h1>
            <p className="mt-1.5 text-sm text-gray-500 max-w-xl">
              Share what you&apos;re building in the <strong className="text-gray-700">Feed</strong>.
              Dive deep into specific topics in the <strong className="text-gray-700">Forum</strong>.
            </p>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────── */}
        <div className="mb-5 inline-flex rounded-xl border border-gray-200 overflow-hidden bg-white">
          <TabButton active={tab === "feed"} onClick={() => setTab("feed")} icon={<Rss size={13} />} label="Feed" subtitle="Quick posts + images" />
          <TabButton active={tab === "forum"} onClick={() => setTab("forum")} icon={<MessagesSquare size={13} />} label="Forum" subtitle="Threaded, moderated" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4 lg:gap-6 items-start">
          {/* ── Main column ─────────────────────────────────── */}
          <div className="space-y-5 min-w-0">
            {tab === "feed" ? (
              <>
                <ExplainBand
                  kind="feed"
                  title="Feed — the fast lane"
                  body="Post setups, backtest screenshots, quick wins and short thoughts. No category, no approval queue — everything goes live instantly. Think Twitter, not Stack Overflow."
                />
                <FeedList />
              </>
            ) : (
              <>
                <ExplainBand
                  kind="forum"
                  title="Forum — deep discussions"
                  body="Organized by category (Strategy, MQL5, Marketplace, Off-topic). Markdown-supported, searchable, moderator-reviewed. Use for specific topics that need context and a permanent address."
                />
                <ForumSection userId={user?.id ?? null} />
              </>
            )}
          </div>

          {/* ── Sidebar ────────────────────────────────────── */}
          <Sidebar />
        </div>
      </div>
    </PublicShell>
  );
}

// ── Tab button ─────────────────────────────────────────────────────

function TabButton({
  active, onClick, icon, label, subtitle,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; subtitle: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2.5 text-left transition-colors",
        active ? "bg-gray-900 text-white" : "bg-white text-gray-700 hover:bg-gray-50",
      )}
    >
      <div className="inline-flex items-center gap-1.5 text-xs font-700">
        {icon} {label}
      </div>
      <div className={cn("text-[10px]", active ? "text-gray-300" : "text-gray-400")}>
        {subtitle}
      </div>
    </button>
  );
}

// ── Explain band (top of each tab) ────────────────────────────────

function ExplainBand({ kind, title, body }: { kind: "feed" | "forum"; title: string; body: string }) {
  return (
    <div className={cn(
      "rounded-xl border p-3 flex items-start gap-3",
      kind === "feed" ? "border-emerald-200 bg-emerald-50/40" : "border-blue-200 bg-blue-50/40",
    )}>
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
        kind === "feed" ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600",
      )}>
        {kind === "feed" ? <Rss size={14} /> : <MessagesSquare size={14} />}
      </div>
      <div className="min-w-0">
        <div className={cn(
          "text-xs font-700",
          kind === "feed" ? "text-emerald-800" : "text-blue-800",
        )}>{title}</div>
        <p className="mt-0.5 text-[11px] text-gray-600 leading-snug">{body}</p>
      </div>
    </div>
  );
}

// ── Forum section ─────────────────────────────────────────────────

function ForumSection({ userId }: { userId: string | null }) {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [cats, ps] = await Promise.all([
          listCategories(),
          listApprovedPosts({ limit: 30 }),
        ]);
        if (!alive) return;
        setCategories(cats);
        setPosts(ps);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const ps = await listApprovedPosts({
        limit: 30,
        category: category || undefined,
        search: search || undefined,
      });
      if (alive) setPosts(ps);
    })();
    return () => { alive = false; };
  }, [category, search]);

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-700 text-gray-900 inline-flex items-center gap-1.5">
            <MessagesSquare size={14} className="text-blue-600" /> Threads
          </h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <CustomSelect
              value={category}
              onChange={setCategory}
              className="w-36"
              options={[
                { value: "", label: "All categories" },
                ...categories.map((c) => ({ value: c.slug, label: c.label })),
              ]}
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="flex-1 sm:w-56 sm:flex-initial"
            />
            <Button asChild size="sm">
              <a href={userId ? "/community/new" : "/sign-in?returnTo=/community/new"}>
                <Plus size={12} /> New thread
              </a>
            </Button>
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="py-10 text-center text-xs text-gray-400">Loading…</div>
          ) : posts.length === 0 ? (
            <EmptyState
              icon={<MessagesSquare size={18} />}
              title="No threads yet"
              description={search || category ? "Try a different filter." : "Be the first to start a topic."}
              action={
                <Button asChild size="sm">
                  <a href={userId ? "/community/new" : "/sign-in?returnTo=/community/new"}>
                    <Plus size={12} /> New thread
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
  );
}

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

// ── Sidebar ────────────────────────────────────────────────────────

function Sidebar() {
  const [leaderboard, setLeaderboard] = useState<CreatorStats[]>([]);
  useEffect(() => { void fetchLeaderboard(10).then(setLeaderboard); }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <div className="flex items-center gap-1.5">
            <Crown size={14} className="text-amber-500" />
            <h2 className="text-sm font-700 text-gray-900">Top creators</h2>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">Ranked by trust score — sales, listings, reviews, tenure.</p>
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
          <h3 className="text-sm font-700 text-gray-900 inline-flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-600" /> Community guidelines
          </h3>
          <ul className="mt-3 space-y-1.5 text-[11px] text-gray-600 leading-snug">
            <li><strong className="text-gray-700">Feed</strong> — setups, screenshots, updates. No spammy launch ads.</li>
            <li><strong className="text-gray-700">Forum</strong> — threads are reviewed before publishing.</li>
            <li>Self-promotion belongs inside your marketplace listing or a showcase post.</li>
            <li>Be specific. Share a strategy, a backtest, a question with context.</li>
            <li>Moderators remove posts that violate the spirit (or the letter).</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function LeaderRow({ rank, creator }: { rank: number; creator: CreatorStats }) {
  return (
    <li>
      <a href={`/creator/${creator.user_id}/`} className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-gray-50">
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
