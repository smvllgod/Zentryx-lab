"use client";

// ──────────────────────────────────────────────────────────────────
// /community/new  — compose a forum post
// ──────────────────────────────────────────────────────────────────
// Posts land in `pending` status (enforced by DB trigger). After submit
// we redirect back to /community with a toast so the user knows their
// post is awaiting moderation.

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock, Info, Send, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { PublicShell } from "@/components/app/public-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/context";
import { createPost, listCategories, listMyPosts, type ForumCategory, type ForumPost } from "@/lib/forum/client";
import { formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export default function NewPostPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [categorySlug, setCategorySlug] = useState("discussion");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [mine, setMine] = useState<ForumPost[]>([]);

  useEffect(() => {
    if (ready && !user) router.replace("/sign-in?returnTo=/community/new");
  }, [ready, user, router]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [cats, own] = await Promise.all([listCategories(), listMyPosts()]);
      if (alive) {
        setCategories(cats);
        setMine(own);
        // Prefer "discussion" if it exists, otherwise the first.
        if (!cats.some((c) => c.slug === "discussion") && cats.length > 0) {
          setCategorySlug(cats[0].slug);
        }
      }
    })();
    return () => { alive = false; };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required."); return; }
    if (body.trim().length < 20) { toast.error("Post body is too short — aim for at least a couple of sentences."); return; }
    if (!categorySlug) { toast.error("Pick a category."); return; }
    setSaving(true);
    try {
      await createPost({ categorySlug, title: title.trim(), body: body.trim() });
      toast.success("Post submitted — awaiting moderation.");
      router.push("/community");
    } catch (err) {
      toast.error("Submit failed: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
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
                <NativeSelect id="cat" value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)}>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.label}</option>
                  ))}
                </NativeSelect>
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
