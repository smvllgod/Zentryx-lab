"use client";

import { motion } from "framer-motion";

const logos = [
  "FTMO", "MyForexFunds", "The5ers", "Funded Next", "TopStep",
  "E8 Funding", "Alpha Capital", "Blue Guardian", "SurgeTrader", "Lux Trading",
  "FTMO", "MyForexFunds", "The5ers", "Funded Next", "TopStep",
  "E8 Funding", "Alpha Capital", "Blue Guardian", "SurgeTrader", "Lux Trading",
];

export default function LogoBar() {
  return (
    <section className="py-12 border-y border-gray-100 bg-gray-50/50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-6 text-center">
        <p className="text-sm font-500 text-gray-400 tracking-wide uppercase">
          Trusted by traders at leading prop firms worldwide
        </p>
      </div>
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-12 md:w-32 bg-gradient-to-r from-gray-50/50 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 md:w-32 bg-gradient-to-l from-gray-50/50 to-transparent z-10 pointer-events-none" />
        <div className="flex overflow-hidden">
          <motion.div
            animate={{ x: [0, "-50%"] }}
            transition={{ duration: 30, ease: "linear", repeat: Infinity }}
            className="flex items-center gap-3 sm:gap-6 md:gap-12 shrink-0"
          >
            {logos.map((logo, i) => (
              <div
                key={i}
                className="shrink-0 px-6 py-2 rounded-xl border border-gray-200 bg-white"
              >
                <span className="text-sm font-600 text-gray-400 whitespace-nowrap tracking-wide">
                  {logo}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
