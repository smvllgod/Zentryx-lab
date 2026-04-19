"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Plus, Move, RotateCcw, Settings, ArrowUpRight, Zap, ArrowDownRight, Newspaper, Grid2x2, FileDown, FileText, Check, TrendingUp } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Build Visually",
    subtitle: "Drag, drop, connect",
    description:
      "Use our intuitive visual canvas to assemble your strategy from pre-built logic blocks. Connect Entry Logic, Risk Engine, Exit conditions and filters — no code required.",
    features: ["200+ pre-built logic blocks", "Visual node connections", "Real-time validation", "Strategy templates"],
    color: "#10b981",
    visual: "builder",
  },
  {
    number: "02",
    title: "Export to MT5",
    subtitle: "One-click export",
    description:
      "When your strategy is ready, export it as a native .ex5 file with a single click. Zentryx Lab compiles your visual logic into optimized MQL5 code automatically.",
    features: ["Native MQL5 output", "MT4 & MT5 compatible", "Optimized code generation", "Instant download"],
    color: "#6366f1",
    visual: "export",
  },
  {
    number: "03",
    title: "Backtest in MT5",
    subtitle: "Using MT5 Strategy Tester",
    description:
      "Load your exported EA directly into MetaTrader 5's built-in Strategy Tester. Run full historical backtests using MT5's native engine — the industry standard for EA testing.",
    features: ["MT5 Strategy Tester", "Historical data testing", "Optimization runs", "Full MT5 native reports"],
    color: "#f59e0b",
    visual: "backtest",
  },
];

const BUILDER_NODES = [
  { label: "Entry Logic", x: 24, y: 28, color: "#10b981", Icon: ArrowUpRight },
  { label: "Risk Engine", x: 164, y: 28, color: "#6366f1", Icon: Zap },
  { label: "Exit Logic", x: 304, y: 28, color: "#f59e0b", Icon: ArrowDownRight },
  { label: "News Filter", x: 94, y: 128, color: "#ef4444", Icon: Newspaper },
  { label: "Grid System", x: 234, y: 128, color: "#3b82f6", Icon: Grid2x2 },
];

