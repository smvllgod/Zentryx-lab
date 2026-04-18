"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { useIsAdmin } from "@/lib/admin/auth";
import { AdminSidebar } from "./AdminSidebar";
import { isSupabaseConfigured } from "@/lib/supabase/client";

interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function AdminShell({ title, subtitle, actions, children }: Props) {
  const { ready, user } = useAuth();
  const { role } = useIsAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    if (!ready) return;
    if (!user) router.replace("/sign-in?returnTo=/admin");
    else if (!role) router.replace("/overview");
  }, [ready, user, role, router]);

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center text-sm text-gray-500">
          Supabase isn&apos;t configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>.
        </div>
      </div>
    );
  }

  if (!ready || !user) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading…</div>;
  }
  if (!role) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Not authorised — redirecting…</div>;
  }

  return (
    <div className="min-h-screen bg-[#fafbfa]">
      <aside className="hidden md:block fixed inset-y-0 left-0 w-60 border-r border-gray-100 bg-white">
        <AdminSidebar />
      </aside>
      <div className="md:pl-60 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-gray-100">
          <div className="flex h-14 items-center gap-3 px-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-700 uppercase tracking-widest text-emerald-600">Admin</span>
                <span className="text-[10px] text-gray-300">·</span>
                <span className="text-[10px] font-600 uppercase tracking-wider text-gray-400">{role}</span>
              </div>
              <h1 className="text-base font-700 text-gray-900 truncate leading-tight">{title}</h1>
              {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-3">{actions}</div>
          </div>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
