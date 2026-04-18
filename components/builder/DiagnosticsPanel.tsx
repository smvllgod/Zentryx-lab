"use client";

import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import type { Diagnostic } from "@/lib/strategies/validators";

const ICONS: Record<Diagnostic["level"], React.ReactNode> = {
  error: <AlertCircle size={14} className="text-red-500" />,
  warning: <AlertTriangle size={14} className="text-amber-500" />,
  info: <Info size={14} className="text-sky-500" />,
};

export function DiagnosticsPanel({
  diagnostics,
  summary,
  onSelectNode,
}: {
  diagnostics: Diagnostic[];
  summary: string;
  onSelectNode?: (nodeId: string) => void;
}) {
  const errors = diagnostics.filter((d) => d.level === "error");
  const warnings = diagnostics.filter((d) => d.level === "warning");

  return (
    <div className="rounded-xl bg-white border border-gray-200 p-4 max-h-[40vh] overflow-y-auto">
      <div className="flex items-start gap-2 mb-3">
        {errors.length === 0 ? (
          <CheckCircle2 size={16} className="text-emerald-500 mt-0.5" />
        ) : (
          <AlertCircle size={16} className="text-red-500 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-700 uppercase tracking-wider text-gray-500">
            Strategy summary
          </div>
          <p className="text-sm text-gray-800 mt-0.5 leading-snug">{summary}</p>
        </div>
      </div>
      {diagnostics.length === 0 ? (
        <div className="text-xs text-emerald-600 font-600">All checks passed.</div>
      ) : (
        <ul className="space-y-1.5">
          {[...errors, ...warnings].map((d, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-xs text-gray-700"
              onClick={() => d.nodeId && onSelectNode?.(d.nodeId)}
              role={d.nodeId ? "button" : undefined}
              style={{ cursor: d.nodeId ? "pointer" : "default" }}
            >
              {ICONS[d.level]}
              <span>{d.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
