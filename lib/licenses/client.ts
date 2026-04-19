// @ts-nocheck — Supabase v2 generic `never` widening.
"use client";

// Browser-side helpers for the license system. Creators use these from
// /dashboard/licenses to list, issue, and revoke keys. Buyers use them
// to see keys issued to them. Never hashes or generates keys — that's
// server-only (see /lib/licenses/core.ts and the Netlify functions).

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/types";
import type {
  IssueLicenseInput,
  IssueLicenseResult,
  LicenseActivationRow,
  LicenseRow,
} from "./types";

function db() {
  return getSupabase();
}

// ── Listing ────────────────────────────────────────────────────────

export async function listMyIssuedLicenses(opts: {
  strategyId?: string;
  listingId?: string;
  limit?: number;
} = {}): Promise<LicenseRow[]> {
  if (!isSupabaseConfigured()) return [];
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [];
  let q = s
    .from("licenses")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.strategyId) q = q.eq("strategy_id", opts.strategyId);
  if (opts.listingId) q = q.eq("listing_id", opts.listingId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LicenseRow[];
}

export async function listMyPurchasedLicenses(): Promise<LicenseRow[]> {
  if (!isSupabaseConfigured()) return [];
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [];
  const { data, error } = await s
    .from("licenses")
    .select("*")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LicenseRow[];
}

export async function getLicenseActivations(licenseId: string, limit = 100): Promise<LicenseActivationRow[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await db()
    .from("license_activations")
    .select("*")
    .eq("license_id", licenseId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as LicenseActivationRow[];
}

// ── Issuance (browser → Netlify function) ──────────────────────────

/**
 * Issue a new license. Hits the /license-issue function with the user's
 * Supabase JWT. The plaintext key is returned ONCE — display it to the
 * creator immediately and never persist it client-side.
 */
export async function issueLicense(input: IssueLicenseInput): Promise<IssueLicenseResult> {
  const s = db();
  const { data: { session } } = await s.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  const res = await fetch("/.netlify/functions/license-issue", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(input),
  });
  const payload = (await res.json()) as IssueLicenseResult | { error: string; message?: string };
  if (!res.ok || "error" in payload) {
    const msg = "error" in payload ? (payload.message ?? payload.error) : res.statusText;
    throw new Error(msg);
  }
  return payload;
}

// ── Mutations (direct via RLS) ─────────────────────────────────────

export async function revokeLicense(licenseId: string, reason?: string): Promise<void> {
  const { error } = await db()
    .from("licenses")
    .update({
      revoked: true,
      revoked_at: new Date().toISOString(),
      revoke_reason: reason ?? null,
    })
    .eq("id", licenseId);
  if (error) throw error;
}

export async function unrevokeLicense(licenseId: string): Promise<void> {
  const { error } = await db()
    .from("licenses")
    .update({ revoked: false, revoked_at: null, revoke_reason: null })
    .eq("id", licenseId);
  if (error) throw error;
}

export async function updateLicense(
  licenseId: string,
  patch: {
    bound_account?: number | null;
    bound_broker?: string | null;
    bound_server?: string | null;
    expires_at?: string | null;
    max_activations?: number | null;
    label?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await db()
    .from("licenses")
    .update({ ...patch, metadata: (patch.metadata ?? undefined) as Json | undefined })
    .eq("id", licenseId);
  if (error) throw error;
}

// ── Admin helpers ─────────────────────────────────────────────────

export async function listLicensesAdmin(opts: {
  query?: string;
  revoked?: boolean;
  limit?: number;
} = {}): Promise<LicenseRow[]> {
  if (!isSupabaseConfigured()) return [];
  let q = db()
    .from("licenses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.revoked !== undefined) q = q.eq("revoked", opts.revoked);
  if (opts.query) q = q.or(`key_prefix.ilike.%${opts.query}%,label.ilike.%${opts.query}%,buyer_email.ilike.%${opts.query}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LicenseRow[];
}

export async function adminRevokeLicense(licenseId: string, reason: string): Promise<void> {
  const s = db();
  const { error } = await s
    .from("licenses")
    .update({
      revoked: true,
      revoked_at: new Date().toISOString(),
      revoke_reason: reason,
    })
    .eq("id", licenseId);
  if (error) throw error;
}
