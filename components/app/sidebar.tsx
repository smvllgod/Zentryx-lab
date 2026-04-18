"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Workflow,
  Store,
  Download,
  CreditCard,
  Settings,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { href: "/overview",     label: "Overview",      icon: LayoutDashboard },
  { href: "/strategies",   label: "My Strategies", icon: FolderKanban },
  { href: "/builder",      label: "Builder",       icon: Workflow },
  { href: "/marketplace",  label: "Marketplace",   icon: Store },
  { href: "/exports",      label: "Exports",       icon: Download },
  { href: "/docs",         label: "Docs",          icon: BookOpen },
  { href: "/billing",      label: "Billing",       icon: CreditCard },
  { href: "/settings",     label: "Settings",      icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col h-full p-3">
      <a href="/overview" className="flex items-center gap-2 px-2 py-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/30">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z" fill="white" fillOpacity="0.9" />
            <path d="M8 5L11 6.5V9.5L8 11L5 9.5V6.5L8 5Z" fill="white" />
          </svg>
        </div>
        <div className="leading-none">
          <div className="text-[9px] font-500 text-gray-400 tracking-widest uppercase">
            Zentryx
          </div>
          <div className="text-sm font-700 text-gray-900 -mt-0.5">Lab</div>
        </div>
      </a>

      <div className="flex flex-col gap-0.5 mt-2">
        {NAV.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/overview" && pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-emerald-50 text-emerald-700 font-600"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
              )}
            >
              <Icon size={16} className={active ? "text-emerald-600" : "text-gray-400"} />
              {item.label}
            </a>
          );
        })}
      </div>

      <div className="mt-auto pt-4">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
          <div className="text-xs font-700 text-emerald-700">Need help?</div>
          <div className="text-[11px] text-emerald-600/80 mt-1">
            Read the docs or get in touch — we ship weekly.
          </div>
          <a
            href="mailto:hello@zentryx.lab"
            className="mt-3 inline-flex items-center text-xs font-600 text-emerald-700 hover:underline"
          >
            Contact support →
          </a>
        </div>
      </div>
    </nav>
  );
}
