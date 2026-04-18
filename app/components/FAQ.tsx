"use client";

import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";

const faqs = [
  {
    q: "Do I need to know how to code to use Zentryx Lab?",
    a: "No. Zentryx Lab was built specifically for traders who want to automate their strategies without learning MQL4/MQL5. The entire builder is visual — you drag, drop, and connect logic blocks. If you can describe your strategy, you can build it.",
  },
  {
    q: "Is backtesting done on your platform?",
    a: "No — and that's by design. Backtesting is performed directly inside MetaTrader 5's native Strategy Tester after you export your EA. This gives you the most accurate, industry-standard backtest results using MT5's own engine. Zentryx Lab handles the building and exporting; MT5 handles the testing.",
  },
  {
    q: "Which brokers are compatible?",
    a: "Any broker that supports MetaTrader 4 or MetaTrader 5. Exported EAs are standard .ex4 and .ex5 files — they work on any MT4/MT5 platform regardless of broker. FTMO, MyForexFunds, The5ers, E8 Funding, and all major retail brokers are compatible.",
  },
  {
    q: "Can I sell the strategies I build?",
    a: "Yes, on the Creator plan ($99/mo). You can list your exported strategies on the Zentryx Marketplace and earn 70% of every sale. Your strategies remain your intellectual property.",
  },
  {
    q: "What happens if I cancel my subscription?",
    a: "You keep access until the end of your billing period. All exported EA files you've downloaded remain yours permanently. You lose access to the builder, premium modules, and Marketplace features after your plan expires.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — the Free plan is permanently free with up to 3 active strategies. Pro and Creator plans offer a 7-day money-back guarantee on first purchase so you can test the full platform risk-free.",
  },
  {
    q: "What's the difference between MT4 and MT5 export?",
    a: "Both are included on all paid plans. MT4 (.ex4) is compatible with brokers running the older MetaTrader 4 platform. MT5 (.ex5) is for MetaTrader 5, which has more advanced order types and supports more asset classes. We recommend MT5 for new strategies.",
  },
  {
    q: "Can I build grid and martingale strategies?",
    a: "Yes. Grid Systems and Recovery modules are available on Pro and Creator plans. You have full control over grid spacing, lot multipliers, max levels, and recovery logic — all without writing code.",
  },
];

function FAQItem({ q, a, i }: { q: string; a: string; i: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05, duration: 0.5 }}
      className="border-b border-gray-100 last:border-0"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-4 py-5 text-left group"
      >
        <span className={`text-base font-600 transition-colors ${open ? "text-emerald-600" : "text-gray-900 group-hover:text-emerald-600"}`}>
          {q}
        </span>
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors mt-0.5 ${open ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-500"}`}
        >
          <Plus size={14} strokeWidth={2.5} />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-gray-500 leading-relaxed text-[15px]">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQ() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="faq" ref={ref} className="py-16 md:py-32 bg-gray-50/50">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <span className="text-sm font-700 text-emerald-500 uppercase tracking-widest">FAQ</span>
          <h2 className="mt-3 text-3xl md:text-4xl xl:text-5xl font-800 text-gray-900 tracking-tight">
            Common questions
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Everything you need to know before building your first EA.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="bg-white rounded-2xl border border-gray-100 px-8 py-2 shadow-sm"
        >
          {faqs.map((faq, i) => (
            <FAQItem key={i} q={faq.q} a={faq.a} i={i} />
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
          className="text-center mt-8 text-sm text-gray-400"
        >
          Still have questions?{" "}
          <a href="mailto:hello@zentryx.studio" className="text-emerald-500 font-600 hover:text-emerald-600 transition-colors">
            hello@zentryx.studio
          </a>
        </motion.p>
      </div>
    </section>
  );
}
