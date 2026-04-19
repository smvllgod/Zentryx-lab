"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import { Users, FolderKanban, Boxes, Store, LayoutDashboard, CreditCard, Download, Crown, Flag, Settings, ScrollText, Search } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

interface Hit {
  kind: "nav" | "user" | "strategy" | "listing";
  label: string;
  subtitle?: string;
  href: string;
  icon?: React.ReactNode;
}

const NAV_ITEMS: Hit[] = [
  { kind: "nav", label: "Overview",       href: "/admin",               icon: <LayoutDashboard size={14} /> },
  { kind: "nav", label: "Users",          href: "/admin/users",         icon: <Users size={14} /> },
  { kind: "nav", label: "Subscriptions",  href: "/admin/subscriptions", icon: <CreditCard size={14} /> },
  { kind: "nav", label: "Strategies",     href: "/admin/strategies",    icon: <FolderKanban size={14} /> },
  { kind: "nav", label: "Logic Blocks",   href: "/admin/blocks",        icon: <Boxes size={14} /> },
  { kind: "nav", label: "Exports",        href: "/admin/exports",       icon: <Download size={14} /> },
  { kind: "nav", label: "Marketplace",    href: "/admin/marketplace",   icon: <Store size={14} /> },
  { kind: "nav", label: "Creators",       href: "/admin/creators",      icon: <Crown size={14} /> },
  { kind: "nav", label: "Flags / Control",href: "/admin/flags",         icon: <Flag size={14} /> },
  { kind: "nav", label: "Audit log",      href: "/admin/audit",         icon: <ScrollText size={14} /> },
  { kind: "nav", label: "System",         href: "/admin/settings",      icon: <Settings size={14} /> },
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState<Hit[]>([]);
  const [cursor, setCursor] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced remote search
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) { setRemote([]); return; }
    if (!isSupabaseConfigured()) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const s = getSupabase();
        const [users, strategies, listings] = await Promise.all([
          s.from("profiles").select("id,email,full_name,plan").or(`email.ilike.%${q}%,full_name.ilike.%${q}%`).limit(6),
          s.from("strategies").select("id,name,status").ilike("name", `%${q}%`).limit(6),
          s.from("marketplace_listings").select("id,title,status").ilike("title", `%${q}%`).limit(6),
        ]);
        if (ctrl.signal.aborted) return;
        const hits: Hit[] = [];
        for (const u of (users.data ?? []) as { id: string; email: string; full_name: string | null; plan: string }[]) {
          hits.push({ kind: "user", label: u.full_name || u.email, subtitle: `${u.email} · ${u.plan}`, href: `/admin/users/${u.id}`, icon: <Users size={14} /> });
        }
        for (const s of (strategies.data ?? []) as { id: string; name: string; status: string }[]) {
          hits.push({ kind: "strategy", label: s.name, subtitle: `Strategy · ${s.status}`, href: `/admin/strategies/${s.id}`, icon: <FolderKanban size={14} /> });
        }
        for (const l of (listings.data ?? []) as { id: string; title: string; status: string }[]) {
          hits.push({ kind: "listing", label: l.title, subtitle: `Listing · ${l.status}`, href: `/admin/marketplace`, icon: <Store size={14} /> });
        }
        setRemote(hits);
      } catch {
        // swallow
      }
    }, 180);
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [query, open]);

  const filtered = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase();
    const navHits = q ? NAV_ITEMS.filter((n) => n.label.toLowerCase().includes(q)) : NAV_ITEMS;
    return [...navHits, ...remote];
  }, [query, remote]);

  useEffect(() => { setCursor(0); }, [filtered.length]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setQuery("");
      setRemote([]);
    }
  }, [open]);

  function go(h: Hit) {
    onOpenChange(false);
    router.push(h.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (filtered[cursor]) go(filtered[cursor]); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!p-0 max-w-xl overflow-hidden border-0 shadow-[0_20px_60px_rgba(15,23,42,0.18)] bg-white">
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search users, strategies, listings…  (↑↓ to navigate · ↵ open)"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
          <kbd className="hidden sm:inline-flex text-[10px] font-mono font-600 text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto py-1">
          {filtered.length === 0 && (
            <li className="px-4 py-8 text-center text-xs text-gray-400">No matches.</li>
          )}
          {filtered.map((h, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseEnter={() => setCursor(i)}
                onClick={() => go(h)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors",
                  cursor === i ? "bg-emerald-50/70" : "hover:bg-gray-50",
                )}
              >
                <span className="w-6 h-6 rounded-md bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                  {h.icon}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-600 text-gray-900 truncate">{h.label}</span>
                  {h.subtitle && <span className="block text-[10px] text-gray-500 truncate">{h.subtitle}</span>}
                </span>
                <span className="text-[9px] font-700 uppercase tracking-wider text-gray-400">{h.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

/** Hook — call inside AdminShell to open the palette with Cmd-K / Ctrl-K. */
export function useCommandPaletteShortcut(open: boolean, setOpen: (v: boolean) => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, setOpen]);
}
