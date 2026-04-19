import type { Context } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// ──────────────────────────────────────────────────────────────────
// Zentryx Lab — Live telemetry ingest
// ──────────────────────────────────────────────────────────────────
// POST /.netlify/functions/strategy-telemetry
// Body: { token, ticket, symbol, side, open_time, open_price,
//         close_time, close_price, lots, pnl_cash, pnl_pips?,
//         close_reason?, equity_after?, balance_after?,
//         account_currency?, broker?, ea_version?, extra? }
//
// Behaviour:
// - Matches `token` to a `strategies.telemetry_token` row; rejects any
//   request that doesn't match (no auth header required — the EA runs
//   inside MT5, no user session).
// - Upserts the event by (strategy_id, ticket). Duplicate POSTs are
//   idempotent.
// - Returns 200 with {ok:true, id} so the EA knows the event landed.
// - Returns 400/401 on malformed / unknown token.

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Burst guard: accept up to 60 events per 60s per token.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;
const buckets = new Map<string, { t: number; n: number }>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "POST,OPTIONS",
    },
  });
}

function checkRate(token: string): boolean {
  const now = Date.now();
  const b = buckets.get(token);
  if (!b || now - b.t >= RATE_WINDOW_MS) {
    buckets.set(token, { t: now, n: 1 });
    return true;
  }
  if (b.n >= RATE_MAX) return false;
  b.n += 1;
  return true;
}

export default async (req: Request, _ctx: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "content-type",
        "access-control-allow-methods": "POST,OPTIONS",
      },
    });
  }
  if (req.method !== "POST") return json({ ok: false, error: "bad_method" }, 405);

  if (!SUPABASE_URL || !SERVICE_KEY) return json({ ok: false, error: "server_not_configured" }, 500);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const token = String(body.token ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(token)) return json({ ok: false, error: "bad_token" }, 400);
  if (!checkRate(token)) return json({ ok: false, error: "rate_limited" }, 429);

  const required = ["ticket", "symbol", "side", "open_time", "open_price", "close_time", "close_price", "lots", "pnl_cash"];
  for (const k of required) {
    if (body[k] === undefined || body[k] === null || body[k] === "") {
      return json({ ok: false, error: `missing_${k}` }, 400);
    }
  }

  const side = String(body.side).toLowerCase();
  if (side !== "long" && side !== "short") return json({ ok: false, error: "bad_side" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: strategyRow, error: lookupErr } = await admin
    .from("strategies")
    .select("id, user_id")
    .eq("telemetry_token", token)
    .maybeSingle();
  if (lookupErr) return json({ ok: false, error: "lookup_failed", detail: lookupErr.message }, 500);
  if (!strategyRow) return json({ ok: false, error: "unknown_token" }, 401);

  const sr = strategyRow as unknown as { id: string; user_id: string };
  const row = {
    strategy_id: sr.id,
    user_id: sr.user_id,
    ticket: Number(body.ticket),
    symbol: String(body.symbol).slice(0, 32),
    timeframe: body.timeframe ? String(body.timeframe).slice(0, 8) : null,
    side,
    open_time: new Date(String(body.open_time)).toISOString(),
    open_price: Number(body.open_price),
    close_time: new Date(String(body.close_time)).toISOString(),
    close_price: Number(body.close_price),
    lots: Number(body.lots),
    pnl_cash: Number(body.pnl_cash),
    pnl_pips: body.pnl_pips != null ? Number(body.pnl_pips) : null,
    close_reason: body.close_reason ? String(body.close_reason).slice(0, 24) : null,
    equity_after: body.equity_after != null ? Number(body.equity_after) : null,
    balance_after: body.balance_after != null ? Number(body.balance_after) : null,
    account_currency: body.account_currency ? String(body.account_currency).slice(0, 8) : null,
    broker: body.broker ? String(body.broker).slice(0, 64) : null,
    ea_version: body.ea_version ? String(body.ea_version).slice(0, 16) : null,
    extra: (body.extra as Record<string, unknown>) ?? {},
  };

  // Validate numeric fields.
  for (const [k, v] of Object.entries(row)) {
    if (["ticket", "open_price", "close_price", "lots", "pnl_cash"].includes(k)) {
      if (typeof v !== "number" || !Number.isFinite(v)) return json({ ok: false, error: `bad_${k}` }, 400);
    }
  }

  const { data: inserted, error } = await admin
    .from("strategy_telemetry_events")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(row as any, { onConflict: "strategy_id,ticket" })
    .select("id")
    .single();

  if (error) return json({ ok: false, error: "insert_failed", detail: error.message }, 500);
  return json({ ok: true, id: (inserted as { id: string }).id });
};
