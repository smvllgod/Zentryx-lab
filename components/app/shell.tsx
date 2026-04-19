"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

interface AppShellProps {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  /** Render the page edge-to-edge (no padding/scroll container). Used by builder. */
  bare?: boolean;
}

// localStorage key used to persist the collapsed state across visits.
const SIDEBAR_COLLAPSED_KEY = "zx.sidebarCollapsed";

export function AppShell({ title, actions, children, bare }: AppShellProps) {
  const { ready, configured, user } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Collapsible sidebar — enabled in `bare` mode (builder). Default
  // uncollapsed; user's last choice is persisted across visits.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === "1") setCollapsed(true);
    } catch { /* no-op */ }
  }, []);
  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0"); } catch { /* no-op */ }
      return next;
    });
  };
  const collapsible = bare === true;
  const isCollapsed = collapsible && collapsed;

  useEffect(() => {
    if (configured && ready && !user) router.replace("/sign-in");
  }, [configured, ready, user, router]);

  if (!isSupabaseConfigured()) {
    return <SupabaseSetupHint />;
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">
        Redirecting to sign-in…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Desktop sidebar — width toggles with `collapsed` in bare mode */}
      <aside
        className={cn(
          "hidden md:block fixed inset-y-0 left-0 border-r border-gray-100 bg-white transition-[width] duration-150",
          isCollapsed ? "w-14" : "w-64",
        )}
      >
        <Sidebar
          collapsed={isCollapsed}
          onToggleCollapse={collapsible ? toggleCollapse : undefined}
        />
      </aside>

      {/* Mobile sidebar overlay — always expanded inside the drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white border-r border-gray-100 shadow-xl">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/*
        In `bare` mode (builder) we lock the outer wrapper to `h-screen`
        so `main` can use flex-1 + min-h-0 to fit exactly the viewport —
        otherwise the node library's intrinsic content height bubbles up
        and stretches the page, which throws fitView off dramatically.
      */}
      <div
        className={cn(
          "flex flex-col transition-[padding] duration-150",
          isCollapsed ? "md:pl-14" : "md:pl-64",
          bare ? "h-screen overflow-hidden" : "min-h-screen",
        )}
      >
        <Topbar title={title} actions={actions} onOpenMobileNav={() => setMobileOpen(true)} />
        <main
          className={
            bare
              ? "flex-1 flex flex-col min-h-0 overflow-hidden"
              : "flex-1 px-4 md:px-8 py-6"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function SupabaseSetupHint() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-lg w-full rounded-2xl border border-amber-200 bg-amber-50/60 p-8 text-center">
        <h2 className="text-lg font-700 text-amber-900">Supabase isn&apos;t configured yet</h2>
        <p className="mt-2 text-sm text-amber-800">
          Add your <code className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
          <code className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">.env.local</code> and restart the dev server.
        </p>
        <p className="mt-4 text-xs text-amber-700">
          The full SQL schema lives at <code>supabase/migrations/0001_init.sql</code>. Run it in the Supabase SQL editor to bootstrap the database.
        </p>
        <Button asChild variant="secondary" className="mt-6">
          <a href="/">Back to landing</a>
        </Button>
      </div>
    </div>
  );
}
