"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sparkles,
  Send,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
  Wrench,
  History,
  Plus,
  Trash2,
  Pin,
  Pencil,
  Check,
  ChevronLeft,
  Square,
  ListChecks,
  Compass,
  Lightbulb,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";
import { getSupabase } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";
import { NODE_DEFINITIONS } from "@/lib/strategies/nodes";
import { executeTool, extractLastAssistantText, type DoneSummary } from "@/lib/ai/tools";
import { useConfirm } from "@/components/ui/confirm";
import {
  deleteConversation,
  listConversations,
  loadConversationMessages,
  renameConversation,
  togglePinConversation,
} from "@/lib/ai/store";
import type {
  AiChatResponse,
  AiContentBlock,
  AiConversationSummary,
  AiMessage,
  AiToolUseBlock,
} from "@/lib/ai/types";
import type { StrategyGraph } from "@/lib/strategies/types";
import { cn } from "@/lib/utils/cn";
import { formatRelative } from "@/lib/utils/format";

// ──────────────────────────────────────────────────────────────────
// Zentryx AI panel v2
// ──────────────────────────────────────────────────────────────────
//   • Persisted conversations in `ai_conversations` / `ai_messages`
//   • Sidebar with recent chats, pin, rename, delete
//   • "New chat" button
//   • Markdown-rendered assistant messages (gfm: tables, code blocks)
//   • Live tool-call bubbles, abort button while AI is working
//   • Cmd/Ctrl+K opens the panel from anywhere in the builder
// ──────────────────────────────────────────────────────────────────

interface AiPanelProps {
  graph: StrategyGraph;
  onGraphReplace: (g: StrategyGraph) => void;
  strategyId: string | null;
  onHighlightNode?: (nodeId: string) => void;
}

type UiMessage =
  | { kind: "user"; text: string }
  | { kind: "assistant"; blocks: AiContentBlock[] }
  | { kind: "tool"; label: string; status: "running" | "ok" | "error"; detail?: string }
  | { kind: "done"; summary: DoneSummary }
  | { kind: "error"; text: string; upgradeTo?: "pro" | "creator" };

type View = "chat" | "history";

