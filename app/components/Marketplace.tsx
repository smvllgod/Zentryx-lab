"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Star } from "lucide-react";

const strategies1 = [
  { name: "Apex Grid Pro", type: "Grid", winrate: "68%", pairs: "EURUSD", price: "$49", creator: "TradeFusion", rating: 4.9 },
  { name: "Scalp Master X", type: "Scalping", winrate: "74%", pairs: "GBPUSD", price: "$79", creator: "AlgoNinja", rating: 4.8 },
  { name: "Swing Hunter", type: "Swing", winrate: "61%", pairs: "USDJPY", price: "$39", creator: "SwingLabs", rating: 4.7 },
  { name: "Trend Rider EA", type: "Trend", winrate: "58%", pairs: "XAUUSD", price: "$99", creator: "GoldAlgo", rating: 4.9 },
  { name: "News Crusher", type: "News", winrate: "71%", pairs: "Multi", price: "$59", creator: "EventBot", rating: 4.6 },
  { name: "Night Scalper", type: "Scalping", winrate: "79%", pairs: "AUDUSD", price: "$69", creator: "NightFX", rating: 4.8 },
];

const strategies2 = [
  { name: "Zone Recovery AI", type: "Recovery", winrate: "65%", pairs: "Multi", price: "$89", creator: "ZoneIQ", rating: 4.7 },
  { name: "Breakout Beast", type: "Breakout", winrate: "63%", pairs: "EURUSD", price: "$45", creator: "BreakLab", rating: 4.5 },
  { name: "Martingale Pro", type: "Martingale", winrate: "77%", pairs: "GBPJPY", price: "$55", creator: "SafeMart", rating: 4.6 },
  { name: "RSI Maestro", type: "Mean Rev.", winrate: "69%", pairs: "USDJPY", price: "$35", creator: "RSILabs", rating: 4.8 },
  { name: "Hedge Master", type: "Hedging", winrate: "72%", pairs: "Multi", price: "$119", creator: "HedgeFX", rating: 4.9 },
  { name: "Session Trader", type: "Session", winrate: "66%", pairs: "GBPUSD", price: "$49", creator: "LondonFX", rating: 4.7 },
];

const typeColors: Record<string, string> = {
  Grid: "#3b82f6",
  Scalping: "#10b981",
  Swing: "#8b5cf6",
  Trend: "#f59e0b",
  News: "#ef4444",
  Recovery: "#6366f1",
  Breakout: "#14b8a6",
  Martingale: "#f97316",
  "Mean Rev.": "#ec4899",
  Hedging: "#84cc16",
  Session: "#06b6d4",
};

function StrategyCard({ strategy }: { strategy: typeof strategies1[0] }) {
  const color = typeColors[strategy.type] || "#10b981";
  return (
    <div className="shrink-0 w-64 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <span
          className="text-xs font-700 px-2.5 py-1 rounded-full"
          style={{ background: color + "15", color }}
        >
          {strategy.type}
        </span>
        <div className="flex items-center gap-1">
          <Star size={12} className="text-amber-400 fill-amber-400" />
          <span className="text-xs font-700 text-gray-700">{strategy.rating}</span>
        </div>
      </div>

      <h4 className="text-sm font-700 text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors">{strategy.name}</h4>
      <p className="text-xs text-gray-400 mb-4">by {strategy.creator}</p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-gray-50 rounded-xl p-2 text-center">
          <div className="text-sm font-800 text-gray-900">{strategy.winrate}</div>
          <div className="text-[9px] text-gray-400 uppercase tracking-wide font-600">Win Rate</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-2 text-center">
          <div className="text-sm font-800 text-gray-900">{strategy.pairs}</div>
          <div className="text-[9px] text-gray-400 uppercase tracking-wide font-600">Pairs</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-lg font-800 text-gray-900">{strategy.price}</span>
        <span className="text-xs font-700 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full group-hover:bg-emerald-500 group-hover:text-white transition-all">
          Get EA →
        </span>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="marketplace" ref={ref} className="py-16 md:py-32 bg-gray-50/50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div>
            <span className="text-sm font-700 text-emerald-500 uppercase tracking-widest">Marketplace</span>
            <h2 className="mt-3 text-3xl md:text-4xl xl:text-5xl font-800 text-gray-900 tracking-tight">
              Explore the Strategy Marketplace
            </h2>
            <p className="mt-4 text-base md:text-lg text-gray-500 max-w-xl">
              100+ ready-to-export Expert Advisors. Deploy in minutes, built by verified creators.
            </p>
          </div>
          <div className="hidden sm:flex gap-4 shrink-0">
            <div className="text-center">
              <div className="text-3xl font-800 text-gray-900">100+</div>
              <div className="text-xs text-gray-400 font-500">Strategies</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-800 text-gray-900">40+</div>
              <div className="text-xs text-gray-400 font-500">Creators</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-800 text-gray-900">4.8★</div>
              <div className="text-xs text-gray-400 font-500">Avg Rating</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Row 1 — scrolls left */}
      <div className="relative mb-4">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-gray-50/50 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-gray-50/50 to-transparent z-10 pointer-events-none" />
        <div className="flex overflow-hidden">
          <motion.div
            animate={{ x: [0, "-50%"] }}
            transition={{ duration: 40, ease: "linear", repeat: Infinity }}
            className="flex gap-4 pr-4 shrink-0"
          >
            {[...strategies1, ...strategies1].map((s, i) => (
              <StrategyCard key={i} strategy={s} />
            ))}
          </motion.div>
        </div>
      </div>

      {/* Row 2 — scrolls right */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-gray-50/50 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-gray-50/50 to-transparent z-10 pointer-events-none" />
        <div className="flex overflow-hidden">
          <motion.div
            animate={{ x: ["-50%", 0] }}
            transition={{ duration: 40, ease: "linear", repeat: Infinity }}
            className="flex gap-4 pr-4 shrink-0"
          >
            {[...strategies2, ...strategies2].map((s, i) => (
              <StrategyCard key={i} strategy={s} />
            ))}
          </motion.div>
        </div>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="mt-10 text-center"
      >
        <a
          href="#"
          className="inline-flex items-center gap-2 text-emerald-600 font-700 hover:text-emerald-700 transition-colors"
        >
          Browse all strategies →
        </a>
      </motion.div>
    </section>
  );
}
