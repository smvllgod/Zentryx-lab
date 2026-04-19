"use client";

import { useState } from "react";
import { Check, AlertTriangle, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/context";
import { createStrategyFromTemplate } from "@/lib/templates/instantiate";
import type { Template, TemplateRisk } from "@/lib/templates/types";

const RISK_TONE: Record<TemplateRisk, "emerald" | "amber" | "red" | "default"> = {
  low: "emerald",
  medium: "default",
  high: "amber",
  "very-high": "red",
};

const RISK_LABEL: Record<TemplateRisk, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
  "very-high": "Very high risk",
};

export function TemplateDetail({
  template,
  open,
  onOpenChange,
}: {
  template: Template | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!template) return;
    if (!user) {
      toast.error("Sign in to use this template.");
      return;
    }
    setCreating(true);
    try {
      const { id } = await createStrategyFromTemplate(template, { name: name.trim() || undefined });
      toast.success("Strategy created from template.");
      window.location.href = `/builder?id=${id}`;
    } catch (err) {
      toast.error((err as Error).message);
      setCreating(false);
    }
  }

  if (!template) return null;
  const accent = template.accent ?? "#10b981";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
              style={{ background: accent + "18" }}
              aria-hidden
            >
              <span>{template.emoji}</span>
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg">{template.name}</DialogTitle>
              <DialogDescription className="mt-1">{template.tagline}</DialogDescription>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge tone={RISK_TONE[template.risk]}>{RISK_LABEL[template.risk]}</Badge>
                <Badge tone="default">{template.category}</Badge>
                <Badge tone="default">{template.difficulty}</Badge>
                <Badge tone="default">
                  {template.recommendedTimeframes.join(" · ")}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto pr-1 space-y-5 py-2">
          <p className="text-sm text-gray-600 leading-relaxed">{template.description}</p>

          <Section title="How it works">
            <ul className="space-y-1.5">
              {template.howItWorks.map((line, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Section title="Works well when" icon={<TrendingUp size={12} className="text-emerald-500" />}>
              <ul className="space-y-1 text-sm text-gray-600">
                {template.whenItWorks.map((line, i) => (
                  <li key={i} className="list-disc ml-4">{line}</li>
                ))}
              </ul>
            </Section>
            <Section title="Struggles when" icon={<TrendingDown size={12} className="text-amber-500" />}>
              <ul className="space-y-1 text-sm text-gray-600">
                {template.whenItFails.map((line, i) => (
                  <li key={i} className="list-disc ml-4">{line}</li>
                ))}
              </ul>
            </Section>
          </div>

          <Section title="Recommended setup">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
              <Chip label="Symbols" value={template.recommendedSymbols.join(", ")} />
              <Chip label="Timeframes" value={template.recommendedTimeframes.join(", ")} />
              <Chip label="Min balance" value={`$${template.minBalanceUsd.toLocaleString()}`} />
            </div>
          </Section>

          {template.caveats && template.caveats.length > 0 && (
            <Section title="Before you deploy" icon={<AlertTriangle size={12} className="text-amber-500" />}>
              <ul className="space-y-1.5 text-sm text-gray-700">
                {template.caveats.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        <DialogFooter className="pt-4 border-t border-gray-100 flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 w-full">
            <Label htmlFor="tpl-name" className="text-xs">Name your copy (optional)</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={template.name}
            />
          </div>
          <Button onClick={handleCreate} disabled={creating} size="lg">
            {creating ? <Loader2 size={14} className="animate-spin" /> : null}
            {creating ? "Creating…" : "Use this template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-700 text-gray-700 uppercase tracking-wider flex items-center gap-1.5 mb-2">
        {icon}
        {title}
      </h4>
      {children}
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <div className="text-[10px] font-700 text-gray-400 uppercase tracking-wider">{label}</div>
      <div className="text-sm font-600 text-gray-800 mt-0.5">{value}</div>
    </div>
  );
}
