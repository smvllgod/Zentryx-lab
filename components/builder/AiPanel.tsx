"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/context";
import { getSupabase } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";
import { NODE_DEFINITIONS } from "@/lib/strategies/nodes";
import { executeTool, extractLastAssistantText } from "@/lib/ai/tools";
import type {
  AiChatResponse,
  AiContentBlock,
  AiMessage,
  AiToolUseBlock,
} from "@/lib/ai/types";
import type { StrategyGraph } from "@/lib/strategies/types";
import { cn } from "@/lib/utils/cn";

// ──────────────────────────────────────────────────────────────────
// Zentryx AI panel — slide-out chat that can mutate the builder graph.
// Available to all tiers (with quotas: free 3 / pro 5 / creator 30/day).
// ──────────────────────────────────────────────────────────────────

interface AiPanelProps {
  graph: StrategyGraph;
  /** Replace the whole graph — callback into useGraphHistory.set. */
  onGraphReplace: (g: StrategyGraph) => void;
  strategyId: string | null;
  /** Asked to highlight a node after a tool call — for the builder to center on. */
  onHighlightNode?: (nodeId: string) => void;
}

type UiMessage =
  | { kind: "user"; text: string }
  | { kind: "assistant"; blocks: AiContentBlock[] }
  | { kind: "tool"; label: string; status: "running" | "ok" | "error"; detail?: string }
  | { kind: "error"; text: string; upgradeTo?: "pro" | "creator" };

