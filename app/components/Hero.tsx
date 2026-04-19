"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
} from "framer-motion";
import {
  ArrowRight,
  Play,
  Check,
  ShieldCheck,
  Zap,
  Star,
  Sparkles,
  Save,
  Undo2,
  Redo2,
  Maximize,
  Maximize2,
  Code2,
  Download,
  Search,
  PanelLeftClose,
  PanelRightClose,
  Trash2,
  Copy,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

// ──────────────────────────────────────────────────────────────────
// Magnetic CTA — pulled toward cursor for a tactile "premium" feel.
// ──────────────────────────────────────────────────────────────────
function MagneticButton({
  children,
  className,
  href,
}: {
  children: React.ReactNode;
  className: string;
  href: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * 0.25);
    y.set((e.clientY - cy) * 0.25);
  };
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.a
      ref={ref}
      href={href}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </motion.a>
  );
}

// ──────────────────────────────────────────────────────────────────
// BuilderMockup — pixel-faithful preview of the real builder UI.
// Same chrome (topbar + collapsible sidebars + metadata bar +
// in-canvas toolbar), same emerald-handle nodes, same diagnostics
// panel, same floating "Ask AI" button.
// ──────────────────────────────────────────────────────────────────
function BuilderMockup() {
  return (
    <div className="relative w-full bg-white rounded-2xl border border-gray-200 shadow-2xl shadow-gray-300/40 overflow-hidden">
      {/* ── Window chrome ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 h-9 border-b border-gray-100 bg-gray-50/80 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </div>
        <span className="ml-2 text-[10px] font-600 text-gray-400 truncate">
          lab.zentryx.tech / builder
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[9px] font-700 uppercase tracking-widest text-purple-600 bg-purple-50 border border-purple-100 rounded px-1.5 py-0.5">
            Creator
          </span>
        </div>
      </div>

      {/* ── App topbar ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 h-11 px-3 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center shadow shadow-emerald-500/30">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z" fill="white" fillOpacity="0.9" />
              <path d="M8 5L11 6.5V9.5L8 11L5 9.5V6.5L8 5Z" fill="white" />
            </svg>
          </div>
          <span className="text-xs font-700 text-gray-900">EUR/USD Trend Hunter</span>
        </div>
        <div className="flex-1" />
        <ToolbarBtn icon={<Undo2 size={11} />} label="Undo" />
        <ToolbarBtn icon={<Redo2 size={11} />} label="Redo" />
        <span className="mx-0.5 h-4 w-px bg-gray-200" />
        <ToolbarBtn icon={<Play size={11} />} label="Validate" tone="secondary" />
        <ToolbarBtn icon={<Code2 size={11} />} label="Preview" tone="secondary" />
        <ToolbarBtn icon={<Download size={11} />} label="Export" tone="secondary" />
        <ToolbarBtn icon={<Save size={11} />} label="Save" tone="primary" />
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-[150px_1fr_180px] h-[440px] bg-gray-50/40">
        {/* Node library */}
        <div className="border-r border-gray-100 bg-white flex flex-col min-h-0">
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-100">
            <span className="text-[8px] font-700 uppercase tracking-widest text-gray-400">
              Nodes
            </span>
            <PanelLeftClose size={11} className="text-gray-300" />
          </div>
          <div className="px-2 py-1.5">
            <div className="relative">
              <Search size={9} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-300" />
              <div className="h-5 rounded-md border border-gray-200 bg-gray-50 pl-5 text-[9px] text-gray-300 flex items-center">
                Search…
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden px-1.5 space-y-2 pb-2">
            <CategoryRow color="#10b981" label="Entry" count={9} active />
            <LibraryItem label="EMA Cross" desc="Fast / slow crossover" highlighted />
            <LibraryItem label="MACD Cross" desc="Momentum trigger" />
            <LibraryItem label="Stochastic" desc="K/D crossover" />
            <CategoryRow color="#0ea5e9" label="Filter" count={11} />
            <LibraryItem label="RSI Filter" desc="Block extremes" highlighted />
            <LibraryItem label="ATR Filter" desc="Volatility band" />
            <CategoryRow color="#f59e0b" label="Risk" count={6} />
            <LibraryItem label="Risk %" desc="1% per trade" highlighted />
            <CategoryRow color="#ef4444" label="Exit" count={8} />
            <LibraryItem label="Fixed TP/SL" desc="Pip-based" highlighted />
          </div>
        </div>

        {/* Center column */}
        <div className="flex flex-col min-h-0">
          {/* Metadata bar */}
          <div className="grid grid-cols-4 gap-1.5 px-3 py-1.5 border-b border-gray-100 bg-white">
            <MetaField label="Name" value="EUR/USD Trend Hunter" />
            <MetaField label="Symbol" value="EURUSD" mono />
            <MetaField label="Timeframe" value="M15" mono />
            <MetaField label="Magic #" value="20260418" mono />
          </div>

          {/* In-canvas toolbar */}
          <div className="flex items-center gap-1 px-3 py-1 border-b border-gray-100 bg-white">
            <ToolbarBtn icon={<Maximize size={9} />} label="Fit" mini />
            <ToolbarBtn icon={<Maximize2 size={9} />} label="Fullscreen" mini />
            <div className="flex-1" />
            <span className="text-[9px] text-emerald-600 font-600 inline-flex items-center gap-1">
              <CheckCircle2 size={9} /> Validated
            </span>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative bg-gray-50/40 overflow-hidden">
            {/* Dot grid */}
            <svg className="absolute inset-0 w-full h-full opacity-50">
              <defs>
                <pattern id="hero-dots" width="14" height="14" patternUnits="userSpaceOnUse">
                  <circle cx="0.7" cy="0.7" r="0.7" fill="#d1d5db" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hero-dots)" />
            </svg>

            {/* Nodes + edges */}
            <CanvasNodes />

            {/* Mini-map (bottom-right) */}
            <div className="absolute bottom-2 right-2 w-20 h-12 bg-white/85 backdrop-blur border border-gray-200 rounded-md p-1 flex items-center gap-0.5">
              <div className="w-2.5 h-1 rounded-sm bg-emerald-400" />
              <div className="w-2.5 h-1 rounded-sm bg-sky-400" />
              <div className="w-2.5 h-1 rounded-sm bg-amber-400" />
              <div className="w-2.5 h-1 rounded-sm bg-red-400" />
            </div>

            {/* Zoom controls (bottom-left) */}
            <div className="absolute bottom-2 left-2 bg-white border border-gray-200 rounded-md shadow-sm divide-y divide-gray-100 text-[10px] font-700 text-gray-400">
              <div className="px-1.5 py-0.5">+</div>
              <div className="px-1.5 py-0.5">−</div>
            </div>
          </div>

          {/* Strategy summary */}
          <div className="border-t border-gray-100 bg-white px-3 py-2">
            <div className="flex items-start gap-1.5">
              <CheckCircle2 size={10} className="text-emerald-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-[9px] font-700 uppercase tracking-widest text-gray-400">
                  Strategy summary
                </div>
                <p className="text-[10.5px] text-gray-700 leading-snug mt-0.5 truncate">
                  EURUSD M15: Trade when EMA 20 crosses above EMA 50, RSI(14) within band, risk 1%, TP 30 / SL 15 pips.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Inspector */}
        <div className="border-l border-gray-100 bg-white flex flex-col min-h-0">
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-100">
            <PanelRightClose size={11} className="text-gray-300" />
            <span className="text-[8px] font-700 uppercase tracking-widest text-gray-400">
              Inspector
            </span>
          </div>
          <div className="px-2.5 py-2">
            <div className="text-[8px] font-700 uppercase tracking-widest text-gray-400">Entry</div>
            <div className="flex items-center gap-1 mt-0.5">
              <h4 className="text-[11px] font-700 text-gray-900">EMA Cross</h4>
              <div className="ml-auto flex items-center gap-0.5 text-gray-300">
                <Copy size={9} />
                <Trash2 size={9} />
              </div>
            </div>
            <p className="text-[9px] text-gray-400 mt-0.5 leading-tight">
              Fast / slow EMA crossover.
            </p>
          </div>
          <div className="flex-1 px-2.5 space-y-2.5 overflow-hidden">
            <Field label="Fast EMA" value="20" />
            <Field label="Slow EMA" value="50" />
            <FieldSelect label="Direction" value="Both" />
            <Field label="Lookback" value="2 bars" />
          </div>
          <div className="border-t border-gray-100 px-2.5 py-1.5">
            <div className="text-[8px] font-700 uppercase tracking-widest text-amber-600 flex items-center gap-1">
              <AlertTriangle size={9} /> 1 warning
            </div>
            <p className="text-[9px] text-gray-500 mt-0.5 leading-tight">
              No spread filter — consider adding one.
            </p>
          </div>
        </div>
      </div>

      {/* Floating "Ask AI" pill */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="absolute bottom-4 right-4"
      >
        <motion.div
          animate={{ scale: [1, 1.04, 1], boxShadow: ["0 8px 22px rgba(16,185,129,0.35)", "0 12px 30px rgba(16,185,129,0.55)", "0 8px 22px rgba(16,185,129,0.35)"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-[11px] font-700"
        >
          <Sparkles size={11} />
          Ask AI
          <kbd className="text-[8px] font-700 text-emerald-100 border border-emerald-300/40 rounded px-1">⌘K</kbd>
        </motion.div>
      </motion.div>
    </div>
  );
}

function ToolbarBtn({
  icon,
  label,
  tone = "ghost",
  mini,
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "ghost" | "secondary" | "primary";
  mini?: boolean;
}) {
  const cls =
    tone === "primary"
      ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/25"
      : tone === "secondary"
        ? "bg-white border border-gray-200 text-gray-700"
        : "text-gray-500";
  return (
    <div
      className={`inline-flex items-center gap-1 ${mini ? "h-5 px-1.5" : "h-6 px-2"} rounded-md text-[10px] font-600 ${cls}`}
    >
      {icon}
      {label}
    </div>
  );
}

function MetaField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[8px] font-700 uppercase tracking-widest text-gray-400">{label}</div>
      <div
        className={`mt-0.5 h-5 rounded border border-gray-200 px-1.5 text-[9px] flex items-center text-gray-700 truncate ${mono ? "font-mono" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[8px] font-700 text-gray-500">{label}</div>
      <div className="mt-0.5 h-5 rounded border border-gray-200 px-1.5 text-[9px] flex items-center font-mono text-gray-700">
        {value}
      </div>
    </div>
  );
}

function FieldSelect({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[8px] font-700 text-gray-500">{label}</div>
      <div className="mt-0.5 h-5 rounded border border-gray-200 px-1.5 text-[9px] flex items-center justify-between text-gray-700">
        {value}
        <span className="text-gray-300">▾</span>
      </div>
    </div>
  );
}

function CategoryRow({
  color,
  label,
  count,
  active,
}: {
  color: string;
  label: string;
  count: number;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-1 px-1 pt-1.5">
      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span
        className={`text-[8px] font-700 uppercase tracking-widest ${
          active ? "text-gray-700" : "text-gray-400"
        }`}
      >
        {label}
      </span>
      <span className="text-[8px] text-gray-300 ml-auto">{count}</span>
    </div>
  );
}

function LibraryItem({
  label,
  desc,
  highlighted,
}: {
  label: string;
  desc: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-md border ${
        highlighted ? "border-emerald-200 bg-emerald-50/40" : "border-transparent"
      } px-1.5 py-1`}
    >
      <div className="text-[10px] font-700 text-gray-800 leading-tight truncate">{label}</div>
      <div className="text-[8px] text-gray-400 leading-tight truncate">{desc}</div>
    </div>
  );
}

