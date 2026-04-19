// @ts-nocheck — Supabase v2 generics
"use client";

// Marketplace listing image uploads. The Supabase Storage bucket
// `listing-images` is public-read, author-write (see migration 0007).
// Paths are always `<listing_id>/<uuid>.<ext>` — RLS enforces that the
// first segment matches the caller's listing.

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

const BUCKET = "listing-images";
const MAX_BYTES = 5 * 1024 * 1024;         // 5 MB (matches bucket limit)
const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

export interface UploadedImage {
  url: string;          // publicUrl for <img src>
  path: string;         // storage path — used for delete
}

export async function uploadListingImage(
  listingId: string,
  file: File,
): Promise<UploadedImage> {
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured.");
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Only PNG, JPEG or WEBP images are accepted.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`Image too large — max ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`);
  }
  const s = getSupabase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const name = `${listingId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await s.storage.from(BUCKET).upload(name, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = s.storage.from(BUCKET).getPublicUrl(name);
  return { url: data.publicUrl, path: name };
}

export async function deleteListingImage(path: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const s = getSupabase();
  await s.storage.from(BUCKET).remove([path]);
}

/** Strip the public URL prefix to get back the storage path. */
export function urlToPath(url: string): string | null {
  const m = url.match(new RegExp(`/${BUCKET}/(.+)$`));
  return m ? m[1] : null;
}
