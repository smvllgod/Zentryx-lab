// Zentryx Lab — MQL5 appearance renderer.
// Converts a VisualSchema into a SectionContribution the main compiler
// can merge alongside the trading-logic contributions. The runtime
// behaviour on MT5: a single OnInit() call creates all chart objects,
// OnTick updates the value labels, OnDeinit cleans up by prefix.
//
// Only three MQL5 object types are used:
//   - OBJ_RECTANGLE_LABEL  (panel chrome + accent bar)
//   - OBJ_LABEL            (text, labels + values)
//   - OBJ_BITMAP_LABEL     (logos — Creator-only, opt-in)

import type { SectionContribution } from "./types";
import type {
  KpiModuleDefinition,
  PanelCorner,
  PanelSize,
  ThemeDefinition,
  VisualSchema,
} from "@/lib/appearance/types";
import { getTheme } from "@/lib/appearance/themes";
import { resolveActiveModules } from "@/lib/appearance/modules";

// ────────────────────────────────────────────────────────────────────
// Layout geometry
// ────────────────────────────────────────────────────────────────────

const SIZE_WIDTHS: Record<PanelSize, number> = {
  compact: 180,
  standard: 240,
  full: 300,
};

// MQL5 chart corner constants
const MT5_CORNER: Record<PanelCorner, string> = {
  "top-left":     "CORNER_LEFT_UPPER",
  "top-right":    "CORNER_RIGHT_UPPER",
  "bottom-left":  "CORNER_LEFT_LOWER",
  "bottom-right": "CORNER_RIGHT_LOWER",
};

// Every appearance object gets this prefix so OnDeinit can clean up.
const OBJ_PREFIX = "ZxLab_";

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

/**
 * Produce a SectionContribution that creates the EA panel at OnInit
 * and refreshes its labels on every tick.
 */
export function renderAppearance(schema: VisualSchema): SectionContribution {
  const theme = getTheme(schema.themeId);
  const modules = resolveActiveModules(schema);

  const size: PanelSize = theme.layout.supportedSizes.includes(schema.layout.size)
    ? schema.layout.size
    : theme.layout.defaultSize;
  const isCompact = schema.layout.compact || size === "compact";

  const panelW = SIZE_WIDTHS[size];
  const panelH = computePanelHeight(theme, modules.length, schema, isCompact);
  const accentMql = schema.overrides.accent?.mql ?? theme.palette.accent.mql;

  const initBody = emitInit({
    theme, schema, modules, panelW, panelH, accentMql, isCompact, size,
  });

  const tick = emitTickRefresh({ theme, modules, size, isCompact });

  const helpers: string[] = [
    MT5_LABEL_HELPERS,
    initBody,                    // defines ZxLabInit() + ZxLabDeinit() at file scope
    moduleHelperBundle(modules),
  ];

  const globals: string[] = [
    mqlString("ZxBrandEaName", schema.branding.eaName),
    mqlString("ZxBrandSubtitle", schema.branding.subtitle ?? ""),
    mqlString("ZxBrandCreator", schema.branding.creatorName ?? "Built with Zentryx Lab"),
    mqlString("ZxBrandVersion", schema.branding.versionLabel ?? "v1.0"),
    mqlString("ZxRiskModeLabel", "FIXED"),
    mqlString("ZxDailyTargetLabel", "—"),
    mqlString("ZxDdLimitLabel", "—"),
    mqlString("ZxSessionLabel", "ACTIVE"),
    mqlString("ZxNewsLabel", "—"),
    mqlString("ZxLicenseLabel", "VALID"),
  ];

  return {
    helpers,
    globals,
    // User-facing dashboard inputs. These surface in the VISUAL
    // DASHBOARD section of MT5's Parameters tab so the broker-side
    // user can toggle the panel on/off or reposition it without
    // re-exporting the EA.
    inputs: [
      {
        name: "InpShowDashboard",
        type: "bool",
        defaultExpr: "true",
        label: "Show On-Chart Dashboard",
        section: "dashboard",
        orderHint: -10,
      },
      {
        name: "InpDashboardAnchor",
        type: "int",
        defaultExpr: String(cornerToInt(schema.layout.corner)),
        label: "Panel Corner — 0 TL, 1 TR, 2 BL, 3 BR",
        section: "dashboard",
      },
      {
        name: "InpDashboardOffsetX",
        type: "int",
        defaultExpr: String(schema.layout.offset.x),
        label: "Panel Offset X (px)",
        section: "dashboard",
      },
      {
        name: "InpDashboardOffsetY",
        type: "int",
        defaultExpr: String(schema.layout.offset.y),
        label: "Panel Offset Y (px)",
        section: "dashboard",
      },
    ],
    // Gate the panel's lifecycle on InpShowDashboard so toggling the
    // input in MT5 Parameters hides / shows the overlay without
    // re-exporting. The runtime helpers themselves are always compiled.
    onInitCode: [`if(InpShowDashboard) ZxLabInit();`],
    onDeinitCode: [`if(InpShowDashboard) ZxLabDeinit();`],
    positionManagement: [`if(InpShowDashboard) {\n${tick}\n}`],
    summaryFragments: [
      `${theme.displayName} theme · ${modules.length} modules · ${size}${isCompact ? " compact" : ""}`,
    ],
  };
}

