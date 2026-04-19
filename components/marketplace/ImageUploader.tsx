"use client";

import { useRef, useState } from "react";
import { Upload, X, ImageIcon, Loader2, GripVertical } from "lucide-react";
import { uploadListingImage, deleteListingImage, urlToPath } from "@/lib/marketplace/images";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

/**
 * Single-image uploader (used for the presentation / hero image).
 */
export function SingleImageUploader({
  listingId,
  value,
  onChange,
  label = "Presentation image",
  hint,
  aspectClass = "aspect-[16/9]",
}: {
  listingId: string;
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  hint?: string;
  aspectClass?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      if (value) {
        const p = urlToPath(value);
        if (p) await deleteListingImage(p).catch(() => undefined);
      }
      const up = await uploadListingImage(listingId, f);
      onChange(up.url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove() {
    if (!value) return;
    setBusy(true);
    try {
      const p = urlToPath(value);
      if (p) await deleteListingImage(p);
      onChange(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-700 uppercase tracking-wider text-gray-500">{label}</label>
        {value && !busy && (
          <button type="button" onClick={remove} className="text-[10px] text-red-600 hover:underline">Remove</button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onPick} disabled={busy} />
      {value ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className={cn(
            "relative w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50 group",
            aspectClass,
          )}
          title="Click to replace"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center text-white opacity-0 group-hover:opacity-100">
            <Upload size={18} />
          </div>
          {busy && <div className="absolute inset-0 bg-white/70 flex items-center justify-center"><Loader2 size={18} className="animate-spin text-emerald-600" /></div>}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className={cn(
            "w-full rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/60 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors flex flex-col items-center justify-center gap-1.5 text-gray-500",
            aspectClass,
          )}
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
          <span className="text-[11px] font-600">{busy ? "Uploading…" : "Click to upload"}</span>
          {hint && <span className="text-[9px] text-gray-400 px-4 text-center">{hint}</span>}
        </button>
      )}
    </div>
  );
}

/**
 * Multi-image gallery uploader. Images are stored as an array of URLs,
 * reorderable via drag handles, removable one by one.
 */
export function GalleryUploader({
  listingId,
  values,
  onChange,
  label = "Gallery",
  hint = "Screenshots, backtests, result charts — up to 8 images.",
  max = 8,
}: {
  listingId: string;
  values: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  hint?: string;
  max?: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const room = max - values.length;
    if (room <= 0) {
      toast.error(`Gallery full — max ${max} images.`);
      return;
    }
    setBusy(true);
    const next = [...values];
    try {
      for (const f of files.slice(0, room)) {
        const up = await uploadListingImage(listingId, f);
        next.push(up.url);
      }
      onChange(next);
      toast.success(`Added ${files.slice(0, room).length} image(s)`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeAt(i: number) {
    const url = values[i];
    const p = urlToPath(url);
    if (p) await deleteListingImage(p).catch(() => undefined);
    onChange(values.filter((_, idx) => idx !== i));
  }

  function onDragStart(i: number) { setDragIdx(i); }
  function onDragOver(e: React.DragEvent) { e.preventDefault(); }
  function onDrop(i: number) {
    if (dragIdx == null || dragIdx === i) return;
    const next = [...values];
    const [m] = next.splice(dragIdx, 1);
    next.splice(i, 0, m);
    onChange(next);
    setDragIdx(null);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-700 uppercase tracking-wider text-gray-500">{label}</label>
        <span className="text-[10px] text-gray-400">{values.length}/{max}</span>
      </div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" multiple onChange={onPick} disabled={busy} />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {values.map((url, i) => (
          <div
            key={url + i}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={onDragOver}
            onDrop={() => onDrop(i)}
            className={cn(
              "relative aspect-[4/3] rounded-xl border border-gray-200 bg-gray-50 overflow-hidden group",
              dragIdx === i && "opacity-50",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
            <div className="absolute top-1 left-1 inline-flex items-center gap-0.5 text-[8px] font-700 uppercase tracking-wider bg-black/50 text-white rounded px-1 py-0.5 cursor-grab">
              <GripVertical size={9} />
            </div>
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute top-1 right-1 inline-flex w-5 h-5 items-center justify-center rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors"
              aria-label="Remove image"
            >
              <X size={10} />
            </button>
          </div>
        ))}
        {values.length < max && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="aspect-[4/3] rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/60 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors flex flex-col items-center justify-center gap-1 text-gray-500"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            <span className="text-[10px] font-600">{busy ? "Uploading…" : "Add image"}</span>
          </button>
        )}
      </div>

      {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
    </div>
  );
}
