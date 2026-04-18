"use client";

import { useMemo, useState } from "react";
import { Lock, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import {
  ALL_THEMES,
  ALL_MODULES,
  brandingFeaturesForPlan,
  defaultVisualSchema,
  getTheme,
  themeAvailableForPlan,
  validateVisualSchema,
} from "@/lib/appearance/registry";
import type {
  KpiModuleId,
  PanelCorner,
  PanelSize,
  ThemeId,
  ThemePlan,
  VisualSchema,
} from "@/lib/appearance/types";
import { AppearancePreview } from "./AppearancePreview";

interface Props {
  /** Current visual schema. If null, treated as a fresh default for `eaName`. */
  value: VisualSchema | null;
  /** Called on every change. Parent should persist the schema. */
  onChange: (schema: VisualSchema) => void;
  /** User's current plan — controls theme + branding gating. */
  plan: ThemePlan;
  /** Name shown when value.branding.eaName is empty. */
  defaultEaName: string;
  /** Creator display — injected when branding.creatorName is empty. */
  creatorDisplayName?: string;
}

export function AppearancePanel({
  value,
  onChange,
  plan,
  defaultEaName,
  creatorDisplayName,
}: Props) {
  const schema = value ?? defaultVisualSchema(defaultEaName, creatorDisplayName);
  const theme = getTheme(schema.themeId);
  const features = brandingFeaturesForPlan(plan);
  const diagnostics = useMemo(() => validateVisualSchema(schema), [schema]);
  const [open, setOpen] = useState<"theme" | "branding" | "modules" | "layout" | null>("theme");

  function patch(patch: Partial<VisualSchema>) {
    onChange({ ...schema, ...patch });
  }
  function patchLayout(p: Partial<VisualSchema["layout"]>) {
    patch({ layout: { ...schema.layout, ...p } });
  }
  function patchBranding(p: Partial<VisualSchema["branding"]>) {
    patch({ branding: { ...schema.branding, ...p } });
  }
  function patchOverrides(p: Partial<VisualSchema["overrides"]>) {
    patch({ overrides: { ...schema.overrides, ...p } });
  }
  function setModuleVisible(id: KpiModuleId, visible: boolean) {
    patch({ modules: { ...schema.modules, [id]: { visible } } });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4">
      {/* Configuration column */}
      <div className="space-y-3">
        {/* THEME */}
        <Section
          title="Theme preset"
          subtitle={theme.displayName}
          open={open === "theme"}
          onToggle={() => setOpen(open === "theme" ? null : "theme")}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {ALL_THEMES.map((t) => {
              const locked = !themeAvailableForPlan(t.id, plan);
              const selected = schema.themeId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={locked}
                  onClick={() => patch({ themeId: t.id })}
                  className={cn(
                    "relative text-left rounded-xl border p-3 transition-all",
                    selected
                      ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20"
                      : "border-gray-200 bg-white hover:border-gray-300",
                    locked && "opacity-60 cursor-not-allowed",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-700 text-gray-900 truncate">{t.displayName}</div>
                    {selected && <Check size={14} className="text-emerald-600 shrink-0" />}
                    {locked && <Lock size={12} className="text-amber-500 shrink-0" />}
                  </div>
                  <div className="mt-0.5 text-[10px] text-gray-500 truncate">{t.tagline}</div>
                  {/* Mini palette strip */}
                  <div className="mt-2.5 flex items-center gap-1">
                    <ColorDot color={t.palette.panelBg.css} border={t.palette.panelBorder.css} />
                    <ColorDot color={t.palette.headerBg.css} border={t.palette.panelBorder.css} />
                    <ColorDot color={t.palette.accent.css} />
                    <ColorDot color={t.palette.valueText.css} border={t.palette.panelBorder.css} />
                    <span className="ml-auto text-[9px] uppercase tracking-wider font-700 text-gray-400">{t.plan}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 rounded-lg bg-gray-50/80 border border-gray-100 p-2.5 text-[11px] leading-relaxed text-gray-500">
            <span className="font-700 text-gray-700">{theme.displayName}</span> — {theme.designIntent}
          </div>
        </Section>

        {/* BRANDING */}
        <Section
          title="Branding"
          subtitle={schema.branding.eaName || "—"}
          open={open === "branding"}
          onToggle={() => setOpen(open === "branding" ? null : "branding")}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>EA name</Label>
              <Input
                value={schema.branding.eaName}
                onChange={(e) => patchBranding({ eaName: e.target.value })}
                maxLength={48}
              />
            </div>
            <div>
              <Label className="flex items-center gap-1">
                Version label
              </Label>
              <Input
                value={schema.branding.versionLabel ?? ""}
                onChange={(e) => patchBranding({ versionLabel: e.target.value })}
                placeholder="v1.0"
                maxLength={24}
              />
            </div>
            <div>
              <Label className="flex items-center gap-1">
                Subtitle
                {!features.canEditSubtitle && <Lock size={10} className="text-amber-500" />}
              </Label>
              <Input
                value={schema.branding.subtitle ?? ""}
                onChange={(e) => patchBranding({ subtitle: e.target.value })}
                disabled={!features.canEditSubtitle}
                placeholder={features.canEditSubtitle ? "e.g. Trend-follower · H4" : "Upgrade to Pro to edit"}
                maxLength={48}
              />
            </div>
            <div>
              <Label className="flex items-center gap-1">
                Creator name
                {!features.canEditCreatorName && <Lock size={10} className="text-amber-500" />}
              </Label>
              <Input
                value={schema.branding.creatorName ?? ""}
                onChange={(e) => patchBranding({ creatorName: e.target.value })}
                disabled={!features.canEditCreatorName}
                placeholder={features.canEditCreatorName ? "Your name" : "Built with Zentryx Lab (locked on Free)"}
                maxLength={48}
              />
            </div>
          </div>
          {features.canOverrideAccent && (
            <div className="mt-3">
              <Label className="flex items-center gap-1.5">
                <span>Accent colour override</span>
                <Badge tone="purple" className="text-[8px] px-1.5 py-0">Creator</Badge>
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={schema.overrides.accent?.css ?? theme.palette.accent.css}
                  onChange={(e) => patchOverrides({ accent: { css: e.target.value, mql: hexToMqlColor(e.target.value) } })}
                  className="h-9 w-12 rounded-lg border border-gray-200 cursor-pointer"
                />
                <Input
                  value={schema.overrides.accent?.css ?? theme.palette.accent.css}
                  onChange={(e) => patchOverrides({ accent: { css: e.target.value, mql: hexToMqlColor(e.target.value) } })}
                  className="font-mono"
                />
                {schema.overrides.accent && (
                  <button
                    type="button"
                    onClick={() => patchOverrides({ accent: undefined })}
                    className="text-[11px] text-gray-500 hover:text-gray-900"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          )}
          {features.canHideHeader || features.canHideFooter ? (
            <div className="mt-3 flex gap-4">
              {features.canHideHeader && (
                <Toggle
                  label="Hide header"
                  checked={!!schema.overrides.hideHeader}
                  onChange={(v) => patchOverrides({ hideHeader: v })}
                />
              )}
              {features.canHideFooter && (
                <Toggle
                  label="Hide footer"
                  checked={!!schema.overrides.hideFooter}
                  onChange={(v) => patchOverrides({ hideFooter: v })}
                />
              )}
            </div>
          ) : null}
        </Section>

        {/* LAYOUT */}
        <Section
          title="Panel layout"
          subtitle={`${schema.layout.size} · ${schema.layout.corner}`}
          open={open === "layout"}
          onToggle={() => setOpen(open === "layout" ? null : "layout")}
        >
          <div className="space-y-3">
            <div>
              <Label>Corner</Label>
              <div className="grid grid-cols-4 gap-1.5 mt-1">
                {(["top-left", "top-right", "bottom-left", "bottom-right"] as PanelCorner[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => patchLayout({ corner: c })}
                    className={cn(
                      "text-[11px] rounded-lg border py-2 transition-colors",
                      schema.layout.corner === c
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-600"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
                    )}
                  >
                    {c.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Size</Label>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {(["compact", "standard", "full"] as PanelSize[]).map((s) => {
                  const supported = theme.layout.supportedSizes.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={!supported}
                      onClick={() => patchLayout({ size: s })}
                      className={cn(
                        "text-[11px] rounded-lg border py-2 transition-colors",
                        schema.layout.size === s
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-600"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
                        !supported && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Offset X (px)</Label>
                <Input
                  type="number"
                  value={schema.layout.offset.x}
                  onChange={(e) =>
                    patchLayout({ offset: { ...schema.layout.offset, x: Number(e.target.value) } })
                  }
                  min={0}
                  max={500}
                />
              </div>
              <div>
                <Label>Offset Y (px)</Label>
                <Input
                  type="number"
                  value={schema.layout.offset.y}
                  onChange={(e) =>
                    patchLayout({ offset: { ...schema.layout.offset, y: Number(e.target.value) } })
                  }
                  min={0}
                  max={500}
                />
              </div>
            </div>
            {theme.compactModeSupported && (
              <Toggle
                label="Force compact mode"
                checked={schema.layout.compact}
                onChange={(v) => patchLayout({ compact: v })}
              />
            )}
          </div>
        </Section>

        {/* MODULES */}
        <Section
          title="KPI modules"
          subtitle={`${Object.values(schema.modules).filter((m) => m?.visible).length || ALL_MODULES.filter((m) => m.defaultVisible).length} visible`}
          open={open === "modules"}
          onToggle={() => setOpen(open === "modules" ? null : "modules")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {ALL_MODULES.map((m) => {
              const override = schema.modules[m.id];
              const visible = override ? override.visible : m.defaultVisible;
              const locked = m.plan && !planCovers(plan, m.plan);
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={locked}
                  onClick={() => setModuleVisible(m.id, !visible)}
                  className={cn(
                    "flex items-start gap-2 text-left rounded-lg border px-2.5 py-2 transition-colors",
                    visible
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-gray-200 bg-white hover:border-gray-300",
                    locked && "opacity-60 cursor-not-allowed",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0",
                      visible ? "bg-emerald-500 border-emerald-500" : "bg-white border-gray-300",
                    )}
                  >
                    {visible && <Check size={10} className="text-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-600 text-gray-900 truncate">{m.label}</div>
                    <div className="text-[10px] text-gray-500 truncate">{m.description}</div>
                  </div>
                  {locked && <Lock size={10} className="text-amber-500 shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Diagnostics */}
        {diagnostics.length > 0 && (
          <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 space-y-1">
            {diagnostics.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px]">
                <Badge tone={d.level === "error" ? "red" : "amber"} className="shrink-0 mt-0.5 text-[8px] px-1.5 py-0">
                  {d.level}
                </Badge>
                <span className="text-amber-800">{d.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview column */}
      <div className="lg:sticky lg:top-4 self-start">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-700 uppercase tracking-wider text-gray-400">Preview</div>
              <Badge tone="default" className="text-[9px]">simulated</Badge>
            </div>
            <div className="rounded-lg bg-gray-50/60 border border-gray-100 p-4 flex items-start justify-center min-h-[280px]">
              <AppearancePreview schema={schema} />
            </div>
            <p className="mt-2 text-[10px] text-gray-400 leading-relaxed">
              Mock values only. Actual numbers populate on the live chart once the EA is attached.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Primitives
// ────────────────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="!p-0">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <div>
            <div className="text-sm font-700 text-gray-900">{title}</div>
            {subtitle && <div className="text-[11px] text-gray-500 mt-0.5">{subtitle}</div>}
          </div>
          <span className="text-gray-400 text-xs">{open ? "−" : "+"}</span>
        </button>
        {open && <div className="px-5 pb-5 pt-1">{children}</div>}
      </CardContent>
    </Card>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
          checked ? "bg-emerald-500" : "bg-gray-300",
        )}
      >
        <span
          className={cn(
            "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-4.5" : "translate-x-0.5",
          )}
          style={{ transform: `translateX(${checked ? 18 : 2}px)` }}
        />
      </button>
      <span>{label}</span>
    </label>
  );
}

function ColorDot({ color, border }: { color: string; border?: string }) {
  return (
    <span
      className="inline-block w-3 h-3 rounded-full"
      style={{ background: color, border: `1px solid ${border ?? "rgba(0,0,0,0.12)"}` }}
    />
  );
}

function planCovers(a: ThemePlan, b: ThemePlan): boolean {
  const order: Record<ThemePlan, number> = { free: 0, pro: 1, creator: 2 };
  return order[a] >= order[b];
}

// Convert "#RRGGBB" → MQL5 `C'R,G,B'` literal
function hexToMqlColor(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "clrNONE";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return "clrNONE";
  return `C'${r},${g},${b}'`;
}
