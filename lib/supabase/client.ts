"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let _client: SupabaseClient<Database> | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anon);
}

// Lazy singleton — Supabase isn't required to render UI shells, so we only
// instantiate when something actually calls into it. Pages should check
// `isSupabaseConfigured()` and degrade gracefully if env is missing.
export function getSupabase(): SupabaseClient<Database> {
  if (_client) return _client;
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase environment variables missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
    );
  }
  _client = createClient<Database>(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}
