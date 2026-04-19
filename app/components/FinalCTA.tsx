"use client";

import { useRef } from "react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { ArrowRight } from "lucide-react";

function MagneticButton({ children, className }: { children: React.ReactNode; className: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - (rect.left + rect.width / 2)) * 0.3);
    y.set((e.clientY - (rect.top + rect.height / 2)) * 0.3);
  };
  const handleMouseLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.a
      ref={ref}
      href="#pricing"
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </motion.a>
  );
}

const stats = [
  { value: "2,400+", label: "Strategies Built" },
  { value: "40+", label: "Countries" },
  { value: "98%", label: "Export Success" },
  { value: "< 1s", label: "Average Export Time" },
];

export default function FinalCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-16 md:py-32 overflow-hidden bg-white">
      {/* Background */}
      <div className="absolute inset-0 grid-bg opacity-60" />
      <motion.div
        animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.7, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[200px] md:w-[600px] md:h-[400px] ambient-orb pointer-events-none"
      />

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-600 text-emerald-700">Free to start — no credit card required</span>
          </span>

          <h2 className="text-3xl md:text-5xl xl:text-6xl font-800 text-gray-900 tracking-tight leading-[1.05] mb-6">
            Your trading robot is{" "}
            <span className="text-gradient-em">waiting to be built</span>
          </h2>
          <p className="text-base md:text-xl text-gray-500 leading-relaxed mb-10 max-w-2xl mx-auto">
            Join thousands of traders who automate their strategies without writing a line of code.
            Build your first EA in under 10 minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-md sm:max-w-none mx-auto">
            <MagneticButton
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-700 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl shadow-xl shadow-emerald-500/30 transition-colors text-base"
            >
              Start Building Free
              <ArrowRight size={18} />
            </MagneticButton>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 hover:border-emerald-200 hover:text-emerald-600 font-600 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl transition-all text-base shadow-sm"
            >
              See how it works
            </a>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-12 md:mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4 + i * 0.08, duration: 0.5 }}
            >
              <div className="text-4xl font-800 text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-400 font-500 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
