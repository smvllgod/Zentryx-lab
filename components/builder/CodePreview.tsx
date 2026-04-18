"use client";

import { useState } from "react";
import { Check, Copy, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface CodePreviewProps {
  source: string;
  filename: string;
  /** If false, the code is shown blurred, copy is disabled, and an upgrade CTA is shown. */
  unlocked: boolean;
}

export function CodePreview({ source, filename, unlocked }: CodePreviewProps) {
  const [copied, setCopied] = useState(false);

  function copy() {
    if (!unlocked) return;
    navigator.clipboard.writeText(source);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative rounded-xl border border-gray-200 bg-[#0b1020] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#0b1020]">
        <div className="flex items-center gap-2 text-[11px] font-600 text-gray-300">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
          {filename}.mq5
          {!unlocked && (
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-700 uppercase tracking-wider text-amber-400">
              <Lock size={10} /> Free tier preview
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={copy}
          disabled={!unlocked}
          className="text-gray-300 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
          title={unlocked ? "Copy to clipboard" : "Upgrade to Pro to copy the source"}
        >
          {unlocked && copied ? <Check size={12} /> : <Copy size={12} />}
          {unlocked && copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="relative">
        <pre
          className={cn(
            "text-[11.5px] leading-relaxed text-gray-200 px-4 py-4 overflow-auto max-h-[60vh] transition-[filter] duration-300",
            !unlocked && "select-none",
          )}
          style={{
            fontFamily: "'JetBrains Mono', Menlo, monospace",
            filter: unlocked ? undefined : "blur(5.5px)",
            userSelect: unlocked ? "text" : "none",
          }}
        >
          <code>{source}</code>
        </pre>
        {!unlocked && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-gradient-to-b from-[#0b1020]/40 via-[#0b1020]/60 to-[#0b1020]/80 pointer-events-none">
            <div className="max-w-sm text-center pointer-events-auto">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center mx-auto mb-3">
                <Sparkles size={18} />
              </div>
              <h3 className="text-sm font-700 text-white">
                Unlock the MQL5 source
              </h3>
              <p className="mt-1 text-xs text-gray-300">
                Upgrade to <strong>Pro</strong> to read, copy, and tweak the
                generated code. Free tier can still download the compiled
                <code className="mx-1 px-1 py-0.5 rounded bg-white/10 text-[10px]">.mq5</code>
                file to run in MetaTrader 5.
              </p>
              <Button
                asChild
                size="sm"
                variant="primary"
                className="mt-4"
              >
                <a href="/billing">Upgrade to Pro</a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
