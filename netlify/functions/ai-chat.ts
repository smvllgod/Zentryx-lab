import type { Context } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

// ──────────────────────────────────────────────────────────────────
// Zentryx AI — Netlify function
// ──────────────────────────────────────────────────────────────────
// POST /.netlify/functions/ai-chat
// Headers: Authorization: Bearer <supabase access token>
// Body: { messages, graph, nodeTypes, strategyId? }
//
// Flow:
//   1. Verify the Supabase JWT → resolve user + plan
//   2. Enforce per-tier quota:
//        free    → 3 messages total (lifetime)
//        pro     → 5 messages total (lifetime)
//        creator → 30 messages per day (UTC reset)
//   3. Build the tool-use messages call to Claude Sonnet 4.6 with
//      prompt caching on the (large, stable) node catalog
//   4. Increment usage + log the turn
//   5. Return the assistant content blocks for the client to apply
// ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const MODEL = "claude-sonnet-4-6";

const QUOTAS = {
  free: { kind: "lifetime" as const, limit: 15 },
  pro: { kind: "lifetime" as const, limit: 30 },
  creator: { kind: "daily" as const, limit: 150 },
};

// ──────────────────────────────────────────────────────────────────
// Burst rate limiter (per user, per function instance)
// ──────────────────────────────────────────────────────────────────
// Guards against a single user hammering the endpoint — independent of
// the lifetime / daily quota, which only blocks after the caps are hit.
// Backed by an in-memory Map keyed by user_id, keyed inside each
// Netlify function instance. Netlify reuses warm instances, so the
// limiter catches bursts from the same client within a few minutes.
// A cold start resets the counter, which is intentional — the
// persistent quota still enforces correctness; this layer is just a
// cheap first-line guard against accidental loops.
//
// Window: 60 seconds. Limit: 45 requests. Chosen to match the
// client-side agentic loop (lib/ai/client MAX_STEPS = 40) plus a
// small headroom for a user who sends a follow-up message mid-build.
// Previous value of 10 was tuned for single-turn chats and starved
// multi-step builds (users saw "retry in Ns" mid-build).
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 45;
const rateBuckets = new Map<string, { windowStart: number; count: number }>();

function checkRateLimit(userId: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = rateBuckets.get(userId);
  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(userId, { windowStart: now, count: 1 });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (bucket.count >= RATE_LIMIT_MAX) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((RATE_LIMIT_WINDOW_MS - (now - bucket.windowStart)) / 1000),
    );
    return { allowed: false, retryAfterSec };
  }
  bucket.count++;
  return { allowed: true, retryAfterSec: 0 };
}

