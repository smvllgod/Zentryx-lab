"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Book,
  Code2,
  Download,
  ListTree,
  Search,
  Sparkles,
  Workflow,
  Cog,
  LogIn,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Circle,
  Hexagon,
} from "lucide-react";
import {
  NODE_DEFINITIONS,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  type NodeDefinition,
} from "@/lib/strategies/nodes";
import type { NodeCategory } from "@/lib/strategies/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type Section =
  | "intro"
  | "getting-started"
  | "builder"
  | "ai-helper"
  | "nodes"
  | "mql5-export"
  | "strategy-tester"
  | "plans"
  | "faq";

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "intro", label: "Introduction", icon: <Book size={14} /> },
  { id: "getting-started", label: "Getting started", icon: <Sparkles size={14} /> },
  { id: "builder", label: "Strategy builder", icon: <Workflow size={14} /> },
  { id: "ai-helper", label: "Zentryx AI", icon: <Zap size={14} /> },
  { id: "nodes", label: "Node reference", icon: <ListTree size={14} /> },
  { id: "mql5-export", label: "MQL5 export", icon: <Code2 size={14} /> },
  { id: "strategy-tester", label: "Strategy Tester", icon: <Download size={14} /> },
  { id: "plans", label: "Plans & limits", icon: <ShieldCheck size={14} /> },
  { id: "faq", label: "FAQ", icon: <Book size={14} /> },
];

const VISIBLE_CATEGORIES: NodeCategory[] = [
  "entry", "filter", "risk", "exit", "grid", "news", "utility",
];

export default function DocsPage() {
  const [active, setActive] = useState<Section>("intro");
  const [query, setQuery] = useState("");

  const filteredNodes = useMemo(() => {
    if (!query) return NODE_DEFINITIONS;
    const q = query.toLowerCase();
    return NODE_DEFINITIONS.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        n.summary.toLowerCase().includes(q),
    );
  }, [query]);

  const nodeStats = useMemo(() => {
    const total = NODE_DEFINITIONS.length;
    const premium = NODE_DEFINITIONS.filter((n) => n.premium).length;
    const preview = NODE_DEFINITIONS.filter((n) => n.stub).length;
    return { total, premium, preview, live: total - preview };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Top nav */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shadow shadow-emerald-500/30">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z" fill="white" fillOpacity="0.9" />
                <path d="M8 5L11 6.5V9.5L8 11L5 9.5V6.5L8 5Z" fill="white" />
              </svg>
            </div>
            <div className="leading-none">
              <div className="text-[9px] font-500 text-gray-400 tracking-widest uppercase">Zentryx</div>
              <div className="text-sm font-700 text-gray-900 -mt-0.5">Lab</div>
            </div>
          </a>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-600 text-gray-600">Documentation</span>
          <div className="flex-1" />
          <Button asChild variant="ghost" size="sm">
            <a href="/"><ArrowLeft size={14} /> Back to site</a>
          </Button>
          <Button asChild size="sm">
            <a href="/sign-in">Open app</a>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-gray-100 bg-gradient-to-br from-emerald-50/60 via-white to-white">
        <div className="ambient-orb pointer-events-none absolute -top-32 -left-32 h-80 w-80" />
        <div className="ambient-orb pointer-events-none absolute -bottom-32 right-0 h-80 w-80" />
        <div className="max-w-7xl mx-auto px-6 py-14 md:py-20 relative">
          <Badge tone="emerald" className="mb-4">Documentation</Badge>
          <h1 className="text-3xl md:text-5xl font-800 tracking-tight text-gray-900 max-w-3xl">
            Build MT5 Expert Advisors visually.
            <span className="block text-gradient-em">Ship clean MQL5.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm md:text-base text-gray-600 leading-relaxed">
            Zentryx Lab turns a drag-and-drop graph into production-grade MQL5
            source — ready for MetaEditor, compile-and-test in MetaTrader 5.
            This reference explains every node, every compiler stage, and every
            plan limit.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Button onClick={() => setActive("getting-started")} variant="primary">
              <Sparkles size={14} /> Get started
            </Button>
            <Button onClick={() => setActive("nodes")} variant="secondary">
              <ListTree size={14} /> Node reference
            </Button>
            <Button asChild variant="ghost">
              <a href="/sign-up">
                <LogIn size={14} /> Create account
              </a>
            </Button>
          </div>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-5">
            <Stat label="Nodes" value={String(nodeStats.total)} hint={`${nodeStats.live} live · ${nodeStats.preview} preview`} />
            <Stat label="Platforms" value="MT5" hint="MQL5 only — MT4 on roadmap" />
            <Stat label="Plans" value="3" hint="Free, Pro, Creator" />
            <Stat label="Price" value="$0" hint="Free tier includes exports" />
          </div>
        </div>
      </section>

      {/* Content grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[240px_1fr] gap-10 px-6 py-12">
        {/* Sidebar */}
        <nav className="md:sticky md:top-20 md:self-start">
          <div className="text-[10px] font-700 uppercase tracking-widest text-gray-400 mb-2 px-3">
            Contents
          </div>
          <ul className="space-y-0.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setActive(s.id)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors text-left",
                    active === s.id
                      ? "bg-emerald-50 text-emerald-700 font-600"
                      : "text-gray-600 hover:bg-gray-100",
                  )}
                >
                  <span className={active === s.id ? "text-emerald-600" : "text-gray-400"}>
                    {s.icon}
                  </span>
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-8 px-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
              <div className="flex items-center gap-2 text-xs font-700 text-emerald-700 mb-1">
                <Sparkles size={13} /> Tip
              </div>
              <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                The fastest way to learn Zentryx Lab is to open{" "}
                <a href="/builder" className="underline font-600">the builder</a>,
                drop an EMA Cross + RSI + Risk + TP/SL, and hit Export.
              </p>
            </div>
          </div>
        </nav>

        {/* Article */}
        <article>
          {active === "intro" && <Intro setActive={setActive} />}
          {active === "getting-started" && <GettingStarted />}
          {active === "builder" && <BuilderDocs />}
          {active === "ai-helper" && <AiHelperDocs />}
          {active === "nodes" && (
            <NodeReference nodes={filteredNodes} query={query} onQueryChange={setQuery} totalCount={NODE_DEFINITIONS.length} />
          )}
          {active === "mql5-export" && <Mql5Export />}
          {active === "strategy-tester" && <StrategyTester />}
          {active === "plans" && <PlansSection />}
          {active === "faq" && <Faq />}

          {/* Footer nav */}
          <SectionFooter active={active} setActive={setActive} />
        </article>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-[10px] font-700 uppercase tracking-widest text-gray-400">{label}</div>
      <div className="mt-1 text-2xl font-800 text-gray-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}

