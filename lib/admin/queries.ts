// @ts-nocheck — Supabase v2 generic `never` widening.
"use client";

// All admin-only Supabase queries. Every call assumes the caller has
// already verified `useIsAdmin()` — RLS still enforces this server-side.

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Tables, Json } from "@/lib/supabase/types";

function db() {
  return getSupabase();
}

// ── Overview ──────────────────────────────────────────────────────

export interface OverviewStats {
  totalUsers: number;
  newSignups7d: number;
  payingSubscribers: number;
  proSubs: number;
  creatorSubs: number;
  mrrUsd: number;
  totalStrategies: number;
  totalExports: number;
  totalListings: number;
  totalPurchases: number;
  recentErrors: number;
}

export async function fetchOverviewStats(): Promise<OverviewStats> {
  if (!isSupabaseConfigured()) return emptyStats();

  const s = db();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    users,
    signups7d,
    strategies,
    exports,
    listings,
    purchases,
    errors7d,
    mrr,
  ] = await Promise.all([
    s.from("profiles").select("id", { count: "exact", head: true }),
    s.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    s.from("strategies").select("id", { count: "exact", head: true }),
    s.from("exports").select("id", { count: "exact", head: true }),
    s.from("marketplace_listings").select("id", { count: "exact", head: true }),
    s.from("purchases").select("id", { count: "exact", head: true }).eq("status", "paid"),
    s.from("system_errors").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    s.from("mrr_snapshot").select("*").single(),
  ]);

  return {
    totalUsers: users.count ?? 0,
    newSignups7d: signups7d.count ?? 0,
    payingSubscribers: (mrr.data as any)?.paying_subscribers ?? 0,
    proSubs: (mrr.data as any)?.pro_subs ?? 0,
    creatorSubs: (mrr.data as any)?.creator_subs ?? 0,
    mrrUsd: (mrr.data as any)?.mrr_usd ?? 0,
    totalStrategies: strategies.count ?? 0,
    totalExports: exports.count ?? 0,
    totalListings: listings.count ?? 0,
    totalPurchases: purchases.count ?? 0,
    recentErrors: errors7d.count ?? 0,
  };
}

function emptyStats(): OverviewStats {
  return {
    totalUsers: 0, newSignups7d: 0, payingSubscribers: 0,
    proSubs: 0, creatorSubs: 0, mrrUsd: 0,
    totalStrategies: 0, totalExports: 0, totalListings: 0, totalPurchases: 0, recentErrors: 0,
  };
}

export async function fetchRecentErrors(limit = 10) {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await db()
    .from("system_errors")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ── Users ─────────────────────────────────────────────────────────

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string | null;
  plan: "free" | "pro" | "creator";
  role: "user" | "staff" | "admin";
  suspended: boolean;
  created_at: string;
  strategies_count?: number;
  exports_count?: number;
  is_seller?: boolean;
}

export async function listUsers(opts: { query?: string; plan?: string; limit?: number; offset?: number } = {}) {
  if (!isSupabaseConfigured()) return [] as AdminUserRow[];
  let q = db()
    .from("profiles")
    .select("id,email,full_name,plan,role,suspended,created_at")
    .order("created_at", { ascending: false })
    .range(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 50) - 1);
  if (opts.query) q = q.or(`email.ilike.%${opts.query}%,full_name.ilike.%${opts.query}%`);
  if (opts.plan) q = q.eq("plan", opts.plan);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AdminUserRow[];
}

export async function getUser(id: string) {
  const s = db();
  const { data, error } = await s.from("profiles").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Tables<"profiles">;
}

