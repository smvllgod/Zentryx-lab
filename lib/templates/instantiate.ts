// @ts-nocheck — Supabase v2 generic resolution issue (PostgrestVersion 12).
"use client";

// ──────────────────────────────────────────────────────────────────
// Instantiate a template into a real strategy row
// ──────────────────────────────────────────────────────────────────
// Creates a new row in `strategies` owned by the current user with a
// graph copied from the template factory, a sensible default name,
// and status = "draft". Returns the new row id so the caller can
// redirect to /builder?id=…

import { getSupabase } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/types";
import type { Template } from "./types";

interface Opts {
  /** Override the default name "TemplateName copy" if you like. */
  name?: string;
}

export async function createStrategyFromTemplate(template: Template, opts: Opts = {}): Promise<{ id: string; name: string }> {
  const supabase = getSupabase();
  const { data: userResp } = await supabase.auth.getUser();
  if (!userResp?.user) throw new Error("Not signed in.");

  const name = opts.name?.trim() || template.name;
  const graph = template.build({ strategyName: name });

  const { data, error } = await supabase
    .from("strategies")
    .insert({
      user_id: userResp.user.id,
      name,
      description: template.tagline,
      graph: graph as unknown as Json,
      status: "draft",
      // Store the template slug on the strategy for analytics + "Based on X" badges.
      tags: [`template:${template.slug}`],
    } as any)
    .select("id, name")
    .single();

  if (error) throw error;
  return { id: data.id, name: data.name };
}
