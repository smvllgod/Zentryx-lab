"use client";

import { useEffect, useState } from "react";
import { Plus, Eye, EyeOff, Pencil, ImageIcon } from "lucide-react";
import { AppShell } from "@/components/app/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  createListing,
  listOwnListings,
  listTags,
  updateListing,
  type ListingRow,
} from "@/lib/marketplace/store";
import { listStrategies, type StrategyRow } from "@/lib/strategies/store";
import { canPublishToMarketplace } from "@/lib/billing/gating";
import { useAuth } from "@/lib/auth/context";
import { formatPrice, formatRelative } from "@/lib/utils/format";
import { SingleImageUploader, GalleryUploader } from "@/components/marketplace/ImageUploader";
import { SetfilesManager } from "@/components/setfiles/SetfilesManager";

export default function MyListingsPage() {
  const { profile } = useAuth();
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [strategies, setStrategies] = useState<StrategyRow[]>([]);
  const [tags, setTags] = useState<{ slug: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ListingRow | null>(null);

  // Create-dialog state
  const [strategyId, setStrategyId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [pickedTags, setPickedTags] = useState<string[]>([]);

  const plan = profile?.plan ?? "free";
  const gate = canPublishToMarketplace(plan);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [own, strats, t] = await Promise.all([listOwnListings(), listStrategies(), listTags()]);
        if (!alive) return;
        setListings(own);
        setStrategies(strats);
        setTags(t);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  function toggleCreateTag(slug: string) {
    setPickedTags((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!gate.ok) { toast.error(gate.reason ?? "Creator plan required."); return; }
    if (!strategyId) { toast.error("Pick a strategy."); return; }
    try {
      const row = await createListing({
        strategyId,
        title,
        description,
        priceCents: Math.round(Number(price || "0") * 100),
        tags: pickedTags,
      });
      setListings((l) => [row, ...l]);
      setCreateOpen(false);
      resetCreate();
      // Open the editor straight away so the user can upload images.
      setEditing(row);
      toast.success("Listing created in draft. Add images and publish when ready.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function resetCreate() {
    setStrategyId("");
    setTitle("");
    setDescription("");
    setPrice("0");
    setPickedTags([]);
  }

  async function togglePublish(row: ListingRow) {
    try {
      const next = row.status === "published" ? "draft" : "published";
      const updated = await updateListing(row.id, { status: next });
      setListings((l) => l.map((x) => (x.id === row.id ? updated : x)));
      toast.success(next === "published" ? "Published." : "Unpublished.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function patchLocal(updated: ListingRow) {
    setListings((l) => l.map((x) => (x.id === updated.id ? updated : x)));
    setEditing(updated);
  }

  return (
    <AppShell
      title="My Listings"
      actions={
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={14} /> New listing
        </Button>
      }
    >
      {!gate.ok && (
        <Card className="mb-5 border-amber-200 bg-amber-50/40">
          <CardContent>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-700 text-amber-900">Marketplace publishing requires Creator</h3>
                <p className="mt-1 text-xs text-amber-800">{gate.reason}</p>
              </div>
              <Button asChild size="sm"><a href="/billing">View plans</a></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : listings.length === 0 ? (
        <EmptyState
          title="No listings yet"
          description="Promote a strategy from your library — buyers can purchase and download the .mq5."
          action={<Button onClick={() => setCreateOpen(true)}><Plus size={14} /> Create listing</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listings.map((l) => (
            <Card key={l.id} className="overflow-hidden">
              <CardContent className="!p-0">
                {/* Presentation image or placeholder */}
                <div className="aspect-[16/9] bg-gradient-to-br from-emerald-50 to-white relative">
                  {l.presentation_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.presentation_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 gap-1.5">
                      <ImageIcon size={16} /> <span className="text-[11px]">No cover image</span>
                    </div>
                  )}
                  <Badge tone={l.status === "published" ? "emerald" : "default"} className="absolute top-2.5 right-2.5">{l.status}</Badge>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-700 text-gray-900 truncate">{l.title}</h3>
                      <div className="text-xs text-gray-400 mt-1">
                        Updated {formatRelative(l.updated_at)} · {l.price_cents === 0 ? "Free" : formatPrice(l.price_cents, l.currency)} · {l.gallery_urls.length}/8 gallery
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-gray-500 line-clamp-2">{l.description}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditing(l)} className="flex-1">
                      <Pencil size={12} /> Edit
                    </Button>
                    <Button size="sm" variant={l.status === "published" ? "secondary" : "primary"} onClick={() => togglePublish(l)}>
                      {l.status === "published" ? <><EyeOff size={12} /> Unpublish</> : <><Eye size={12} /> Publish</>}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-[94vw] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>New marketplace listing</DialogTitle>
            <DialogDescription>Create a draft — you&apos;ll upload images and publish in the next step.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <div>
              <Label htmlFor="strategy">Strategy</Label>
              <NativeSelect id="strategy" value={strategyId} onChange={(e) => setStrategyId(e.target.value)} required>
                <option value="">Pick a strategy…</option>
                {strategies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </NativeSelect>
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="price">Price (USD)</Label>
              <Input id="price" type="number" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => toggleCreateTag(t.slug)}
                    className={`text-xs px-2.5 py-1 rounded-full border ${pickedTags.includes(t.slug) ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-gray-200 text-gray-600"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit">Create draft</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      {editing && (
        <EditListingDialog
          listing={editing}
          tags={tags}
          onClose={() => setEditing(null)}
          onSaved={patchLocal}
        />
      )}
    </AppShell>
  );
}

// ────────────────────────────────────────────────────────────────────
// Edit dialog — full listing editor including images
// ────────────────────────────────────────────────────────────────────

function EditListingDialog({
  listing,
  tags,
  onClose,
  onSaved,
}: {
  listing: ListingRow;
  tags: { slug: string; label: string }[];
  onClose: () => void;
  onSaved: (row: ListingRow) => void;
}) {
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description);
  const [price, setPrice] = useState(String(listing.price_cents / 100));
  const [pickedTags, setPickedTags] = useState<string[]>(listing.tags);
  const [presentationUrl, setPresentationUrl] = useState<string | null>(listing.presentation_image_url ?? null);
  const [gallery, setGallery] = useState<string[]>(listing.gallery_urls ?? []);
  const [saving, setSaving] = useState(false);

  function toggleTag(slug: string) {
    setPickedTags((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  async function save() {
    setSaving(true);
    try {
      const updated = await updateListing(listing.id, {
        title,
        description,
        price_cents: Math.round(Number(price || "0") * 100),
        tags: pickedTags,
        presentation_image_url: presentationUrl,
        gallery_urls: gallery,
      });
      onSaved(updated);
      toast.success("Listing saved.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // Auto-save images immediately — no user surprise with "forgot to click save".
  async function saveImages(next: { presentation?: string | null; gallery?: string[] }) {
    try {
      const updated = await updateListing(listing.id, {
        presentation_image_url: next.presentation !== undefined ? next.presentation : presentationUrl,
        gallery_urls: next.gallery !== undefined ? next.gallery : gallery,
      });
      onSaved(updated);
    } catch (err) {
      toast.error("Image save failed: " + (err as Error).message);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[94vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">Edit listing — {listing.title}</DialogTitle>
          <DialogDescription>Images upload and save immediately. Text fields save when you click Save.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <SingleImageUploader
            listingId={listing.id}
            value={presentationUrl}
            onChange={(url) => { setPresentationUrl(url); saveImages({ presentation: url }); }}
            label="Presentation / hero image"
            hint="1600 × 900 recommended · PNG / JPEG / WEBP · up to 5 MB"
          />

          <GalleryUploader
            listingId={listing.id}
            values={gallery}
            onChange={(urls) => { setGallery(urls); saveImages({ gallery: urls }); }}
            label="Gallery (backtests, results, chart panels)"
            hint="Drag to reorder · up to 8 images · PNG / JPEG / WEBP"
          />

          <div>
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-desc">Description (markdown OK)</Label>
            <Textarea id="edit-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[120px]" />
          </div>
          <div>
            <Label htmlFor="edit-price">Price (USD)</Label>
            <Input id="edit-price" type="number" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => toggleTag(t.slug)}
                  className={`text-xs px-2.5 py-1 rounded-full border ${pickedTags.includes(t.slug) ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-gray-200 text-gray-600"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Setfiles</Label>
            <SetfilesManager
              listingId={listing.id}
              hidePublicToggle
              title="Setfiles attached to this listing"
              description="Buyers of this strategy get these .set files alongside the .mq5 download."
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
          <Button type="button" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