export async function getUserDetail(id: string) {
  const s = db();
  const [profile, subs, strategies, exports] = await Promise.all([
    s.from("profiles").select("*").eq("id", id).single(),
    s.from("subscriptions").select("*").eq("user_id", id).order("created_at", { ascending: false }),
    s.from("strategies").select("id,name,status,created_at,updated_at").eq("user_id", id).order("updated_at", { ascending: false }),
    s.from("exports").select("id,filename,created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
  ]);
  return {
    profile: (profile.data ?? null) as Tables<"profiles"> | null,
    subscriptions: (subs.data ?? []) as Tables<"subscriptions">[],
    strategies: (strategies.data ?? []) as Pick<Tables<"strategies">, "id" | "name" | "status" | "created_at" | "updated_at">[],
    exports: (exports.data ?? []) as Pick<Tables<"exports">, "id" | "filename" | "created_at">[],
  };
}

export async function setUserSuspended(id: string, suspended: boolean) {
  const { error } = await db().from("profiles").update({ suspended }).eq("id", id);
  if (error) throw error;
}

export async function setUserPlan(id: string, plan: "free" | "pro" | "creator") {
  const { error } = await db().from("profiles").update({ plan }).eq("id", id);
  if (error) throw error;
}

export async function setUserRole(id: string, role: "user" | "staff" | "admin") {
  const { error } = await db().from("profiles").update({ role }).eq("id", id);
  if (error) throw error;
}

// ── Subscriptions ─────────────────────────────────────────────────

export async function listSubscriptions(opts: { status?: string; limit?: number } = {}) {
  if (!isSupabaseConfigured()) return [];
  let q = db()
    .from("subscriptions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.status) q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function overrideSubscription(id: string, patch: { plan?: string; status?: string; current_period_end?: string }) {
  const { error } = await db().from("subscriptions").update(patch).eq("id", id);
  if (error) throw error;
}

// ── Strategies ────────────────────────────────────────────────────

export async function listStrategiesAdmin(opts: { query?: string; status?: string; limit?: number } = {}) {
  if (!isSupabaseConfigured()) return [];
  let q = db()
    .from("strategies")
    .select("id,user_id,name,status,tags,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.query) q = q.ilike("name", `%${opts.query}%`);
  if (opts.status) q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// ── Blocks analytics ──────────────────────────────────────────────

export async function listBlockAnalytics() {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await db()
    .from("block_analytics")
    .select("*")
    .order("usage_count", { ascending: false });
  if (error && error.code !== "42P01") throw error;
  return (data ?? []) as { block_id: string; usage_count: number; unique_users: number; last_used_at: string | null }[];
}

// ── Block registry overrides ──────────────────────────────────────

export async function listBlockOverrides() {
  const { data, error } = await db().from("block_registry_overrides").select("*");
  if (error) throw error;
  return (data ?? []) as Tables<"block_registry_overrides">[];
}

export async function setBlockOverride(blockId: string, patch: { force_status?: string; force_plan?: string; force_hidden?: boolean; notes?: string }) {
  const s = db();
  const user = (await s.auth.getUser()).data.user;
  const { error } = await s
    .from("block_registry_overrides")
    .upsert(
      { block_id: blockId, ...patch, updated_by: user?.id ?? null },
      { onConflict: "block_id" },
    );
  if (error) throw error;
}

export async function clearBlockOverride(blockId: string) {
  const { error } = await db().from("block_registry_overrides").delete().eq("block_id", blockId);
  if (error) throw error;
}

// ── Feature flags ─────────────────────────────────────────────────

export async function listFeatureFlags() {
  const { data, error } = await db().from("feature_flags").select("*").order("slug");
  if (error) throw error;
  return (data ?? []) as Tables<"feature_flags">[];
}

export async function setFeatureFlag(slug: string, enabled: boolean) {
  const s = db();
  const user = (await s.auth.getUser()).data.user;
  const { error } = await s.from("feature_flags").upsert(
    { slug, enabled, updated_by: user?.id ?? null },
    { onConflict: "slug" },
  );
  if (error) throw error;
}

// ── Exports ───────────────────────────────────────────────────────

export async function listExportsAdmin(limit = 100) {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await db()
    .from("exports")
    .select("id,filename,user_id,strategy_id,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ── Marketplace ───────────────────────────────────────────────────

export async function listListingsAdmin(opts: { status?: string; query?: string; limit?: number } = {}) {
  if (!isSupabaseConfigured()) return [];
  let q = db()
    .from("marketplace_listings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.status) q = q.eq("status", opts.status);
  if (opts.query) q = q.ilike("title", `%${opts.query}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function setListingStatus(id: string, status: "draft" | "published" | "archived") {
  const { error } = await db().from("marketplace_listings").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function listListingFlags(opts: { resolved?: boolean } = {}) {
  if (!isSupabaseConfigured()) return [];
  let q = db().from("listing_flags").select("*").order("created_at", { ascending: false });
  if (opts.resolved !== undefined) q = q.eq("resolved", opts.resolved);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function resolveListingFlag(id: string) {
  const s = db();
  const user = (await s.auth.getUser()).data.user;
  const { error } = await s.from("listing_flags")
    .update({ resolved: true, resolved_by: user?.id ?? null })
    .eq("id", id);
  if (error) throw error;
}

// ── Creator management ────────────────────────────────────────────

export interface CreatorRow {
  id: string;
  email: string;
  full_name: string | null;
  listings: number;
  purchases: number;
  revenue_cents: number;
}

export async function listTopCreators(limit = 20) {
  if (!isSupabaseConfigured()) return [] as CreatorRow[];
  // Pull the set of creator users; join listing + purchase counts in JS
  // (RPC / materialised view can be added later for larger scales).
  const s = db();
  const [creators, listings, purchases] = await Promise.all([
    s.from("profiles").select("id,email,full_name,plan").eq("plan", "creator"),
    s.from("marketplace_listings").select("author_id"),
    s.from("purchases").select("listing_id,price_cents,status"),
  ]);
  const listingsByAuthor = new Map<string, number>();
  for (const l of (listings.data ?? []) as { author_id: string }[]) {
    listingsByAuthor.set(l.author_id, (listingsByAuthor.get(l.author_id) ?? 0) + 1);
  }
  const paidPurchasesByListing = new Map<string, number>();
  const revenueByListing = new Map<string, number>();
  for (const p of (purchases.data ?? []) as { listing_id: string; price_cents: number; status: string }[]) {
    if (p.status === "paid") {
      paidPurchasesByListing.set(p.listing_id, (paidPurchasesByListing.get(p.listing_id) ?? 0) + 1);
      revenueByListing.set(p.listing_id, (revenueByListing.get(p.listing_id) ?? 0) + p.price_cents);
    }
  }
  // Map listing → author for revenue attribution
  const listingToAuthor = new Map<string, string>();
  for (const l of (listings.data ?? []) as { author_id: string; id?: string }[]) {
    // The SELECT above only pulled author_id — re-query for id→author_id mapping
  }
  const authorListingsFull = await s
    .from("marketplace_listings")
    .select("id,author_id");
  for (const l of (authorListingsFull.data ?? []) as { id: string; author_id: string }[]) {
    listingToAuthor.set(l.id, l.author_id);
  }
  const revenueByAuthor = new Map<string, number>();
  for (const [listingId, cents] of revenueByListing.entries()) {
    const author = listingToAuthor.get(listingId);
    if (!author) continue;
    revenueByAuthor.set(author, (revenueByAuthor.get(author) ?? 0) + cents);
  }

  return ((creators.data ?? []) as { id: string; email: string; full_name: string | null }[])
    .map((c) => ({
      id: c.id,
      email: c.email,
      full_name: c.full_name,
      listings: listingsByAuthor.get(c.id) ?? 0,
      purchases: Array.from(paidPurchasesByListing.entries()).reduce((acc, [listingId, n]) => {
        return listingToAuthor.get(listingId) === c.id ? acc + n : acc;
      }, 0),
      revenue_cents: revenueByAuthor.get(c.id) ?? 0,
    }))
    .sort((a, b) => b.revenue_cents - a.revenue_cents)
    .slice(0, limit);
}

// ── System settings ───────────────────────────────────────────────

export async function listSettings() {
  const { data, error } = await db().from("system_settings").select("*").order("key");
  if (error) throw error;
  return (data ?? []) as Tables<"system_settings">[];
}

export async function updateSetting(key: string, value: Json) {
  const s = db();
  const user = (await s.auth.getUser()).data.user;
  const { error } = await s.from("system_settings").upsert(
    { key, value, updated_by: user?.id ?? null },
    { onConflict: "key" },
  );
  if (error) throw error;
}