// Tools passed to Claude — mirror of lib/ai/tools.ts TOOL_SCHEMAS.
// Defined here (duplicated) because Netlify Functions are bundled
// separately and shouldn't import browser-targeted client code.
const TOOLS: Anthropic.Tool[] = [
  {
    name: "add_node",
    description:
      "Add a new node to the strategy graph. Use this for every new building block the user needs. Returns the assigned id.",
    input_schema: {
      type: "object",
      properties: {
        node_type: {
          type: "string",
          description:
            'Exact NodeType, e.g. "entry.emaCross", "filter.rsi", "risk.fixedLot", "exit.fixedTpSl".',
        },
        params: {
          type: "object",
          description:
            "Optional parameter overrides. If omitted, the node's default params are used.",
        },
      },
      required: ["node_type"],
    },
  },
  {
    name: "connect_nodes",
    description:
      "Create a directed edge from source_id to target_id. Must respect the category flow (entry → filter → risk → exit).",
    input_schema: {
      type: "object",
      properties: {
        source_id: { type: "string" },
        target_id: { type: "string" },
      },
      required: ["source_id", "target_id"],
    },
  },
  {
    name: "update_node_params",
    description:
      "Mutate parameters of an existing node. Only supplied keys are updated.",
    input_schema: {
      type: "object",
      properties: {
        node_id: { type: "string" },
        params: { type: "object" },
      },
      required: ["node_id", "params"],
    },
  },
  {
    name: "delete_node",
    description: "Remove a node and every edge that references it.",
    input_schema: {
      type: "object",
      properties: { node_id: { type: "string" } },
      required: ["node_id"],
    },
  },
  {
    name: "delete_edge",
    description: "Remove a single edge by id.",
    input_schema: {
      type: "object",
      properties: { edge_id: { type: "string" } },
      required: ["edge_id"],
    },
  },
  {
    name: "set_metadata",
    description:
      "Update strategy metadata — name, symbol, timeframe, magic number, trade comment.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        symbol: { type: "string" },
        timeframe: {
          type: "string",
          enum: ["M1", "M5", "M15", "M30", "H1", "H4", "D1"],
        },
        magicNumber: { type: "integer" },
        tradeComment: { type: "string" },
      },
    },
  },
  {
    name: "list_graph",
    description:
      "Return the current graph (nodes + edges + metadata). Use after several mutations if you need a fresh view.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_validation",
    description:
      "Return the current validator diagnostics (errors + warnings).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "done",
    description:
      "Signal that you have finished applying changes. Always end multi-step responses with this tool. The UI renders your input as a rich summary card, so be generous with the structured fields — this is the only place the user reads a clean recap of what you did. Aim for specific, scannable bullets (short phrases, not paragraphs).",
    input_schema: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description:
            'One-sentence headline (under 120 chars) describing the end result. Example: "Built a USDJPY M5 scalper with EMA cross entry, 3 filters, and ATR-based exits."',
        },
        whatChanged: {
          type: "array",
          items: { type: "string" },
          description:
            'Concrete bullets — what you added, modified, or removed in this turn. One idea per bullet, under 100 chars each. Example: ["Added EMA 8/21 cross entry (long + short)", "Wired risk_fixed_lot at 0.10 lots", "Renamed strategy to \'USDJPY Scalper Pro\'"]. Don\'t invent items to pad the list — keep it to what actually changed.',
        },
        strategyShape: {
          type: "string",
          description:
            'Optional 1-2 sentence plain-language description of the strategy\'s runtime behaviour. Example: "Enters on EMA cross during London session, sizes 1% risk on ATR-based stops, trails with break-even after +1R." Omit for pure metadata / fix-only turns.',
        },
        nextSteps: {
          type: "array",
          items: { type: "string" },
          description:
            'Two to four concrete suggestions the user might do next. Each under 100 chars. Example: ["Validate and preview the MQL5 source", "Backtest on EURUSD M5 2023-2024", "Add a news filter if you want to avoid NFP"]. Prioritise what is meaningful for this strategy — avoid generic tips.',
        },
        warnings: {
          type: "array",
          items: { type: "string" },
          description:
            'Optional list of caveats, trade-offs, or gotchas specific to this strategy. Example: ["Magic number shared with existing EAs will conflict — consider bumping", "No news filter — be cautious around NFP"]. Omit if nothing warrants attention.',
        },
      },
      required: ["summary", "whatChanged", "nextSteps"],
    },
  },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async (req: Request, _ctx: Context) => {
  if (req.method !== "POST") return json({ ok: false, error: "bad_request", message: "POST required" }, 405);

  if (!ANTHROPIC_KEY) return json({ ok: false, error: "ai_failed", message: "Server is missing ANTHROPIC_API_KEY." }, 500);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return json({ ok: false, error: "ai_failed", message: "Server is missing Supabase env vars." }, 500);
  }

  const auth = req.headers.get("authorization") ?? "";
  const accessToken = auth.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) return json({ ok: false, error: "unauthorized", message: "Missing bearer token." }, 401);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const { data: userData, error: userErr } = await admin.auth.getUser(accessToken);
  if (userErr || !userData.user) {
    return json({ ok: false, error: "unauthorized", message: "Invalid session." }, 401);
  }
  const user = userData.user;

  // ── Burst rate limit (per user, per function instance)
  const rl = checkRateLimit(user.id);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "rate_limited",
        message: `Too many requests — retry in ${rl.retryAfterSec}s.`,
        retryAfterSec: rl.retryAfterSec,
      }),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": String(rl.retryAfterSec),
        },
      },
    );
  }

  // ── Resolve plan
  const { data: profile } = await admin
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();
  const plan = (profile?.plan ?? "free") as keyof typeof QUOTAS;
  const quota = QUOTAS[plan];

  // ── Current usage
  const today = new Date().toISOString().slice(0, 10);
  const { data: usageRow } = await admin
    .from("ai_usage")
    .select("lifetime_count, daily_count, daily_reset_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const dailyCountNow =
    usageRow && usageRow.daily_reset_at === today ? usageRow.daily_count : 0;
  const lifetimeCountNow = usageRow?.lifetime_count ?? 0;

  const used = quota.kind === "lifetime" ? lifetimeCountNow : dailyCountNow;
  if (used >= quota.limit) {
    return json({
      ok: false,
      error: "quota_exceeded",
      message:
        quota.kind === "lifetime"
          ? `You've used your ${quota.limit} AI messages on the ${plan} plan. Upgrade to keep going.`
          : `Daily limit of ${quota.limit} messages reached. Resets at 00:00 UTC.`,
      upgradeTo: plan === "free" ? "pro" : plan === "pro" ? "creator" : undefined,
    }, 403);
  }

  // ── Parse request
  let body: {
    messages: unknown;
    graph: unknown;
    nodeTypes: unknown;
    strategyId?: string | null;
    conversationId?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "bad_request", message: "Invalid JSON body." }, 400);
  }

  const messages = Array.isArray(body.messages) ? (body.messages as Anthropic.MessageParam[]) : [];
  const graph = body.graph ?? {};
  const nodeTypes = Array.isArray(body.nodeTypes) ? (body.nodeTypes as string[]) : [];
  const strategyId = typeof body.strategyId === "string" ? body.strategyId : null;
  let conversationId = typeof body.conversationId === "string" ? body.conversationId : null;
  let conversationTitle: string | undefined;

  // Resolve / create the conversation record before calling Claude so we
  // have an id to attach to ai_messages even if the call fails.
  if (!conversationId) {
    const firstUser = messages.find((m) => m.role === "user");
    const titleSource =
      typeof firstUser?.content === "string"
        ? firstUser.content
        : Array.isArray(firstUser?.content)
          ? (firstUser.content.find((b) => b.type === "text") as { text?: string } | undefined)?.text
          : undefined;
    conversationTitle = (titleSource ?? "New chat").slice(0, 80);
    const { data: convo, error: convoErr } = await admin
      .from("ai_conversations")
      .insert({
        user_id: user.id,
        strategy_id: strategyId,
        title: conversationTitle,
      })
      .select("id")
      .single();
    if (convoErr || !convo) {
      return json({
        ok: false,
        error: "ai_failed",
        message: `Could not create conversation: ${convoErr?.message ?? "unknown"}`,
      }, 500);
    }
    conversationId = convo.id;
  }

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

  // ── System prompt with ephemeral cache on the catalog (stable between turns)
  const staticSystem = buildStaticSystem(nodeTypes);
  const dynamicSystem = buildDynamicContext(graph);

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      // Smaller max_tokens keeps each Claude turn fast, which matters because
      // Netlify free-tier sync functions cap around 10s. Tool-heavy turns rarely
      // need more than ~800 tokens of assistant text.
      max_tokens: 1200,
      system: [
        // Cached: stable across turns, pays per-request only when changed
        { type: "text", text: staticSystem, cache_control: { type: "ephemeral" } },
        // Not cached: current graph snapshot
        { type: "text", text: dynamicSystem },
      ],
      tools: TOOLS,
      messages,
    });

    // ── Increment usage (atomic upsert)
    const nextLifetime = lifetimeCountNow + 1;
    const nextDaily =
      usageRow?.daily_reset_at === today ? dailyCountNow + 1 : 1;
    await admin.from("ai_usage").upsert({
      user_id: user.id,
      lifetime_count: nextLifetime,
      daily_count: nextDaily,
      daily_reset_at: today,
      updated_at: new Date().toISOString(),
    });

    // ── Log the user + assistant messages (best-effort)
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      await admin.from("ai_messages").insert([
        {
          user_id: user.id,
          strategy_id: strategyId,
          conversation_id: conversationId,
          role: "user",
          content: lastUser.content as never,
        },
        {
          user_id: user.id,
          strategy_id: strategyId,
          conversation_id: conversationId,
          role: "assistant",
          content: response.content as never,
          tokens_in: response.usage.input_tokens,
          tokens_out: response.usage.output_tokens,
        },
      ]);
      // message_count and last_message_at are maintained by a Postgres
      // trigger on ai_messages (migration 0010). Nothing to do here.
    }

    return json({
      ok: true,
      assistant: response.content,
      stopReason: response.stop_reason,
      remaining: quota.limit - (used + 1),
      quota: { type: quota.kind, used: used + 1, limit: quota.limit },
      conversationId,
      conversationTitle,
    });
  } catch (err) {
    const message = (err as Error).message ?? "Unknown";
    return json({ ok: false, error: "ai_failed", message: `Claude call failed: ${message}` }, 502);
  }
};