export function AiPanel({ graph, onGraphReplace, strategyId, onHighlightNode }: AiPanelProps) {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("chat");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [uiMessages, setUiMessages] = useState<UiMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string>("New chat");
  const [conversations, setConversations] = useState<AiConversationSummary[]>([]);
  const [convoLoading, setConvoLoading] = useState(false);

  const historyRef = useRef<AiMessage[]>([]);
  const graphRef = useRef(graph);
  const abortRef = useRef<{ aborted: boolean }>({ aborted: false });

  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [uiMessages, busy]);

  // Cmd/Ctrl + K to toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reload conversations whenever the panel opens or we land on the history view.
  const refreshConversations = useCallback(async () => {
    if (!user) return;
    setConvoLoading(true);
    try {
      const list = await listConversations();
      setConversations(list);
    } finally {
      setConvoLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (open) void refreshConversations();
  }, [open, refreshConversations]);

  const nodeTypes = useMemo(() => NODE_DEFINITIONS.map((d) => d.type), []);

  // ── New chat
  const startNewChat = useCallback(() => {
    setConversationId(null);
    setConversationTitle("New chat");
    setUiMessages([]);
    historyRef.current = [];
    setView("chat");
  }, []);

  // ── Open historical conversation
  const openConversation = useCallback(async (summary: AiConversationSummary) => {
    setConversationId(summary.id);
    setConversationTitle(summary.title);
    setUiMessages([{ kind: "assistant", blocks: [{ type: "text", text: "_Loading…_" }] }]);
    setView("chat");
    try {
      const rows = await loadConversationMessages(summary.id);
      const ui: UiMessage[] = [];
      const raw: AiMessage[] = [];
      for (const r of rows) {
        // Re-hydrate raw history for the model
        raw.push({ role: r.role, content: r.content as never });
        // Re-hydrate the visible bubbles
        if (r.role === "user") {
          const text = typeof r.content === "string"
            ? r.content
            : (r.content as AiContentBlock[]).find((b) => b.type === "text")?.text ?? "";
          ui.push({ kind: "user", text });
        } else {
          const blocks = Array.isArray(r.content) ? (r.content as AiContentBlock[]) : [{ type: "text", text: String(r.content) } as AiContentBlock];
          // Surface tool_use blocks as compact bubbles — except `done`,
          // which is re-materialised as the rich recap card below.
          for (const b of blocks) {
            if (b.type !== "tool_use") continue;
            if (b.name === "done") {
              const parsed = parseDoneInput(b.input);
              if (parsed) ui.push({ kind: "done", summary: parsed });
            } else {
              ui.push({ kind: "tool", label: b.name, status: "ok" });
            }
          }
          if (blocks.some((b) => b.type === "text")) {
            ui.push({ kind: "assistant", blocks });
          }
        }
      }
      historyRef.current = raw;
      setUiMessages(ui);
    } catch (err) {
      toast.error(`Could not load conversation: ${(err as Error).message}`);
      startNewChat();
    }
  }, [startNewChat]);

  // ── Send
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    if (!user) {
      toast.error("Sign in to use the AI helper.");
      return;
    }

    setInput("");
    setUiMessages((m) => [...m, { kind: "user", text }]);
    setBusy(true);
    abortRef.current = { aborted: false };

    historyRef.current.push({ role: "user", content: text });

    try {
      const result = await runAgenticLoop(
        historyRef.current,
        graphRef,
        (patch) => {
          graphRef.current = patch;
          onGraphReplace(patch);
        },
        setUiMessages,
        onHighlightNode,
        {
          strategyId,
          nodeTypes,
          conversationId,
          abortRef: abortRef.current,
        },
      );
      if (result?.conversationId) {
        setConversationId(result.conversationId);
        if (result.conversationTitle) setConversationTitle(result.conversationTitle);
      }
      void refreshConversations();
    } catch (err) {
      setUiMessages((m) => [...m, { kind: "error", text: (err as Error).message }]);
    } finally {
      setBusy(false);
    }
  }, [
    input, busy, user, onGraphReplace, onHighlightNode,
    strategyId, nodeTypes, conversationId, refreshConversations,
  ]);

  const stop = useCallback(() => {
    abortRef.current.aborted = true;
    setBusy(false);
    setUiMessages((m) => [...m, { kind: "error", text: "Stopped by you." }]);
  }, []);

  // ── Conversation actions (sidebar)
  const onPinConversation = useCallback(async (id: string, pinned: boolean) => {
    await togglePinConversation(id, pinned);
    void refreshConversations();
  }, [refreshConversations]);

  const onDeleteConversation = useCallback(async (id: string) => {
    const ok = await confirm({
      title: "Delete this conversation?",
      body: "All messages in this chat are removed. This cannot be undone.",
      destructive: true,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    await deleteConversation(id);
    if (conversationId === id) startNewChat();
    void refreshConversations();
  }, [conversationId, refreshConversations, startNewChat, confirm]);

  const onRenameConversation = useCallback(async (id: string, title: string) => {
    await renameConversation(id, title);
    if (conversationId === id) setConversationTitle(title);
    void refreshConversations();
  }, [conversationId, refreshConversations]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 h-12 px-4 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-transform"
        aria-label="Open Zentryx AI helper"
      >
        <Sparkles size={16} />
        <span className="text-sm font-700">Ask AI</span>
        <kbd className="ml-1 hidden md:inline-block text-[9px] font-700 text-emerald-100 border border-emerald-300/40 rounded px-1">⌘K</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="ai-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed top-0 right-0 h-screen w-full sm:w-[440px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <header className="flex items-center justify-between px-4 h-14 border-b border-gray-100 bg-gradient-to-r from-emerald-500/5 via-white to-white shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {view === "history" ? (
                  <button
                    onClick={() => setView("chat")}
                    className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center"
                    aria-label="Back to chat"
                  >
                    <ChevronLeft size={16} />
                  </button>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center shadow shrink-0">
                    <Sparkles size={15} />
                  </div>
                )}
                <div className="leading-tight min-w-0">
                  <div className="text-sm font-700 text-gray-900 truncate">
                    {view === "history" ? "All conversations" : conversationTitle}
                  </div>
                  <div className="text-[10px] text-gray-400 truncate">
                    {view === "history"
                      ? `${conversations.length} chat${conversations.length === 1 ? "" : "s"}`
                      : "Strategy assistant"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                {view === "chat" && (
                  <>
                    <button
                      onClick={() => setView("history")}
                      className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center"
                      title="Conversation history"
                    >
                      <History size={15} />
                    </button>
                    <button
                      onClick={startNewChat}
                      className="w-8 h-8 rounded-lg hover:bg-emerald-50 text-emerald-600 flex items-center justify-center"
                      title="New chat"
                    >
                      <Plus size={15} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center"
                >
                  <X size={15} />
                </button>
              </div>
            </header>

            {/* Body */}
            {view === "history" ? (
              <ConversationsList
                conversations={conversations}
                loading={convoLoading}
                activeId={conversationId}
                onOpen={openConversation}
                onPin={onPinConversation}
                onDelete={onDeleteConversation}
                onRename={onRenameConversation}
                onNewChat={startNewChat}
              />
            ) : (
              <>
                <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {uiMessages.length === 0 && !busy ? <Welcome onPick={setInput} /> : null}
                  {uiMessages.map((m, i) => (
                    <MessageBubble key={i} m={m} />
                  ))}
                  {busy && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Loader2 size={12} className="animate-spin" /> Thinking…
                    </div>
                  )}
                </div>

                {/* Composer */}
                <footer className="border-t border-gray-100 p-3 bg-white shrink-0">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void send();
                    }}
                    className="flex items-end gap-2"
                  >
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void send();
                        }
                      }}
                      placeholder="Add an RSI filter, fix the errors, change to H1…"
                      rows={2}
                      className="flex-1 resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/15"
                    />
                    {busy ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={stop}
                        title="Stop the AI"
                      >
                        <Square size={13} />
                      </Button>
                    ) : (
                      <Button type="submit" size="sm" disabled={!input.trim()}>
                        <Send size={13} />
                      </Button>
                    )}
                  </form>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
                    <span>Powered by Zentryx AI</span>
                    <span>Enter to send · Shift+Enter for newline</span>
                  </div>
                </footer>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────
// Conversations list view (history)
// ──────────────────────────────────────────────────────────────────
function ConversationsList({
  conversations,
  loading,
  activeId,
  onOpen,
  onPin,
  onDelete,
  onRename,
  onNewChat,
}: {
  conversations: AiConversationSummary[];
  loading: boolean;
  activeId: string | null;
  onOpen: (c: AiConversationSummary) => void;
  onPin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onNewChat: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function startEdit(c: AiConversationSummary) {
    setEditingId(c.id);
    setEditValue(c.title);
  }
  async function commitEdit(id: string) {
    if (editValue.trim()) await onRename(id, editValue.trim());
    setEditingId(null);
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <button
        onClick={onNewChat}
        className="w-full flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 text-emerald-700 px-3 py-2.5 text-sm font-700 mb-3 transition-colors"
      >
        <Plus size={14} /> New chat
      </button>

      {loading ? (
        <div className="text-xs text-gray-400 text-center py-8">Loading…</div>
      ) : conversations.length === 0 ? (
        <div className="text-xs text-gray-400 text-center py-12">
          No conversations yet. Start one!
        </div>
      ) : (
        <ul className="space-y-1">
          {conversations.map((c) => {
            const active = c.id === activeId;
            const editing = c.id === editingId;
            return (
              <li key={c.id}>
                <div
                  className={cn(
                    "group flex items-start gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors",
                    active ? "bg-emerald-50 ring-1 ring-emerald-200" : "hover:bg-gray-100",
                  )}
                  onClick={() => !editing && onOpen(c)}
                >
                  <div className="flex-1 min-w-0">
                    {editing ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void commitEdit(c.id);
                        }}
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => void commitEdit(c.id)}
                          className="flex-1 text-xs rounded border border-emerald-300 px-2 py-1 focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="text-emerald-600 hover:bg-emerald-100 rounded p-1"
                        >
                          <Check size={12} />
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {c.pinned && <Pin size={9} className="text-emerald-600 shrink-0" />}
                        <span className="text-[12px] font-600 text-gray-900 truncate">{c.title}</span>
                      </div>
                    )}
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {formatRelative(c.lastMessageAt)} · {c.messageCount} msg
                    </div>
                  </div>
                  {!editing && (
                    <div
                      className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onPin(c.id, !c.pinned)}
                        className="p-1 hover:bg-gray-200 rounded"
                        title={c.pinned ? "Unpin" : "Pin"}
                      >
                        <Pin
                          size={11}
                          className={c.pinned ? "fill-emerald-500 text-emerald-500" : "text-gray-400"}
                        />
                      </button>
                      <button
                        onClick={() => startEdit(c)}
                        className="p-1 hover:bg-gray-200 rounded text-gray-400"
                        title="Rename"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => onDelete(c.id)}
                        className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Welcome({ onPick }: { onPick: (q: string) => void }) {
  const suggestions = [
    "Build a simple EMA-cross strategy on EURUSD with 1% risk",
    "Add an RSI filter to avoid overbought entries",
    "What's wrong with my current strategy?",
    "Switch this to H1 timeframe and explain why",
  ];
  return (
    <div>
      <div className="rounded-xl bg-gradient-to-br from-emerald-50 via-emerald-50/40 to-white border border-emerald-100 p-4">
        <div className="flex items-center gap-2 text-xs font-700 text-emerald-700">
          <Zap size={12} /> Your strategy assistant
        </div>
        <p className="mt-1.5 text-[12px] text-emerald-900/80 leading-relaxed">
          Describe what you want and I&apos;ll build it on your canvas — adding
          nodes, wiring connections, and tuning parameters as you watch.
        </p>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="text-[10px] font-700 uppercase tracking-widest text-gray-400 px-1">
          Try
        </div>
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="w-full text-left text-xs rounded-lg border border-gray-200 px-3 py-2 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ m }: { m: UiMessage }) {
  if (m.kind === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-emerald-500 text-white px-3.5 py-2 text-sm leading-snug whitespace-pre-wrap">
          {m.text}
        </div>
      </div>
    );
  }
  if (m.kind === "assistant") {
    const text = extractLastAssistantText(m.blocks);
    if (!text) return null;
    return (
      <div className="flex justify-start">
        <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-gray-100 text-gray-900 px-3.5 py-2 text-sm leading-snug zx-md">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="my-1 first:mt-0 last:mb-0">{children}</p>,
              h1: ({ children }) => <h3 className="mt-3 mb-1 text-[13px] font-700">{children}</h3>,
              h2: ({ children }) => <h3 className="mt-3 mb-1 text-[13px] font-700">{children}</h3>,
              h3: ({ children }) => <h4 className="mt-2.5 mb-1 text-[12px] font-700">{children}</h4>,
              h4: ({ children }) => <h4 className="mt-2 mb-0.5 text-[12px] font-700">{children}</h4>,
              ul: ({ children }) => <ul className="my-1 ml-4 list-disc space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="my-1 ml-4 list-decimal space-y-0.5">{children}</ol>,
              li: ({ children }) => <li className="leading-snug">{children}</li>,
              code: ({ children, className }) => {
                const isBlock = className?.includes("language-");
                if (isBlock) {
                  return (
                    <pre className="my-2 overflow-x-auto rounded-lg bg-gray-900 text-gray-100 text-[11px] p-2.5">
                      <code>{children}</code>
                    </pre>
                  );
                }
                return (
                  <code className="rounded bg-gray-200/70 px-1 py-0.5 text-[11.5px] font-mono">
                    {children}
                  </code>
                );
              },
              strong: ({ children }) => <strong className="font-700 text-gray-900">{children}</strong>,
              em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noreferrer" className="text-emerald-700 underline">
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="my-2 border-l-2 border-emerald-200 pl-2 text-gray-600">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="my-2 overflow-x-auto">
                  <table className="text-[11px] border-collapse">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-gray-200/60">{children}</thead>,
              th: ({ children }) => <th className="border border-gray-300 px-2 py-1 text-left font-600">{children}</th>,
              td: ({ children }) => <td className="border border-gray-200 px-2 py-1 align-top">{children}</td>,
              hr: () => <hr className="my-2 border-gray-200" />,
            }}
          >
            {text}
          </ReactMarkdown>
        </div>
      </div>
    );
  }
  if (m.kind === "tool") {
    const icon = m.status === "running"
      ? <Loader2 size={11} className="animate-spin text-sky-500" />
      : m.status === "ok"
        ? <CheckCircle2 size={11} className="text-emerald-500" />
        : <AlertCircle size={11} className="text-red-500" />;
    return (
      <div className="flex items-start gap-2 text-[11px] text-gray-500">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <span>
          <span className="inline-flex items-center gap-1 font-600 text-gray-600">
            <Wrench size={10} /> {m.label}
          </span>
          {m.detail && <span className="text-gray-400"> — {m.detail}</span>}
        </span>
      </div>
    );
  }
  if (m.kind === "done") {
    return <DoneCard summary={m.summary} />;
  }
  if (m.kind === "error") {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50/60 px-3 py-2 text-xs text-red-700">
        <div className="flex items-center gap-1.5 font-700">
          <AlertCircle size={12} /> {m.text}
        </div>
        {m.upgradeTo && (
          <a
            href="/billing"
            className="mt-1.5 inline-flex items-center gap-1 text-emerald-700 font-600 underline"
          >
            Upgrade to {m.upgradeTo}
          </a>
        )}
      </div>
    );
  }
  return null;
}

// ──────────────────────────────────────────────────────────────────
// Done card — rich recap rendered when the AI calls done()
// ──────────────────────────────────────────────────────────────────
function DoneCard({ summary }: { summary: DoneSummary }) {
  return (
    <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 to-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
      {/* Headline */}
      <div className="px-4 py-3 border-b border-emerald-100 bg-emerald-50/40 flex items-start gap-2.5">
        <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white shrink-0">
          <CheckCircle2 size={12} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-700 uppercase tracking-widest text-emerald-700">
            All done
          </div>
          <div className="mt-0.5 text-sm font-700 text-gray-900 leading-snug">
            {summary.summary}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3.5">
        {summary.whatChanged.length > 0 && (
          <DoneSection
            icon={<ListChecks size={12} />}
            title="What changed"
            tone="emerald"
          >
            <ul className="space-y-1">
              {summary.whatChanged.map((c, i) => (
                <li key={i} className="flex gap-1.5 text-[12.5px] text-gray-700 leading-snug">
                  <span className="text-emerald-500 shrink-0">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </DoneSection>
        )}

        {summary.strategyShape && (
          <DoneSection
            icon={<Compass size={12} />}
            title="How it trades"
            tone="slate"
          >
            <p className="text-[12.5px] text-gray-700 leading-relaxed">
              {summary.strategyShape}
            </p>
          </DoneSection>
        )}

        {summary.nextSteps.length > 0 && (
          <DoneSection
            icon={<Lightbulb size={12} />}
            title="Next steps"
            tone="sky"
          >
            <ul className="space-y-1">
              {summary.nextSteps.map((s, i) => (
                <li key={i} className="flex gap-1.5 text-[12.5px] text-gray-700 leading-snug">
                  <span className="text-sky-500 shrink-0">→</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </DoneSection>
        )}

        {summary.warnings && summary.warnings.length > 0 && (
          <DoneSection
            icon={<AlertTriangle size={12} />}
            title="Watch out"
            tone="amber"
          >
            <ul className="space-y-1">
              {summary.warnings.map((w, i) => (
                <li key={i} className="flex gap-1.5 text-[12.5px] text-amber-800 leading-snug">
                  <span className="text-amber-500 shrink-0">!</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </DoneSection>
        )}
      </div>
    </div>
  );
}

function DoneSection({
  icon,
  title,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone: "emerald" | "slate" | "sky" | "amber";
  children: React.ReactNode;
}) {
  const toneMap = {
    emerald: "bg-emerald-50 text-emerald-700",
    slate:   "bg-slate-100 text-slate-700",
    sky:     "bg-sky-50 text-sky-700",
    amber:   "bg-amber-50 text-amber-700",
  }[tone];
  return (
    <div>
      <div className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-700 uppercase tracking-wider", toneMap)}>
        {icon}
        {title}
      </div>
      <div className="mt-1.5 pl-0.5">{children}</div>
    </div>
  );
}

/**
 * Re-materialise a DoneSummary from a persisted tool_use.input blob.
 * We validate defensively because older conversations stored only
 * `{ summary: string }` — in that case we still render the headline.
 */
function parseDoneInput(input: unknown): DoneSummary | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  const summary = typeof record.summary === "string" && record.summary.trim()
    ? record.summary.trim()
    : null;
  if (!summary) return null;
  const whatChanged = normaliseStringArray(record.whatChanged);
  const nextSteps = normaliseStringArray(record.nextSteps);
  const warnings = normaliseStringArray(record.warnings);
  const strategyShape = typeof record.strategyShape === "string" && record.strategyShape.trim()
    ? record.strategyShape.trim()
    : undefined;
  return {
    summary,
    whatChanged,
    strategyShape,
    nextSteps,
    warnings: warnings.length ? warnings : undefined,
  };
}

function normaliseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const v of value) {
    if (typeof v !== "string") continue;
    const t = v.trim();
    if (t) out.push(t);
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────
// Agentic loop — supports conversation_id passthrough + abort
// ──────────────────────────────────────────────────────────────────
async function runAgenticLoop(
  history: AiMessage[],
  graphRef: { current: StrategyGraph },
  replace: (g: StrategyGraph) => void,
  setUi: React.Dispatch<React.SetStateAction<UiMessage[]>>,
  onHighlight: ((nodeId: string) => void) | undefined,
  opts: {
    strategyId: string | null;
    nodeTypes: string[];
    conversationId: string | null;
    abortRef: { aborted: boolean };
  },
): Promise<{ conversationId: string; conversationTitle?: string } | null> {
  const supabase = getSupabase();
  const sess = await supabase.auth.getSession();
  const accessToken = sess.data.session?.access_token;
  if (!accessToken) throw new Error("Not signed in.");

  const MAX_STEPS = 40;
  let activeConvoId = opts.conversationId;
  let firstTitle: string | undefined;

  for (let step = 0; step < MAX_STEPS; step++) {
    if (opts.abortRef.aborted) return activeConvoId ? { conversationId: activeConvoId, conversationTitle: firstTitle } : null;

    let data: AiChatResponse | null = null;
    let lastErr: string | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch("/.netlify/functions/ai-chat", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            messages: history,
            graph: graphRef.current,
            nodeTypes: opts.nodeTypes,
            strategyId: opts.strategyId,
            conversationId: activeConvoId,
          }),
        });
        const ct = res.headers.get("content-type") ?? "";
        const raw = await res.text();
        if (!ct.includes("application/json")) {
          throw new Error(
            res.status === 504 || res.status === 408
              ? "AI request timed out (Netlify limit). Try a smaller request, or split into steps."
              : `Server returned a non-JSON response (status ${res.status}). It usually means the function timed out.`,
          );
        }
        data = JSON.parse(raw) as AiChatResponse;
        break;
      } catch (err) {
        lastErr = (err as Error).message;
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }
      }
    }

    if (!data) {
      setUi((m) => [...m, { kind: "error", text: lastErr ?? "AI request failed. Try again." }]);
      return activeConvoId ? { conversationId: activeConvoId, conversationTitle: firstTitle } : null;
    }
    if (!data.ok) {
      setUi((m) => [
        ...m,
        {
          kind: "error",
          text: data!.message,
          upgradeTo: (data as { upgradeTo?: "pro" | "creator" }).upgradeTo,
        },
      ]);
      return activeConvoId ? { conversationId: activeConvoId, conversationTitle: firstTitle } : null;
    }

    if (!activeConvoId && data.conversationId) {
      activeConvoId = data.conversationId;
      firstTitle = data.conversationTitle;
    }

    const assistant = data.assistant;
    history.push({ role: "assistant", content: assistant });

    if (assistant.some((b) => b.type === "text")) {
      setUi((m) => [...m, { kind: "assistant", blocks: assistant }]);
    }

    const toolUses = assistant.filter((b): b is AiToolUseBlock => b.type === "tool_use");
    if (toolUses.length === 0) {
      return { conversationId: activeConvoId!, conversationTitle: firstTitle };
    }

    const toolResults: AiMessage["content"] = [];
    let finished = false;
    for (const use of toolUses) {
      if (opts.abortRef.aborted) break;
      // `done` is rendered as a rich recap card, not a tool pill.
      const isDone = use.name === "done";
      if (!isDone) {
        setUi((m) => [...m, { kind: "tool", label: use.name, status: "running" }]);
        await new Promise((r) => setTimeout(r, 120));
      }

      const outcome = executeTool(use, graphRef.current);
      graphRef.current = outcome.graph;
      replace(outcome.graph);
      if (outcome.highlightNodeId) onHighlight?.(outcome.highlightNodeId);

      if (isDone) {
        if (outcome.doneSummary) {
          setUi((m) => [...m, { kind: "done", summary: outcome.doneSummary! }]);
        }
      } else {
        setUi((m) => {
          const next = [...m];
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].kind === "tool" && (next[i] as { status: string }).status === "running") {
              next[i] = {
                kind: "tool",
                label: use.name,
                status: outcome.isError ? "error" : "ok",
                detail: outcome.result.slice(0, 140),
              };
              break;
            }
          }
          return next;
        });
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: use.id,
        content: outcome.result,
        is_error: outcome.isError,
      } as never);

      if (outcome.finished) finished = true;
    }

    history.push({ role: "user", content: toolResults as never });
    if (finished) return { conversationId: activeConvoId!, conversationTitle: firstTitle };
  }

  setUi((m) => [
    ...m,
    { kind: "error", text: "AI hit the step limit. Ask again with a smaller request." },
  ]);
  return activeConvoId ? { conversationId: activeConvoId, conversationTitle: firstTitle } : null;
}
