"use client";

import { Check } from "lucide-react";
import { AppShell } from "@/components/app/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS, type PlanTier } from "@/lib/billing/plans";
import { useAuth } from "@/lib/auth/context";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

const TIERS: PlanTier[] = ["free", "pro", "creator"];

export default function BillingPage() {
  const { profile } = useAuth();
  const current = profile?.plan ?? "free";

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
          <h3 className="text-sm font-700 text-gray-900">Zentryx AI quotas</h3>
          <p className="mt-1 text-sm text-gray-600">
            The AI helper inside the builder runs on a metered quota. Free and Pro get a
            one-time trial to feel it out; Creator is the plan for using it daily.
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-[10px] font-700 uppercase tracking-widest text-gray-400">Free</div>
              <div className="mt-1 text-lg font-800 text-gray-900">15 messages</div>
              <div className="text-xs text-gray-500">one-time trial</div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
              <div className="text-[10px] font-700 uppercase tracking-widest text-emerald-700">Pro</div>
              <div className="mt-1 text-lg font-800 text-gray-900">30 messages</div>
              <div className="text-xs text-gray-500">one-time trial</div>
            </div>
            <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4">
              <div className="text-[10px] font-700 uppercase tracking-widest text-purple-700">Creator</div>
              <div className="mt-1 text-lg font-800 text-gray-900">150 / day</div>
              <div className="text-xs text-gray-500">resets every 24h</div>
            </div>
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
