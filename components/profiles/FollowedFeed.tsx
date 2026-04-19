"use client";

import { useEffect, useState } from "react";
import { Users, ArrowRight, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";
import { fetchFollowedFeed, type FollowedListing } from "@/lib/profiles/client";
import { formatPrice, formatRelative } from "@/lib/utils/format";

/**
 * Shows the most recent listings from creators the current user follows.
 * Hides itself cleanly when the user has no follows (to avoid empty state noise).
 */
export function FollowedFeed({ limit = 6 }: { limit?: number }) {
  const { user } = useAuth();
  const [items, setItems] = useState<FollowedListing[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) { setLoaded(true); return; }
      const rows = await fetchFollowedFeed(limit);
      if (!alive) return;
      setItems(rows);
      setLoaded(true);
    })();
    return () => { alive = false; };
  }, [user, limit]);

  if (!loaded || items.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardContent>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-700 text-gray-900 inline-flex items-center gap-1.5">
            <Users size={14} className="text-emerald-600" />
            New from creators you follow
          </h2>
          <Button asChild size="sm" variant="ghost">
            <a href="/marketplace" className="text-xs">All marketplace <ArrowRight size={10} /></a>
          </Button>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((l) => (
            <li key={l.listing_id}>
              <a
                href={`/marketplace/listing?id=${l.listing_id}`}
                className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 hover:border-gray-300 hover:-translate-y-0.5 hover:shadow-sm transition-all"
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-200 to-emerald-500 shrink-0 flex items-center justify-center">
                  {l.thumbnail_url ? (
                    <img src={l.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingBag size={18} className="text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-700 text-gray-900 truncate group-hover:text-emerald-700">{l.title}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-500">
                    <span>by</span>
                    <span className="inline-flex items-center gap-1">
                      {l.author_avatar ? (
                        <img src={l.author_avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-emerald-500" />
                      )}
                      <span className="truncate max-w-[120px]">{l.author_name}</span>
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                    <span>{l.price_cents === 0 ? "Free" : formatPrice(l.price_cents, l.currency)}</span>
                    <span>{formatRelative(l.created_at)}</span>
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