function buildStaticSystem(nodeTypes: string[]): string {
  return `You are Zentryx AI, an expert assistant embedded in Zentryx Lab — a visual, no-code builder for MetaTrader 5 Expert Advisors (MQL5). You help users design, debug, and improve trading strategies represented as a directed node graph.

── Your capabilities
You have tools to mutate the user's current strategy directly. After each tool call, the user SEES the change animate on their canvas. Favor several small, explicit tool calls over one giant one — it makes the experience feel live.

── Strategy graph model
• Nodes belong to one of these categories, and must flow in this order:
  entry → filter → session → news → risk → lot → management → exit → grid → utility
• An "entry" must NEVER connect directly to an "exit"; there has to be at least a risk or lot sizing node in between.
• Exactly one risk node and one lot node at most.
• An entry + some form of lot sizing + at least one exit is the minimum viable strategy.

── Available node types (exact strings for add_node)
${nodeTypes.join(", ")}

── How to answer
• Be concise — the user is looking at their graph, not reading a textbook.
• Always call tools when the user asks for a change; don't just describe it.
• When the user asks for advice without a mutation, give a clear recommendation and optionally call add_node/connect_nodes to execute it.
• If you detect errors (validation diagnostics), call list_validation first, then fix.
• If a node_type isn't in the list, don't invent one — tell the user.

── Ending every multi-step response — call "done" with a rich recap
Every turn that makes changes MUST end with the "done" tool. This is the user's main debrief — the UI renders your input as a structured card, so invest real effort here:

• summary (required) — one-sentence headline. Specific about what the strategy IS now (symbol, timeframe, core idea), not "I made changes."
• whatChanged (required) — scannable bullets of actual mutations this turn. One idea per bullet, under 100 chars. Past tense, concrete. Bad: "Improved the strategy." Good: "Added EMA 8/21 cross entry", "Wired risk_fixed_lot at 0.10 lots".
• strategyShape (optional) — 1-2 sentences in plain language on HOW the strategy trades. Skip for fix-only / metadata-only turns.
• nextSteps (required) — 2-4 specific follow-ups tailored to THIS strategy. Bad: "Test it." Good: "Backtest on EURUSD M5 2023-2024", "Add a news filter before NFP".
• warnings (optional) — caveats the user should know about. Omit if nothing warrants attention.

Quality bar: if your done output could have come from a different strategy, it's not specific enough. Reference the actual symbol, timeframe, nodes, and intent.

── Style
Direct, pragmatic, zero fluff. Use second person ("you"). Call the user's strategy "your strategy".`;
}

function buildDynamicContext(graph: unknown): string {
  return `── Current strategy graph (live snapshot)\n${JSON.stringify(graph, null, 2)}`;
}
