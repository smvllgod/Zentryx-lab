"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Marcus T.",
    role: "Prop Trader — FTMO",
    avatar: "MT",
    avatarColor: "#10b981",
    rating: 5,
    text: "I spent 3 months trying to find a developer to code my grid strategy. With Zentryx Lab I built it myself in an afternoon and exported a working MT5 EA. Passed my FTMO challenge 2 weeks later.",
    highlight: "Built & exported in one afternoon",
  },
  {
    name: "Aleksei R.",
    role: "Algo Trader — The5ers",
    avatar: "AR",
    avatarColor: "#6366f1",
    rating: 5,
    text: "The visual builder is genuinely impressive. The connection between nodes is intuitive, the risk engine covers everything I need, and the MT5 export just works. No messing with MQL5 syntax.",
    highlight: "Zero MQL5 knowledge required",
  },
  {
    name: "James K.",
    role: "Strategy Creator — Marketplace",
    avatar: "JK",
    avatarColor: "#f59e0b",
    rating: 5,
    text: "I've sold 14 strategies on the marketplace in 60 days. The 70% revenue split is fair and the Creator dashboard makes tracking earnings easy. Best decision for my trading business.",
    highlight: "14 strategies sold in 60 days",
  },
  {
    name: "Sophie M.",
    role: "Retail Trader — E8 Funding",
    avatar: "SM",
    avatarColor: "#ef4444",
    rating: 5,
    text: "I had zero coding background. Zentryx Lab's builder is so visual that I understood how to wire an entry signal to a trailing stop in minutes. My first EA was running in MT5 the same day.",
    highlight: "First EA live same day, zero coding",
  },
];

export default function Testimonials() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-16 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <span className="text-sm font-700 text-emerald-500 uppercase tracking-widest">Testimonials</span>
          <h2 className="mt-3 text-3xl md:text-4xl xl:text-5xl font-800 text-gray-900 tracking-tight">
            Traders who shipped
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
            From prop firm traders to independent creators — here's what they built.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="bg-gray-50 rounded-2xl border border-gray-100 p-7 hover:border-emerald-100 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 group"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} size={13} className="text-amber-400 fill-amber-400" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-gray-700 leading-relaxed mb-6 text-[15px]">
                &ldquo;{t.text}&rdquo;
              </p>

              {/* Highlight pill */}
              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs font-700 text-emerald-700">{t.highlight}</span>
              </div>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-800 text-white shrink-0"
                  style={{ background: t.avatarColor }}
                >
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-700 text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400 font-500">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Aggregate rating */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 border border-gray-100 rounded-2xl p-6 bg-gray-50"
        >
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-800 text-gray-900">4.9</div>
            <div className="flex gap-0.5 justify-center mt-1">
              {[...Array(5)].map((_, i) => <Star key={i} size={13} className="text-amber-400 fill-amber-400" />)}
            </div>
            <p className="text-xs text-gray-400 mt-1">Average rating</p>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-800 text-gray-900">2.4k+</div>
            <p className="text-xs text-gray-400 mt-2">Strategies built</p>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-800 text-gray-900">40+</div>
            <p className="text-xs text-gray-400 mt-2">Countries</p>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-800 text-gray-900">98%</div>
            <p className="text-xs text-gray-400 mt-2">Export success rate</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
