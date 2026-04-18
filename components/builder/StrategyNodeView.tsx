"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CATEGORY_COLORS, getNodeDefinition } from "@/lib/strategies/nodes";
import type { NodeType } from "@/lib/strategies/types";
import { cn } from "@/lib/utils/cn";

export interface BuilderNodeData {
  type: NodeType;
  [key: string]: unknown;
}

export function StrategyNodeView(props: NodeProps) {
  const data = props.data as BuilderNodeData;
  const def = getNodeDefinition(data.type);
  if (!def) return null;
  const color = CATEGORY_COLORS[def.category];
  const selected = props.selected;

  return (
    <div
      className={cn(
        "zx-node group rounded-xl bg-white border shadow-sm w-56 transition-all",
        selected
          ? "border-emerald-400 ring-2 ring-emerald-400/30 shadow-md"
          : "border-gray-200 hover:border-emerald-300 hover:shadow-md",
      )}
    >
      {/* Target handle (left edge) — where incoming edges arrive. */}
      <Handle
        type="target"
        position={Position.Left}
        className="zx-handle zx-handle-in"
        style={{ background: color, borderColor: "white" }}
      />

      <div
        className="rounded-t-xl px-3 py-2 flex items-center justify-between"
        style={{ background: `${color}14` }}
      >
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-[10px] font-700 uppercase tracking-wider text-gray-600">
            {def.category}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {def.premium && (
            <span className="text-[9px] font-700 uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5">
              Pro
            </span>
          )}
          {def.stub && (
            <span
              title="Preview node — visible in builder but not yet emitted in MQL5 export"
              className="text-[9px] font-700 uppercase tracking-wider text-sky-600 bg-sky-50 border border-sky-200 rounded px-1.5"
            >
              Preview
            </span>
          )}
        </div>
      </div>

      <div className="px-3 py-2.5">
        <div className="text-sm font-700 text-gray-900">{def.label}</div>
        <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">{def.summary}</div>
      </div>

      {/* Source handle (right edge) — where outgoing edges start. */}
      <Handle
        type="source"
        position={Position.Right}
        className="zx-handle zx-handle-out"
        style={{ background: color, borderColor: "white" }}
      />
    </div>
  );
}
