"use client";

// @ts-nocheck — Supabase v2 generics

import { useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

interface Props {
  /** `/overview` by default. After onboarding it may be `/onboarding`. */
  redirectTo?: string;
  mode?: "signin" | "signup";
  className?: string;
}

export function GoogleSignInButton({ redirectTo = "/overview", mode = "signin", className }: Props) {
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();

  async function onClick() {
    if (!configured) {
      toast.error("Supabase not configured.");
      return;
    }
    setLoading(true);
    try {
      const target = typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
        : redirectTo;
      const { error } = await getSupabase().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: target },
      });
      if (error) throw error;
      // The browser is redirected to Google by Supabase; no further action here.
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      onClick={onClick}
      disabled={loading || !configured}
      className={"w-full justify-center gap-2.5 border-gray-300 hover:bg-gray-50 " + (className ?? "")}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M21.35 11.1H12v2.83h5.38c-.23 1.4-1.66 4.1-5.38 4.1-3.24 0-5.87-2.68-5.87-5.97s2.63-5.97 5.87-5.97c1.84 0 3.08.79 3.79 1.47l2.57-2.47C16.7 3.53 14.6 2.5 12 2.5 6.9 2.5 2.77 6.63 2.77 11.73S6.9 20.96 12 20.96c6.93 0 9.5-4.87 9.5-9.23 0-.62-.06-1.09-.15-1.63z" />
      </svg>
      {loading
        ? "Redirecting…"
        : mode === "signup"
          ? "Continue with Google"
          : "Sign in with Google"}
    </Button>
  );
}
