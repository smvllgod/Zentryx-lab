"use client";

// Admin-role resolution. Reads the `role` column on profiles.
// Admin pages MUST gate on `useIsAdmin()` before rendering.
//
// Race to avoid: the AuthContext reports `ready=true` as soon as the
// *session* is loaded, but the profile row is fetched asynchronously
// a tick later. If consumers redirect on `role === null` the moment
// ready flips true, they redirect in the race window — before the
// profile has arrived — and stamp non-admins on admins. We therefore
// treat "user present but profile not yet fetched" as NOT ready.

import { useAuth } from "@/lib/auth/context";

export type AdminRole = "admin" | "staff";

export function useIsAdmin(): { ready: boolean; role: AdminRole | null } {
  const { ready, user, profile } = useAuth();
  if (!ready) return { ready: false, role: null };
  // Signed-in but profile not yet loaded — stay not-ready so the guard
  // doesn't bounce the user on a transient null profile.
  if (user && !profile) return { ready: false, role: null };
  const role = (profile as unknown as { role?: string } | null)?.role;
  if (role === "admin" || role === "staff") return { ready: true, role };
  return { ready: true, role: null };
}
