"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

// Supabase's JS client auto-consumes the URL hash (`#access_token=…`)
// when the page mounts via `detectSessionInUrl: true` (see lib/supabase/
// client.ts). We just need to wait for the session to land, then route
// new users to /onboarding and returning users to the `next` target.

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingState label="Signing you in…" />}>
      <AuthCallbackInner />
    </Suspense>
  );
}

function AuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params?.get("next") ?? "/overview";

  useEffect(() => {
    if (!isSupabaseConfigured()) { router.replace("/sign-in"); return; }
    let cancelled = false;
    (async () => {
      const s = getSupabase();
      // Wait up to ~5s for the session to become available.
      for (let i = 0; i < 25; i++) {
        const { data } = await s.auth.getSession();
        if (data.session) break;
        await new Promise((r) => setTimeout(r, 200));
      }
      if (cancelled) return;
      const { data: { user } } = await s.auth.getUser();
      if (!user) { router.replace("/sign-in?error=oauth"); return; }

      // Check whether onboarding has been completed. We use the
      // `profiles.onboarded` boolean (added in migration 0005).
      const { data: profile } = await s
        .from("profiles")
        .select("onboarded")
        .eq("id", user.id)
        .single();
      if (profile && (profile as unknown as { onboarded?: boolean }).onboarded === false) {
        router.replace(`/onboarding?next=${encodeURIComponent(next)}`);
      } else {
        router.replace(next);
      }
    })();
    return () => { cancelled = true; };
  }, [router, next]);

  return <LoadingState label="Signing you in…" />;
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center gap-3">
      <span className="inline-block w-5 h-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
