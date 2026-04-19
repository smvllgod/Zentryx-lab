"use client";

// Public layout — no auth required. Used on /marketplace and any future
// public-facing route. Signed-in users see a "Dashboard" CTA in the
// topbar; unauthenticated see "Sign in" / "Sign up".

import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface Props {
  title?: string;
  className?: string;
  children: ReactNode;
  /** Show a narrow border at the bottom of the topbar — defaults true. */
  bordered?: boolean;
}

export function PublicShell({ children, className, bordered = true }: Props) {
  const { user, ready } = useAuth();
  return (
    <div className={cn("min-h-screen bg-white flex flex-col", className)}>
      <header className={cn("sticky top-0 z-30 bg-white/90 backdrop-blur", bordered && "border-b border-gray-100")}>
        <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-5 lg:px-8">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z" fill="white" fillOpacity="0.95" />
                <path d="M8 5L11 6.5V9.5L8 11L5 9.5V6.5L8 5Z" fill="#10b981" />
              </svg>
            </div>
            <div className="leading-none">
              <div className="text-[9px] font-700 text-gray-400 tracking-widest uppercase">Zentryx</div>
              <div className="text-sm font-700 text-gray-900 -mt-0.5">Lab</div>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-5 text-[13px] text-gray-600">
            <a href="/" className="hover:text-gray-900">Product</a>
            <a href="/marketplace" className="hover:text-gray-900 font-600 text-emerald-700">Marketplace</a>
            <a href="/docs" className="hover:text-gray-900">Docs</a>
            <a href="/billing" className="hover:text-gray-900">Pricing</a>
          </nav>

          <div className="flex items-center gap-2">
            {!ready ? (
              <div className="h-8 w-20 rounded-lg bg-gray-100 animate-pulse" />
            ) : user ? (
              <>
                <Button asChild size="sm" variant="secondary" className="hidden sm:inline-flex">
                  <a href="/overview">Dashboard</a>
                </Button>
                <Button asChild size="sm">
                  <a href="/builder">Open builder</a>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost">
                  <a href="/sign-in">Sign in</a>
                </Button>
                <Button asChild size="sm">
                  <a href="/sign-up">Get started</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-gray-100 py-8 mt-12 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-gray-500">
          <div>© Zentryx Lab — No-code MT5 Expert Advisor builder.</div>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="hover:text-gray-900">Privacy</a>
            <a href="/terms" className="hover:text-gray-900">Terms</a>
            <a href="/refund" className="hover:text-gray-900">Refund</a>
            <a href="/docs" className="hover:text-gray-900">Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
