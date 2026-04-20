"use client";

// Client helper for firing the AI post-moderation function.
// Deliberately fire-and-forget: the UI optimistically shows the post,
// and the background moderation may retroactively soft-delete (feed)
// or reject (forum). If that happens the user sees it on next refresh
// — we deliberately avoid blocking the create flow on AI latency.

export type ModerationSurface = "feed" | "forum";

export interface ModerationDecision {
  ok: boolean;
  decision?: "approve" | "reject" | "needs_review";
  reason?: string;
  tags?: string[];
  error?: string;
  cached?: boolean;
  fallback?: boolean;
}

/** Fire the moderation call in the background. Returns the decision. */
export async function moderatePost(surface: ModerationSurface, postId: string): Promise<ModerationDecision> {
  try {
    const res = await fetch("/.netlify/functions/moderate-post", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ surface, post_id: postId }),
    });
    return (await res.json()) as ModerationDecision;
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Kick moderation without blocking. The caller stays responsive; if the
 * AI rejects the post the user sees it disappear on next list refresh.
 */
export function moderatePostAsync(surface: ModerationSurface, postId: string): void {
  void moderatePost(surface, postId).catch(() => undefined);
}
