"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowUpRight, Zap, ArrowDownRight, Grid2x2, Newspaper, type LucideIcon } from "lucide-react";

const modules: { Icon: LucideIcon; iconBg: string; title: string; description: string; features: string[]; badge: string }[] = [
  {
    Icon: ArrowUpRight,
    iconBg: "#10b981",
    title: "Entry Logic",
    description: "Define precise conditions for trade entries using indicators, price action, and custom signals.",
    features: [
      "50+ indicator conditions",
      "Price action patterns",
      "Multi-timeframe logic",
      "Session-based filters",
      "Custom signal inputs",
    ],
    badge: "Core",
  },
  {
    Icon: Zap,
    iconBg: "#6366f1",
    title: "Risk Engine",
    description: "Protect your capital with sophisticated risk management rules built into every strategy.",
    features: [
      "Dynamic lot sizing",
      "Max daily drawdown",
      "Per-trade stop loss",
      "Equity curve filter",
      "Margin protection",
    ],
    badge: "Essential",
  },
  {
    Icon: ArrowDownRight,
    iconBg: "#f59e0b",
    title: "Exit Logic",
    description: "Control exactly how and when your trades close — from fixed targets to trailing logic.",
    features: [
      "Trailing stop engine",
      "Partial close levels",
      "Time-based exits",
      "Breakeven rules",
      "Opposite signal exit",
    ],
    badge: "Core",
  },
  {
    Icon: Grid2x2,
    iconBg: "#3b82f6",
    title: "Grid Systems",
    description: "Build sophisticated grid and martingale strategies with complete visual control.",
    features: [
      "Fixed grid spacing",
      "Dynamic grid levels",
      "Zone recovery logic",
      "Grid lot multiplier",
      "Max grid orders",
    ],
    badge: "Advanced",
  },
  {
    Icon: Newspaper,
    iconBg: "#ef4444",
    title: "News Filters",
    description: "Protect open trades during high-impact news events automatically.",
    features: [
      "Economic calendar integration",
      "Pre/post news pause",
      "Impact level filter",
      "Currency pair filter",
      "Auto resume after news",
    ],
    badge: "Pro",
  },
];

export default function StrategyModules() {
  const [hovered, setHovered] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="modules" ref={ref} className="py-16 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <span className="text-sm font-700 text-emerald-500 uppercase tracking-widest">Strategy Modules</span>
          <h2 className="mt-3 text-3xl md:text-4xl xl:text-5xl font-800 text-gray-900 tracking-tight">
            Every module you need
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
            Compose your strategy from battle-tested logic blocks trusted by professional traders.
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {modules.map((mod, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              onHoverStart={() => setHovered(i)}
              onHoverEnd={() => setHovered(null)}
              className="relative group cursor-pointer"
            >
              <motion.div
                animate={{
                  y: hovered === i ? -4 : 0,
                  boxShadow: hovered === i
                    ? `0 20px 60px ${mod.iconBg}15, 0 4px 20px rgba(0,0,0,0.06)`
                    : "0 1px 3px rgba(0,0,0,0.04)",
                }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-2xl border border-gray-100 p-6 h-full"
              >
                {/* Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300"
                    style={{
                      background: hovered === i ? mod.iconBg + "20" : "#f9fafb",
                      color: hovered === i ? mod.iconBg : "#9ca3af",
                    }}
                  >
                    <mod.Icon size={20} strokeWidth={2} />
                  </div>
                  <span
                    className="text-xs font-700 px-2 py-0.5 rounded-full"
                    style={{
                      background: mod.iconBg + "12",
                      color: mod.iconBg,
                    }}
                  >
                    {mod.badge}
                  </span>
                </div>

                <h3 className="text-base font-700 text-gray-900 mb-2">{mod.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{mod.description}</p>

                {/* Features — revealed on hover */}
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={hovered === i ? { opacity: 1, height: "auto" } : { opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 border-t border-gray-100 space-y-1.5">
                    {mod.features.map((f, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0" style={{ background: mod.iconBg + "20" }}>
                          <svg width="6" height="5" viewBox="0 0 6 5" fill="none">
                            <path d="M1 2.5L2.5 4L5 1" stroke={mod.iconBg} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-600">{f}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Hover arrow */}
                <motion.div
                  animate={{ opacity: hovered === i ? 1 : 0, x: hovered === i ? 0 : -4 }}
                  className="mt-4 flex items-center gap-1 text-xs font-700"
                  style={{ color: mod.iconBg }}
                >
                  Explore module <span>→</span>
                </motion.div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
