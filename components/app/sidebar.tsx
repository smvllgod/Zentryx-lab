"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Workflow,
  Sparkles,
  Store,
  Download,
  CreditCard,
  Settings,
  BookOpen,
  KeyRound,
  FileCode2,
  Users,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { href: "/overview",      label: "Overview",      icon: LayoutDashboard },
  { href: "/strategies",    label: "My Strategies", icon: FolderKanban },
  { href: "/templates",     label: "Templates",     icon: Sparkles },
  { href: "/builder",       label: "Builder",       icon: Workflow },
  { href: "/marketplace",   label: "Marketplace",   icon: Store },
  { href: "/community",     label: "Community",     icon: Users },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/exports",       label: "Exports",       icon: Download },
  { href: "/licenses",      label: "Licenses",      icon: KeyRound },
  { href: "/setfiles",      label: "Setfiles",      icon: FileCode2 },
  { href: "/docs",          label: "Docs",          icon: BookOpen },
  { href: "/billing",       label: "Billing",       icon: CreditCard },
  { href: "/settings",      label: "Settings",      icon: Settings },
];

export interface SidebarProps {
  onNavigate?: () => void;
  /** Icon-only rail (no labels, no "Need help" card, no brand text). */
  collapsed?: boolean;
  /** Render the bottom collapse-toggle when provided. */
  onToggleCollapse?: () => void;
}

export function Sidebar({ onNavigate, collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  return (
    <nav className={cn("flex flex-col h-full", collapsed ? "py-3 px-1.5" : "p-3")}>
      <a
        href="/overview"
        className={cn(
          "flex items-center gap-2 py-3 mb-2",
          collapsed ? "px-0 justify-center" : "px-2",
        )}
        title={collapsed ? "Zentryx Lab" : undefined}
      >
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/30 shrink-0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z" fill="white" fillOpacity="0.9" />
            <path d="M8 5L11 6.5V9.5L8 11L5 9.5V6.5L8 5Z" fill="white" />
          </svg>
        </div>
        {!collapsed && (
          <div className="leading-none">
            <div className="text-[9px] font-500 text-gray-400 tracking-widest uppercase">Zentryx</div>
            <div className="text-sm font-700 text-gray-900 -mt-0.5">Lab</div>
          </div>
        )}
      </a>

      <div className={cn("flex flex-col gap-0.5 mt-2", collapsed && "items-center")}>
        {NAV.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/overview" && pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
              className={cn(
                "rounded-lg text-sm transition-colors",
                collapsed
                  ? "flex items-center justify-center w-10 h-10"
                  : "flex items-center gap-3 px-3 py-2",
                active
                  ? "bg-emerald-50 text-emerald-700 font-600"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
              )}
            >
              <Icon size={16} className={active ? "text-emerald-600" : "text-gray-400"} />
              {!collapsed && item.label}
            </a>
          );
        })}
      </div>

      <div className={cn("mt-auto", collapsed ? "pt-3" : "pt-4")}>
        {!collapsed && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 mb-2">
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
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors",
              collapsed
                ? "w-10 h-10 inline-flex items-center justify-center mx-auto"
                : "w-full flex items-center justify-center gap-2 py-2 text-[11px] font-600",
            )}
          >
            {collapsed ? <PanelLeftOpen size={14} /> : (
              <><PanelLeftClose size={14} /> Collapse</>
            )}
          </button>
        )}
      </div>
    </nav>
  );
}
