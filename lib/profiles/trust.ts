// Trust level derivation — shared between server (view `creator_stats`)
// and client (fallback computation if we have stats without a DB view read).
//
// The underlying formula lives in 0008_platform_expansion.sql:
//   trust_score = sales * 5 + listings * 2 + rating × reviews + days/30

export type TrustLevel = "new" | "rising" | "trusted" | "top";

export interface TrustBadgeMeta {
  level: TrustLevel;
  label: string;
  description: string;
  tone: "slate" | "emerald" | "purple" | "amber";
  /** Points needed to reach this tier — floor. */
  threshold: number;
}

export const TRUST_BADGES: Record<TrustLevel, TrustBadgeMeta> = {
  new:     { level: "new",     label: "New creator",        description: "Just getting started on Zentryx.",                         tone: "slate",   threshold: 0   },
  rising:  { level: "rising",  label: "Rising creator",     description: "Published strategies and earning early traction.",          tone: "emerald", threshold: 20  },
  trusted: { level: "trusted", label: "Trusted creator",    description: "Proven track record — steady sales and positive reviews.",   tone: "purple",  threshold: 60  },
  top:     { level: "top",     label: "Top-rated creator",  description: "Top of the platform — trusted by many buyers.",              tone: "amber",   threshold: 120 },
};

export function levelFromScore(score: number): TrustLevel {
  if (score >= TRUST_BADGES.top.threshold) return "top";
  if (score >= TRUST_BADGES.trusted.threshold) return "trusted";
  if (score >= TRUST_BADGES.rising.threshold) return "rising";
  return "new";
}

export interface TrustInputs {
  sales: number;
  listings: number;
  avgRating: number;
  reviewsReceived: number;
  accountAgeDays: number;
}

export function computeTrustScore(inputs: TrustInputs): number {
  const { sales, listings, avgRating, reviewsReceived, accountAgeDays } = inputs;
  return Math.floor(
    sales * 5
    + listings * 2
    + avgRating * reviewsReceived
    + accountAgeDays / 30,
  );
}

/** Points remaining to reach the next level, or null at the top. */
export function pointsToNextLevel(score: number): { next: TrustLevel; gap: number } | null {
  if (score < TRUST_BADGES.rising.threshold)   return { next: "rising",  gap: TRUST_BADGES.rising.threshold  - score };
  if (score < TRUST_BADGES.trusted.threshold)  return { next: "trusted", gap: TRUST_BADGES.trusted.threshold - score };
  if (score < TRUST_BADGES.top.threshold)      return { next: "top",     gap: TRUST_BADGES.top.threshold     - score };
  return null;
}
