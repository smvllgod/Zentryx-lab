// @ts-nocheck — Supabase v2 generic resolution issue (PostgrestVersion 12).
"use client";

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { AiConversationSummary, AiContentBlock } from "./types";

export interface AiPersistedMessage {
  id: string;
  role: "user" | "assistant";
  content: string | AiContentBlock[];
  createdAt: string;
}

function db() {
  return getSupabase();
}

export async function listConversations(strategyId?: string | null): Promise<AiConversationSummary[]> {
  if (!isSupabaseConfigured()) return [];
  let q = db()
    .from("ai_conversations")
    .select("id, strategy_id, title, pinned, message_count, last_message_at, created_at")
    .order("pinned", { ascending: false })
    .order("last_message_at", { ascending: false })
    .limit(50);
  if (strategyId) q = q.eq("strategy_id", strategyId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    strategyId: r.strategy_id,
    title: r.title,
    pinned: r.pinned,
    messageCount: r.message_count ?? 0,
    lastMessageAt: r.last_message_at,
    createdAt: r.created_at,
  }));
}

export async function loadConversationMessages(conversationId: string): Promise<AiPersistedMessage[]> {
  const { data, error } = await db()
    .from("ai_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    role: r.role as "user" | "assistant",
    content: r.content as string | AiContentBlock[],
    createdAt: r.created_at,
  }));
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const { error } = await db()
    .from("ai_conversations")
    .delete()
    .eq("id", conversationId);
  if (error) throw error;
}

export async function renameConversation(conversationId: string, title: string): Promise<void> {
  const { error } = await db()
    .from("ai_conversations")
    .update({ title })
    .eq("id", conversationId);
  if (error) throw error;
}

export async function togglePinConversation(conversationId: string, pinned: boolean): Promise<void> {
  const { error } = await db()
    .from("ai_conversations")
    .update({ pinned })
    .eq("id", conversationId);
  if (error) throw error;
}
