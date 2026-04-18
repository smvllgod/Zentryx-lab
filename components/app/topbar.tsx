"use client";

import { Menu, LogOut, User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";

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
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-700 text-gray-900 truncate">{title}</h1>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          {actions}
          <Badge tone={plan === "FREE" ? "default" : plan === "PRO" ? "emerald" : "purple"}>
            {plan}
          </Badge>
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100">
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
        </div>
        <div className="sm:hidden">
          <UserIcon size={18} className="text-gray-500" />
        </div>
      </div>
    </header>
  );
}
