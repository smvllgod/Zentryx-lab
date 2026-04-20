// ──────────────────────────────────────────────────────────────────
// Zentryx AI — shared types between the Netlify function and client.
// ──────────────────────────────────────────────────────────────────

import type { StrategyGraph } from "@/lib/strategies/types";

export interface AiTextBlock {
  type: "text";
  text: string;
}

export interface AiToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AiToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export type AiContentBlock = AiTextBlock | AiToolUseBlock | AiToolResultBlock;

export interface AiMessage {
  role: "user" | "assistant";
  content: string | AiContentBlock[];
}

/** Tool names the AI can invoke against the strategy graph. */
export type AiToolName =
  | "add_node"
  | "connect_nodes"
  | "update_node_params"
  | "delete_node"
  | "delete_edge"
  | "set_metadata"
  | "list_graph"
  | "list_validation"
  | "done";

export interface AiChatRequestBody {
  messages: AiMessage[];
  graph: StrategyGraph;
  /** Slim list of the node types the client knows about. */
  nodeTypes: string[];
  /** Optional strategy id so we can persist the conversation. */
  strategyId?: string | null;
  /** Existing conversation id to append to; omitted on first turn. */
  conversationId?: string | null;
}

export interface AiChatOkResponse {
  ok: true;
  assistant: AiContentBlock[];
  stopReason: string | null;
  /** Remaining quota after this call. `null` = unlimited (shouldn't happen). */
  remaining: number | null;
  /** Quota info for UI. */
  quota: { type: "lifetime" | "daily"; used: number; limit: number };
  /** The conversation this turn belongs to — created server-side on first turn. */
  conversationId: string;
  /** Auto-derived title (only sent on the first turn of a conversation). */
  conversationTitle?: string;
}

export interface AiConversationSummary {
  id: string;
  strategyId: string | null;
  title: string;
  pinned: boolean;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
}

export interface AiChatErrorResponse {
  ok: false;
  error:
    | "unauthorized"
    | "quota_exceeded"
    | "ai_failed"
    | "bad_request"
    | "tier_not_allowed"
    | "rate_limited"
    | "upstream_timeout"
    | "upstream_busy";
  message: string;
  upgradeTo?: "pro" | "creator";
  /**
   * Seconds the client should wait before retrying. Set on the
   * recoverable codes: rate_limited, upstream_timeout, upstream_busy.
   */
  retryAfterSec?: number;
}

export type AiChatResponse = AiChatOkResponse | AiChatErrorResponse;
