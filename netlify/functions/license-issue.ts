import type { Context } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

import { issueLicenseCore } from "../../lib/licenses/server";
import type { IssueLicenseInput } from "../../lib/licenses/types";

// ──────────────────────────────────────────────────────────────────
// Zentryx License — issuance endpoint
// ──────────────────────────────────────────────────────────────────
// POST /.netlify/functions/license-issue
// Headers: Authorization: Bearer <supabase access token>
// Body:    IssueLicenseInput (see lib/licenses/types.ts)
//
// Two callers:
//   1. Dashboard (creator manually issuing a key to a buyer)
//   2. Future Stripe webhook — re-using this function via a service-role
//      bypass header (not yet wired; bypass flag is present but unused).
//
// Authorization rules:
//   • Caller must be the owner of the `strategy_id` OR the author of the
//     referenced `listing_id`. Admin role also permitted.
//   • User must be on the `creator` plan (or admin) to issue licenses.
//     Pro and Free can bind their own EAs (account-lock, expiry, etc.)
//     at export time, but issuing keys to others is a creator-tier feature.
//
// Returns: { license_id, key, key_prefix, expires_at, bound_account, ... }
// The plaintext `key` is returned ONLY on the issue response. Never
// persisted in plaintext. The caller (UI) must display it and let the
// user copy before closing the dialog.
// ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export default async (req: Request, _ctx: Context) => {
  if (req.method !== "POST") {
    return json({ error: "bad_request", message: "POST required" }, 405);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return json({ error: "server_misconfigured", message: "Missing Supabase env vars." }, 500);
  }

  const auth = req.headers.get("authorization") ?? "";
  const accessToken = auth.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) {
    return json({ error: "unauthorized", message: "Missing bearer token." }, 401);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const { data: userData, error: userErr } = await admin.auth.getUser(accessToken);
  if (userErr || !userData.user) {
    return json({ error: "unauthorized", message: "Invalid session." }, 401);
  }
  const user = userData.user;

  // ── Plan gate: creator or admin only ─────────────────────────────
  const { data: profile } = await admin
    .from("profiles")
    .select("plan,role,suspended")
    .eq("id", user.id)
    .maybeSingle();
  const plan = (profile?.plan ?? "free") as "free" | "pro" | "creator";
  const role = (profile?.role ?? "user") as "user" | "staff" | "admin";
  const suspended = profile?.suspended ?? false;
  const isAdmin = role === "admin" || role === "staff";

  if (suspended) {
    return json({ error: "forbidden", message: "Account suspended." }, 403);
  }
  if (!isAdmin && plan !== "creator") {
    return json({
      error: "forbidden",
      message: "License issuance requires the Creator plan.",
      upgradeTo: "creator",
    }, 403);
  }

  // ── Parse input ──────────────────────────────────────────────────
  let body: IssueLicenseInput;
  try {
    body = (await req.json()) as IssueLicenseInput;
  } catch {
    return json({ error: "bad_request", message: "Invalid JSON body." }, 400);
  }

  if (!body.strategy_id || typeof body.strategy_id !== "string") {
    return json({ error: "bad_request", message: "strategy_id is required." }, 400);
  }

  // ── Ownership check: the strategy must belong to the caller, or
  // the listing (if provided) must be authored by the caller. Admins bypass.
  if (!isAdmin) {
    const { data: strategy } = await admin
      .from("strategies")
      .select("id,user_id")
      .eq("id", body.strategy_id)
      .maybeSingle();
    const ownsStrategy = strategy?.user_id === user.id;

    let ownsListing = false;
    if (body.listing_id) {
      const { data: listing } = await admin
        .from("marketplace_listings")
        .select("id,author_id,strategy_id")
        .eq("id", body.listing_id)
        .maybeSingle();
      ownsListing = listing?.author_id === user.id && listing.strategy_id === body.strategy_id;
    }

    if (!ownsStrategy && !ownsListing) {
      return json({
        error: "forbidden",
        message: "You don't own this strategy or listing.",
      }, 403);
    }
  }

  // ── Generate key and insert (via shared core) ───────────────────
  try {
    const result = await issueLicenseCore({
      admin,
      userId: user.id,
      actorEmail: user.email ?? null,
      input: body,
    });
    return json(result, 200);
  } catch (err) {
    return json({
      error: "insert_failed",
      message: (err as Error).message,
    }, 500);
  }
};
