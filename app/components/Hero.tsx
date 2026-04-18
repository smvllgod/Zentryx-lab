"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { ArrowRight, Play, Check, ShieldCheck, Zap, Star, Plus, Move, RotateCcw, Settings, TrendingUp, AlertTriangle, Grid2x2, ArrowUpRight, ArrowDownRight, Newspaper } from "lucide-react";

const words = ["Build", "Your", "Own", "Trading", "Robot", "Without", "Writing", "Code"];

function MagneticButton({ children, className, href }: { children: React.ReactNode; className: string; href: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * 0.25);
    y.set((e.clientY - cy) * 0.25);
  };
  const handleMouseLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.a
      ref={ref}
      href={href}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </motion.a>
  );
}

function BuilderMockup() {
  const [activeStep, setActiveStep] = useState(0);
  const [dotPos, setDotPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(s => (s + 1) % 3);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let progress = 0;
    const anim = setInterval(() => {
      progress = (progress + 0.01) % 1;
      // Animate dot along path from entry to risk
      setDotPos({
        x: 80 + progress * 120,
        y: 60 + Math.sin(progress * Math.PI) * 20,
      });
    }, 16);
    return () => clearInterval(anim);
  }, []);

  const nodes = [
    { id: "entry", label: "Entry Logic", x: 40, y: 50, color: "#10b981", Icon: ArrowUpRight },
    { id: "risk", label: "Risk Engine", x: 200, y: 50, color: "#6366f1", Icon: Zap },
    { id: "exit", label: "Exit Logic", x: 360, y: 50, color: "#f59e0b", Icon: ArrowDownRight },
    { id: "filter", label: "News Filter", x: 120, y: 170, color: "#ef4444", Icon: Newspaper },
    { id: "grid", label: "Grid System", x: 280, y: 170, color: "#3b82f6", Icon: Grid2x2 },
  ];

  const connections = [
    { x1: 110, y1: 65, x2: 200, y2: 65 },
    { x1: 270, y1: 65, x2: 360, y2: 65 },
    { x1: 120, y1: 80, x2: 120, y2: 170 },
    { x1: 200, y1: 80, x2: 200, y2: 170 },
  ];

  return (
    <div className="relative w-full bg-white rounded-2xl border border-gray-200 shadow-2xl shadow-gray-200/80 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 h-10 border-b border-gray-100 bg-gray-50/80">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <span className="ml-3 text-xs font-500 text-gray-400">Zentryx Lab — Strategy Builder</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 font-600 border border-emerald-100">● Live</span>
        </div>
      </div>

      <div className="flex h-[420px]">
        {/* Left toolbar */}
        <div className="w-12 border-r border-gray-100 bg-gray-50 flex flex-col items-center py-4 gap-4">
          {([Plus, Move, RotateCcw, Settings] as const).map((Icon, i) => (
            <button key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${i === 0 ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" : "text-gray-400 hover:bg-gray-200"}`}>
              <Icon size={14} />
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div className="flex-1 relative bg-white overflow-hidden">
          {/* Grid lines */}
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.4 }}>
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {connections.map((c, i) => (
              <g key={i}>
                <line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke="#e5e7eb" strokeWidth="2" />
                <line
                  x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="60"
                  strokeDashoffset="0"
                  opacity="0.6"
                  style={{
                    animation: `dataFlow ${1.5 + i * 0.3}s linear infinite`,
                  }}
                />
              </g>
            ))}
            {/* Animated dot */}
            <circle cx={dotPos.x} cy={dotPos.y + 50} r="4" fill="#10b981" opacity="0.8" />
          </svg>

          {/* Nodes */}
          {nodes.map((node, i) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 + 0.3 }}
              style={{ left: node.x, top: node.y }}
              className={`absolute cursor-pointer group`}
            >
              <div
                className={`w-[110px] rounded-xl border-2 bg-white shadow-lg p-3 transition-all duration-200 group-hover:shadow-xl group-hover:-translate-y-0.5`}
                style={{ borderColor: node.color + "40" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: node.color + "15", color: node.color }}
                  >
                    <node.Icon size={12} strokeWidth={2.5} />
                  </span>
                  <span className="text-[10px] font-700 text-gray-700 leading-none">{node.label}</span>
                </div>
                <div className="flex gap-1 mt-1">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="flex-1 h-1 rounded-full" style={{ background: j < 2 ? node.color : "#e5e7eb" }} />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Right panel */}
        <div className="w-56 border-l border-gray-100 bg-gray-50/60 p-4 flex flex-col gap-4">
          <div>
            <p className="text-[10px] font-700 uppercase tracking-wider text-gray-400 mb-2">Export</p>
            <div className="space-y-2">
              {["MT4 (.ex4)", "MT5 (.ex5)"].map((fmt, i) => (
                <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-500 cursor-pointer transition-all ${i === 1 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-white text-gray-600"}`}>
                  <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${i === 1 ? "border-emerald-500" : "border-gray-300"}`}>
                    {i === 1 && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  </div>
                  {fmt}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-700 uppercase tracking-wider text-gray-400 mb-2">Risk Settings</p>
            <div className="space-y-2">
              <div className="bg-white border border-gray-200 rounded-lg p-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] text-gray-500">Max DD</span>
                  <span className="text-[9px] font-700 text-gray-700">5%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: "50%" }} />
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] text-gray-500">Lot Size</span>
                  <span className="text-[9px] font-700 text-gray-700">0.01</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: "20%" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Sparkline */}
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <p className="text-[9px] font-700 text-gray-400 uppercase tracking-wide mb-2">Equity Curve</p>
            <svg viewBox="0 0 100 40" className="w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,35 L10,30 L20,28 L30,25 L40,22 L50,20 L55,23 L60,18 L70,12 L80,8 L90,5 L100,3" fill="none" stroke="#10b981" strokeWidth="1.5" />
              <path d="M0,35 L10,30 L20,28 L30,25 L40,22 L50,20 L55,23 L60,18 L70,12 L80,8 L90,5 L100,3 L100,40 L0,40Z" fill="url(#sparkGrad)" />
            </svg>
            <div className="flex justify-between mt-1">
              <span className="text-[8px] text-gray-400">30 days</span>
              <span className="text-[8px] font-700 text-emerald-500">+18.4%</span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-700 py-2.5 rounded-xl shadow-lg shadow-emerald-500/30 transition-colors"
          >
            Export to MT5 →
          </motion.button>
        </div>
      </div>
    </div>
  );
}

const PARTICLES = [
  { id: 0,  x: 15.2, y: 12.6, size: 2.0, duration: 5.2, delay: 0.0 },
  { id: 1,  x: 69.6, y: 49.4, size: 4.9, duration: 7.1, delay: 1.3 },
  { id: 2,  x: 2.1,  y: 38.2, size: 3.7, duration: 6.4, delay: 2.1 },
  { id: 3,  x: 28.7, y: 98.5, size: 3.4, duration: 4.8, delay: 0.7 },
  { id: 4,  x: 40.0, y: 52.0, size: 4.7, duration: 8.3, delay: 3.2 },
  { id: 5,  x: 8.5,  y: 70.3, size: 4.9, duration: 5.7, delay: 1.8 },
  { id: 6,  x: 65.8, y: 32.9, size: 4.9, duration: 6.9, delay: 0.4 },
  { id: 7,  x: 44.8, y: 6.0,  size: 5.4, duration: 9.1, delay: 2.6 },
  { id: 8,  x: 2.8,  y: 58.4, size: 5.8, duration: 7.5, delay: 1.1 },
  { id: 9,  x: 33.6, y: 13.3, size: 3.2, duration: 4.3, delay: 3.8 },
  { id: 10, x: 77.6, y: 26.6, size: 4.8, duration: 6.2, delay: 0.9 },
  { id: 11, x: 0.6,  y: 7.2,  size: 4.3, duration: 5.5, delay: 2.4 },
  { id: 12, x: 31.9, y: 25.4, size: 3.8, duration: 8.7, delay: 1.6 },
  { id: 13, x: 83.3, y: 45.5, size: 5.7, duration: 7.0, delay: 0.2 },
  { id: 14, x: 46.8, y: 97.0, size: 3.5, duration: 5.9, delay: 3.0 },
  { id: 15, x: 58.2, y: 46.9, size: 2.9, duration: 6.6, delay: 1.4 },
  { id: 16, x: 57.2, y: 91.7, size: 2.9, duration: 4.6, delay: 2.9 },
  { id: 17, x: 6.6,  y: 86.6, size: 4.1, duration: 7.8, delay: 0.6 },
  { id: 18, x: 69.4, y: 47.3, size: 5.4, duration: 5.1, delay: 3.5 },
  { id: 19, x: 78.1, y: 33.2, size: 5.3, duration: 8.0, delay: 1.9 },
];

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, -60]);
  const y2 = useTransform(scrollY, [0, 500], [0, -30]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);

  const particles = PARTICLES;

  return (
    <section ref={containerRef} className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-white pt-16">
      {/* Animated grid */}
      <div className="absolute inset-0 grid-bg" />

      {/* Ambient orbs */}
      <motion.div
        style={{ y: y1 }}
        className="absolute top-20 left-1/4 w-96 h-96 ambient-orb pointer-events-none"
        animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.8, 0.6] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        style={{ y: y2 }}
        className="absolute top-40 right-1/4 w-80 h-80 ambient-orb pointer-events-none"
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.5, 0.7, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-emerald-400 pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: 0.4,
          }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -20, -40, 0],
            opacity: [0.4, 0.7, 0.3, 0.4],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      <div className="relative max-w-7xl mx-auto px-6 py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left: Copy */}
          <motion.div style={{ opacity }}>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-4 py-1.5 mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-600 text-emerald-700">No-code MT4/MT5 strategy builder</span>
            </motion.div>

            {/* Headline */}
            <div className="mb-6">
              <motion.h1
                className="text-4xl md:text-5xl xl:text-6xl font-800 leading-[1.05] tracking-tight text-gray-900"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.06 } },
                }}
              >
                {["Build Your Own", "Trading Robot", "Without Writing Code"].map((line, li) => (
                  <motion.span
                    key={li}
                    className={`block ${li === 1 ? "text-gradient-em pb-2" : ""}`}
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
                    }}
                  >
                    {line}
                  </motion.span>
                ))}
              </motion.h1>
            </div>

            {/* Sub */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-lg text-gray-500 leading-relaxed mb-10 max-w-md"
            >
              Design, export and launch automated MT4/MT5 strategies through a visual strategy builder.
              No programming required.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap gap-4"
            >
              <MagneticButton
                href="#pricing"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-700 px-6 py-3.5 rounded-2xl shadow-xl shadow-emerald-500/30 transition-colors text-sm"
              >
                Start Building Free
                <ArrowRight size={16} />
              </MagneticButton>
              <MagneticButton
                href="#how-it-works"
                className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:border-emerald-200 hover:text-emerald-600 font-600 px-6 py-3.5 rounded-2xl transition-all text-sm shadow-sm"
              >
                <Play size={14} className="text-emerald-500" />
                See How It Works
              </MagneticButton>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.85, duration: 0.6 }}
              className="flex flex-wrap items-center gap-5 mt-5"
            >
              {[
                { icon: Check, text: "No credit card required" },
                { icon: ShieldCheck, text: "Cancel anytime" },
                { icon: Zap, text: "Export in < 1s" },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Icon size={13} className="text-emerald-500" strokeWidth={2.5} />
                  {text}
                </div>
              ))}
            </motion.div>

            {/* Social proof mini */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.6 }}
              className="flex items-center gap-6 mt-10"
            >
              <div className="flex -space-x-2">
                {["#10b981", "#6366f1", "#f59e0b", "#ef4444"].map((c, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-700 text-white" style={{ background: c }}>
                    {["JD", "MK", "AR", "TL"][i]}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={12} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">2,400+ strategies built</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ y: y2 }}
            className="relative hidden lg:block"
          >
            {/* Glow behind mockup */}
            <div className="absolute -inset-8 bg-emerald-400/10 rounded-3xl blur-3xl" />
            <BuilderMockup />
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2"
      >
        <span className="text-xs text-gray-400 font-500">Scroll to explore</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-5 h-8 rounded-full border-2 border-gray-200 flex items-start justify-center pt-1.5"
        >
          <div className="w-1 h-2 rounded-full bg-emerald-400" />
        </motion.div>
      </motion.div>
    </section>
  );
}
