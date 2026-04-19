"use client";

import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";

export interface MenuItem {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}

export interface MenuGroup {
  title?: string;
  items: MenuItem[];
}

/**
 * Table-row action menu. Replaces inline button clusters with a single
 * "⋯" button that opens a clean dropdown. Keeps rows uncluttered.
 */
export function ActionMenu({
  groups,
  align = "end",
  label = "Actions",
}: {
  groups: MenuGroup[];
  align?: "start" | "end" | "center";
  label?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={label}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100"
        >
          <MoreHorizontal size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[180px]">
        {groups.map((g, gi) => (
          <div key={gi}>
            {gi > 0 && <DropdownMenuSeparator />}
            {g.title && <DropdownMenuLabel>{g.title}</DropdownMenuLabel>}
            {g.items.map((it, ii) => {
              const inner = (
                <span className="flex items-center gap-2">
                  {it.icon && <span className="text-gray-400">{it.icon}</span>}
                  {it.label}
                </span>
              );
              return (
                <DropdownMenuItem
                  key={ii}
                  disabled={it.disabled}
                  onSelect={(e) => {
                    if (it.onClick) {
                      e.preventDefault();
                      it.onClick();
                    }
                  }}
                  className={cn(it.destructive && "text-red-600 focus:text-red-700")}
                >
                  {it.href ? <a href={it.href} className="w-full">{inner}</a> : inner}
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
