"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FolderKanban,
  Boxes,
  Download,
  Store,
  Crown,
  Flag,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { href: "/admin",                 label: "Overview",     icon: LayoutDashboard },
  { href: "/admin/users",           label: "Users",        icon: Users },
  { href: "/admin/subscriptions",   label: "Subscriptions",icon: CreditCard },
  { href: "/admin/strategies",      label: "Strategies",   icon: FolderKanban },
  { href: "/admin/blocks",          label: "Logic Blocks", icon: Boxes },
  { href: "/admin/exports",         label: "Exports",      icon: Download },
  { href: "/admin/marketplace",     label: "Marketplace",  icon: Store },
  { href: "/admin/creators",        label: "Creators",     icon: Crown },
  { href: "/admin/flags",           label: "Flags / Control", icon: Flag },
  { href: "/admin/settings",        label: "System",       icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col h-full p-3">
      <a href="/admin" className="flex items-center gap-2 px-2 py-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z" fill="#10b981" fillOpacity="0.9" />
            <path d="M8 5L11 6.5V9.5L8 11L5 9.5V6.5L8 5Z" fill="white" />
          </svg>
        </div>
        <div className="leading-none">
          <div className="text-[9px] font-500 text-gray-400 tracking-widest uppercase">Zentryx</div>
          <div className="text-sm font-700 text-gray-900 -mt-0.5">Admin</div>
        </div>
      </a>

      <div className="flex flex-col gap-0.5 mt-2">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/admin" && pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-emerald-50 text-emerald-700 font-600"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
              )}
            >
              <Icon size={15} className={active ? "text-emerald-600" : "text-gray-400"} />
              {item.label}
            </a>
          );
        })}
      </div>

      <div className="mt-auto pt-4 border-t border-gray-100">
        <a
          href="/overview"
          className="flex items-center gap-2 text-[11px] text-gray-400 hover:text-gray-700 px-2 py-2"
        >
          <ArrowLeft size={12} /> Back to app
        </a>
      </div>
    </nav>
  );
}
