import type { Context } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

import { issueLicenseCore } from "../../lib/licenses/server";

// ──────────────────────────────────────────────────────────────────
// Marketplace auto-issue
// ──────────────────────────────────────────────────────────────────
// POST /.netlify/functions/marketplace-auto-issue
// Headers: X-Zentryx-Service-Key: <ZENTRYX_SERVICE_KEY>
// Body:    { purchase_id: string }
//
// Called by the Stripe webhook (or any trusted automation) right after a
// purchase transitions to `paid`. Looks up the listing, issues a license
// owned by the listing author bound to the buyer, writes the license id
// back onto the purchase row, and returns the plaintext key.
//
// Idempotent: if the purchase already has a license_id, the existing one
// is returned (without its plaintext — the secret can't be recovered).
// Stripe retries are common; this MUST be safe to re-run.
//
// Authorization: a shared secret header, not Supabase auth. The caller
// is trusted server-to-server. The secret lives in ZENTRYX_SERVICE_KEY
// (Netlify env var); if missing, the endpoint refuses every request.
//
// NOTE: this file is wiring for a future Stripe webhook. Purchase flow
// isn't live yet (marketplace is still at the "draft purchase" stub).
// Shipping it now so the shape is stable when Stripe is finally hooked.
// ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const SERVICE_SECRET = process.env.ZENTRYX_SERVICE_KEY ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

interface Body {
  purchase_id?: string;
}

export default async (req: Request, _ctx: Context) => {
  if (req.method !== "POST") {
    return json({ error: "bad_request", message: "POST required" }, 405);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return json({ error: "server_misconfigured" }, 500);
  }
  if (!SERVICE_SECRET) {
    return json({ error: "server_misconfigured", message: "ZENTRYX_SERVICE_KEY is not set." }, 500);
  }

  const providedKey = req.headers.get("x-zentryx-service-key") ?? "";
  if (!timingSafeEqual(providedKey, SERVICE_SECRET)) {
    return json({ error: "unauthorized" }, 401);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: "bad_request", message: "Invalid JSON body." }, 400);
  }
  if (!body.purchase_id) {
    return json({ error: "bad_request", message: "purchase_id is required." }, 400);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // ── Load purchase + listing. Join manually; RPC would be cleaner.
  const { data: purchase, error: purchaseErr } = await admin
    .from("purchases")
    .select("id, listing_id, buyer_id, status, license_id")
    .eq("id", body.purchase_id)
    .maybeSingle();

  if (purchaseErr) {
    return json({ error: "db_error", message: purchaseErr.message }, 500);
  }
  if (!purchase) {
    return json({ error: "not_found", message: "Purchase not found." }, 404);
  }
  if (purchase.status !== "paid") {
    return json({ error: "not_paid", message: `Purchase status is ${purchase.status}, not paid.` }, 409);
  }

  // Idempotency — if a license was already issued for this purchase, ack it.
  if (purchase.license_id) {
    const { data: existing } = await admin
      .from("licenses")
      .select("id, key_prefix, expires_at, bound_account, bound_broker, bound_server")
      .eq("id", purchase.license_id)
      .maybeSingle();
    if (existing) {
      return json({
        already_issued: true,
        license_id: existing.id,
        key_prefix: existing.key_prefix,
      });
    }
  }

  const { data: listing, error: listingErr } = await admin
    .from("marketplace_listings")
    .select("id, strategy_id, author_id, title")
    .eq("id", purchase.listing_id)
    .maybeSingle();

  if (listingErr) {
    return json({ error: "db_error", message: listingErr.message }, 500);
  }
  if (!listing) {
    return json({ error: "not_found", message: "Listing not found." }, 404);
  }

  // Look up buyer email for a friendlier label / metadata.
  const { data: buyerProfile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", purchase.buyer_id)
    .maybeSingle();

  // ── Issue the license. Owner = listing author (who can revoke).
  let issued;
  try {
    issued = await issueLicenseCore({
      admin,
      userId: listing.author_id,
      actorEmail: null,
      input: {
        strategy_id: listing.strategy_id,
        listing_id: listing.id,
        purchase_id: purchase.id,
        buyer_id: purchase.buyer_id,
        buyer_email: buyerProfile?.email ?? null,
        label: `Marketplace — ${listing.title}`,
        metadata: { source: "marketplace.auto_issue" },
      },
    });
  } catch (err) {
    return json({ error: "issue_failed", message: (err as Error).message }, 500);
  }

  // ── Write back the purchase.license_id so future idempotent calls hit
  // the already-issued branch above.
  const { error: updateErr } = await admin
    .from("purchases")
    .update({ license_id: issued.license_id })
    .eq("id", purchase.id);

  if (updateErr) {
    // Not fatal — the license is valid; log-only.
    console.warn("Failed to backfill purchases.license_id:", updateErr.message);
  }

  // TODO(email): deliver the plaintext key to the buyer via email.
  // Until an email provider is wired, the key is returned to the webhook
  // caller in the response body — the webhook is responsible for either
  // emailing it or exposing it on the buyer's /licenses page.

  return json({
    already_issued: false,
    license_id: issued.license_id,
    key: issued.key,
    key_prefix: issued.key_prefix,
    expires_at: issued.expires_at,
  });
};

/** Constant-time string compare to avoid timing-based secret leakage. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
