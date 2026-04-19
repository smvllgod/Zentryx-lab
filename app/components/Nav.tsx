"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "How It Works", hash: "how-it-works" },
  { label: "Modules", hash: "modules" },
  { label: "Features", hash: "features" },
  { label: "Pricing", hash: "pricing" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Docs", href: "/docs" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const navLinks = NAV_LINKS.map((l) => ({
    label: l.label,
    href: l.href ?? (isHome ? `#${l.hash}` : `/#${l.hash}`),
  }));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z" fill="white" fillOpacity="0.9" />
                <path d="M8 5L11 6.5V9.5L8 11L5 9.5V6.5L8 5Z" fill="white" />
              </svg>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[10px] font-500 text-gray-400 tracking-widest uppercase">Zentryx</span>
              <span className="text-sm font-700 text-gray-900 -mt-0.5">Lab</span>
            </div>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-500 text-gray-500 hover:text-gray-900 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="/sign-in"
              className="text-sm font-500 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign in
            </a>
            <motion.a
              href="/sign-up"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-600 px-4 py-2 rounded-xl transition-colors shadow-lg shadow-emerald-500/25"
            >
              Start Free
            </motion.a>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            <div className="absolute inset-0 bg-white/95 backdrop-blur-xl" />
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              exit={{ y: -20 }}
              className="relative flex flex-col items-center justify-center h-full gap-8"
            >
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => setMobileOpen(false)}
                  className="text-2xl font-600 text-gray-900 hover:text-emerald-500 transition-colors"
                >
                  {link.label}
                </motion.a>
              ))}
              <motion.a
                href={isHome ? "#pricing" : "/#pricing"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: navLinks.length * 0.07 }}
                onClick={() => setMobileOpen(false)}
                className="mt-4 bg-emerald-500 text-white text-lg font-600 px-8 py-3 rounded-2xl"
              >
                Start Free
              </motion.a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