export function AiPanel({ graph, onGraphReplace, strategyId, onHighlightNode }: AiPanelProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [uiMessages, setUiMessages] = useState<UiMessage[]>([]);
  // Raw Anthropic-format history — what we send to the API.
  const historyRef = useRef<AiMessage[]>([]);
  // Keep the latest graph in a ref so we can mutate it synchronously during
  // a tool-use loop without waiting for React's async state commits.
  const graphRef = useRef(graph);
  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [uiMessages, busy]);

  const nodeTypes = NODE_DEFINITIONS.map((d) => d.type);

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

    // Append to raw history
    historyRef.current.push({ role: "user", content: text });

    try {
      await runAgenticLoop(
        historyRef.current,
        graphRef,
        (patch) => {
          graphRef.current = patch;
          onGraphReplace(patch);
        },
        setUiMessages,
        onHighlightNode,
        { strategyId, nodeTypes },
      );
    } catch (err) {
      setUiMessages((m) => [...m, { kind: "error", text: (err as Error).message }]);
    } finally {
      setBusy(false);
    }
  }, [input, busy, user, onGraphReplace, onHighlightNode, strategyId, nodeTypes]);

  // ── Floating trigger (always rendered; panel overlays on top when open)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 h-12 px-4 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-transform"
        aria-label="Open Zentryx AI helper"
      >
        <Sparkles size={16} />
        <span className="text-sm font-700">Ask AI</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="ai-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed top-0 right-0 h-screen w-full sm:w-[420px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col"
          >
            <header className="flex items-center justify-between px-4 h-14 border-b border-gray-100 bg-gradient-to-r from-emerald-500/5 via-white to-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center shadow">
                  <Sparkles size={15} />
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-700 text-gray-900">Zentryx AI</div>
                  <div className="text-[10px] text-gray-400">Builds, debugs, explains</div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </header>

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

            <footer className="border-t border-gray-100 p-3 bg-white">
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
                <Button type="submit" size="sm" disabled={busy || !input.trim()}>
                  <Send size={13} />
                </Button>
              </form>
              <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
                <span>Claude Sonnet 4.6 · Zentryx-tuned</span>
                <span>Enter to send · Shift+Enter = newline</span>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
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
          <Zap size={12} /> What can I do?
        </div>
        <p className="mt-1.5 text-[12px] text-emerald-900/80 leading-relaxed">
          I can read your graph, add or reconfigure nodes, fix validation
          errors, and explain the MQL5 output. Every change I make shows up
          live on your canvas.
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
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-emerald-500 text-white px-3.5 py-2 text-sm leading-snug">
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
            // Override the default block elements with chat-friendly styling.
            // No `prose` class because we don't ship the typography plugin.
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
// Agentic loop: send → assistant returns tool_use blocks → apply
// them locally → send tool_result back → repeat until "done" or no
// more tool calls. Each step shows up live in the chat and canvas.
// ──────────────────────────────────────────────────────────────────
async function runAgenticLoop(
  history: AiMessage[],
  graphRef: { current: StrategyGraph },
  replace: (g: StrategyGraph) => void,
  setUi: React.Dispatch<React.SetStateAction<UiMessage[]>>,
  onHighlight: ((nodeId: string) => void) | undefined,
  opts: { strategyId: string | null; nodeTypes: string[] },
) {
  const supabase = getSupabase();
  const sess = await supabase.auth.getSession();
  const accessToken = sess.data.session?.access_token;
  if (!accessToken) throw new Error("Not signed in.");

  // Safety rail — prevent infinite loops if the model misbehaves.
  // 40 lets the AI plan a multi-node strategy + fix validation + reconnect
  // edges in a single turn; complex grids hit ~25 round-trips.
  const MAX_STEPS = 40;
  for (let step = 0; step < MAX_STEPS; step++) {
    let data: AiChatResponse | null = null;
    let lastErr: string | null = null;

    // Retry once on transient failures (Netlify cold start, dropped TCP,
    // HTML error page from a function timeout, etc.). Two attempts is
    // enough — anything more is a real outage and the user should retry.
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
          }),
        });
        const ct = res.headers.get("content-type") ?? "";
        const raw = await res.text();
        if (!ct.includes("application/json")) {
          // Function crashed / timed out → Netlify served an HTML error page.
          // Parsing that as JSON would throw the cryptic "Unexpected token '<'"
          // message the user saw. Surface a clean error instead.
          throw new Error(
            res.status === 504 || res.status === 408
              ? "AI request timed out (Netlify limit). Try a smaller/simpler request, or split it into steps."
              : `Server returned a non-JSON response (status ${res.status}). It usually means the function timed out.`,
          );
        }
        data = JSON.parse(raw) as AiChatResponse;
        break;
      } catch (err) {
        lastErr = (err as Error).message;
        if (attempt === 0) {
          // Brief backoff then retry once
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }
      }
    }

    if (!data) {
      setUi((m) => [
        ...m,
        {
          kind: "error",
          text: lastErr ?? "AI request failed. Try again.",
        },
      ]);
      return;
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
      return;
    }

    const assistant = data.assistant;
    history.push({ role: "assistant", content: assistant });

    // Render the assistant's text portion if any
    if (assistant.some((b) => b.type === "text")) {
      setUi((m) => [...m, { kind: "assistant", blocks: assistant }]);
    }

    const toolUses = assistant.filter(
      (b): b is AiToolUseBlock => b.type === "tool_use",
    );
    if (toolUses.length === 0) return; // nothing to execute

    // Apply each tool call and collect tool_result blocks for the next turn
    const toolResults: AiMessage["content"] = [];
    let doneMsg: string | null = null;
    for (const use of toolUses) {
      setUi((m) => [...m, { kind: "tool", label: use.name, status: "running" }]);
      await new Promise((r) => setTimeout(r, 120)); // small visible delay

      const outcome = executeTool(use, graphRef.current);
      graphRef.current = outcome.graph;
      replace(outcome.graph);
      if (outcome.highlightNodeId) onHighlight?.(outcome.highlightNodeId);

      setUi((m) => {
        // Mutate the last tool bubble to its final status
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

      toolResults.push({
        type: "tool_result",
        tool_use_id: use.id,
        content: outcome.result,
        is_error: outcome.isError,
      } as never);

      if (outcome.finished && outcome.doneMessage) {
        doneMsg = outcome.doneMessage;
      }
    }

    // Feed tool results back to the model
    history.push({ role: "user", content: toolResults as never });

    if (doneMsg) {
      // Stop: AI signalled completion
      return;
    }
  }

  setUi((m) => [
    ...m,
    { kind: "error", text: "AI hit the step limit. Ask again with a smaller request." },
  ]);
}
