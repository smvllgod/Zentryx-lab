"use client";

import { Menu, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { NotificationsBell } from "./NotificationsBell";

export function Topbar({
  title,
  actions,
  onOpenMobileNav,
}: {
  title: string;
  actions?: React.ReactNode;
  onOpenMobileNav?: () => void;
}) {
  const { user, profile, signOut } = useAuth();
  const initials = (profile?.full_name ?? user?.email ?? "?")
    .split(/\s+|@/)[0]
    .slice(0, 2)
    .toUpperCase();
  const plan = (profile?.plan ?? "free").toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-gray-100">
      <div className="flex h-14 items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm sm:text-base font-700 text-gray-900 truncate">{title}</h1>
        </div>
        {/* Page actions — visible on every breakpoint, scrollable if
            they overflow on mobile. Individual buttons can still hide
            via `hidden sm:inline-flex` when they don't fit. */}
        {actions && (
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 overflow-x-auto no-scrollbar">
            {actions}
          </div>
        )}
        <NotificationsBell />
        <Badge
          tone={plan === "FREE" ? "default" : plan === "PRO" ? "emerald" : "purple"}
          className="hidden sm:inline-flex"
        >
          {plan}
        </Badge>
        <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100">
          <div className="w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-700 flex items-center justify-center">
            {initials}
          </div>
          <button
            onClick={() => signOut()}
            className="text-xs text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="sm:hidden w-8 h-8 rounded-full bg-emerald-500 text-white text-[11px] font-700 flex items-center justify-center shrink-0"
          aria-label="Sign out"
          title="Sign out"
        >
          {initials}
        </button>
      </div>
    </header>
  );
}
