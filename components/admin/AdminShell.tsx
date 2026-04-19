"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { useIsAdmin } from "@/lib/admin/auth";
import { AdminSidebar } from "./AdminSidebar";
import { CommandPalette, useCommandPaletteShortcut } from "./CommandPalette";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { Menu, ChevronRight } from "lucide-react";
import { NotificationsBell } from "@/components/app/NotificationsBell";

interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  children: React.ReactNode;
}

// Static export requires every component reading useSearchParams to be
// rendered inside a <Suspense> boundary.
export function AdminShell(props: Props) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading…</div>}>
      <AdminShellInner {...props} />
    </Suspense>
  );
}

function AdminShellInner({ title, subtitle, actions, breadcrumbs, children }: Props) {
  const { ready: sessionReady, user, profile } = useAuth();
  const { ready: roleReady, role } = useIsAdmin();
  const router = useRouter();
  const searchParams = useSearchParams();
  const debug = searchParams?.get("debug") === "1";
  const [cmdOpen, setCmdOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  useCommandPaletteShortcut(cmdOpen, setCmdOpen);

  useEffect(() => {
    if (debug) return;
    if (!isSupabaseConfigured()) return;
    if (!sessionReady) return;
    if (!user) { router.replace("/sign-in?returnTo=/admin"); return; }
    if (!roleReady) return;
    if (!role) router.replace("/overview");
  }, [sessionReady, user, roleReady, role, router, debug]);

  if (debug) {
    const rawRole = (profile as unknown as { role?: string } | null)?.role;
    const state = {
      configured: isSupabaseConfigured(),
      sessionReady, roleReady,
      userId: user?.id ?? null, userEmail: user?.email ?? null,
      profileLoaded: !!profile,
      profileRoleRaw: rawRole ?? null, profileRoleType: typeof rawRole,
      resolvedRole: role,
      profileFullKeys: profile ? Object.keys(profile) : null,
    };
    return (
      <div className="min-h-screen bg-gray-950 text-emerald-300 font-mono text-xs p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-white text-base font-700 mb-3">Admin diagnostic (debug=1)</h1>
          <pre className="whitespace-pre-wrap bg-black/60 border border-emerald-900/40 rounded-lg p-4 overflow-auto">
            {JSON.stringify(state, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  if (!isSupabaseConfigured()) {
    return <div className="min-h-screen flex items-center justify-center p-6 text-sm text-gray-500">Supabase isn't configured.</div>;
  }
  if (!sessionReady || !user || !roleReady) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading…</div>;
  }
  if (!role) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Not authorised — redirecting…</div>;
  }

  const initials = (profile?.full_name ?? user.email ?? "?").split(/\s+|@/)[0].slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f7f8f7]">
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col bg-white border-r border-gray-100">
        <AdminSidebar onOpenCmdK={() => setCmdOpen(true)} />
      </aside>

      {mobileNav && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNav(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white border-r border-gray-100 shadow-xl flex flex-col">
            <AdminSidebar onOpenCmdK={() => { setMobileNav(false); setCmdOpen(true); }} />
          </div>
        </div>
      )}

      <div className="md:pl-60 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100">
          <div className="flex h-14 items-center gap-3 px-5 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileNav(true)}
              className="md:hidden w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              aria-label="Open navigation"
            >
              <Menu size={16} />
            </button>

            <div className="flex-1 min-w-0">
              {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1 text-[10px] font-600 uppercase tracking-wider text-gray-400 leading-tight">
                  {breadcrumbs.map((b, i) => (
                    <span key={i} className="flex items-center gap-1 min-w-0 truncate">
                      {i > 0 && <ChevronRight size={10} className="text-gray-300 shrink-0" />}
                      {b.href ? <a href={b.href} className="hover:text-gray-700 truncate">{b.label}</a> : <span className="truncate">{b.label}</span>}
                    </span>
                  ))}
                </nav>
              )}
              <div className="flex items-baseline gap-2">
                <h1 className="text-[15px] font-700 text-gray-900 truncate">{title}</h1>
                {subtitle && <span className="text-[11px] text-gray-500 truncate">· {subtitle}</span>}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="hidden sm:inline-flex items-center gap-2 h-8 rounded-lg border border-gray-200 bg-white px-2.5 text-xs text-gray-400 hover:text-gray-600 hover:border-gray-300"
            >
              <span>Search…</span>
              <kbd className="text-[9px] font-mono font-600 border border-gray-200 rounded px-1 bg-gray-50">⌘K</kbd>
            </button>

            <div className="flex items-center gap-2">{actions}</div>

            <NotificationsBell />

            <div className="flex items-center gap-2 pl-2 border-l border-gray-100 ml-1">
              <div className="text-right hidden sm:block leading-tight">
                <div className="text-[11px] font-600 text-gray-900 truncate max-w-[120px]">{profile?.full_name ?? user.email}</div>
                <div className="text-[9px] font-700 uppercase tracking-wider text-emerald-600">{role}</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-[11px] font-700 flex items-center justify-center shadow-sm">
                {initials}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 lg:px-8 py-6">{children}</main>
      </div>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
