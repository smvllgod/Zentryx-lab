"use client";

import { Sparkles } from "lucide-react";
import { AppShell } from "@/components/app/shell";
import { TemplatePicker } from "@/components/templates/TemplatePicker";

export default function TemplatesPage() {
  return (
    <AppShell title="Templates">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs font-700 text-emerald-600 uppercase tracking-widest">
          <Sparkles size={14} />
          Start from a template
        </div>
        <h1 className="mt-1 text-2xl font-800 text-gray-900 tracking-tight">
          Pick a battle-tested robot, tweak, and export
        </h1>
        <p className="mt-2 text-sm text-gray-500 max-w-2xl">
          Every template is a full strategy — not a snippet. Entries, filters, risk,
          exits, and trade management are already wired. Click any template to see how
          it trades, when it works, and when it struggles before you use it.
        </p>
      </div>

      <TemplatePicker />
    </AppShell>
  );
}
