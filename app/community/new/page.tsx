"use client";

// ──────────────────────────────────────────────────────────────────
// /community/new  — compose a forum post
// ──────────────────────────────────────────────────────────────────
// Posts land in `pending` status (enforced by DB trigger). After submit
// we redirect back to /community with a toast so the user knows their
// post is awaiting moderation.

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock, Info, Send, Sparkles, ImagePlus, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { PublicShell } from "@/components/app/public-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/context";
import {
  createPost, listCategories, listMyPosts, uploadForumImage, deleteForumImage,
  type ForumCategory, type ForumPost,
} from "@/lib/forum/client";
import { moderatePostAsync } from "@/lib/moderation/client";
import { formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export default function NewPostPage() {
  const { user, profile, ready } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [categorySlug, setCategorySlug] = useState("discussion");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [mine, setMine] = useState<ForumPost[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const MAX_IMAGES = 6;

  useEffect(() => {
    if (ready && !user) router.replace("/sign-in?returnTo=/community/new");
  }, [ready, user, router]);

  const isAdmin = (profile?.role ?? "user") === "admin";

  useEffect(() => {
    let alive = true;
    (async () => {
      const [catsRaw, own] = await Promise.all([listCategories(), listMyPosts()]);
      // Hide admin-only categories (e.g. Announcements) from non-admin users.
      const cats = catsRaw.filter(
        (c) => isAdmin || !((c as unknown as { admin_only?: boolean }).admin_only),
      );
      if (alive) {
        setCategories(cats);
        setMine(own);
        if (!cats.some((c) => c.slug === "discussion") && cats.length > 0) {
          setCategorySlug(cats[0].slug);
        }
      }
    })();
    return () => { alive = false; };
  }, [isAdmin]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required."); return; }
    if (body.trim().length < 20) { toast.error("Post body is too short — aim for at least a couple of sentences."); return; }
    if (!categorySlug) { toast.error("Pick a category."); return; }
    setSaving(true);
    try {
      const created = await createPost({ categorySlug, title: title.trim(), body: body.trim(), imageUrls: images });
      toast.success("Post submitted — AI moderation running now.");
      // Fire-and-forget: the AI moderator may auto-approve the post
      // before the human queue catches it, so the user sees it live
      // within seconds instead of "pending" for hours.
      moderatePostAsync("forum", created.id);
      router.push("/community");
    } catch (err) {
      toast.error("Submit failed: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) { toast.error(`Up to ${MAX_IMAGES} images per post.`); return; }
    const batch = files.slice(0, remaining);
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of batch) {
        try {
          const url = await uploadForumImage(f);
          urls.push(url);
        } catch (err) {
          toast.error(`${f.name}: ${(err as Error).message}`);
        }
      }
      if (urls.length > 0) {
        setImages((prev) => [...prev, ...urls]);
        toast.success(`${urls.length} image${urls.length === 1 ? "" : "s"} uploaded.`);
      }
    } finally {
      setUploading(false);
      // Reset input so the same file can be picked again if removed.
      e.target.value = "";
    }
  }

  async function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
    // Best-effort cleanup of the storage object.
    void deleteForumImage(url).catch(() => undefined);
  }

  const pending = useMemo(() => mine.filter((p) => p.status === "pending"), [mine]);
  const rejected = useMemo(() => mine.filter((p) => p.status === "rejected"), [mine]);

  return (
    <PublicShell>
      <div className="max-w-3xl mx-auto px-5 lg:px-8 py-8">
        <div className="flex items-center gap-1.5 text-[11px] font-600 text-gray-400 mb-5">
          <a href="/community" className="hover:text-gray-700 inline-flex items-center gap-1"><ArrowLeft size={10} /> Community</a>
        </div>

        <h1 className="text-xl sm:text-2xl font-700 text-gray-900">New post</h1>
        <p className="mt-1 text-sm text-gray-500">Posts are reviewed before publishing — keep it on-topic, no spam, no drive-by promotion.</p>

        <Card className="mt-5">
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="cat">Category</Label>
                <CustomSelect
                  id="cat"
                  value={categorySlug}
                  onChange={setCategorySlug}
                  options={categories.map((c) => ({
                    value: c.slug,
                    label: c.label,
                    hint: c.description ?? undefined,
                  }))}
                />
                {categories.find((c) => c.slug === categorySlug)?.description && (
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    {categories.find((c) => c.slug === categorySlug)!.description}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Specific, actionable, searchable." />
                <div className="text-[10px] text-gray-400 mt-1 text-right">{title.length} / 120</div>
              </div>

              <div>
                <Label htmlFor="body">Body (markdown supported)</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[220px] font-mono text-[13px]"
                  placeholder={`What you're trying to do, what you've tried, backtest / tick screenshots etc.\n\nFormatting: **bold**, *italic*, \`code\`, tables, links.`}
                />
              </div>

              {/* Image uploader — up to 6 images, 5 MB each. */}
              <div>
                <Label>Images (optional, up to {MAX_IMAGES})</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {images.map((url) => (
                    <div key={url} className="relative group w-24 h-24 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(url)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <label className={cn(
                      "w-24 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer text-gray-400 text-[10px] font-600",
                      uploading ? "border-emerald-300 bg-emerald-50/40" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50",
                    )}>
                      {uploading ? <Loader2 size={16} className="animate-spin text-emerald-500" /> : <ImagePlus size={18} />}
                      <span>{uploading ? "Uploading" : "Add image"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImages}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] text-gray-500">PNG, JPG, WEBP. Max 5 MB each. They appear inline in your post.</p>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/40 p-3 text-[11px] text-amber-800 leading-snug">
                <Info size={13} className="shrink-0 mt-0.5" />
                <div>
                  Your post goes through a quick manual review before showing up on the community feed. You&apos;ll still see it under &ldquo;Your pending posts&rdquo; below.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => router.push("/community")}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  <Send size={13} /> {saving ? "Submitting…" : "Submit for review"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {(pending.length > 0 || rejected.length > 0) && (
          <Card className="mt-5">
            <CardContent>
              <h2 className="text-sm font-700 text-gray-900 inline-flex items-center gap-1.5"><Clock size={13} className="text-amber-600" /> Your pending posts</h2>
              <ul className="mt-3 divide-y divide-gray-100">
                {[...pending, ...rejected].map((p) => (
                  <li key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-600 text-gray-900 truncate">{p.title}</div>
                      <div className="text-[10px] text-gray-400">{formatRelative(p.created_at)}</div>
                    </div>
                    <Badge tone={p.status === "pending" ? "amber" : "red"}>{p.status}</Badge>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[10px] text-gray-400">
                Rejected posts include the moderator&apos;s reason — tap the post to see it.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PublicShell>
  );
}