function cornerToInt(corner: PanelCorner): number {
  switch (corner) {
    case "top-left":     return 0;
    case "top-right":    return 1;
    case "bottom-left":  return 2;
    case "bottom-right": return 3;
  }
}

// ────────────────────────────────────────────────────────────────────
// OnInit emitter — builds all objects
// ────────────────────────────────────────────────────────────────────

interface EmitCtx {
  theme: ThemeDefinition;
  schema: VisualSchema;
  modules: KpiModuleDefinition[];
  panelW: number;
  panelH: number;
  accentMql: string;
  isCompact: boolean;
  size: PanelSize;
}

function emitInit(ctx: EmitCtx): string {
  const { theme, schema, modules, panelW, panelH, accentMql, isCompact, size } = ctx;
  const corner = MT5_CORNER[schema.layout.corner];
  const ox = schema.layout.offset.x;
  const oy = schema.layout.offset.y;

  const bodyX = ox + theme.layout.padding.x;
  const bodyYStart = oy + (schema.overrides.hideHeader ? 0 : theme.layout.headerHeight) + theme.layout.padding.y;
  const valueXOffset = panelW - theme.layout.padding.x;

  const rowH = theme.layout.rowHeight + theme.layout.moduleSpacing;

  const labelCase = theme.id === "dark-terminal" || theme.id === "institutional"
    ? (s: string) => s.toUpperCase()
    : (s: string) => s;

  const lines: string[] = [];
  lines.push(`void ZxLabInit() {`);
  lines.push(`  // Panel chrome`);
  lines.push(`  ZxCreateRect("${OBJ_PREFIX}bg", ${corner}, ${ox}, ${oy}, ${panelW}, ${panelH}, ${theme.palette.panelBg.mql}, ${theme.palette.panelBorder.mql}, ${borderWidthFor(theme.borderStyle)});`);

  // Accent element — depends on header style
  if (theme.headerStyle === "accent-bar") {
    lines.push(`  ZxCreateRect("${OBJ_PREFIX}accentBar", ${corner}, ${ox}, ${oy}, ${panelW}, 2, ${accentMql}, ${accentMql}, 0);`);
  } else if (theme.id === "light-pro" || theme.id === "minimal-pro") {
    // Left accent column (1.5 px)
    lines.push(`  ZxCreateRect("${OBJ_PREFIX}accentCol", ${corner}, ${ox}, ${oy}, 2, ${panelH}, ${accentMql}, ${accentMql}, 0);`);
  }

  // Header background (if solid/bordered)
  if (!schema.overrides.hideHeader) {
    if (theme.headerStyle === "solid" || theme.headerStyle === "bordered") {
      lines.push(`  ZxCreateRect("${OBJ_PREFIX}headerBg", ${corner}, ${ox}, ${oy}, ${panelW}, ${theme.layout.headerHeight}, ${theme.palette.headerBg.mql}, ${theme.palette.panelBorder.mql}, ${theme.headerStyle === "bordered" ? 1 : 0});`);
    }
    // EA name label
    lines.push(`  ZxCreateLabel("${OBJ_PREFIX}title", ${corner}, ${ox + theme.layout.padding.x}, ${oy + Math.floor(theme.layout.headerHeight / 2) - Math.floor(theme.typography.h1.size / 2)}, "${esc(labelCase(schema.branding.eaName))}", "${theme.typography.h1.font}", ${theme.typography.h1.size}, ${theme.palette.headerText.mql});`);

    if (schema.branding.subtitle && !isCompact) {
      lines.push(`  ZxCreateLabel("${OBJ_PREFIX}subtitle", ${corner}, ${ox + theme.layout.padding.x + titleWidthHint(theme)}, ${oy + Math.floor(theme.layout.headerHeight / 2) - Math.floor(theme.typography.h2.size / 2)}, "${esc(schema.branding.subtitle)}", "${theme.typography.h2.font}", ${theme.typography.h2.size}, ${theme.palette.muted.mql});`);
    }
  }

  // KPI rows
  lines.push(`  // KPI rows`);
  modules.forEach((m, i) => {
    const y = bodyYStart + i * rowH;
    lines.push(`  ZxCreateLabel("${OBJ_PREFIX}lab_${m.id}", ${corner}, ${bodyX}, ${y}, "${esc(labelCase(m.label))}", "${theme.typography.body.font}", ${theme.typography.body.size}, ${theme.palette.bodyText.mql});`);
    // Value labels are created empty here and refreshed on every tick
    lines.push(`  ZxCreateLabel("${OBJ_PREFIX}val_${m.id}", ${corner}, ${valueXOffset}, ${y}, "—", "${valueFontFor(theme, m)}", ${theme.typography.mono.size}, ${valueColorFor(theme, m)}, ANCHOR_RIGHT_UPPER);`);
  });

  // Footer
  if (!schema.overrides.hideFooter && theme.layout.footerHeight > 0) {
    const footerY = oy + panelH - theme.layout.footerHeight;
    lines.push(`  // Footer`);
    if (theme.headerStyle === "solid" || theme.headerStyle === "bordered") {
      lines.push(`  ZxCreateRect("${OBJ_PREFIX}footerBg", ${corner}, ${ox}, ${footerY}, ${panelW}, ${theme.layout.footerHeight}, ${theme.palette.headerBg.mql}, ${theme.palette.panelBorder.mql}, 0);`);
    }
    lines.push(`  ZxCreateLabel("${OBJ_PREFIX}footer", ${corner}, ${ox + theme.layout.padding.x}, ${footerY + 2}, ZxBrandCreator + "  " + ZxBrandVersion, "${theme.typography.body.font}", ${Math.max(theme.typography.body.size - 1, 8)}, ${theme.palette.muted.mql});`);
  }

  lines.push(`  ChartRedraw(0);`);
  lines.push(`}`);

  lines.push(``);
  lines.push(`void ZxLabDeinit() {`);
  lines.push(`  ObjectsDeleteAll(0, "${OBJ_PREFIX}");`);
  lines.push(`  ChartRedraw(0);`);
  lines.push(`}`);

  lines.push(``);
  lines.push(`// Size=${size} isCompact=${isCompact} theme=${theme.id}`);
  return lines.join("\n");
}

