"use client";

// Admin-role resolution. Reads the `role` column on profiles.
// Admin pages MUST gate on `useIsAdmin()` before rendering.

import { useAuth } from "@/lib/auth/context";

export type AdminRole = "admin" | "staff";

export function useIsAdmin(): { ready: boolean; role: AdminRole | null } {
  const { ready, profile } = useAuth();
  if (!ready) return { ready: false, role: null };
  const role = (profile as unknown as { role?: string } | null)?.role;
  if (role === "admin" || role === "staff") return { ready: true, role };
  return { ready: true, role: null };
}
