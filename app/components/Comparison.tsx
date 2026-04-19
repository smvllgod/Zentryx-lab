"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Check, X, Minus } from "lucide-react";

const rows = [
  { feature: "No coding required", zentryx: "yes", mql5: "no", dev: "no" },
  { feature: "Build time for first EA", zentryx: "< 1 hour", mql5: "Weeks", dev: "2–4 weeks" },
  { feature: "Cost", zentryx: "From $0", mql5: "Free*", dev: "$500–$5,000+" },
  { feature: "MT4 & MT5 compatible", zentryx: "yes", mql5: "yes", dev: "partial" },
  { feature: "Edit & iterate instantly", zentryx: "yes", mql5: "no", dev: "no" },
  { feature: "Risk Engine built-in", zentryx: "yes", mql5: "manual", dev: "partial" },
  { feature: "Strategy Marketplace", zentryx: "yes", mql5: "no", dev: "no" },
  { feature: "Sell your strategies", zentryx: "yes", mql5: "no", dev: "limited" },
  { feature: "Backtesting", zentryx: "Via MT5*", mql5: "yes", dev: "yes" },
  { feature: "Own your EA files", zentryx: "yes", mql5: "yes", dev: "partial" },
];

type CellValue = "yes" | "no" | "partial" | "manual" | string;

function Cell({ value }: { value: CellValue }) {
  if (value === "yes") return (
    <div className="flex justify-center">
      <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
        <Check size={13} className="text-emerald-500" strokeWidth={2.5} />
      </div>
    </div>
  );
  if (value === "no") return (
    <div className="flex justify-center">
      <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center">
        <X size={13} className="text-gray-300" strokeWidth={2.5} />
      </div>
    </div>
  );
  if (value === "partial" || value === "manual" || value === "limited") return (
    <div className="flex justify-center">
      <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center">
        <Minus size={13} className="text-amber-400" strokeWidth={2.5} />
      </div>
    </div>
  );
  return <div className="text-center text-sm font-600 text-gray-600">{value}</div>;
}

export default function Comparison() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-16 md:py-32 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <span className="text-sm font-700 text-emerald-500 uppercase tracking-widest">Why Zentryx Lab</span>
          <h2 className="mt-3 text-3xl md:text-4xl xl:text-5xl font-800 text-gray-900 tracking-tight">
            The smarter way to automate
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
            Compare your options for building a trading robot.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm"
        >
          <div className="min-w-[560px]">
          {/* Header */}
          <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-100">
            <div className="px-6 py-4 col-span-1" />
            <div className="px-4 py-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z" fill="white" fillOpacity="0.9" />
                  </svg>
                </div>
                <span className="text-sm font-800 text-gray-900">Zentryx Lab</span>
              </div>
              <span className="text-xs text-emerald-500 font-700 bg-emerald-50 px-2 py-0.5 rounded-full">Recommended</span>
            </div>
            <div className="px-4 py-4 text-center">
              <p className="text-sm font-700 text-gray-700 mb-1">Manual MQL5</p>
              <p className="text-xs text-gray-400">Code it yourself</p>
            </div>
            <div className="px-4 py-4 text-center">
              <p className="text-sm font-700 text-gray-700 mb-1">Hire a Dev</p>
              <p className="text-xs text-gray-400">Freelance/agency</p>
            </div>
          </div>

          {/* Rows */}
          {rows.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-4 border-b border-gray-50 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
            >
              <div className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600 font-500 flex items-center">{row.feature}</div>
              {/* Zentryx — highlighted */}
              <div className="px-4 py-4 flex items-center justify-center bg-emerald-50/40">
                <Cell value={row.zentryx} />
              </div>
              <div className="px-4 py-4 flex items-center justify-center">
                <Cell value={row.mql5} />
              </div>
              <div className="px-4 py-4 flex items-center justify-center">
                <Cell value={row.dev} />
              </div>
            </div>
          ))}
          </div>
        </motion.div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          * MT5 free but requires months of learning. Backtesting done inside MetaTrader 5 Strategy Tester, not on platform.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="mt-10 text-center"
        >
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-700 px-7 py-3.5 rounded-2xl shadow-lg shadow-emerald-500/25 transition-colors"
          >
            Start Building Free →
          </a>
        </motion.div>
      </div>
    </section>
  );
}
