"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

export type Profile = Tables<"profiles">;

interface AuthContextValue {
  ready: boolean;
  configured: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Context = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const [ready, setReady] = useState(!configured); // if not configured, we're "ready" with null
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const profileLoaded = useRef<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabase();
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [configured]);

  const user = session?.user ?? null;

  const refreshProfile = useMemo(
    () => async () => {
      if (!configured || !user) {
        setProfile(null);
        return;
      }
      const { data } = await getSupabase()
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile((data as Profile | null) ?? null);
      profileLoaded.current = user.id;
    },
    [configured, user],
  );

  useEffect(() => {
    if (!user) {
      setProfile(null);
      profileLoaded.current = null;
      return;
    }
    if (profileLoaded.current === user.id) return;
    void refreshProfile();
  }, [user, refreshProfile]);

  const signOut = async () => {
    if (!configured) return;
    await getSupabase().auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const value: AuthContextValue = {
    ready,
    configured,
    session,
    user,
    profile,
    refreshProfile,
    signOut,
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