function SectionFooter({
  active,
  setActive,
}: {
  active: Section;
  setActive: (s: Section) => void;
}) {
  const idx = SECTIONS.findIndex((s) => s.id === active);
  const prev = idx > 0 ? SECTIONS[idx - 1] : null;
  const next = idx < SECTIONS.length - 1 ? SECTIONS[idx + 1] : null;
  return (
    <div className="mt-14 pt-8 border-t border-gray-100 flex items-center justify-between">
      {prev ? (
        <button
          onClick={() => setActive(prev.id)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-700"
        >
          <ArrowLeft size={14} />
          <span>
            <div className="text-[10px] uppercase tracking-wider text-gray-400">Previous</div>
            <div className="font-600">{prev.label}</div>
          </span>
        </button>
      ) : (
        <span />
      )}
      {next && (
        <button
          onClick={() => setActive(next.id)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-700 text-right"
        >
          <span>
            <div className="text-[10px] uppercase tracking-wider text-gray-400">Next</div>
            <div className="font-600">{next.label}</div>
          </span>
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

// ── Intro ─────────────────────────────────────────────────────────
function Intro({ setActive }: { setActive: (s: Section) => void }) {
  return (
    <>
      <PageTitle eyebrow="Overview" title="What Zentryx Lab is (and is not)" />
      <p className="mt-3 text-gray-600 text-base leading-relaxed max-w-2xl">
        Zentryx Lab is a visual, node-based builder for MetaTrader 5 Expert
        Advisors. You assemble a strategy on a canvas, Zentryx compiles it into
        real MQL5 source you can read, download, and run in MetaEditor — no
        code required, no vendor lock-in.
      </p>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureCard
          icon={<Workflow size={18} />}
          title="Visual builder"
          body="Drag nodes, drop them on the canvas, and connect. The graph is validated live and the human-readable summary updates as you wire it."
          tone="emerald"
        />
        <FeatureCard
          icon={<Code2 size={18} />}
          title="Real MQL5 generator"
          body="Every node has a typed translator that contributes inputs, indicator handles, gates, lot sizing, and exit logic. Output is deterministic."
          tone="sky"
        />
        <FeatureCard
          icon={<Download size={18} />}
          title=".mq5 download"
          body="Export to a single self-contained .mq5 file. Compile it in MetaEditor with F7 and test it with Strategy Tester."
          tone="amber"
        />
      </div>

      <h2 className="mt-14 text-xl font-800 text-gray-900">What this is not</h2>
      <p className="mt-2 text-gray-600 max-w-2xl">
        We intentionally limit scope so the tool stays sharp.
      </p>
      <ul className="mt-4 space-y-2 max-w-2xl">
        <Con text="We do not run backtests on-platform. MT5 Strategy Tester is the authoritative runner for historical simulation." />
        <Con text="No MT4 / MQL4 support. MQL5 only for now. Adding MT4 would double our translator surface for a shrinking ecosystem." />
        <Con text="No server-side compilation. .ex5 is produced by MetaEditor on your machine. That keeps your strategy's final binary yours." />
      </ul>

      <h2 className="mt-14 text-xl font-800 text-gray-900">Strategy anatomy</h2>
      <p className="mt-2 text-gray-600 max-w-2xl">
        Every strategy you build is a <strong>directed graph</strong> flowing
        through these phases:
      </p>
      <div className="mt-5 rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {[
            { label: "Entry", cat: "entry" as const, desc: "When to consider a trade" },
            { label: "Filter", cat: "filter" as const, desc: "Block noise / news / spread" },
            { label: "Risk", cat: "risk" as const, desc: "Size the position" },
            { label: "Exit", cat: "exit" as const, desc: "TP / SL / trailing" },
            { label: "Utility", cat: "utility" as const, desc: "Guards & limits" },
          ].map((p, i, arr) => (
            <div key={p.cat} className="flex items-center gap-2">
              <PhaseChip label={p.label} desc={p.desc} color={CATEGORY_COLORS[p.cat]} />
              {i < arr.length - 1 && <ArrowRight size={14} className="text-gray-300" />}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-500">
          Zentryx enforces this ordering: you can&apos;t connect an Entry
          directly to an Exit — you must flow through Risk first.
        </p>
      </div>

      <CTA onClick={() => setActive("getting-started")} title="Ready to build your first EA?" sub="Walk through Getting Started in 5 minutes." />
    </>
  );
}

function Con({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-gray-600">
      <Circle size={8} className="text-gray-400 mt-1.5 shrink-0 fill-current" />
      <span>{text}</span>
    </li>
  );
}

function PhaseChip({ label, desc, color }: { label: string; desc: string; color: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm min-w-[160px]">
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-[10px] font-700 uppercase tracking-wider text-gray-500">
          {label}
        </span>
      </div>
      <div className="mt-1 text-xs text-gray-700">{desc}</div>
    </div>
  );
}

// ── Getting Started ──────────────────────────────────────────────
function GettingStarted() {
  const steps = [
    {
      icon: <LogIn size={18} />,
      title: "Create your account",
      body:
        "Head to sign-up. Free tier includes 3 strategies, the core node library, and .mq5 exports.",
      link: { href: "/sign-up", label: "Sign up" },
    },
    {
      icon: <Workflow size={18} />,
      title: "Open the builder",
      body:
        "Navigate to the Builder from the sidebar. An empty canvas is waiting — drag nodes in from the left panel.",
      link: { href: "/builder", label: "Open builder" },
    },
    {
      icon: <Zap size={18} />,
      title: "Drop nodes and connect them",
      body:
        "Double-click library items or drag them in. Zentryx auto-suggests edges along the entry → filter → risk → exit pipeline, but you can draw your own by dragging from a node's emerald handle.",
    },
    {
      icon: <Cog size={18} />,
      title: "Tune parameters in the inspector",
      body:
        "Click any node to configure it — periods, thresholds, direction, risk %. Every parameter shows up in the exported MQL5 as a configurable input.",
    },
    {
      icon: <Code2 size={18} />,
      title: "Preview + validate",
      body:
        "The diagnostics panel live-validates orphans, conflicting risk, missing required fields, etc. Pro users can read + copy the generated source directly.",
    },
    {
      icon: <Download size={18} />,
      title: "Export and run",
      body:
        "Hit Export .mq5 → drop the file in MetaTrader's MQL5/Experts folder → F7 to compile → Ctrl+R to backtest.",
    },
  ];
  return (
    <>
      <PageTitle eyebrow="Tutorial" title="Ship your first EA in 5 minutes" />
      <p className="mt-3 text-gray-600 max-w-2xl">
        The fastest route from idea to a running Expert Advisor. You&apos;ll
        build a simple EMA cross with RSI filter, 1% risk sizing, and fixed
        take-profit / stop-loss — then export it.
      </p>
      <ol className="mt-10 space-y-5">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-4 rounded-2xl border border-gray-200 p-5 bg-white">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              {step.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-700 uppercase tracking-widest text-gray-400">
                  Step {i + 1}
                </span>
                <h3 className="text-base font-700 text-gray-900">{step.title}</h3>
              </div>
              <p className="mt-1 text-sm text-gray-600 leading-relaxed">{step.body}</p>
              {step.link && (
                <Button asChild variant="secondary" size="sm" className="mt-3">
                  <a href={step.link.href}>{step.link.label} <ArrowRight size={12} /></a>
                </Button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

// ── Builder ─────────────────────────────────────────────────────
function BuilderDocs() {
  return (
    <>
      <PageTitle eyebrow="Reference" title="Inside the strategy builder" />
      <p className="mt-3 text-gray-600 max-w-2xl">
        The builder is a live-validated graph editor backed by React Flow.
        Every panel contributes something specific to the compilation result.
      </p>

      <div className="mt-10 rounded-2xl border border-gray-200 bg-gray-50/40 p-6">
        <LayoutDiagram />
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
        <FeatureCard
          icon={<ListTree size={18} />}
          title="Node library"
          body="Grouped by category, with search. Drag items onto the canvas or double-click to add at center. Pro-only nodes show a Pro badge; Preview nodes are visible but don't emit MQL5 yet."
          tone="emerald"
        />
        <FeatureCard
          icon={<Workflow size={18} />}
          title="Canvas"
          body="React Flow v12 with minimap, zoom controls, fit-view, true browser fullscreen. Edges animate along the flow direction. Handles are large emerald dots tinted to match the node's category."
          tone="sky"
        />
        <FeatureCard
          icon={<Cog size={18} />}
          title="Inspector"
          body="Selecting a node surfaces its typed parameter form. Selecting an edge shows a from/to summary and a one-click delete. Delete key or toolbar button also work."
          tone="amber"
        />
        <FeatureCard
          icon={<CheckCircle2 size={18} />}
          title="Diagnostics"
          body="Continuously runs eight validation rules (missing entry, conflicting risk, bad EMA ordering, orphans, session windows, etc.) and a plain-English strategy summary."
          tone="emerald"
        />
      </div>

      <h2 className="mt-14 text-xl font-800 text-gray-900">Auto-suggested connections</h2>
      <p className="mt-2 text-gray-600 max-w-2xl">
        When you drop a node of category X, Zentryx tries to connect it to the
        most recent node of the nearest upstream category that doesn&apos;t
        already have an outgoing edge. A linear pipeline wires itself up as you
        drop: <code>EMA Cross</code> → <code>RSI</code> → <code>Risk %</code> → <code>Fixed TP/SL</code>.
      </p>

      <h2 className="mt-10 text-xl font-800 text-gray-900">Keyboard</h2>
      <ul className="mt-2 space-y-1 text-sm text-gray-600">
        <li><Kbd>Delete</Kbd> / <Kbd>Backspace</Kbd> — remove selected node or edge</li>
        <li><Kbd>Drag</Kbd> a handle — create a connection</li>
        <li><Kbd>Drag</Kbd> an edge endpoint — reconnect to a different node (drop on empty space to delete)</li>
        <li><Kbd>Scroll</Kbd> — zoom in/out on the canvas</li>
      </ul>
    </>
  );
}

function LayoutDiagram() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="h-9 border-b border-gray-100 flex items-center px-3 gap-2 bg-gray-50/50">
        <div className="w-2 h-2 rounded-full bg-red-400" />
        <div className="w-2 h-2 rounded-full bg-amber-400" />
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="ml-2 text-[10px] font-600 text-gray-400">Strategy Builder</span>
      </div>
      <div className="grid grid-cols-[120px_1fr_140px] min-h-[200px]">
        <div className="border-r border-gray-100 p-3 space-y-2">
          <div className="text-[9px] font-700 uppercase tracking-widest text-gray-400">Nodes</div>
          {["EMA Cross", "RSI Filter", "Risk %", "TP / SL"].map((l) => (
            <div key={l} className="rounded-md border border-gray-200 px-2 py-1 text-[10px] text-gray-700">
              {l}
            </div>
          ))}
        </div>
        <div className="relative grid-bg p-4">
          <div className="absolute top-4 left-4">
            <MiniNode label="Entry" color="#10b981" />
          </div>
          <div className="absolute top-4 left-32">
            <MiniNode label="Filter" color="#0ea5e9" />
          </div>
          <div className="absolute top-20 left-60">
            <MiniNode label="Risk" color="#f59e0b" />
          </div>
          <div className="absolute top-4 left-[22rem]">
            <MiniNode label="Exit" color="#ef4444" />
          </div>
          <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
            <defs>
              <marker id="arrow" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill="#10b981" />
              </marker>
            </defs>
            <path d="M80,30 C105,30 95,30 120,30" stroke="#10b981" strokeWidth="1.5" fill="none" strokeDasharray="4 3" />
            <path d="M196,30 C220,50 215,70 240,90" stroke="#10b981" strokeWidth="1.5" fill="none" strokeDasharray="4 3" />
            <path d="M316,90 C340,60 340,40 360,30" stroke="#10b981" strokeWidth="1.5" fill="none" strokeDasharray="4 3" />
          </svg>
        </div>
        <div className="border-l border-gray-100 p-3 space-y-1.5">
          <div className="text-[9px] font-700 uppercase tracking-widest text-gray-400">Inspector</div>
          <div className="h-2 rounded bg-gray-100" />
          <div className="h-5 rounded border border-gray-200" />
          <div className="h-2 rounded bg-gray-100 w-1/2" />
          <div className="h-5 rounded border border-gray-200" />
        </div>
      </div>
      <div className="border-t border-gray-100 p-3 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={12} className="text-emerald-500" />
          <span className="text-[10px] font-600 text-gray-700">Strategy summary</span>
        </div>
        <div className="mt-1 h-2 rounded bg-gray-200 w-3/4" />
        <div className="mt-1.5 h-2 rounded bg-gray-100 w-2/3" />
      </div>
    </div>
  );
}

function MiniNode({ label, color }: { label: string; color: string }) {
  return (
    <div className="w-20 h-14 rounded-lg bg-white border border-gray-200 shadow-sm text-[9px] flex flex-col items-center justify-center">
      <span className="inline-flex items-center gap-1 text-gray-500">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
    </div>
  );
}

// ── AI helper ──────────────────────────────────────────────────
function AiHelperDocs() {
  return (
    <>
      <PageTitle eyebrow="Assistant" title="Zentryx AI — an AI co-builder on your canvas" />
      <p className="mt-3 text-gray-600 max-w-2xl">
        Zentryx AI is a chat panel inside the builder that can read your
        current graph, suggest improvements, and apply changes live by calling
        the same node / edge operations you do manually. You watch nodes land,
        rewire, and reconfigure in real time.
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="text-[10px] font-700 uppercase tracking-widest text-gray-400">Free</div>
          <div className="mt-1 text-2xl font-800 text-gray-900">15 messages</div>
          <div className="mt-1 text-xs text-gray-500">One-time trial. Feel the product before committing.</div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
          <div className="text-[10px] font-700 uppercase tracking-widest text-emerald-700">Pro</div>
          <div className="mt-1 text-2xl font-800 text-gray-900">30 messages</div>
          <div className="mt-1 text-xs text-gray-600">
            One-time trial. Use it on your flagship strategy or save it for a
            tricky bug.
          </div>
        </div>
        <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4">
          <div className="text-[10px] font-700 uppercase tracking-widest text-purple-700">Creator</div>
          <div className="mt-1 text-2xl font-800 text-gray-900">150 / day</div>
          <div className="mt-1 text-xs text-gray-600">
            Resets every 24h. Enough for continuous iteration on multiple
            listings.
          </div>
        </div>
      </div>

      <h2 className="mt-14 text-xl font-800 text-gray-900">How it works</h2>
      <ol className="mt-4 space-y-3 text-sm text-gray-600 max-w-2xl list-decimal pl-5">
        <li>
          Click the <strong>Ask AI</strong> button at the bottom-right of the builder.
          A side panel slides in.
        </li>
        <li>
          Describe what you want in plain English — &quot;add a trailing stop
          after 15 pips&quot;, &quot;switch to H1 and rebalance risk&quot;,
          &quot;my RSI filter is contradictory, fix it&quot;.
        </li>
        <li>
          The AI reads your graph, plans a sequence of tool calls, and executes
          them one by one. You see <em>Wrench → add_node</em>, <em>Wrench → connect_nodes</em>,
          etc., with each operation landing on the canvas.
        </li>
        <li>
          When it&apos;s done, it posts a 1–3 sentence summary. Everything is
          undoable from the toolbar.
        </li>
      </ol>

      <h2 className="mt-10 text-xl font-800 text-gray-900">What it can do</h2>
      <ul className="mt-3 space-y-2 max-w-2xl">
        <Bullet>Add or remove nodes, connect them, tune their parameters</Bullet>
        <Bullet>Fix validation errors you haven&apos;t resolved yet</Bullet>
        <Bullet>Change the symbol, timeframe, magic number, trade comment</Bullet>
        <Bullet>Draft a complete strategy from a one-sentence brief</Bullet>
        <Bullet>Explain what your current graph does in plain English</Bullet>
      </ul>

      <h2 className="mt-10 text-xl font-800 text-gray-900">What it won&apos;t do</h2>
      <ul className="mt-3 space-y-2 max-w-2xl">
        <Bullet>Invent node types that don&apos;t exist in the registry</Bullet>
        <Bullet>Bypass the validator (no entry → exit shortcuts)</Bullet>
        <Bullet>Run backtests — that&apos;s still MT5 Strategy Tester&apos;s job</Bullet>
        <Bullet>Send your code or account data to any third party. Requests go through our Netlify function to Anthropic and back; nothing is shared beyond that.</Bullet>
      </ul>

      <div className="mt-10 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-white p-5">
        <div className="flex items-center gap-2 text-sm font-700 text-emerald-700">
          <Zap size={14} /> Try it
        </div>
        <p className="mt-1 text-xs text-emerald-900/80">
          Open the builder, click <strong>Ask AI</strong>, type
          &quot;Build a simple EMA-cross strategy on EURUSD with 1% risk and
          trailing stop&quot;. Watch the graph build itself.
        </p>
      </div>
    </>
  );
}

// ── Node reference ──────────────────────────────────────────────
function NodeReference({
  nodes,
  query,
  onQueryChange,
  totalCount,
}: {
  nodes: NodeDefinition[];
  query: string;
  onQueryChange: (v: string) => void;
  totalCount: number;
}) {
  return (
    <>
      <PageTitle
        eyebrow="Node reference"
        title={`Every node the builder ships (${totalCount})`}
      />
      <p className="mt-3 text-gray-600 max-w-2xl">
        Generated from the live registry. <strong className="text-amber-600">Pro</strong> nodes
        require the Pro plan at export time. <strong className="text-sky-600">Preview</strong> nodes
        are visible in the builder but aren&apos;t emitted as MQL5 yet —
        translators ship in upcoming releases.
      </p>

      <div className="mt-8 sticky top-16 z-10 bg-white pb-3 pt-1 -mx-1 px-1">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search nodes by name or type…"
            className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/15"
          />
        </div>
      </div>

      {VISIBLE_CATEGORIES.map((cat) => {
        const catNodes = nodes.filter((n) => n.category === cat);
        if (catNodes.length === 0) return null;
        const color = CATEGORY_COLORS[cat];
        return (
          <section key={cat} className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <span
                className="inline-flex w-7 h-7 rounded-lg items-center justify-center"
                style={{ background: `${color}1a`, color }}
              >
                <Hexagon size={14} />
              </span>
              <h2 className="text-lg font-800 text-gray-900 m-0">
                {CATEGORY_LABELS[cat]}
              </h2>
              <span className="text-xs text-gray-400">· {catNodes.length} nodes</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {catNodes.map((n) => (
                <Card key={n.type} className="hover:border-emerald-200 transition-colors">
                  <CardContent>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-700 text-gray-900 m-0 truncate">{n.label}</h3>
                        <code className="text-[10px] text-gray-400">{n.type}</code>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {n.premium && <Badge tone="amber">Pro</Badge>}
                        {n.stub && <Badge tone="blue">Preview</Badge>}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-600">{n.summary}</p>
                    {n.params.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-[10px] uppercase tracking-widest text-gray-400 font-700 mb-1.5">
                          Parameters
                        </div>
                        <ul className="text-[11px] text-gray-600 space-y-1">
                          {n.params.map((p) => (
                            <li key={p.key} className="flex flex-wrap items-baseline gap-1">
                              <code className="text-gray-700 font-600">{p.key}</code>
                              <span className="text-gray-400">· {p.label}</span>
                              {p.default !== undefined && (
                                <span className="text-gray-400">
                                  (default {String(p.default)})
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        );
      })}

      {nodes.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-500">
          No node matches &quot;{query}&quot;.
        </div>
      )}
    </>
  );
}

// ── MQL5 export ─────────────────────────────────────────────────
function Mql5Export() {
  return (
    <>
      <PageTitle eyebrow="Compiler" title="From graph to .mq5 in four stages" />
      <p className="mt-3 text-gray-600 max-w-2xl">
        Hitting <em>Export</em> runs a deterministic pipeline. The same graph
        always produces byte-identical source — so backtest parameter names
        stay stable across edits.
      </p>

      <ol className="mt-10 space-y-4">
        <Stage
          n={1}
          title="Validate"
          body="Eight rules check for missing entries, orphan nodes, conflicting risk, impossible session windows, and more. Errors block export; warnings show in the panel but don't stop you."
        />
        <Stage
          n={2}
          title="Order"
          body="Nodes are sorted by category (entry → filter → session → news → risk → exit → grid → utility) and then by id. Same graph → same order → same output."
        />
        <Stage
          n={3}
          title="Translate"
          body="Each node runs its own translator, emitting inputs, indicator handles, helpers, entry conditions, pre-trade gates, lot expressions, stop levels, and position management snippets."
        />
        <Stage
          n={4}
          title="Assemble"
          body="The template merges every contribution into a valid MQL5 file: OnInit / OnTick / OnDeinit lifecycle, CTrade executor, new-bar gating, a real ZxOpen() helper, and deterministic input names hashed from node ids."
        />
      </ol>

      <h2 className="mt-14 text-xl font-800 text-gray-900">Anatomy of the output</h2>
      <div className="mt-4 rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-[#0b1020] text-gray-300 text-[11px] font-mono px-4 py-3 border-b border-white/5">
          sample EURUSD_Trend_Hunter.mq5
        </div>
        <pre className="text-[11.5px] leading-relaxed text-gray-800 bg-white p-5 overflow-x-auto">
{`//+-----------------------------------------+
//|  EURUSD_Trend_Hunter.mq5
//+-----------------------------------------+
#include <Trade/Trade.mqh>

// ── Inputs (bound to each node's fields)
input int    InpFast_abc123 = 20;
input int    InpSlow_abc123 = 50;
input double InpRiskPercent_def456 = 1.0;

// ── Indicator handles, lifecycle
int hFast_abc123 = INVALID_HANDLE;

int OnInit() { ... }
void OnDeinit(const int reason) { ... }

// ── Tick: management → gates → signals → entry
void OnTick()
{
   // 1. Manage open position (trailing, break-even)
   // 2. New-bar guard
   // 3. Pre-trade gates (session, spread, ATR)
   // 4. Entry signals → ZxOpen(direction)
}`}
        </pre>
      </div>

      <h2 className="mt-14 text-xl font-800 text-gray-900">What&apos;s in the file</h2>
      <ul className="mt-3 space-y-2 max-w-2xl">
        <Bullet>Input parameters bound to every node&apos;s tunable fields.</Bullet>
        <Bullet>Indicator handles created in <code>OnInit</code> and released in <code>OnDeinit</code>.</Bullet>
        <Bullet>Pre-trade gates (session, spread, ATR, daily loss) short-circuit the tick.</Bullet>
        <Bullet>New-bar gating — entries fire once per bar, not per tick.</Bullet>
        <Bullet>Lot sizing via the Risk node you selected (fixed lot or risk-%).</Bullet>
        <Bullet>Stop-loss / take-profit + trailing / break-even inside a single position-management block.</Bullet>
      </ul>
    </>
  );
}

function Stage({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="rounded-2xl border border-gray-200 p-5 bg-white">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-emerald-500 text-white text-sm font-800 flex items-center justify-center">
          {n}
        </div>
        <div>
          <h3 className="text-base font-700 text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-600 leading-relaxed">{body}</p>
        </div>
      </div>
    </li>
  );
}

// ── Strategy Tester ────────────────────────────────────────────
function StrategyTester() {
  return (
    <>
      <PageTitle eyebrow="MetaTrader 5" title="Backtest your exported EA" />
      <p className="mt-3 text-gray-600 max-w-2xl">
        Zentryx generates source — MetaTrader 5 runs the simulation. Here is
        the authoritative sequence from a fresh <code>.mq5</code> to a running
        Strategy Tester.
      </p>
      <ol className="mt-10 space-y-4">
        <Stage n={1} title="Locate the MQL5 folder" body="In MT5, File → Open Data Folder. Navigate to MQL5/Experts." />
        <Stage n={2} title="Drop the .mq5 file" body="Place your downloaded file directly in MQL5/Experts." />
        <Stage n={3} title="Open MetaEditor" body="Press F4 in MT5, or launch MetaEditor from the toolbar." />
        <Stage n={4} title="Compile to .ex5" body="Double-click your file in the navigator, then F7. Errors appear in the output console; warnings are usually safe to ignore." />
        <Stage n={5} title="Start the Strategy Tester" body="Back in MT5, Ctrl+R. Pick your EA, the same symbol and timeframe you set in Zentryx, tick Every tick based on real ticks for accuracy, and click Start." />
      </ol>

      <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
        <h3 className="text-sm font-700 text-amber-900">Pro tip — align metadata</h3>
        <p className="mt-1 text-xs text-amber-800">
          Set the same <code>Symbol</code> and <code>Timeframe</code> in the
          Zentryx builder that you&apos;ll use in Strategy Tester. Changing them
          after export requires re-running the export so the generated
          <code className="mx-1">InpTimeframe</code> default stays consistent.
        </p>
      </div>
    </>
  );
}

// ── Plans ───────────────────────────────────────────────────────
function PlansSection() {
  const rows: { feature: string; free: string; pro: string; creator: string }[] = [
    { feature: "Saved strategies", free: "Up to 3", pro: "Unlimited", creator: "Unlimited" },
    { feature: ".mq5 downloads", free: "Yes", pro: "Yes", creator: "Yes" },
    { feature: "Readable source preview", free: "Blurred", pro: "Yes", creator: "Yes" },
    { feature: "Clipboard copy of source", free: "No", pro: "Yes", creator: "Yes" },
    { feature: "Premium nodes (Risk %, trailing, ATR, …)", free: "Blocks export", pro: "Yes", creator: "Yes" },
    { feature: "Zentryx AI quota", free: "15 messages (trial)", pro: "30 messages (trial)", creator: "150 / day" },
    { feature: "Marketplace publishing", free: "No", pro: "No", creator: "Yes" },
    { feature: "Creator analytics", free: "No", pro: "No", creator: "Yes" },
  ];
  return (
    <>
      <PageTitle eyebrow="Billing" title="What each plan includes" />
      <p className="mt-3 text-gray-600 max-w-2xl">
        Free is generous enough to ship real EAs. Pro unlocks advanced risk
        management and the readable source. Creator adds marketplace tools so
        you can sell what you build.
      </p>

      <div className="mt-10 overflow-x-auto rounded-2xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 font-700 text-gray-700">Feature</th>
              <th className="px-4 py-3 font-700 text-gray-700">Free</th>
              <th className="px-4 py-3 font-700 text-emerald-700">Pro</th>
              <th className="px-4 py-3 font-700 text-purple-700">Creator</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.feature}>
                <td className="px-4 py-3 text-gray-700">{r.feature}</td>
                <td className="px-4 py-3 text-gray-600">{r.free}</td>
                <td className="px-4 py-3 text-gray-600">{r.pro}</td>
                <td className="px-4 py-3 text-gray-600">{r.creator}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Button asChild><a href="/billing">See pricing</a></Button>
        <Button asChild variant="secondary"><a href="/sign-up">Start Free</a></Button>
      </div>
    </>
  );
}

// ── FAQ ──────────────────────────────────────────────────────────
function Faq() {
  return (
    <>
      <PageTitle eyebrow="FAQ" title="Common questions" />
      <div className="mt-8 space-y-4">
        <Q q="Does Zentryx Lab support MT4?">
          Not right now. MQL5 / MT5 only. MT4 is on the roadmap but not this quarter.
        </Q>
        <Q q="Can I backtest inside Zentryx Lab?">
          No. Backtesting is done in MetaTrader 5&apos;s Strategy Tester after
          you export and compile the .mq5. Running simulations server-side
          would duplicate MT5&apos;s work and lose fidelity with MT5&apos;s tick models.
        </Q>
        <Q q="What happens if a node is marked Preview?">
          You can drop it on the canvas to visualise the architecture. On
          export, it&apos;s skipped and a warning shows in diagnostics. We ship
          translators for Preview nodes over time.
        </Q>
        <Q q="Why is the Free tier preview blurred?">
          Free tier can download and run the .mq5 inside MetaTrader, but
          reading / copying the source is a Pro feature. This protects creators
          who publish their strategies on the marketplace.
        </Q>
        <Q q="Can I connect an Entry directly to an Exit?">
          No. The connection validator enforces the entry → (filter) → risk → exit pipeline.
          Exits need a Risk node upstream so lot sizing is well-defined.
        </Q>
        <Q q="Is my strategy data private?">
          Yes. Every row in our Postgres database is protected by row-level
          security — only you can read or write your strategies.
        </Q>
      </div>
    </>
  );
}

function Q({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-5 bg-white">
      <div className="text-gray-900 font-700">{q}</div>
      <div className="text-gray-600 mt-1.5 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

// ── Shared ───────────────────────────────────────────────────────
function PageTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <div className="text-[11px] font-700 uppercase tracking-widest text-emerald-600">
        {eyebrow}
      </div>
      <h1 className="mt-1 text-2xl md:text-3xl font-800 tracking-tight text-gray-900">
        {title}
      </h1>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  tone: "emerald" | "sky" | "amber";
}) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    sky: "bg-sky-50 text-sky-600 border-sky-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
  };
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow">
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center border",
          tones[tone],
        )}
      >
        {icon}
      </div>
      <div className="mt-3 text-sm font-700 text-gray-900">{title}</div>
      <div className="mt-1 text-xs text-gray-500 leading-relaxed">{body}</div>
    </div>
  );
}

function CTA({ title, sub, onClick }: { title: string; sub: string; onClick: () => void }) {
  return (
    <div className="mt-14 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-white p-6 flex items-center gap-4">
      <div className="shrink-0 w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
        <Sparkles size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-700 text-gray-900">{title}</div>
        <div className="text-xs text-gray-500">{sub}</div>
      </div>
      <Button onClick={onClick}>
        Continue <ArrowRight size={14} />
      </Button>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-gray-700">
      <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-block px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 text-[11px] text-gray-700 font-600">
      {children}
    </kbd>
  );
}

