"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft, Download, Star, ShoppingBag, Calendar, Tag, User, Zap,
  ChevronLeft, ChevronRight, Image as ImageIcon, Check,
} from "lucide-react";
import { PublicShell } from "@/components/app/public-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { getListing, type ListingRow } from "@/lib/marketplace/store";
import { listReviews, myReviewFor, hasPurchased, writeReview, deleteReview, type ReviewRow } from "@/lib/marketplace/reviews";
import { formatPrice, formatRelative } from "@/lib/utils/format";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/context";
import { cn } from "@/lib/utils/cn";

export default function ListingDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading…</div>}>
      <ListingDetailInner />
    </Suspense>
  );
}

function ListingDetailInner() {
  const { user } = useAuth();
  const params = useSearchParams();
  const id = params?.get("id") ?? "";

  const [listing, setListing] = useState<ListingRow | null>(null);
  const [author, setAuthor] = useState<{ full_name: string | null; email: string } | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [myReview, setMyReview] = useState<ReviewRow | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [galleryIdx, setGalleryIdx] = useState(0);

  async function loadAll() {
    if (!id) return;
    setLoading(true);
    try {
      const row = await getListing(id);
      setListing(row);
      if (row) {
        const [revs, mine, eligible] = await Promise.all([
          listReviews(id),
          myReviewFor(id),
          hasPurchased(id),
        ]);
        setReviews(revs);
        setMyReview(mine);
        setCanReview(eligible || !!mine);
        const { getSupabase, isSupabaseConfigured } = await import("@/lib/supabase/client");
        if (isSupabaseConfigured()) {
          const { data } = await getSupabase()
            .from("profiles")
            .select("full_name,email")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .eq("id", row.author_id as any)
            .maybeSingle();
          setAuthor(data as { full_name: string | null; email: string } | null);
        }
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  if (loading) return <PublicShell><div className="max-w-5xl mx-auto py-16 text-center text-sm text-gray-400">Loading…</div></PublicShell>;
  if (!listing) return <PublicShell><NotFound /></PublicShell>;

  const images = [listing.presentation_image_url, ...listing.gallery_urls].filter(Boolean) as string[];
  const free = listing.price_cents === 0;
  const priceLabel = free ? "Free" : formatPrice(listing.price_cents, listing.currency);
  const authorLabel = author?.full_name ?? author?.email ?? "Anonymous";
  const mean = listing.rating ?? 0;

  function prev() { setGalleryIdx((i) => (i - 1 + Math.max(1, images.length)) % Math.max(1, images.length)); }
  function next() { setGalleryIdx((i) => (i + 1) % Math.max(1, images.length)); }

  return (
    <PublicShell>
      <div className="max-w-6xl mx-auto px-5 lg:px-8 py-8">
        <div className="flex items-center gap-1.5 text-[11px] font-600 text-gray-400 mb-5">
          <a href="/marketplace" className="hover:text-gray-700 inline-flex items-center gap-1"><ArrowLeft size={10} /> Marketplace</a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
          <div className="space-y-3">
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 border border-gray-200/80">
              <div className="absolute inset-0 grid-bg opacity-60" aria-hidden="true" />
              {images.length > 0 ? (
                <img src={images[galleryIdx]} alt="" className="relative w-full h-full object-cover" />
              ) : (
                <div className="relative w-full h-full flex items-center justify-center text-emerald-500/60"><Zap size={32} /></div>
              )}
              {images.length > 1 && (
                <>
                  <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700"><ChevronLeft size={16} /></button>
                  <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700"><ChevronRight size={16} /></button>
                  <div className="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] font-600 rounded-full px-2.5 py-0.5">{galleryIdx + 1} / {images.length}</div>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((src, i) => (
                  <button
                    key={src + i}
                    type="button"
                    onClick={() => setGalleryIdx(i)}
                    className={cn(
                      "relative w-24 aspect-[4/3] rounded-lg overflow-hidden border shrink-0 transition-all",
                      galleryIdx === i ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-gray-200 hover:border-gray-300",
                    )}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {listing.tags.slice(0, 5).map((t) => (
                  <span key={t} className="text-[10px] font-600 uppercase tracking-wider text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{t}</span>
                ))}
              </div>
              <h1 className="text-2xl md:text-3xl font-700 text-gray-900 leading-tight">{listing.title}</h1>
              <div className="mt-3 flex items-center gap-4 text-[12px] text-gray-500">
                <span className="inline-flex items-center gap-1"><User size={12} /> {authorLabel}</span>
                <span className="inline-flex items-center gap-1"><Calendar size={12} /> {formatRelative(listing.created_at)}</span>
                <span className="inline-flex items-center gap-1"><Download size={12} /> {listing.downloads}</span>
                {listing.rating_count > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Star size={12} className="fill-amber-500 text-amber-500" /> {mean.toFixed(1)} <span className="text-gray-400">({listing.rating_count})</span>
                  </span>
                )}
              </div>
              <div className="mt-6">
                <p className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">{listing.description}</p>
              </div>
            </div>

            <div className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-700 text-gray-900">Reviews <span className="text-gray-400 font-500">({listing.rating_count ?? 0})</span></h2>
                {listing.rating_count > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <StarsDisplay value={mean} />
                    <span className="font-700 text-gray-900">{mean.toFixed(1)}</span>
                    <span className="text-gray-400">out of 5</span>
                  </div>
                )}
              </div>

              {user ? (
                canReview ? (
                  <ReviewForm
                    key={myReview?.id ?? "new"}
                    existing={myReview}
                    onSave={async (r, b) => {
                      try {
                        await writeReview({ listingId: listing.id, rating: r, body: b });
                        toast.success(myReview ? "Review updated" : "Thanks for your review!");
                        await loadAll();
                      } catch (err) { toast.error((err as Error).message); }
                    }}
                    onDelete={myReview ? async () => {
                      try { await deleteReview(myReview.id); toast.success("Review deleted"); setMyReview(null); await loadAll(); }
                      catch (err) { toast.error((err as Error).message); }
                    } : undefined}
                  />
                ) : (
                  <Card className="bg-gray-50/60">
                    <CardContent className="flex items-center gap-3 !py-4">
                      <ShoppingBag size={16} className="text-gray-400" />
                      <div className="text-xs text-gray-600">
                        Only buyers can leave a review. Purchase this strategy to share your experience.
                      </div>
                    </CardContent>
                  </Card>
                )
              ) : (
                <Card className="bg-gray-50/60">
                  <CardContent className="flex items-center gap-3 !py-4">
                    <User size={16} className="text-gray-400" />
                    <div className="text-xs text-gray-600">
                      <a href={`/sign-in?returnTo=/marketplace/listing?id=${id}`} className="font-700 text-emerald-600 hover:underline">Sign in</a> to read and write reviews.
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="mt-5 space-y-3">
                {reviews.length === 0 && <div className="text-xs text-gray-400 text-center py-6">No reviews yet — be the first.</div>}
                {reviews.map((r) => (
                  <ReviewCard key={r.id} review={r} highlight={myReview?.id === r.id} />
                ))}
              </div>
            </div>
          </div>

          <Card className="lg:sticky lg:top-20 self-start">
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-700 text-gray-900">{priceLabel}</div>
                {free && <Badge tone="emerald">Free download</Badge>}
              </div>
              {listing.rating_count > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                  <StarsDisplay value={mean} size={12} />
                  <span>{mean.toFixed(1)}</span>
                  <span className="text-gray-400">· {listing.rating_count} reviews</span>
                </div>
              )}
              <div className="mt-4 space-y-2">
                {user ? (
                  <Button size="lg" className="w-full" onClick={() => toast.info("Purchase flow — Stripe checkout coming soon.")}>
                    <ShoppingBag size={15} /> {free ? "Get strategy" : "Buy now"}
                  </Button>
                ) : (
                  <Button asChild size="lg" className="w-full">
                    <a href={`/sign-in?returnTo=/marketplace/listing?id=${id}`}>
                      <ShoppingBag size={15} /> Sign in to {free ? "download" : "buy"}
                    </a>
                  </Button>
                )}
                <Button asChild size="sm" variant="secondary" className="w-full">
                  <a href="/marketplace"><ArrowLeft size={12} /> Back to marketplace</a>
                </Button>
              </div>

              <dl className="mt-5 space-y-2 text-xs border-t border-gray-100 pt-4">
                <InfoRow label="Author" value={authorLabel} icon={<User size={10} />} />
                <InfoRow label="Downloads" value={String(listing.downloads)} icon={<Download size={10} />} />
                <InfoRow label="Listed" value={formatRelative(listing.created_at)} icon={<Calendar size={10} />} />
                <InfoRow label="Gallery" value={`${listing.gallery_urls.length} images`} icon={<ImageIcon size={10} />} />
                <InfoRow label="Tags" value={listing.tags.length ? listing.tags.join(", ") : "—"} icon={<Tag size={10} />} />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicShell>
  );
}

function ReviewForm({
  existing,
  onSave,
  onDelete,
}: {
  existing: ReviewRow | null;
  onSave: (rating: number, body: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState<number | null>(null);
  const [body, setBody] = useState(existing?.body ?? "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (rating < 1) { toast.error("Pick a star rating first."); return; }
    setSaving(true);
    try { await onSave(rating, body); } finally { setSaving(false); }
  }

  return (
    <Card className="border-emerald-200/60 bg-emerald-50/10">
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-700 uppercase tracking-wider text-emerald-700">{existing ? "Your review" : "Write a review"}</div>
            <p className="text-[11px] text-gray-500">Honest feedback helps creators and future buyers.</p>
          </div>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setRating(n)}
                className="p-0.5"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
              >
                <Star
                  size={22}
                  className={cn(
                    "transition-colors",
                    (hover ?? rating) >= n ? "text-amber-500 fill-amber-500" : "text-gray-300",
                  )}
                />
              </button>
            ))}
          </div>
        </div>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What did you like? Did it perform as advertised? Any setup tips for other buyers?"
          className="min-h-[90px]"
          maxLength={1500}
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">{body.length}/1500</span>
          <div className="flex items-center gap-2">
            {onDelete && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={async () => { if (confirm("Delete your review?")) await onDelete(); }}
              >
                Delete
              </Button>
            )}
            <Button type="button" size="sm" onClick={submit} disabled={saving}>
              {saving ? "Saving…" : existing ? "Update" : "Submit"} {!saving && <Check size={13} />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewCard({ review, highlight }: { review: ReviewRow; highlight?: boolean }) {
  const author = review.author?.full_name ?? review.author?.email ?? "Anonymous";
  const initials = (author.match(/\b\w/g) ?? []).slice(0, 2).join("").toUpperCase();
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        highlight ? "border-emerald-300 bg-emerald-50/30" : "border-gray-200 bg-white",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-[11px] font-700 flex items-center justify-center shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-700 text-gray-900 truncate">{author}</div>
            <StarsDisplay value={review.rating} size={12} />
            <span className="text-[10px] text-gray-400 ml-auto">{formatRelative(review.created_at)}</span>
          </div>
          {review.body && <p className="mt-1.5 text-[13px] text-gray-700 whitespace-pre-wrap leading-relaxed">{review.body}</p>}
        </div>
      </div>
    </div>
  );
}

function StarsDisplay({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={cn(
            "transition-colors",
            n <= Math.round(value) ? "text-amber-500 fill-amber-500" : "text-gray-300",
          )}
        />
      ))}
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-1.5 text-[10px] font-600 uppercase tracking-wider text-gray-400 shrink-0">
        {icon}{label}
      </span>
      <span className="text-xs text-gray-700 text-right truncate min-w-0">{value}</span>
    </div>
  );
}

function NotFound() {
  return (
    <div className="max-w-2xl mx-auto py-20 text-center">
      <h2 className="text-xl font-700 text-gray-900">Listing not found</h2>
      <p className="mt-2 text-sm text-gray-500">This listing may have been archived or removed.</p>
      <Button asChild className="mt-6"><a href="/marketplace">Browse marketplace</a></Button>
    </div>
  );
}
