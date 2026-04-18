"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Tag } from "lucide-react";
import { AppShell } from "@/components/app/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getListing, type ListingRow } from "@/lib/marketplace/store";
import { formatPrice, formatRelative } from "@/lib/utils/format";
import { toast } from "@/components/ui/toast";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function ListingDetailPage() {
  const params = useSearchParams();
  const id = params.get("id");
  const [listing, setListing] = useState<ListingRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const row = await getListing(id);
        if (alive) setListing(row);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  function onPurchase() {
    toast.message(
      "Stripe checkout will be wired in once billing keys are set. Listing remains in draft purchase state until then.",
    );
  }

  return (
    <AppShell title={listing?.title ?? "Listing"}>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <a href="/marketplace"><ArrowLeft size={14} /> Back to marketplace</a>
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : !listing ? (
        <Card><CardContent>Listing not found.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <div className="aspect-video bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent grid-bg rounded-t-2xl" />
              <CardContent>
                <h1 className="text-xl font-700 text-gray-900">{listing.title}</h1>
                <div className="mt-1 text-xs text-gray-400">
                  Published {formatRelative(listing.created_at)}
                </div>
                <p className="mt-4 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {listing.description}
                </p>
              </CardContent>
            </Card>
          </div>

          <aside>
            <Card className="sticky top-20">
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <div className="text-3xl font-700 text-gray-900">
                    {listing.price_cents === 0 ? "Free" : formatPrice(listing.price_cents, listing.currency)}
                  </div>
                  <Badge tone={listing.status === "published" ? "emerald" : "default"}>
                    {listing.status}
                  </Badge>
                </div>
                <Button className="mt-5 w-full" onClick={onPurchase}>
                  {listing.price_cents === 0 ? <><Download size={14} /> Download .mq5</> : "Purchase"}
                </Button>
                <div className="mt-5 pt-5 border-t border-gray-100 space-y-2">
                  <div className="text-xs font-700 uppercase tracking-wider text-gray-400">Tags</div>
                  <div className="flex flex-wrap gap-1.5">
                    {listing.tags.map((t) => (
                      <span key={t} className="inline-flex items-center text-[10px] uppercase tracking-wider font-600 text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                        <Tag size={10} className="inline mr-1" />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
