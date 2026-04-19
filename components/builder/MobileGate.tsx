"use client";

// ──────────────────────────────────────────────────────────────────
// Mobile gate for the builder
// ──────────────────────────────────────────────────────────────────
// The builder is a multi-panel drag-and-drop canvas — not usable on
// phone viewports. Rather than let a user swipe through a broken UI,
// we show a friendly "switch to a larger screen" screen. Shows until
// the viewport crosses the md breakpoint (768px), then the real
// builder takes over.
// ──────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import {
  Monitor, Tablet, ArrowLeft, FolderKanban, Store, BookOpen, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const BREAKPOINT_PX = 768; // matches Tailwind's `md:`

/**
 * Returns true when the viewport is below the md breakpoint. SSR-safe:
 * defaults to false on the server (desktop-first) so hydration doesn't
 * mismatch, then snaps to the real value on mount.
 */
export function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${BREAKPOINT_PX - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

export function BuilderMobileGate() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/60 via-white to-white flex flex-col">
      <header className="border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="flex items-center gap-2 px-4 h-14 max-w-xl mx-auto">
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-500/20">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z" fill="white" fillOpacity="0.9" />
                <path d="M8 5L11 6.5V9.5L8 11L5 9.5V6.5L8 5Z" fill="white" />
              </svg>
            </div>
            <div className="leading-none">
              <div className="text-[9px] font-700 text-gray-400 tracking-widest uppercase">Zentryx</div>
              <div className="text-sm font-700 text-gray-900 -mt-0.5">Lab</div>
            </div>
          </a>
        </div>
      </header>

      <main className="flex-1 px-5 py-10 flex flex-col items-center text-center max-w-md mx-auto">
        {/* Illustration */}
        <div className="relative mt-2 mb-8">
          <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-2xl" />
          <div className="relative flex items-end justify-center gap-3">
            <div className="w-12 h-16 rounded-lg border-2 border-gray-300 bg-white flex items-center justify-center shadow-sm">
              <Tablet size={18} className="text-gray-400" />
            </div>
            <div className="w-24 h-16 rounded-lg border-2 border-emerald-500 bg-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Monitor size={22} className="text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-100 px-2.5 py-0.5 mb-4">
          <Sparkles size={11} className="text-amber-600" />
          <span className="text-[10px] font-700 uppercase tracking-widest text-amber-700">
            Desktop required
          </span>
        </div>

        <h1 className="text-2xl font-800 text-gray-900 tracking-tight">
          The builder needs a bigger screen
        </h1>
        <p className="mt-3 text-sm text-gray-600 leading-relaxed">
          Zentryx Lab&apos;s visual builder uses a multi-panel canvas with
          drag-and-drop nodes, the node library on the left, and an
          inspector on the right. That experience doesn&apos;t work on a
          phone — so we&apos;re not going to pretend it does.
        </p>
        <p className="mt-3 text-sm text-gray-600 leading-relaxed">
          Open this page on a laptop, desktop, or tablet in landscape,
          and you&apos;ll drop right into the builder where you left off.
        </p>

        {/* Alternatives */}
        <div className="mt-8 w-full space-y-2">
          <Button asChild className="w-full justify-between" size="lg">
            <a href="/strategies">
              <span className="inline-flex items-center gap-2">
                <FolderKanban size={15} /> My Strategies
              </span>
              <ArrowLeft size={14} className="rotate-180" />
            </a>
          </Button>
          <Button asChild variant="secondary" className="w-full justify-between" size="lg">
            <a href="/marketplace">
              <span className="inline-flex items-center gap-2">
                <Store size={15} /> Browse marketplace
              </span>
              <ArrowLeft size={14} className="rotate-180" />
            </a>
          </Button>
          <Button asChild variant="ghost" className="w-full justify-between" size="lg">
            <a href="/docs">
              <span className="inline-flex items-center gap-2">
                <BookOpen size={15} /> Read the docs
              </span>
              <ArrowLeft size={14} className="rotate-180" />
            </a>
          </Button>
        </div>

        <p className="mt-10 text-[11px] text-gray-400 leading-relaxed">
          Tip: on an iPad, rotate to landscape — the builder unlocks past
          768 px wide.
        </p>
      </main>
    </div>
  );
}
