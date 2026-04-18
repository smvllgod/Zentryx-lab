"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-16 bg-gradient-to-br from-emerald-50/40 via-white to-white">
      <div className="ambient-orb pointer-events-none absolute -top-40 -left-40 h-96 w-96" />
      <div className="ambient-orb pointer-events-none absolute -bottom-40 -right-40 h-96 w-96" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative"
      >
        <a href="/" className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z" fill="white" fillOpacity="0.9" />
              <path d="M8 5L11 6.5V9.5L8 11L5 9.5V6.5L8 5Z" fill="white" />
            </svg>
          </div>
          <div className="leading-none">
            <div className="text-[10px] font-500 text-gray-400 tracking-widest uppercase">
              Zentryx
            </div>
            <div className="text-sm font-700 text-gray-900 -mt-0.5">Lab</div>
          </div>
        </a>

        <Card className="p-8">
          <h1 className="text-xl font-700 text-gray-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
          <div className="mt-6">{children}</div>
        </Card>

        {footer && <div className="mt-6 text-center text-sm text-gray-500">{footer}</div>}
      </motion.div>
    </div>
  );
}
