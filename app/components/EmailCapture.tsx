"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function EmailCapture() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <section ref={ref} className="py-16 md:py-24 bg-gray-50/60">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-600 text-emerald-700">Join the waitlist — beta seats limited</span>
          </span>

          <h2 className="text-2xl md:text-3xl xl:text-4xl font-800 text-gray-900 tracking-tight mb-4">
            Get early access to new features
          </h2>
          <p className="text-gray-500 leading-relaxed mb-10">
            Be the first to access new strategy modules, marketplace drops, and platform updates. No spam — only what matters.
          </p>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="text-emerald-500" size={28} />
              </div>
              <p className="text-lg font-700 text-gray-900">You're on the list!</p>
              <p className="text-sm text-gray-500">We'll be in touch soon. Check your inbox.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 px-5 py-3.5 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 text-sm font-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white font-700 px-6 py-3.5 rounded-2xl shadow-lg shadow-emerald-500/25 transition-colors text-sm whitespace-nowrap"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Get Early Access <ArrowRight size={14} /></>
                )}
              </motion.button>
            </form>
          )}

          <p className="text-xs text-gray-400 mt-4">No credit card required. Unsubscribe at any time.</p>
        </motion.div>
      </div>
    </section>
  );
}
