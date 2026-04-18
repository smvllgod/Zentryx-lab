"use client";

import { useMemo } from "react";
import { Trash2, Copy, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getNodeDefinition, type ParamSpec } from "@/lib/strategies/nodes";
import type { StrategyNode } from "@/lib/strategies/types";
import { cn } from "@/lib/utils/cn";

export function Inspector({
  node,
  onChange,
  onDelete,
  onDuplicate,
}: {
  node: StrategyNode | null;
  onChange: (params: Record<string, unknown>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  if (!node) {
    return (
      <div className="h-full bg-white border-l border-gray-100 p-6 flex flex-col items-center justify-center text-center text-gray-400">
        <div className="text-sm">Select a node to edit its parameters.</div>
      </div>
    );
  }
  const def = getNodeDefinition(node.type);
  if (!def) return null;

  function update(key: string, value: unknown) {
    if (!node) return;
    onChange({ ...(node.params as Record<string, unknown>), [key]: value });
  }

  const params = node.params as Record<string, unknown>;

  // Filter out params hidden by visibleWhen conditions
  const visibleParams = useMemo(
    () =>
      def.params.filter((p) => {
        if (!p.visibleWhen) return true;
        return params[p.visibleWhen.key] === p.visibleWhen.equals;
      }),
    [def.params, params],
  );

  return (
    <div className="h-full bg-white border-l border-gray-100 flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="text-[10px] font-700 uppercase tracking-wider text-gray-400">{def.category}</div>
            {def.status === "beta" && <Badge tone="blue" className="text-[8px] px-1.5 py-0">Beta</Badge>}
            {def.status === "planned" && <Badge tone="slate" className="text-[8px] px-1.5 py-0">Planned</Badge>}
            {def.stub && <Badge tone="amber" className="text-[8px] px-1.5 py-0">Preview</Badge>}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onDuplicate} aria-label="Duplicate">
              <Copy size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete">
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
        <h3 className="mt-1 text-base font-700 text-gray-900">{def.label}</h3>
        <p className="text-xs text-gray-500 mt-1">{def.summary}</p>
        {def.userExplanation && def.userExplanation !== def.summary && (
          <div className="mt-3 flex gap-2 rounded-lg bg-emerald-50/60 border border-emerald-100 px-2.5 py-1.5">
            <Info size={12} className="mt-0.5 text-emerald-600 shrink-0" />
            <p className="text-[11px] text-emerald-700 leading-snug">{def.userExplanation}</p>
          </div>
        )}
        {def.tags && def.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {def.tags.map((t) => (
              <span
                key={t}
                className="text-[9px] font-600 uppercase tracking-wider text-gray-400 bg-gray-100 rounded-full px-2 py-0.5"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {visibleParams.length === 0 && (
          <div className="text-xs text-gray-400">No parameters.</div>
        )}
        {visibleParams.map((param) => (
          <ParamControl
            key={param.key}
            param={param}
            value={params[param.key]}
            onChange={(v) => update(param.key, v)}
          />
        ))}
      </div>
    </div>
  );
}

function ParamControl({
  param,
  value,
  onChange,
}: {
  param: ParamSpec;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  // select / direction / timeframe all render as a dropdown
  if ((param.kind === "select" || param.kind === "direction" || param.kind === "timeframe") && param.options) {
    return (
      <div>
        <Label>{param.label}</Label>
        <NativeSelect value={String(value ?? param.default)} onChange={(e) => onChange(e.target.value)}>
          {param.options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
        {param.description && <p className="mt-1 text-[10px] text-gray-400">{param.description}</p>}
      </div>
    );
  }
  if (param.kind === "multiSelect" && param.options) {
    const current = toStringList(value ?? param.default);
    return (
      <div>
        <Label>{param.label}</Label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {param.options.map((o) => {
            const active = current.includes(String(o.value));
            return (
              <button
                key={String(o.value)}
                type="button"
                onClick={() => {
                  const next = active
                    ? current.filter((v) => v !== String(o.value))
                    : [...current, String(o.value)];
                  onChange(next.join(","));
                }}
                className={cn(
                  "text-xs font-600 rounded-lg px-2.5 py-1.5 border transition-colors",
                  active
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "bg-white border-gray-200 text-gray-500 hover:border-gray-300",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        {param.description && <p className="mt-1 text-[10px] text-gray-400">{param.description}</p>}
      </div>
    );
  }
  if (param.kind === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-400"
        />
        {param.label}
      </label>
    );
  }
  if (param.kind === "csv") {
    return (
      <div>
        <Label>{param.label}</Label>
        <Input
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder="comma,separated,values"
        />
        {param.description && <p className="mt-1 text-[10px] text-gray-400">{param.description}</p>}
      </div>
    );
  }
  if (param.kind === "string" || param.kind === "time") {
    return (
      <div>
        <Label>{param.label}</Label>
        <Input value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
        {param.description && <p className="mt-1 text-[10px] text-gray-400">{param.description}</p>}
      </div>
    );
  }
  // number / integer
  return (
    <div>
      <div className="flex items-end justify-between">
        <Label>{param.label}</Label>
        {param.unit && <span className="text-[10px] text-gray-400 pb-1.5">{param.unit}</span>}
      </div>
      <Input
        type="number"
        value={String(value ?? "")}
        min={param.min}
        max={param.max}
        step={param.kind === "integer" ? 1 : (param.step ?? "any")}
        onChange={(e) => {
          const n = e.target.value === "" ? null : Number(e.target.value);
          onChange(n);
        }}
      />
      {param.description && (
        <p className="mt-1 text-[10px] text-gray-400">{param.description}</p>
      )}
    </div>
  );
}

function toStringList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}