// ────────────────────────────────────────────────────────────────────
// OnTick label refresh
// ────────────────────────────────────────────────────────────────────

function emitTickRefresh(args: {
  theme: ThemeDefinition;
  modules: KpiModuleDefinition[];
  size: PanelSize;
  isCompact: boolean;
}): string {
  const { theme, modules } = args;
  const lines: string[] = [];
  lines.push(`// ── appearance: refresh KPI values ──`);
  lines.push(`static datetime _zxLastPaint = 0;`);
  lines.push(`if(TimeCurrent() - _zxLastPaint >= 1) {`);
  lines.push(`  _zxLastPaint = TimeCurrent();`);
  for (const m of modules) {
    const exprStr = `(string)(${m.mql5ValueExpr})`;
    const colorExpr = valueColorExprFor(theme, m);
    lines.push(`  ZxSetLabelText("${OBJ_PREFIX}val_${m.id}", ${exprStr}, ${colorExpr});`);
  }
  lines.push(`  ChartRedraw(0);`);
  lines.push(`}`);
  return lines.join("\n");
}

// ────────────────────────────────────────────────────────────────────
// Geometry helpers
// ────────────────────────────────────────────────────────────────────

function computePanelHeight(
  theme: ThemeDefinition,
  moduleCount: number,
  schema: VisualSchema,
  isCompact: boolean,
): number {
  void isCompact;
  const header = schema.overrides.hideHeader ? 0 : theme.layout.headerHeight;
  const footer = schema.overrides.hideFooter ? 0 : theme.layout.footerHeight;
  const body =
    theme.layout.padding.y * 2 +
    moduleCount * (theme.layout.rowHeight + theme.layout.moduleSpacing);
  return header + body + footer;
}

