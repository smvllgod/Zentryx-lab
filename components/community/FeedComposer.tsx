"use client";

import { useState } from "react";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/context";
import { createFeedPost, uploadFeedImage, deleteFeedImage, type FeedPost } from "@/lib/feed/client";
import { moderatePostAsync } from "@/lib/moderation/client";
import { cn } from "@/lib/utils/cn";

const MAX_IMAGES = 4;
const BODY_LIMIT = 2000;

export function FeedComposer({ onPosted }: { onPosted: (post: FeedPost) => void }) {
  const { user, profile } = useAuth();
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);

  if (!user) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center">
        <p className="text-sm text-gray-600">Sign in to share with the community.</p>
        <Button asChild size="sm" className="mt-2">
          <a href="/sign-in?returnTo=/community">Sign in</a>
        </Button>
      </div>
    );
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
        try { urls.push(await uploadFeedImage(f)); }
        catch (err) { toast.error(`${f.name}: ${(err as Error).message}`); }
      }
      if (urls.length) setImages((prev) => [...prev, ...urls]);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
    void deleteFeedImage(url).catch(() => undefined);
  }

  async function submit() {
    if (!user) return;
    if (!body.trim() && images.length === 0) { toast.error("Say something, or add a picture."); return; }
    setPosting(true);
    try {
      const post = await createFeedPost({ body: body.trim(), imageUrls: images });
      onPosted({
        ...post,
        author: { id: user.id, display_name: profile?.full_name ?? "You", avatar_url: profile?.avatar_url ?? null },
        liked_by_me: false,
      });
      setBody("");
      setImages([]);
      toast.success("Posted.");
      // Fire-and-forget AI moderation — the post is live instantly and
      // the AI may retroactively soft-delete it if it looks like spam.
      moderatePostAsync("feed", post.id);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPosting(false);
    }
  }

  const remaining = BODY_LIMIT - body.length;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex gap-3">
        <Avatar name={profile?.full_name ?? "You"} avatar={profile?.avatar_url ?? null} size="md" />
        <div className="flex-1 min-w-0">
          <Textarea
            value={body}
            maxLength={BODY_LIMIT}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share a setup, a screenshot, or a quick note…"
            className="min-h-[70px] border-0 focus:ring-0 focus-visible:ring-0 resize-none bg-transparent text-sm placeholder:text-gray-400"
          />

          {images.length > 0 && (
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {images.map((url) => (
                <div key={url} className="relative group aspect-video rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
            <label className={cn(
              "inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 cursor-pointer",
              (images.length >= MAX_IMAGES || uploading) && "opacity-40 cursor-not-allowed",
            )}>
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
              {uploading ? "Uploading…" : `Photo (${images.length}/${MAX_IMAGES})`}
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImages} disabled={uploading || images.length >= MAX_IMAGES} />
            </label>
            <div className="flex items-center gap-3">
              <span className={cn("text-[10px] tabular-nums", remaining < 80 ? "text-amber-600" : "text-gray-400")}>
                {remaining}
              </span>
              <Button onClick={submit} disabled={posting || uploading || (!body.trim() && images.length === 0)} size="sm">
                {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {posting ? "Posting…" : "Post"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Avatar({ name, avatar, size = "md" }: { name: string; avatar: string | null; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-7 h-7 text-[10px]" : "w-10 h-10 text-[12px]";
  return (
    <div className={cn("rounded-full overflow-hidden bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0 font-700 text-white", dim)}>
      {avatar ? (
        <img src={avatar} alt="" className="w-full h-full object-cover" />
      ) : (
        (name.match(/\b\w/g) ?? []).slice(0, 2).join("").toUpperCase() || "?"
      )}
    </div>
  );
}
