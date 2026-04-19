"use client";

// @ts-nocheck — Supabase v2 generic resolution issue (PostgrestVersion 12).

import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS, type PlanTier } from "@/lib/billing/plans";
import { useAuth } from "@/lib/auth/context";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

const TIERS: PlanTier[] = ["free", "pro", "creator"];

// Kept in sync with netlify/functions/ai-chat.ts QUOTAS.
const AI_QUOTAS: Record<PlanTier, { kind: "lifetime" | "daily"; limit: number; blurb: string }> = {
  free:    { kind: "lifetime", limit: 15,  blurb: "one-time trial" },
  pro:     { kind: "lifetime", limit: 30,  blurb: "one-time trial" },
  creator: { kind: "daily",    limit: 150, blurb: "resets every 24h" },
};

interface AiUsageRow {
  lifetime_count: number;
  daily_count: number;
  daily_reset_at: string; // YYYY-MM-DD
}

export default function BillingPage() {
  const { profile, user } = useAuth();
  const current = profile?.plan ?? "free";
  const [usage, setUsage] = useState<AiUsageRow | null>(null);
  const [usageReady, setUsageReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user || !isSupabaseConfigured()) {
        setUsage(null);
        setUsageReady(true);
        return;
      }
      const { data } = await getSupabase()
        .from("ai_usage")
        .select("lifetime_count, daily_count, daily_reset_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setUsage((data as AiUsageRow | null) ?? { lifetime_count: 0, daily_count: 0, daily_reset_at: new Date().toISOString().slice(0, 10) });
      setUsageReady(true);
    }
    void load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const currentQuota = AI_QUOTAS[current];
  const todayStr = new Date().toISOString().slice(0, 10);
  const usedNow = usage
    ? currentQuota.kind === "lifetime"
      ? usage.lifetime_count
      : (usage.daily_reset_at === todayStr ? usage.daily_count : 0)
    : 0;
  const remaining = Math.max(0, currentQuota.limit - usedNow);
  const pct = Math.min(100, Math.round((usedNow / currentQuota.limit) * 100));

  function onChoose(plan: PlanTier) {
    if (plan === current) return;
    toast.message(
      "Stripe billing is wired but checkout requires a server endpoint. Drop your Stripe keys in .env.local to enable.",
    );
  }

  return (
    <AppShell title="Billing">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIERS.map((tier) => {
          const plan = PLANS[tier];
          const isCurrent = tier === current;
          const popular = tier === "pro";
          return (
            <Card
              key={tier}
              className={cn(
                "relative",
                popular && "border-emerald-500 shadow-lg",
              )}
            >
              {popular && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <Badge tone="emerald">Most popular</Badge>
                </div>
              )}
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-base font-700 text-gray-900">{plan.name}</h3>
                  {isCurrent && <Badge tone="emerald">Current</Badge>}
                </div>
                <p className="mt-1 text-xs text-gray-500">{plan.tagline}</p>
                <div className="mt-4">
                  <span className="text-3xl font-700 text-gray-900">
                    {plan.monthlyPrice === 0 ? "Free" : `$${plan.monthlyPrice}`}
                  </span>
                  {plan.monthlyPrice > 0 && (
                    <span className="ml-1 text-sm text-gray-400">/ month</span>
                  )}
                </div>
                <ul className="mt-5 space-y-2 text-sm text-gray-700">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 w-full"
                  variant={isCurrent ? "secondary" : popular ? "primary" : "outline"}
                  disabled={isCurrent}
                  onClick={() => onChoose(tier)}
                >
                  {isCurrent ? "Current plan" : `Choose ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-700 text-gray-900 flex items-center gap-2">
                <Sparkles size={14} className="text-emerald-500" />
                Zentryx AI usage
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                The AI helper inside the builder runs on a metered quota. Free and Pro get a
                one-time trial to feel it out; Creator is the plan for using it daily.
              </p>
            </div>
            <Badge tone={current === "creator" ? "purple" : current === "pro" ? "emerald" : "default"}>
              {PLANS[current].name} plan
            </Badge>
          </div>

          {/* Current-plan usage meter */}
          <div className="mt-4 rounded-xl border border-gray-200 p-4 bg-gradient-to-br from-white to-gray-50">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="text-[10px] font-700 uppercase tracking-widest text-gray-400">
                  {currentQuota.kind === "lifetime" ? "Lifetime trial" : "Today's usage"}
                </div>
                <div className="mt-1 text-2xl font-800 text-gray-900 tabular-nums">
                  {usageReady ? (
                    <>
                      <span className={remaining === 0 ? "text-red-600" : ""}>{remaining}</span>
                      <span className="text-sm font-500 text-gray-400"> of {currentQuota.limit} left</span>
                    </>
                  ) : (
                    <span className="text-sm font-500 text-gray-400">loading…</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {currentQuota.kind === "lifetime"
                    ? "One-time trial across your account"
                    : "Resets daily at 00:00 UTC"}
                </div>
              </div>
              {usageReady && remaining === 0 && current !== "creator" && (
                <Button variant="primary" onClick={() => onChoose(current === "free" ? "pro" : "creator")}>
                  Upgrade to {current === "free" ? "Pro" : "Creator"}
                </Button>
              )}
            </div>
            <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1 text-[10px] text-gray-400 tabular-nums">
              {usedNow} used · {pct}% consumed
            </div>
          </div>

          {/* All-tier comparison */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            {TIERS.map((tier) => {
              const q = AI_QUOTAS[tier];
              const isCurrent = tier === current;
              return (
                <div
                  key={tier}
                  className={cn(
                    "rounded-xl border p-4",
                    isCurrent && tier === "free" && "border-gray-300 bg-gray-50/60",
                    isCurrent && tier === "pro" && "border-emerald-300 bg-emerald-50/60",
                    isCurrent && tier === "creator" && "border-purple-300 bg-purple-50/60",
                    !isCurrent && "border-gray-200",
                  )}
                >
                  <div className={cn(
                    "text-[10px] font-700 uppercase tracking-widest",
                    tier === "free" ? "text-gray-400" : tier === "pro" ? "text-emerald-700" : "text-purple-700",
                  )}>
                    {PLANS[tier].name}{isCurrent && " · your plan"}
                  </div>
                  <div className="mt-1 text-lg font-800 text-gray-900">
                    {q.kind === "lifetime" ? `${q.limit} messages` : `${q.limit} / day`}
                  </div>
                  <div className="text-xs text-gray-500">{q.blurb}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent>
          <h3 className="text-sm font-700 text-gray-900">How billing works</h3>
          <p className="mt-2 text-sm text-gray-600">
            Subscriptions are managed by Stripe. The platform stores subscription metadata in
            the <code className="text-xs">subscriptions</code> table and reads <code className="text-xs">profiles.plan</code> at
            runtime. Update Stripe keys and connect a webhook to enable real upgrades.
          </p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