// ── Canvas with strategy graph (animated emerald edges) ────────
function CanvasNodes() {
  return (
    <>
      {/* Edges (SVG) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
        <defs>
          <linearGradient id="edge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
          </linearGradient>
          <filter id="edge-glow">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>
        {/* Entry → Filter */}
        <Edge x1={92} y1={68} x2={195} y2={68} delay={0} />
        {/* Filter → Risk */}
        <Edge x1={285} y1={68} x2={388} y2={68} delay={0.6} />
        {/* Risk → Exit */}
        <Edge x1={478} y1={68} x2={580} y2={68} delay={1.2} />
      </svg>

      {/* Nodes */}
      <Node x={8} y={36} category="ENTRY" color="#10b981" label="EMA Cross" sub="20 / 50" />
      <Node x={198} y={36} category="FILTER" color="#0ea5e9" label="RSI Filter" sub="14, band" selected />
      <Node x={388} y={36} category="RISK" color="#f59e0b" label="Risk %" sub="1.0%" />
      <Node x={578} y={36} category="EXIT" color="#ef4444" label="Fixed TP/SL" sub="30 / 15 pips" />
    </>
  );
}

function Edge({ x1, y1, x2, y2, delay }: { x1: number; y1: number; x2: number; y2: number; delay: number }) {
  const midX = (x1 + x2) / 2;
  return (
    <g>
      {/* Static path */}
      <path
        d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
        stroke="#10b981"
        strokeOpacity="0.45"
        strokeWidth="1.4"
        fill="none"
      />
      {/* Animated dashed overlay */}
      <path
        d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
        stroke="url(#edge-grad)"
        strokeWidth="1.6"
        strokeDasharray="4 4"
        fill="none"
        style={{
          animation: `dataFlow 1.6s linear infinite`,
          animationDelay: `${delay}s`,
        }}
      />
      {/* Traveling dot */}
      <motion.circle
        r="2.4"
        fill="#10b981"
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 1.6,
          delay,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        <animateMotion
          path={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
          dur="1.6s"
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
      </motion.circle>
    </g>
  );
}

function Node({
  x,
  y,
  category,
  color,
  label,
  sub,
  selected,
}: {
  x: number;
  y: number;
  category: string;
  color: string;
  label: string;
  sub: string;
  selected?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.4 + (x / 700) * 0.4, type: "spring", stiffness: 280, damping: 22 }}
      className={`absolute w-[88px] rounded-lg border bg-white shadow-sm ${
        selected ? "border-emerald-400 ring-2 ring-emerald-200" : "border-gray-200"
      }`}
      style={{ left: x, top: y }}
    >
      {/* Target handle (left) */}
      <span
        className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border border-white"
        style={{ background: color }}
      />
      <div
        className="rounded-t-lg px-1.5 py-0.5 text-[8px] font-700 uppercase tracking-widest"
        style={{ background: `${color}1a`, color }}
      >
        {category}
      </div>
      <div className="px-1.5 py-1">
        <div className="text-[10px] font-700 text-gray-900 truncate">{label}</div>
        <div className="text-[8px] text-gray-400 truncate">{sub}</div>
      </div>
      {/* Source handle (right) */}
      <span
        className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border border-white"
        style={{ background: color }}
      />
    </motion.div>
  );
}

