"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { useIsAdmin } from "@/lib/admin/auth";
import { AdminSidebar } from "./AdminSidebar";
import { isSupabaseConfigured } from "@/lib/supabase/client";

interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function AdminShell({ title, subtitle, actions, children }: Props) {
  const { ready: sessionReady, user, profile } = useAuth();
  const { ready: roleReady, role } = useIsAdmin();
  const router = useRouter();
  const searchParams = useSearchParams();
  const debug = searchParams?.get("debug") === "1";

  // Guard only after BOTH session and profile are resolved. `roleReady`
  // stays false while the profile is still being fetched — prevents a
  // race where a signed-in admin gets redirected to /overview in the
  // brief window between session-load and profile-load.
  useEffect(() => {
    if (debug) return;                    // don't redirect in debug mode
    if (!isSupabaseConfigured()) return;
    if (!sessionReady) return;
    if (!user) {
      router.replace("/sign-in?returnTo=/admin");
      return;
    }
    if (!roleReady) return;      // profile still loading — wait
    if (!role) router.replace("/overview");
  }, [sessionReady, user, roleReady, role, router, debug]);

  // Debug overlay — activated by ?debug=1. Renders a full state dump so
  // we can see *exactly* why the guard would have bounced. Safe to ship:
  // only shows when the query param is present.
  if (debug) {
    const rawRole = (profile as unknown as { role?: string } | null)?.role;
    const state = {
      configured: isSupabaseConfigured(),
      sessionReady,
      roleReady,
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
      profileLoaded: !!profile,
      profileId: profile?.id ?? null,
      profileEmail: (profile as unknown as { email?: string } | null)?.email ?? null,
      profileRoleRaw: rawRole ?? null,
      profileRoleType: typeof rawRole,
      resolvedRole: role,
      profileFullKeys: profile ? Object.keys(profile) : null,
    };
    return (
      <div className="min-h-screen bg-gray-950 text-emerald-300 font-mono text-xs p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-white text-base font-700 mb-3">Admin diagnostic (debug=1)</h1>
          <p className="text-gray-400 mb-4">
            This is what AdminShell sees right now. If <code>resolvedRole</code> is{" "}
            <span className="text-amber-400">null</span> the guard would have redirected you. Share this dump.
          </p>
          <pre className="whitespace-pre-wrap bg-black/60 border border-emerald-900/40 rounded-lg p-4 overflow-auto">
            {JSON.stringify(state, null, 2)}
          </pre>
          <p className="mt-4 text-gray-500">Remove <code>?debug=1</code> when done.</p>
        </div>
      </div>
    );
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center text-sm text-gray-500">
          Supabase isn&apos;t configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>.
        </div>
      </div>
    );
  }

  if (!sessionReady || !user || !roleReady) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading…</div>;
  }
  if (!role) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Not authorised — redirecting…</div>;
  }

  return (
    <div className="min-h-screen bg-[#fafbfa]">
      <aside className="hidden md:block fixed inset-y-0 left-0 w-60 border-r border-gray-100 bg-white">
        <AdminSidebar />
      </aside>
      <div className="md:pl-60 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-gray-100">
          <div className="flex h-14 items-center gap-3 px-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-700 uppercase tracking-widest text-emerald-600">Admin</span>
                <span className="text-[10px] text-gray-300">·</span>
                <span className="text-[10px] font-600 uppercase tracking-wider text-gray-400">{role}</span>
              </div>
              <h1 className="text-base font-700 text-gray-900 truncate leading-tight">{title}</h1>
              {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-3">{actions}</div>
          </div>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
