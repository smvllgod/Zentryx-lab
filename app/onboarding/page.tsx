// @ts-nocheck — Supabase v2 generics
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/components/ui/toast";
import { ArrowRight, Check, SkipForward } from "lucide-react";

// ────────────────────────────────────────────────────────────────────
// Onboarding data
// ────────────────────────────────────────────────────────────────────

const LEVELS = [
  { value: "beginner",     label: "New to trading",           hint: "Learning the basics" },
  { value: "intermediate", label: "Intermediate",             hint: "Trading for 1-3 years" },
  { value: "advanced",     label: "Advanced",                 hint: "Multiple years, mixed results" },
  { value: "pro",          label: "Professional",             hint: "Prop firm, full-time, or funded" },
];

const MARKETS = [
  { value: "forex",   label: "Forex" },
  { value: "metals",  label: "Metals (Gold / Silver)" },
  { value: "indices", label: "Indices" },
  { value: "crypto",  label: "Crypto" },
  { value: "stocks",  label: "Stocks" },
  { value: "futures", label: "Futures" },
];

const STYLES = [
  { value: "trend",      label: "Trend following" },
  { value: "breakout",   label: "Breakouts" },
  { value: "reversal",   label: "Mean reversion" },
  { value: "scalp",      label: "Scalping" },
  { value: "grid",       label: "Grid / recovery" },
  { value: "news",       label: "News / event trading" },
  { value: "smc",        label: "SMC / ICT" },
  { value: "algorithmic",label: "Pure algorithmic / quant" },
];

const GOALS = [
  { value: "learn",             label: "Learn how EAs work", hint: "Explore and build for fun" },
  { value: "ship-ea",           label: "Ship a personal EA", hint: "Run on my own account" },
  { value: "prop-firm",         label: "Pass a prop-firm challenge", hint: "Strict risk rules, consistent PnL" },
  { value: "sell-marketplace",  label: "Sell strategies in the marketplace", hint: "Creator tier revenue" },
];

const ACCOUNT_SIZES = [
  { value: "<1k",     label: "Under $1,000" },
  { value: "1k-10k",  label: "$1,000 – $10,000" },
  { value: "10k-50k", label: "$10,000 – $50,000" },
  { value: "50k-250k",label: "$50,000 – $250,000" },
  { value: "250k+",   label: "$250,000+" },
];

const REFERRAL_SOURCES = [
  { value: "twitter",  label: "Twitter / X" },
  { value: "youtube",  label: "YouTube" },
  { value: "telegram", label: "Telegram" },
  { value: "friend",   label: "Friend / referral" },
  { value: "search",   label: "Search engine" },
  { value: "other",    label: "Other" },
];

interface OnboardingState {
  trading_level: string | null;
  markets: string[];
  broker: string;
  trading_styles: string[];
  goal: string | null;
  account_size: string | null;
  referral_source: string | null;
  referral_other: string;   // free-text entered when "other" is selected
}

const INITIAL: OnboardingState = {
  trading_level: null,
  markets: [],
  broker: "",
  trading_styles: [],
  goal: null,
  account_size: null,
  referral_source: null,
  referral_other: "",
};

// ────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading…</div>}>
      <OnboardingInner />
    </Suspense>
  );
}

function OnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params?.get("next") ?? "/overview";
  const { user, ready } = useAuth();

  const [step, setStep] = useState(0);
  const [state, setState] = useState<OnboardingState>(INITIAL);
  const [saving, setSaving] = useState(false);

  // If not signed in, bounce to sign-in. If already onboarded, skip.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    if (!ready) return;
    if (!user) { router.replace("/sign-in?returnTo=/onboarding"); return; }
    (async () => {
      const { data } = await getSupabase().from("profiles").select("onboarded").eq("id", user.id).single();
      if ((data as { onboarded?: boolean } | null)?.onboarded) {
        // Full navigation — see `navigate()` comment below.
        const target = next && next.startsWith("/") ? next : "/overview";
        if (typeof window !== "undefined") window.location.assign(target);
        else router.replace(target);
      }
    })();
  }, [user, ready, router, next]);

  const steps: Step[] = [
    {
      key: "level",
      title: "What's your trading level?",
      subtitle: "Helps us show relevant block defaults.",
      content: <RadioGrid
        value={state.trading_level}
        onChange={(v) => setState({ ...state, trading_level: v })}
        options={LEVELS}
      />,
    },
    {
      key: "markets",
      title: "Which markets do you trade?",
      subtitle: "Pick as many as apply.",
      content: <MultiChipGrid
        values={state.markets}
        onChange={(v) => setState({ ...state, markets: v })}
        options={MARKETS}
      />,
    },
    {
      key: "style",
      title: "What style fits you?",
      subtitle: "We'll feature relevant blocks first.",
      content: <MultiChipGrid
        values={state.trading_styles}
        onChange={(v) => setState({ ...state, trading_styles: v })}
        options={STYLES}
      />,
    },
    {
      key: "goal",
      title: "What do you want from Zentryx Lab?",
      subtitle: "One primary goal is enough — you can switch later.",
      content: <RadioGrid
        value={state.goal}
        onChange={(v) => setState({ ...state, goal: v })}
        options={GOALS}
      />,
    },
    {
      key: "account",
      title: "Account size (optional)",
      subtitle: "Used to pre-tune lot-sizing defaults. Never shared.",
      content: <RadioGrid
        value={state.account_size}
        onChange={(v) => setState({ ...state, account_size: v })}
        options={ACCOUNT_SIZES}
      />,
    },
    {
      key: "broker",
      title: "Broker / platform (optional)",
      subtitle: "So we can warn you about broker-specific limits.",
      content: (
        <div className="space-y-3">
          <div>
            <Label>MT5 broker name</Label>
            <Input
              value={state.broker}
              onChange={(e) => setState({ ...state, broker: e.target.value })}
              placeholder="e.g. IC Markets, Pepperstone, FTMO…"
            />
          </div>
        </div>
      ),
    },
    {
      key: "referral",
      title: "How did you hear about us?",
      subtitle: "Helps us know what's working.",
      content: (
        <div className="space-y-4">
          <RadioGrid
            value={state.referral_source}
            onChange={(v) => setState({ ...state, referral_source: v })}
            options={REFERRAL_SOURCES}
          />
          {state.referral_source === "other" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
              <Label htmlFor="referral-other" className="text-[11px] font-700 uppercase tracking-wider text-emerald-700">
                Tell us more
              </Label>
              <Input
                id="referral-other"
                value={state.referral_other}
                onChange={(e) => setState({ ...state, referral_other: e.target.value })}
                placeholder="e.g. Reddit /r/algotrading, LinkedIn post, podcast…"
                autoFocus
                maxLength={80}
              />
              <p className="mt-1.5 text-[10px] text-emerald-700/70">Required when selecting "Other".</p>
            </div>
          )}
        </div>
      ),
    },
  ];

  const total = steps.length;
  const current = steps[step];

  async function save(onboarded = true) {
    if (!user) return;
    setSaving(true);
    try {
      const s = getSupabase();
      // When "other" is selected, merge the free-text answer into the source
      // string — `referral_source` becomes `"other: <text>"` for reporting.
      const ref = state.referral_source === "other" && state.referral_other.trim()
        ? `other: ${state.referral_other.trim().slice(0, 80)}`
        : state.referral_source;
      const { error } = await s.from("profiles").update({
        trading_level: state.trading_level,
        markets: state.markets,
        trading_styles: state.trading_styles,
        goal: state.goal,
        account_size: state.account_size,
        broker: state.broker || null,
        referral_source: ref,
        onboarded,
        onboarded_at: new Date().toISOString(),
      }).eq("id", user.id);
      if (error) {
        // Surface the error but don't block navigation — onboarding
        // columns are optional if migration 0005 isn't applied.
        console.warn("[onboarding save]", error);
        toast.error("Some fields couldn't be saved: " + error.message);
      }
    } catch (err) {
      toast.error("Could not save: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // Full navigation (not router.replace) — Next.js 16 static-export +
  // trailingSlash sometimes swallows client-side router.replace calls,
  // leaving the user stuck on /onboarding. window.location.assign
  // guarantees the navigation.
  function navigate(to: string) {
    const target = to && to.startsWith("/") ? to : "/overview";
    if (typeof window !== "undefined") {
      window.location.assign(target);
    } else {
      router.replace(target);
    }
  }

  async function finish() {
    // Guard: if user picked "Other" as referral source, require the free-text
    if (state.referral_source === "other" && !state.referral_other.trim()) {
      toast.error("Please tell us where you heard about us, or skip this question.");
      return;
    }
    await save(true);
    navigate(next);
  }

  async function skipAll() {
    await save(true);
    navigate(next);
  }

  if (!isSupabaseConfigured() || !ready) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50/30 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur">
        <a href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z" fill="white" fillOpacity="0.95" />
              <path d="M8 5L11 6.5V9.5L8 11L5 9.5V6.5L8 5Z" fill="#10b981" />
            </svg>
          </div>
          <div className="leading-none">
            <div className="text-[9px] font-700 text-gray-400 tracking-widest uppercase">Zentryx</div>
            <div className="text-sm font-700 text-gray-900 -mt-0.5">Lab</div>
          </div>
        </a>
        <button
          type="button"
          onClick={skipAll}
          disabled={saving}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900"
        >
          <SkipForward size={12} /> Skip for now
        </button>
      </header>

      {/* Progress */}
      <div className="max-w-2xl mx-auto w-full px-6 pt-10">
        <div className="flex items-center gap-2 mb-3">
          {steps.map((s, i) => (
            <div
              key={s.key}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i < step ? "bg-emerald-500" : i === step ? "bg-emerald-400" : "bg-gray-200",
              )}
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-500 mb-8">
          <span>Step {step + 1} of {total}</span>
          <span className="font-600 text-emerald-600">{Math.round(((step + 1) / total) * 100)}%</span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200/80 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.04)] p-8 min-h-[380px] flex flex-col">
          <h1 className="text-xl font-700 text-gray-900">{current.title}</h1>
          {current.subtitle && <p className="mt-1.5 text-sm text-gray-500">{current.subtitle}</p>}
          <div className="mt-6 flex-1">{current.content}</div>
          <div className="mt-8 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => (step === 0 ? skipAll() : setStep(step - 1))}
              disabled={saving}
            >
              {step === 0 ? "Skip all" : "Back"}
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => step === total - 1 ? finish() : setStep(step + 1)}
                disabled={saving}
              >
                Skip
              </Button>
              {step === total - 1 ? (
                <Button type="button" onClick={finish} disabled={saving}>
                  {saving ? "Saving…" : "Finish"} <Check size={14} />
                </Button>
              ) : (
                <Button type="button" onClick={() => setStep(step + 1)} disabled={saving}>
                  Next <ArrowRight size={14} />
                </Button>
              )}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-gray-400">
          You can update any of these later in Settings → Profile.
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Primitives
// ────────────────────────────────────────────────────────────────────

interface Step { key: string; title: string; subtitle?: string; content: React.ReactNode; }

function RadioGrid({
  value,
  onChange,
  options,
}: {
  value: string | null;
  onChange: (v: string) => void;
  options: { value: string; label: string; hint?: string }[];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "text-left rounded-xl border px-4 py-3 transition-all",
            value === o.value
              ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/15"
              : "border-gray-200 bg-white hover:border-gray-300",
          )}
        >
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-4 h-4 rounded-full border-2 transition-colors shrink-0",
                value === o.value ? "border-emerald-500 bg-emerald-500" : "border-gray-300 bg-white",
              )}
            >
              {value === o.value && <Check size={10} className="text-white m-0.5" />}
            </div>
            <div className="text-sm font-600 text-gray-900">{o.label}</div>
          </div>
          {o.hint && <div className="text-[11px] text-gray-500 mt-1 ml-6">{o.hint}</div>}
        </button>
      ))}
    </div>
  );
}

function MultiChipGrid({
  values,
  onChange,
  options,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  options: { value: string; label: string }[];
}) {
  function toggle(v: string) {
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = values.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className={cn(
              "text-sm rounded-full px-3.5 py-2 font-600 transition-all border",
              on
                ? "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