// ── Hero ───────────────────────────────────────────────────────
const PARTICLES = [
  { id: 0,  x: 15.2, y: 12.6, size: 2.0, duration: 5.2, delay: 0.0 },
  { id: 1,  x: 69.6, y: 49.4, size: 4.9, duration: 7.1, delay: 1.3 },
  { id: 2,  x: 2.1,  y: 38.2, size: 3.7, duration: 6.4, delay: 2.1 },
  { id: 3,  x: 28.7, y: 98.5, size: 3.4, duration: 4.8, delay: 0.7 },
  { id: 4,  x: 40.0, y: 52.0, size: 4.7, duration: 8.3, delay: 3.2 },
  { id: 5,  x: 8.5,  y: 70.3, size: 4.9, duration: 5.7, delay: 1.8 },
  { id: 6,  x: 65.8, y: 32.9, size: 4.9, duration: 6.9, delay: 0.4 },
  { id: 7,  x: 44.8, y: 6.0,  size: 5.4, duration: 9.1, delay: 2.6 },
  { id: 8,  x: 2.8,  y: 58.4, size: 5.8, duration: 7.5, delay: 1.1 },
  { id: 9,  x: 33.6, y: 13.3, size: 3.2, duration: 4.3, delay: 3.8 },
  { id: 10, x: 77.6, y: 26.6, size: 4.8, duration: 6.2, delay: 0.9 },
  { id: 11, x: 0.6,  y: 7.2,  size: 4.3, duration: 5.5, delay: 2.4 },
  { id: 12, x: 31.9, y: 25.4, size: 3.8, duration: 8.7, delay: 1.6 },
  { id: 13, x: 83.3, y: 45.5, size: 5.7, duration: 7.0, delay: 0.2 },
  { id: 14, x: 46.8, y: 97.0, size: 3.5, duration: 5.9, delay: 3.0 },
  { id: 15, x: 58.2, y: 46.9, size: 2.9, duration: 6.6, delay: 1.4 },
  { id: 16, x: 57.2, y: 91.7, size: 2.9, duration: 4.6, delay: 2.9 },
  { id: 17, x: 6.6,  y: 86.6, size: 4.1, duration: 7.8, delay: 0.6 },
  { id: 18, x: 69.4, y: 47.3, size: 5.4, duration: 5.1, delay: 3.5 },
  { id: 19, x: 78.1, y: 33.2, size: 5.3, duration: 8.0, delay: 1.9 },
];

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, -60]);
  const y2 = useTransform(scrollY, [0, 500], [0, -30]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-white pt-16"
    >
      <div className="absolute inset-0 grid-bg" />

      <motion.div
        style={{ y: y1 }}
        className="absolute top-20 left-1/4 w-96 h-96 ambient-orb pointer-events-none"
        animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.8, 0.6] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        style={{ y: y2 }}
        className="absolute top-40 right-1/4 w-80 h-80 ambient-orb pointer-events-none"
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.5, 0.7, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-emerald-400 pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: 0.4,
          }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -20, -40, 0],
            opacity: [0.4, 0.7, 0.3, 0.4],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      <div className="relative max-w-7xl mx-auto px-6 py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <motion.div style={{ opacity }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 mb-6 sm:mb-8 max-w-full"
            >
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-[11px] sm:text-sm font-600 text-emerald-700 truncate">
                <strong className="font-800">Zentryx Lab</strong>
                <span className="hidden sm:inline"> — No-code MT5 Expert Advisor builder</span>
                <span className="sm:hidden"> — No-code MT5 EA builder</span>
              </span>
            </motion.div>

            <div className="mb-6">
              <motion.h1
                className="text-[32px] sm:text-4xl md:text-5xl xl:text-6xl font-800 leading-[1.08] sm:leading-[1.05] tracking-tight text-gray-900"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.06 } },
                }}
              >
                {["Build Your Own", "Trading Robot", "Without Writing Code"].map((line, li) => (
                  <motion.span
                    key={li}
                    className={`block ${li === 1 ? "text-gradient-em pb-2" : ""}`}
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
                      },
                    }}
                  >
                    {line}
                  </motion.span>
                ))}
              </motion.h1>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-base sm:text-lg text-gray-500 leading-relaxed mb-8 sm:mb-10 max-w-md"
            >
              <strong className="text-gray-900 font-700">Zentryx Lab</strong> is a no-code platform to design, export and ship MetaTrader 5 Expert Advisors visually. Drop nodes, wire them, generate clean MQL5 — and let the built-in AI build alongside you.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap gap-4"
            >
              <MagneticButton
                href="/sign-up"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-700 px-6 py-3.5 rounded-2xl shadow-xl shadow-emerald-500/30 transition-colors text-sm"
              >
                Start Building Free
                <ArrowRight size={16} />
              </MagneticButton>
              <MagneticButton
                href="#how-it-works"
                className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:border-emerald-200 hover:text-emerald-600 font-600 px-6 py-3.5 rounded-2xl transition-all text-sm shadow-sm"
              >
                <Play size={14} className="text-emerald-500" />
                See How It Works
              </MagneticButton>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.85, duration: 0.6 }}
              className="flex flex-wrap items-center gap-5 mt-5"
            >
              {[
                { icon: Check, text: "No credit card required" },
                { icon: ShieldCheck, text: "Cancel anytime" },
                { icon: Zap, text: "AI helper included" },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Icon size={13} className="text-emerald-500" strokeWidth={2.5} />
                  {text}
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.6 }}
              className="flex items-center gap-6 mt-10"
            >
              <div className="flex -space-x-2">
                {["#10b981", "#6366f1", "#f59e0b", "#ef4444"].map((c, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-700 text-white"
                    style={{ background: c }}
                  >
                    {["JD", "MK", "AR", "TL"][i]}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={12} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Trusted by traders worldwide</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Builder mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ y: y2 }}
            className="relative hidden lg:block"
          >
            <div className="absolute -inset-8 bg-emerald-400/10 rounded-3xl blur-3xl" />
            <BuilderMockup />
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2"
      >
        <span className="text-xs text-gray-400 font-500">Scroll to explore</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-5 h-8 rounded-full border-2 border-gray-200 flex items-start justify-center pt-1.5"
        >
          <div className="w-1 h-2 rounded-full bg-emerald-400" />
        </motion.div>
      </motion.div>
    </section>
  );
}
