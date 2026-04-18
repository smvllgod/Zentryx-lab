// @ts-nocheck — Supabase v2 generic resolution emits `never` for table types when
// PostgrestVersion is "12". Suppressed until supabase-js types stabilise.
"use client";

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Tables, Json } from "@/lib/supabase/types";
import { emptyGraph, type StrategyGraph } from "./types";

export type StrategyRow = Tables<"strategies">;
export type StrategyVersionRow = Tables<"strategy_versions">;

// ──────────────────────────────────────────────────────────────────
// Strategy persistence
// ──────────────────────────────────────────────────────────────────
// All operations require Supabase to be configured. Pages are expected
// to gate UI on `isSupabaseConfigured()` so they show a setup hint
// rather than calling these functions and failing.
// ──────────────────────────────────────────────────────────────────

function db() {
  return getSupabase();
}

export async function listStrategies(): Promise<StrategyRow[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await db()
    .from("strategies")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getStrategy(id: string): Promise<StrategyRow | null> {
  const { data, error } = await db().from("strategies").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function createStrategy(name: string): Promise<StrategyRow> {
  const supabase = db();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const graph = emptyGraph({ name });
  const { data, error } = await supabase
    .from("strategies")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      user_id: user.id,
      name,
      graph: graph as unknown as Json,
      status: "draft",
    } as any)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function saveStrategy(
  id: string,
  patch: { name?: string; description?: string | null; graph?: StrategyGraph; tags?: string[] }
): Promise<StrategyRow> {
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.graph !== undefined) update.graph = patch.graph;
  if (patch.tags !== undefined) update.tags = patch.tags;
  const { data, error } = await db()
    .from("strategies")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteStrategy(id: string): Promise<void> {
  const { error } = await db().from("strategies").delete().eq("id", id);
  if (error) throw error;
}

export async function recordVersion(args: {
  strategyId: string;
  graph: StrategyGraph;
  generatedCode: string | null;
  summary: string | null;
}): Promise<StrategyVersionRow> {
  const supabase = db();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: existing } = await supabase
    .from("strategy_versions")
    .select("version")
    .eq("strategy_id", args.strategyId)
    .order("version", { ascending: false })
    .limit(1);
  const nextVersion = (existing?.[0]?.version ?? 0) + 1;

  const { data, error } = await supabase
    .from("strategy_versions")
    .insert({
      strategy_id: args.strategyId,
      version: nextVersion,
      graph: args.graph as unknown as Json,
      generated_code: args.generatedCode,
      summary: args.summary,
      created_by: user.id,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listVersions(strategyId: string): Promise<StrategyVersionRow[]> {
  const { data, error } = await db()
    .from("strategy_versions")
    .select("*")
    .eq("strategy_id", strategyId)
    .order("version", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function recordExport(args: {
  strategyId: string;
  versionId?: string;
  filename: string;
  source: string;
}): Promise<void> {
  const supabase = db();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  await supabase.from("strategies").update({ status: "exported" }).eq("id", args.strategyId);
  const { error } = await supabase.from("exports").insert({
    strategy_id: args.strategyId,
    user_id: user.id,
    version_id: args.versionId ?? null,
    filename: args.filename,
    source: args.source,
  });
  if (error) throw error;
}

export async function listExports() {
  const { data, error } = await db()
    .from("exports")
    .select("*, strategies(name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
