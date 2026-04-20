"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { FeedComposer } from "./FeedComposer";
import { FeedCard } from "./FeedCard";
import { listFeedPosts, type FeedPost } from "@/lib/feed/client";

export function FeedList() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listFeedPosts({ limit: 20 });
      setPosts(rows);
      setHasMore(rows.length === 20);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function loadMore() {
    if (posts.length === 0) return;
    setLoadingMore(true);
    try {
      const before = posts[posts.length - 1].created_at;
      const rows = await listFeedPosts({ limit: 20, before });
      setPosts((prev) => [...prev, ...rows]);
      if (rows.length < 20) setHasMore(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }

  function handlePosted(post: FeedPost) {
    setPosts((prev) => [post, ...prev]);
  }

  function handleDeleted(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-3">
      <FeedComposer onPosted={handlePosted} />

      <div className="flex items-center justify-between">
        <h3 className="text-xs font-700 text-gray-500 uppercase tracking-widest">Latest posts</h3>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      {loading && posts.length === 0 ? (
        <div className="text-xs text-gray-400 text-center py-10">Loading feed…</div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<Inbox size={18} />}
          title="The feed is quiet"
          description="Be the first to post a setup, a result, or a question."
        />
      ) : (
        <>
          <ul className="space-y-3">
            {posts.map((p) => (
              <li key={p.id}>
                <FeedCard post={p} onDeleted={handleDeleted} />
              </li>
            ))}
          </ul>
          {hasMore && (
            <div className="text-center py-4">
              <Button size="sm" variant="secondary" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? <Loader2 size={12} className="animate-spin" /> : null}
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
