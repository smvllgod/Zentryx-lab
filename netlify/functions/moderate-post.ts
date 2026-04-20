import type { Context } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

// ──────────────────────────────────────────────────────────────────
// Zentryx Lab — AI post moderation
// ──────────────────────────────────────────────────────────────────
// Called by the client right after inserting a feed / forum post.
// Input: { surface: "feed" | "forum", post_id: string }
// The function loads the post server-side, runs it through Claude
// Haiku (fast + cheap) with a strict classifier prompt, then:
//   - "approve"       → feed: leave as-is  ·  forum: mark status='approved'
//   - "reject"        → feed: soft-delete  ·  forum: mark status='rejected'
//   - "needs_review"  → feed: leave as-is (soft-flag)  ·  forum: keep 'pending'
//
// The human moderator can still override any decision in the admin UI.

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const MODEL = "claude-haiku-4-5";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization,content-type",
      "access-control-allow-methods": "POST,OPTIONS",
    },
  });
}

// Keep the function prompt short + deterministic. Low temperature.
const SYSTEM_PROMPT = `You are the content moderator for Zentryx Lab, a no-code MT5 Expert Advisor platform. You classify short user posts in a trading community.

Output EXACTLY one JSON object, no prose:
{
  "decision": "approve" | "reject" | "needs_review",
  "reason": "<short explanation, max 120 chars>",
  "tags": ["spam"|"self-promo"|"scam"|"nsfw"|"hate"|"low-effort"|"off-topic"|"ok"]
}

Decision rules:
- APPROVE: on-topic trading content — setups, screenshots, questions, ideas, backtests, feedback, announcements from creators about their free/paid strategies (as long as not spammy).
- REJECT:
  * Outright spam (affiliate link dumps, repeated text, unrelated products).
  * Drive-by promotion of OTHER products/services/signals unrelated to Zentryx Lab.
  * Scams, pyramid schemes, "send X$ and I'll show you".
  * NSFW / hate / harassment.
  * Posts that are just an emoji or a single link with no context.
- NEEDS_REVIEW: borderline — mildly promotional, low quality, or plausibly off-topic. A human should look. Prefer this over reject if unsure.

Bias toward APPROVE for legitimate trading content. Zentryx creators ARE allowed to mention their own marketplace listings as long as they add substance (a thought, a question, a result). Never reject solely for language — French, Spanish, Arabic, etc. are fine.

Keep the JSON flat. No markdown. No code fences.`;

interface ModerationResult {
  decision: "approve" | "reject" | "needs_review";
  reason: string;
  tags: string[];
}

function parseModeration(text: string): ModerationResult {
  // Strip markdown / fences defensively.
  const cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  try {
    const j = JSON.parse(cleaned);
    const decision = ["approve", "reject", "needs_review"].includes(j.decision)
      ? j.decision
      : "needs_review";
    return {
      decision,
      reason: String(j.reason ?? "").slice(0, 160),
      tags: Array.isArray(j.tags) ? j.tags.slice(0, 6).map(String) : [],
    };
  } catch {
    // Fall back to needs_review on parse errors — never auto-reject on our own bugs.
    return { decision: "needs_review", reason: "moderator parse error", tags: [] };
  }
}

export default async (req: Request, _ctx: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "authorization,content-type",
        "access-control-allow-methods": "POST,OPTIONS",
      },
    });
  }
  if (req.method !== "POST") return json({ ok: false, error: "bad_method" }, 405);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ ok: false, error: "server_not_configured" }, 500);
  if (!ANTHROPIC_KEY) return json({ ok: false, error: "missing_anthropic_key" }, 500);

  let body: { surface?: string; post_id?: string };
  try { body = (await req.json()) as typeof body; } catch { return json({ ok: false, error: "bad_json" }, 400); }
  const surface = String(body.surface ?? "").trim();
  const postId = String(body.post_id ?? "").trim();
  if (surface !== "feed" && surface !== "forum") return json({ ok: false, error: "bad_surface" }, 400);
  if (!/^[0-9a-f-]{36}$/i.test(postId)) return json({ ok: false, error: "bad_post_id" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Load post.
  const table = surface === "feed" ? "feed_posts" : "forum_posts";
  const sel = surface === "feed"
    ? "id, body, image_urls, author_id, deleted_at"
    : "id, title, body, image_urls, author_id, category_slug, status";
  const { data: post, error: loadErr } = await admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from(table as any)
    .select(sel)
    .eq("id", postId)
    .maybeSingle();
  if (loadErr) return json({ ok: false, error: "load_failed", detail: loadErr.message }, 500);
  if (!post) return json({ ok: false, error: "not_found" }, 404);

  // Short-circuit: already deleted / decided.
  const p = post as unknown as Record<string, unknown>;
  if (surface === "feed" && p.deleted_at) return json({ ok: true, decision: "reject", reason: "already deleted", cached: true });
  if (surface === "forum" && (p.status === "approved" || p.status === "rejected")) {
    return json({ ok: true, decision: p.status === "approved" ? "approve" : "reject", reason: "already decided", cached: true });
  }

  // Compose moderator input.
  const parts: string[] = [];
  if (surface === "forum" && p.title) parts.push(`Title: ${String(p.title).slice(0, 180)}`);
  if (surface === "forum" && p.category_slug) parts.push(`Category: ${p.category_slug}`);
  if (p.body) parts.push(`Body:\n${String(p.body).slice(0, 3000)}`);
  const images = Array.isArray(p.image_urls) ? (p.image_urls as string[]) : [];
  if (images.length > 0) parts.push(`Images attached: ${images.length}`);
  const userMessage = parts.join("\n\n") || "(empty post)";

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
  let decision: ModerationResult;
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");
    decision = parseModeration(text);
  } catch (err) {
    // On a moderation failure we DO NOT auto-reject — fall back to "needs_review".
    return json({
      ok: true,
      decision: "needs_review",
      reason: `moderator unavailable: ${(err as Error).message}`,
      fallback: true,
    });
  }

  // Apply the decision.
  try {
    if (surface === "feed") {
      if (decision.decision === "reject") {
        await admin
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from("feed_posts" as any)
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", postId);
      }
      // approve + needs_review are no-ops (feed has no pending state).
    } else {
      if (decision.decision === "approve") {
        await admin
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from("forum_posts" as any)
          .update({
            status: "approved",
            approved_at: new Date().toISOString(),
            rejected_reason: null,
          })
          .eq("id", postId);
      } else if (decision.decision === "reject") {
        await admin
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from("forum_posts" as any)
          .update({
            status: "rejected",
            rejected_reason: `Auto-moderated: ${decision.reason}`,
          })
          .eq("id", postId);
      }
      // needs_review → leave `pending` for a human moderator.
    }
  } catch (err) {
    // Don't fail the whole response over a DB write error — return the decision,
    // the client can retry if needed.
    return json({
      ok: true,
      decision: decision.decision,
      reason: decision.reason,
      tags: decision.tags,
      apply_error: (err as Error).message,
    });
  }

  return json({
    ok: true,
    decision: decision.decision,
    reason: decision.reason,
    tags: decision.tags,
  });
};
