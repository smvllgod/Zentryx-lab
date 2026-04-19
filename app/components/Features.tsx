"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Hexagon, Download, Store, Zap, ArrowLeftRight, CheckCircle2, Sparkles, type LucideIcon } from "lucide-react";

function BuilderPreview() {
  const nodes = [
    { label: "Entry", x: 30, y: 40, color: "#10b981" },
    { label: "Risk", x: 160, y: 40, color: "#6366f1" },
    { label: "Exit", x: 290, y: 40, color: "#f59e0b" },
    { label: "Filter", x: 95, y: 130, color: "#ef4444" },
  ];

  return (
    <div className="flex-1 mt-4 relative rounded-xl border border-gray-100 bg-gray-50/60 overflow-hidden min-h-0">
      {/* dot grid */}
      <svg className="absolute inset-0 w-full h-full opacity-40">
        <defs>
          <pattern id="feat-dots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="#d1d5db" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#feat-dots)" />
      </svg>

      {/* connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <line x1="88" y1="56" x2="160" y2="56" stroke="#10b981" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.6" />
        <line x1="218" y1="56" x2="290" y2="56" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.6" />
        <line x1="95" y1="70" x2="95" y2="130" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.5" />
        {/* animated flow dot */}
        <motion.circle r="3.5" fill="#10b981"
          animate={{ cx: [30, 160, 290], cy: [56, 56, 56] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.5 }}
        />
      </svg>

      {/* nodes */}
      {nodes.map((n, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 + i * 0.1 }}
          className="absolute bg-white rounded-xl border-2 px-3 py-2 shadow-md"
          style={{ left: n.x, top: n.y, borderColor: n.color + "35" }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: n.color }} />
            <span className="text-[10px] font-700 text-gray-700">{n.label}</span>
          </div>
          <div className="flex gap-0.5 mt-1">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="flex-1 h-1 rounded-full" style={{ background: j < 2 ? n.color + "60" : "#e5e7eb" }} />
            ))}
          </div>
        </motion.div>
      ))}

      {/* Module chips bottom */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
        {["EMA Cross", "RSI Filter", "ATR Stop", "News Block", "Grid System", "Martingale", "Trailing SL"].map((m, i) => (
          <span key={i} className="text-[9px] font-600 px-2 py-0.5 rounded-full bg-white border border-gray-100 text-gray-500 shadow-sm">
            {m}
          </span>
        ))}
        <span className="text-[9px] font-700 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 shadow-sm">
          +193 more
        </span>
      </div>
    </div>
  );
}

const features: { title: string; description: string; Icon: LucideIcon; color: string; size: "large" | "medium" | "small"; mockup?: boolean }[] = [
  {
    title: "Visual Strategy Builder",
    description: "Drag-and-drop canvas with 200+ logic blocks. Connect nodes, set parameters, build complex strategies without writing a single line of code.",
    Icon: Hexagon,
    color: "#10b981",
    size: "large",
    mockup: true,
  },
  {
    title: "One-Click MT5 Export",
    description: "Compile your strategy to a native .ex5 file instantly. Production-ready code optimized for MetaTrader 5.",
    Icon: Download,
    color: "#6366f1",
    size: "small",
  },
  {
    title: "Strategy Marketplace",
    description: "Browse, purchase and deploy proven strategies from top creators. Or sell your own.",
    Icon: Store,
    color: "#f59e0b",
    size: "small",
  },
  {
    title: "Risk Engine",
    description: "Institutional-grade risk management built into every export. Drawdown limits, lot sizing, equity curve filters.",
    Icon: Zap,
    color: "#ef4444",
    size: "small",
  },
  {
    title: "Multi-Pair Support",
    description: "Run your strategy across multiple currency pairs simultaneously with pair-specific parameter sets.",
    Icon: ArrowLeftRight,
    color: "#3b82f6",
    size: "small",
  },
  {
    title: "Real-Time Validation",
    description: "Strategy errors caught before export. Logic conflicts, missing connections, parameter ranges — all validated instantly.",
    Icon: CheckCircle2,
    color: "#8b5cf6",
    size: "small",
  },
  {
    title: "Zentryx AI Helper",
    description: "An AI co-builder watches your canvas. Ask it to add a trailing stop, fix a validation error, or draft a full strategy — it executes the changes on your graph in real time. Free tier gets 15 trial messages, Pro 30, Creator 150 per day.",
    Icon: Sparkles,
    color: "#10b981",
    size: "medium",
  },
];

export default function Features() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="features" ref={ref} className="py-16 md:py-32 bg-gray-50/60">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <span className="text-sm font-700 text-emerald-500 uppercase tracking-widest">Features</span>
          <h2 className="mt-3 text-3xl md:text-4xl xl:text-5xl font-800 text-gray-900 tracking-tight">
            Everything you need to ship
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
            Professional-grade tooling designed for serious algorithmic traders.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-auto md:auto-rows-[200px]">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.07, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -3 }}
              className={`relative bg-white rounded-2xl border border-gray-100 overflow-hidden group cursor-default transition-shadow hover:shadow-xl hover:shadow-gray-100 ${
                feature.size === "large"
                  ? "md:col-span-2 md:row-span-2 min-h-[260px] sm:min-h-[320px] md:min-h-0"
                  : feature.size === "medium"
                  ? "md:col-span-2 min-h-[160px] md:min-h-0"
                  : "min-h-[160px] md:min-h-0"
              }`}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `radial-gradient(circle at 30% 30%, ${feature.color}08, transparent 70%)` }}
              />

              <div className={`absolute inset-0 p-4 md:p-6 flex flex-col ${feature.size === "large" ? "pb-5" : ""}`}>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shrink-0 transition-all duration-300 group-hover:scale-110"
                  style={{ background: feature.color + "15", color: feature.color }}
                >
                  <feature.Icon size={18} strokeWidth={2} />
                </div>

                <h3 className="text-lg font-700 text-gray-900 mb-1.5 shrink-0">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed shrink-0">{feature.description}</p>

                {feature.mockup && <BuilderPreview />}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {[
            { value: "200+", label: "Logic Blocks" },
            { value: "< 1s", label: "Export Time" },
            { value: "MT4 & MT5", label: "Compatible" },
            { value: "99.9%", label: "Uptime SLA" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-800 text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-400 font-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
