"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Check, ShieldCheck, Zap, RotateCcw } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: { monthly: 0, annual: 0 },
    description: "Build and explore with no commitment.",
    cta: "Get Started Free",
    ctaStyle: "outline",
    features: [
      "3 active strategies",
      "Visual strategy builder",
      "MT5 .mq5 export (obfuscated)",
      "Zentryx AI — 15 trial messages",
      "Core node library",
      "Email support",
    ],
    popular: false,
  },
  {
    name: "Pro",
    price: { monthly: 49, annual: 39 },
    description: "For serious traders building production EAs.",
    cta: "Start Pro Trial",
    ctaStyle: "primary",
    features: [
      "Unlimited strategies",
      "Advanced nodes (risk %, trailing, ATR…)",
      "Readable MQL5 source + clipboard copy",
      "Zentryx AI — 30 trial messages",
      "Strategy versioning",
      "Priority support",
    ],
    popular: true,
    badge: "Most Popular",
  },
  {
    name: "Creator",
    price: { monthly: 99, annual: 79 },
    description: "Sell strategies and build a trading business.",
    cta: "Become a Creator",
    ctaStyle: "dark",
    features: [
      "Everything in Pro",
      "Zentryx AI — 150 messages / day",
      "Marketplace publishing",
      "Revenue sharing 70%",
      "Creator analytics",
      "Early access to new nodes",
    ],
    popular: false,
  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="pricing" ref={ref} className="py-16 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <span className="text-sm font-700 text-emerald-500 uppercase tracking-widest">Pricing</span>
          <h2 className="mt-3 text-3xl md:text-4xl xl:text-5xl font-800 text-gray-900 tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
            Start free. Scale as your strategy portfolio grows.
          </p>

          {/* Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-2 rounded-lg text-sm font-600 transition-all ${!annual ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-2 rounded-lg text-sm font-600 transition-all flex items-center gap-2 ${annual ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
            >
              Annual
              <span className="text-xs font-700 text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-full">-20%</span>
            </button>
          </div>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
              className={`relative rounded-3xl p-8 transition-all duration-300 ${
                plan.popular
                  ? "bg-white border-2 border-emerald-400 shadow-2xl shadow-emerald-500/15"
                  : "bg-gray-50 border border-gray-100"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-emerald-500 text-white text-xs font-700 px-4 py-1.5 rounded-full shadow-lg shadow-emerald-500/30">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-700 text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
              </div>

              <div className="mb-8">
                <div className="flex items-end gap-1">
                  <motion.span
                    key={annual ? "annual" : "monthly"}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl sm:text-5xl font-800 text-gray-900"
                  >
                    ${annual ? plan.price.annual : plan.price.monthly}
                  </motion.span>
                  {plan.price.monthly > 0 && (
                    <span className="text-gray-400 font-500 mb-2">/mo</span>
                  )}
                </div>
                {annual && plan.price.monthly > 0 && (
                  <p className="text-xs text-emerald-600 font-600 mt-1">
                    Save ${(plan.price.monthly - plan.price.annual) * 12}/year
                  </p>
                )}
              </div>

              <motion.a
                href="#"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`block w-full text-center py-3.5 rounded-2xl text-sm font-700 transition-all mb-8 ${
                  plan.ctaStyle === "primary"
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600"
                    : plan.ctaStyle === "dark"
                    ? "bg-gray-900 text-white hover:bg-gray-800"
                    : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                {plan.cta}
              </motion.a>

              <div className="space-y-3">
                {plan.features.map((f, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${plan.popular ? "bg-emerald-50" : "bg-gray-100"}`}>
                      <Check size={10} className={plan.popular ? "text-emerald-500" : "text-gray-500"} strokeWidth={3} />
                    </div>
                    <span className="text-sm text-gray-600">{f}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-8 flex flex-wrap justify-center gap-3 md:gap-6"
        >
          {[
            { icon: ShieldCheck, text: "7-day money-back guarantee" },
            { icon: RotateCcw, text: "Cancel anytime" },
            { icon: Zap, text: "Export in < 1s" },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-center gap-1.5 text-sm text-gray-400">
              <Icon size={14} className="text-emerald-500" strokeWidth={2} />
              {text}
            </div>
          ))}
        </motion.div>

        {/* Enterprise callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-gray-500">
            Need custom pricing for a prop firm or team?{" "}
            <a href="#" className="font-600 text-emerald-500 hover:text-emerald-600 transition-colors">
              Talk to us →
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