function borderWidthFor(style: ThemeDefinition["borderStyle"]): number {
  switch (style) {
    case "none": return 0;
    case "thin": return 1;
    case "thick": return 2;
    case "double": return 1;   // double is rendered as two rects, 1px each
  }
}

function titleWidthHint(theme: ThemeDefinition): number {
  // Rough estimate: average glyph is ~0.55 × fontSize pixels wide.
  // Used only to offset the subtitle. Good enough — MQL5 has no text-measure API.
  return Math.round(theme.typography.h1.size * 0.55 * Math.min(14, theme.typography.h1.size));
}

function valueFontFor(theme: ThemeDefinition, m: KpiModuleDefinition): string {
  if (m.valueKind === "money" || m.valueKind === "number" || m.valueKind === "price" || m.valueKind === "pips" || m.valueKind === "percent") {
    return theme.typography.mono.font;
  }
  return theme.typography.body.font;
}

function valueColorFor(theme: ThemeDefinition, m: KpiModuleDefinition): string {
  switch (m.valueKind) {
    case "money": return theme.palette.valueText.mql;   // runtime colour picked by refresh helper
    default:      return theme.palette.valueText.mql;
  }
}

/**
 * Runtime colour expression — used to recolour the value label on every
 * refresh (so pnl goes red/green). For non-money fields, falls back to
 * the theme's `valueText`.
 */
function valueColorExprFor(theme: ThemeDefinition, m: KpiModuleDefinition): string {
  const pos = theme.palette.positive.mql;
  const neg = theme.palette.negative.mql;
  const base = theme.palette.valueText.mql;
  switch (m.id) {
    case "floatingPnl":
    case "dailyPnl":
      return `(ZxFloatingPnl() >= 0 ? ${pos} : ${neg})`;
    default:
      return base;
  }
}

// ────────────────────────────────────────────────────────────────────
// Helper bundle (shared MQL5 utilities emitted once)
// ────────────────────────────────────────────────────────────────────

const MT5_LABEL_HELPERS = `// ── Zentryx Lab appearance helpers ──
void ZxCreateRect(string name, int corner, int x, int y, int w, int h, color bg, color border, int borderWidth) {
  if(ObjectFind(0, name) < 0) ObjectCreate(0, name, OBJ_RECTANGLE_LABEL, 0, 0, 0);
  ObjectSetInteger(0, name, OBJPROP_CORNER, corner);
  ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
  ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
  ObjectSetInteger(0, name, OBJPROP_XSIZE, w);
  ObjectSetInteger(0, name, OBJPROP_YSIZE, h);
  ObjectSetInteger(0, name, OBJPROP_BGCOLOR, bg);
  ObjectSetInteger(0, name, OBJPROP_COLOR, border);
  ObjectSetInteger(0, name, OBJPROP_BORDER_TYPE, borderWidth > 0 ? BORDER_FLAT : BORDER_FLAT);
  ObjectSetInteger(0, name, OBJPROP_WIDTH, borderWidth);
  ObjectSetInteger(0, name, OBJPROP_BACK, false);
  ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
  ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
}

void ZxCreateLabel(string name, int corner, int x, int y, string text, string font, int size, color clr, ENUM_ANCHOR_POINT anchor = ANCHOR_LEFT_UPPER) {
  if(ObjectFind(0, name) < 0) ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
  ObjectSetInteger(0, name, OBJPROP_CORNER, corner);
  ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
  ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
  ObjectSetInteger(0, name, OBJPROP_ANCHOR, anchor);
  ObjectSetString (0, name, OBJPROP_TEXT, text);
  ObjectSetString (0, name, OBJPROP_FONT, font);
  ObjectSetInteger(0, name, OBJPROP_FONTSIZE, size);
  ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
  ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
  ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
}

void ZxSetLabelText(string name, string text, color clr) {
  if(ObjectFind(0, name) < 0) return;
  ObjectSetString (0, name, OBJPROP_TEXT, text);
  ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
}
`;

function moduleHelperBundle(modules: KpiModuleDefinition[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of modules) {
    for (const h of m.mql5Requires ?? []) {
      if (seen.has(h)) continue;
      seen.add(h);
      out.push(h);
    }
  }
  return out.join("\n\n");
}

// ────────────────────────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────────────────────────

function mqlString(name: string, value: string): string {
  return `string ${name} = "${esc(value)}";`;
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