function BuilderVisual({ active }: { active: boolean }) {
  return (
    <motion.div
      animate={{ opacity: active ? 1 : 0.3, scale: active ? 1 : 0.97 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden"
    >
      {/* Chrome bar */}
      <div className="flex items-center gap-2 px-4 h-9 border-b border-gray-100 bg-gray-50/80">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <span className="text-xs text-gray-400 font-500 ml-2">Strategy Canvas</span>
        <div className="ml-auto flex items-center gap-1">
          <Check size={10} className="text-emerald-500" />
          <span className="text-[10px] font-700 text-emerald-600">Validated</span>
        </div>
      </div>

      <div className="flex">
        {/* Left toolbar */}
        <div className="w-10 border-r border-gray-100 bg-gray-50/80 flex flex-col items-center py-3 gap-2.5">
          {([Plus, Move, RotateCcw, Settings] as const).map((Icon, i) => (
            <button key={i} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${i === 0 ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30" : "text-gray-400 hover:bg-gray-200"}`}>
              <Icon size={13} />
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div className="flex-1 relative h-[220px] bg-white overflow-hidden">
          {/* Dot grid */}
          <svg className="absolute inset-0 w-full h-full opacity-40" aria-hidden>
            <defs>
              <pattern id="hwidots" width="18" height="18" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.8" fill="#d1d5db" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hwidots)" />
          </svg>

          {/* Connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line x1="122" y1="46" x2="164" y2="46" stroke="#10b981" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.7" />
            <line x1="262" y1="46" x2="304" y2="46" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.7" />
            <line x1="94" y1="74" x2="94" y2="128" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.5" />
            <line x1="188" y1="46" x2="188" y2="128" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.4" />
            {/* Animated flow dot */}
            <motion.circle r="3" fill="#10b981" opacity="0.9"
              animate={{ cx: [24, 164, 304], cy: [46, 46, 46] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "linear", repeatDelay: 0.3 }}
            />
          </svg>

          {/* Nodes */}
          {BUILDER_NODES.map((node, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.08 }}
              className="absolute bg-white rounded-xl border-2 px-3 py-2 shadow-md cursor-pointer hover:-translate-y-0.5 transition-transform"
              style={{ left: node.x, top: node.y, borderColor: node.color + "35" }}
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: node.color + "15", color: node.color }}>
                  <node.Icon size={11} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-700 text-gray-700 whitespace-nowrap">{node.label}</span>
              </div>
              <div className="flex gap-0.5 mt-1.5">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex-1 h-0.5 rounded-full" style={{ background: j < 2 ? node.color + "60" : "#e5e7eb" }} />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ExportVisual({ active }: { active: boolean }) {
  return (
    <motion.div
      animate={{ opacity: active ? 1 : 0.3, scale: active ? 1 : 0.97 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6"
    >
      <p className="text-xs font-700 text-gray-400 uppercase tracking-wider mb-4">Export Panel</p>
      <div className="space-y-3">
        {[
          { fmt: "MT5 Expert Advisor (.ex5)", status: "Ready", color: "emerald" },
          { fmt: "MT4 Expert Advisor (.ex4)", status: "Ready", color: "emerald" },
          { fmt: "MQL5 Source (.mq5)", status: "Pro", color: "indigo" },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                  <FileText size={14} />
                </div>
              <span className="text-sm font-500 text-gray-700">{item.fmt}</span>
            </div>
            <span className={`text-xs font-700 px-2 py-0.5 rounded-full ${item.color === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"}`}>
              {item.status}
            </span>
          </div>
        ))}
      </div>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="mt-4 w-full bg-emerald-500 text-white font-700 py-3 rounded-xl shadow-lg shadow-emerald-500/25 text-sm flex items-center justify-center gap-2"
      >
        <FileDown size={15} /> Export Strategy
      </motion.button>
    </motion.div>
  );
}

const BACKTEST_STATS = [
  { label: "Net Profit", value: "+$18,420", positive: true },
  { label: "Profit Factor", value: "1.84", positive: true },
  { label: "Max Drawdown", value: "8.2%", positive: false },
  { label: "Win Rate", value: "67.4%", positive: true },
  { label: "Total Trades", value: "342", positive: null },
  { label: "Sharpe Ratio", value: "1.62", positive: true },
];

function BacktestVisual({ active }: { active: boolean }) {
  return (
    <motion.div
      animate={{ opacity: active ? 1 : 0.3, scale: active ? 1 : 0.97 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-10 border-b border-gray-100 bg-gray-50/80">
        <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white text-[9px] font-800">MT</div>
        <span className="text-sm font-700 text-gray-700">MetaTrader 5 — Strategy Tester</span>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] font-700 text-emerald-600">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Test complete
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3">
        {BACKTEST_STATS.map((s, i) => (
          <div key={i} className={`px-4 py-3 ${i < 3 ? "border-b" : ""} ${i % 3 < 2 ? "border-r" : ""} border-gray-100`}>
            <p className="text-[9px] font-700 text-gray-400 uppercase tracking-wide mb-0.5">{s.label}</p>
            <p className={`text-sm font-800 ${s.positive === true ? "text-emerald-600" : s.positive === false ? "text-red-500" : "text-gray-900"}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Equity curve */}
      <div className="px-4 pb-4 pt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[10px] font-600 text-gray-400">
            <TrendingUp size={11} className="text-emerald-500" />
            Equity Curve
          </div>
          <span className="text-[10px] text-gray-400">2020.01 → 2024.12</span>
        </div>
        <div className="relative h-20 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
          {/* Grid lines */}
          <svg className="absolute inset-0 w-full h-full" aria-hidden>
            {[25, 50, 75].map(y => (
              <line key={y} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke="#f3f4f6" strokeWidth="1" />
            ))}
          </svg>
          <svg viewBox="0 0 400 80" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="btGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,72 L30,68 L60,62 L80,66 L110,54 L140,46 L160,50 L190,38 L220,32 L250,28 L280,20 L310,14 L340,10 L370,6 L400,3" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
            <path d="M0,72 L30,68 L60,62 L80,66 L110,54 L140,46 L160,50 L190,38 L220,32 L250,28 L280,20 L310,14 L340,10 L370,6 L400,3 L400,80 L0,80Z" fill="url(#btGrad)" />
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" ref={ref} className="py-12 sm:py-16 md:py-32 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20"
        >
          <span className="text-sm font-700 text-emerald-500 uppercase tracking-widest">How It Works</span>
          <h2 className="mt-3 text-3xl md:text-4xl xl:text-5xl font-800 text-gray-900 tracking-tight">
            From idea to live EA in minutes
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
            Three steps from concept to a fully functional MT5 Expert Advisor.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-start">
          {/* Left: Steps */}
          <div className="space-y-6">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => setActiveStep(i)}
                className={`cursor-pointer rounded-2xl border p-6 transition-all duration-300 ${
                  activeStep === i
                    ? "bg-white border-emerald-200 shadow-lg shadow-emerald-500/5"
                    : "bg-white/50 border-gray-100 hover:border-gray-200 hover:bg-white"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-800 shrink-0 transition-all"
                    style={{
                      background: activeStep === i ? step.color + "15" : "#f3f4f6",
                      color: activeStep === i ? step.color : "#9ca3af",
                    }}
                  >
                    {step.number}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-700 text-gray-900">{step.title}</h3>
                      <span className="text-xs font-600 text-gray-400">{step.subtitle}</span>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={activeStep === i ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-wrap gap-2 mt-3">
                        {step.features.map((f, j) => (
                          <span key={j} className="inline-flex items-center gap-1 text-xs font-600 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100 text-gray-600">
                            <Check size={10} className="text-emerald-500 shrink-0" strokeWidth={2.5} />{f}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right: Sticky visual — hidden on mobile */}
          <div className="hidden lg:block sticky top-24">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              {activeStep === 0 && <BuilderVisual active={true} />}
              {activeStep === 1 && <ExportVisual active={true} />}
              {activeStep === 2 && <BacktestVisual active={true} />}
              <p className="text-center text-xs text-gray-400 mt-4">
                Step {activeStep + 1} of 3 — click each step to explore
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
