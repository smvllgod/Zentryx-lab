"use client";

import { useEffect, useState } from "react";
import { Plus, Eye, EyeOff, Pencil } from "lucide-react";
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

export default function MyListingsPage() {
  const { profile } = useAuth();
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [strategies, setStrategies] = useState<StrategyRow[]>([]);
  const [tags, setTags] = useState<{ slug: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

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
    return () => {
      alive = false;
    };
  }, []);

  function toggleTag(slug: string) {
    setPickedTags((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!gate.ok) {
      toast.error(gate.reason ?? "Creator plan required.");
      return;
    }
    if (!strategyId) {
      toast.error("Pick a strategy.");
      return;
    }
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
      toast.success("Listing created in draft.");
    } catch (err) {
      toast.error((err as Error).message);
    }
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
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={14} /> Create listing
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listings.map((l) => (
            <Card key={l.id}>
              <CardContent>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-700 text-gray-900">{l.title}</h3>
                    <div className="text-xs text-gray-400 mt-1">
                      Updated {formatRelative(l.updated_at)} · {l.price_cents === 0 ? "Free" : formatPrice(l.price_cents, l.currency)}
                    </div>
                  </div>
                  <Badge tone={l.status === "published" ? "emerald" : "default"}>{l.status}</Badge>
                </div>
                <p className="mt-3 text-xs text-gray-500 line-clamp-2">{l.description}</p>
                <div className="mt-4 flex items-center gap-2">
                  <Button asChild variant="secondary" size="sm" className="flex-1">
                    <a href={`/marketplace/listing?id=${l.id}`}><Pencil size={12} /> View</a>
                  </Button>
                  <Button size="sm" variant={l.status === "published" ? "secondary" : "primary"} onClick={() => togglePublish(l)}>
                    {l.status === "published" ? <><EyeOff size={12} /> Unpublish</> : <><Eye size={12} /> Publish</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>New marketplace listing</DialogTitle>
            <DialogDescription>Promote one of your strategies. You can publish it later.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <div>
              <Label htmlFor="strategy">Strategy</Label>
              <NativeSelect
                id="strategy"
                value={strategyId}
                onChange={(e) => setStrategyId(e.target.value)}
                required
              >
                <option value="">Pick a strategy…</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
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
                    onClick={() => toggleTag(t.slug)}
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
    </AppShell>
  );
}
