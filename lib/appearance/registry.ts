// Public entry for the appearance system.

export * from "./types";
export { THEME_REGISTRY, ALL_THEMES, getTheme } from "./themes";
export { KPI_MODULES, ALL_MODULES, getModule, resolveActiveModules } from "./modules";

import type { VisualSchema, ThemeId, KpiModuleId, ThemePlan } from "./types";
import { defaultVisualSchema } from "./types";
import { getTheme, ALL_THEMES } from "./themes";
import { KPI_MODULES } from "./modules";

export { defaultVisualSchema };

// ────────────────────────────────────────────────────────────────────
// Plan gating
// ────────────────────────────────────────────────────────────────────

const PLAN_RANK: Record<ThemePlan, number> = { free: 0, pro: 1, creator: 2 };

export function themeAvailableForPlan(themeId: ThemeId, userPlan: ThemePlan): boolean {
  const t = getTheme(themeId);
  return PLAN_RANK[userPlan] >= PLAN_RANK[t.plan];
}

export function availableThemes(userPlan: ThemePlan) {
  return ALL_THEMES.filter((t) => PLAN_RANK[userPlan] >= PLAN_RANK[t.plan]);
}

// ────────────────────────────────────────────────────────────────────
// Branding feature flags per plan
// ────────────────────────────────────────────────────────────────────
//
// Free:    EA name + version label. Creator name fixed to "Built with Zentryx Lab".
// Pro:     EA name + subtitle + creator name + version label.
// Creator: All of Pro + custom accent colour override + hide footer.

export interface BrandingFeatures {
  canEditSubtitle: boolean;
  canEditCreatorName: boolean;
  canOverrideAccent: boolean;
  canHideFooter: boolean;
  canHideHeader: boolean;
}

export function brandingFeaturesForPlan(plan: ThemePlan): BrandingFeatures {
  switch (plan) {
    case "free":
      return {
        canEditSubtitle: false,
        canEditCreatorName: false,
        canOverrideAccent: false,
        canHideFooter: false,
        canHideHeader: false,
      };
    case "pro":
      return {
        canEditSubtitle: true,
        canEditCreatorName: true,
        canOverrideAccent: false,
        canHideFooter: false,
        canHideHeader: false,
      };
    case "creator":
      return {
        canEditSubtitle: true,
        canEditCreatorName: true,
        canOverrideAccent: true,
        canHideFooter: true,
        canHideHeader: true,
      };
  }
}

// ────────────────────────────────────────────────────────────────────
// Schema validation
// ────────────────────────────────────────────────────────────────────

export interface SchemaIssue {
  level: "error" | "warning";
  code: string;
  message: string;
}

export function validateVisualSchema(schema: VisualSchema): SchemaIssue[] {
  const out: SchemaIssue[] = [];
  if (!schema.branding.eaName || schema.branding.eaName.length > 48) {
    out.push({
      level: "error",
      code: "branding_eaName_invalid",
      message: "EA name is required and must be ≤ 48 characters.",
    });
  }
  const theme = getTheme(schema.themeId);
  if (!theme) {
    out.push({ level: "error", code: "theme_unknown", message: `Unknown theme ${schema.themeId}.` });
    return out;
  }
  if (!theme.layout.supportedSizes.includes(schema.layout.size)) {
    out.push({
      level: "warning",
      code: "theme_size_unsupported",
      message: `Theme ${theme.displayName} does not support size "${schema.layout.size}" — falling back to ${theme.layout.defaultSize}.`,
    });
  }
  if (schema.layout.compact && !theme.compactModeSupported) {
    out.push({
      level: "warning",
      code: "theme_compact_unsupported",
      message: `Theme ${theme.displayName} does not support compact mode.`,
    });
  }
  // Module presence
  for (const key of Object.keys(schema.modules) as KpiModuleId[]) {
    if (!(key in KPI_MODULES)) {
      out.push({ level: "warning", code: "unknown_module", message: `Unknown module ${key}.` });
    }
  }
  return out;
}
