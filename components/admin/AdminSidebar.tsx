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
  ScrollText,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  group: "platform" | "control";
}

const NAV: NavItem[] = [
  { href: "/admin",                 label: "Overview",       icon: LayoutDashboard, group: "platform" },
  { href: "/admin/users",           label: "Users",          icon: Users,           group: "platform" },
  { href: "/admin/subscriptions",   label: "Subscriptions",  icon: CreditCard,      group: "platform" },
  { href: "/admin/strategies",      label: "Strategies",     icon: FolderKanban,    group: "platform" },
  { href: "/admin/exports",         label: "Exports",        icon: Download,        group: "platform" },
  { href: "/admin/marketplace",     label: "Marketplace",    icon: Store,           group: "platform" },
  { href: "/admin/creators",        label: "Creators",       icon: Crown,           group: "platform" },
  { href: "/admin/licenses",        label: "Licenses",       icon: KeyRound,        group: "platform" },

  { href: "/admin/blocks",          label: "Logic Blocks",   icon: Boxes,           group: "control" },
  { href: "/admin/flags",           label: "Flags / Control",icon: Flag,            group: "control" },
  { href: "/admin/audit",           label: "Audit log",      icon: ScrollText,      group: "control" },
  { href: "/admin/settings",        label: "System",         icon: Settings,        group: "control" },
];

export function AdminSidebar({ onOpenCmdK }: { onOpenCmdK?: () => void }) {
  const pathname = usePathname();

  const platform = NAV.filter((n) => n.group === "platform");
  const control = NAV.filter((n) => n.group === "control");

  return (
    <nav className="flex flex-col h-full">
      {/* Brand */}
      <a href="/admin" className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z" fill="#10b981" fillOpacity="0.95" />
            <path d="M8 5L11 6.5V9.5L8 11L5 9.5V6.5L8 5Z" fill="white" />
          </svg>
        </div>
        <div className="leading-tight">
          <div className="text-[8px] font-700 text-gray-400 tracking-[0.18em] uppercase">Zentryx</div>
          <div className="text-[13px] font-700 text-gray-900 -mt-0.5 flex items-center gap-1.5">
            Admin
            <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-600 text-[8px] font-700 uppercase tracking-wider px-1.5 py-0.5 border border-emerald-100">LIVE</span>
          </div>
        </div>
      </a>

      {/* Cmd-K search trigger */}
      {onOpenCmdK && (
        <button
          type="button"
          onClick={onOpenCmdK}
          className="mx-3 mt-3 flex items-center gap-2 h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-left text-xs text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <span className="flex-1">Search…</span>
          <kbd className="hidden sm:inline-flex text-[9px] font-mono font-600 border border-gray-200 rounded px-1 bg-gray-50">⌘K</kbd>
        </button>
      )}

      {/* Platform group */}
      <SidebarGroup title="Platform">
        {platform.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </SidebarGroup>

      {/* Control group */}
      <SidebarGroup title="Control">
        {control.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </SidebarGroup>

      <div className="mt-auto border-t border-gray-100 p-3">
        <a
          href="/overview"
          className="flex items-center gap-2 rounded-lg px-2 py-2 text-[11px] text-gray-400 hover:text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft size={12} /> Back to app
        </a>
      </div>
    </nav>
  );
}

function isActive(pathname: string | null | undefined, href: string) {
  if (!pathname) return false;
  if (href === "/admin") return pathname === "/admin" || pathname === "/admin/";
  return pathname.startsWith(href);
}

function SidebarGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-3 pt-5">
      <div className="px-2 pb-1.5 text-[9px] font-700 uppercase tracking-[0.14em] text-gray-400">{title}</div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <a
      href={item.href}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors relative",
        active
          ? "bg-gray-900 text-white font-600 shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
      )}
    >
      <Icon size={14} className={cn(active ? "text-emerald-400" : "text-gray-400 group-hover:text-gray-600")} />
      <span>{item.label}</span>
    </a>
  );
}
