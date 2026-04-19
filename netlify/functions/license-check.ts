import type { Context } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

import { hashUserSuppliedKey } from "../../lib/licenses/core";
import { evaluateLicense } from "../../lib/licenses/check";
import type {
  CheckLicenseRequest,
  CheckLicenseResponse,
  LicenseResult,
  LicenseRow,
} from "../../lib/licenses/types";

// ──────────────────────────────────────────────────────────────────
// Zentryx License — runtime check endpoint
// ──────────────────────────────────────────────────────────────────
// POST /.netlify/functions/license-check
// Called by the user's EA via MQL5 WebRequest(). No auth — the license
// key itself is the credential. Every request is logged, even invalid
// ones, into license_activations for abuse detection.
//
// Supports both POST JSON and GET query params, since MQL5's WebRequest
// can be flaky on some brokers with POST bodies. Both shapes work.
//
// Response shape — see lib/licenses/types.ts:CheckLicenseResponse.
// ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      // Permissive CORS: MT5's WebRequest doesn't send an Origin, but in
      // case the same endpoint is called from a browser for testing, we
      // keep it open. The key itself is the auth.
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, GET, OPTIONS",
      "access-control-allow-headers": "content-type",
      "cache-control": "no-store",
    },
  });
}

function parseQuery(url: URL): CheckLicenseRequest {
  const q = url.searchParams;
  const acct = q.get("account");
  return {
    key: q.get("key") ?? "",
    account: acct != null ? Number(acct) : undefined,
    broker: q.get("broker") ?? undefined,
    server: q.get("server") ?? undefined,
    terminal: q.get("terminal") ?? undefined,
    product: q.get("product") ?? undefined,
  };
}

export default async (req: Request, _ctx: Context) => {
  if (req.method === "OPTIONS") return json({}, 204);
  if (req.method !== "POST" && req.method !== "GET") {
    return json({ valid: false, reason: "malformed", message: "POST or GET required" } satisfies CheckLicenseResponse, 405);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return json({ valid: false, reason: "malformed", message: "Server misconfigured." } satisfies CheckLicenseResponse, 500);
  }

  // ── Parse request ────────────────────────────────────────────────
  let body: CheckLicenseRequest;
  if (req.method === "GET") {
    body = parseQuery(new URL(req.url));
  } else {
    try {
      body = (await req.json()) as CheckLicenseRequest;
    } catch {
      // Fall back to query params if JSON is malformed — some MT5 installs
      // POST with Content-Type=application/x-www-form-urlencoded.
      body = parseQuery(new URL(req.url));
    }
  }

  const keyHash = hashUserSuppliedKey(body.key ?? "");
  if (!keyHash) {
    return respondAndLog({
      result: "malformed",
      response: { valid: false, reason: "malformed", message: "Key is malformed." },
      body,
      keyHash: null,
      clientIp: ipFromReq(req),
      userAgent: req.headers.get("user-agent"),
    });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // ── Look up by hash ──────────────────────────────────────────────
  const { data: licenseData, error: lookupErr } = await admin
    .from("licenses")
    .select("*")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (lookupErr) {
    return json({
      valid: false,
      reason: "malformed",
      message: `License lookup failed: ${lookupErr.message}`,
    } satisfies CheckLicenseResponse, 500);
  }

  const license = (licenseData ?? null) as LicenseRow | null;

  // ── Usage count (for max_activations enforcement) ────────────────
  let distinctAccountsSoFar: number | undefined;
  if (license?.max_activations != null) {
    const { data: usageData } = await admin
      .from("license_activations")
      .select("account_login")
      .eq("license_id", license.id)
      .eq("result", "valid");
    const accounts = new Set<number>();
    for (const r of (usageData ?? []) as { account_login: number | null }[]) {
      if (r.account_login != null) accounts.add(Number(r.account_login));
    }
    distinctAccountsSoFar = accounts.size;
  }

  const evalResult = evaluateLicense({
    license,
    request: body,
    distinctAccountsSoFar,
  });

  // ── Grace mode for transient failures ────────────────────────────
  // Only applies when the server is about to say "invalid_key" AND the
  // system-level grace mode is on. (Other failure types are authoritative:
  // an expired or revoked key MUST be refused regardless of grace mode.)
  // This is mostly relevant for the EA's own retry logic, not this path.
  // We still log the result honestly; the response body is what the EA acts on.
  let graceApplied = false;
  if (evalResult.result === "invalid_key") {
    const { data: settings } = await admin
      .from("system_settings")
      .select("value")
      .eq("key", "licensing_defaults")
      .maybeSingle();
    const grace = (settings?.value as { grace_mode?: boolean } | null)?.grace_mode === true;
    if (grace) {
      graceApplied = true;
      evalResult.response = {
        ...evalResult.response,
        grace: true,
        message: "License unknown — server is in grace mode; EA may run.",
      };
    }
  }

  return respondAndLog({
    result: graceApplied ? "grace" : evalResult.result,
    response: evalResult.response,
    body,
    keyHash,
    licenseId: license?.id ?? null,
    clientIp: ipFromReq(req),
    userAgent: req.headers.get("user-agent"),
  });

  // ── Inline helper: log + respond in one shot ────────────────────
  async function respondAndLog(args: {
    result: LicenseResult;
    response: CheckLicenseResponse;
    body: CheckLicenseRequest;
    keyHash: string | null;
    licenseId?: string | null;
    clientIp: string | null;
    userAgent: string | null;
  }) {
    const { result, response, body, keyHash, licenseId, clientIp, userAgent } = args;

    // Best-effort activation log — never block the response on it.
    try {
      await admin.from("license_activations").insert({
        license_id: licenseId ?? null,
        key_hash: keyHash ?? "",
        account_login: body.account ?? null,
        broker: body.broker ?? null,
        server: body.server ?? null,
        terminal_company: body.terminal ?? null,
        client_ip: clientIp,
        user_agent: userAgent,
        result,
      });
    } catch {
      // Swallow — availability of the check endpoint is more important
      // than the log. Admin dashboard will show a gap if logging fails.
    }

    return json(response, response.valid || response.grace ? 200 : 403);
  }
};

function ipFromReq(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? null;
}
