"use client";

// Visual preview of the EA panel. Renders a faithful DOM approximation
// of what the MQL5 runtime will draw — same colors, same fonts, same
// sizes, same layout rules. This is *not* the MT5 output; it's the
// design-time confirmation screen.

import type { VisualSchema } from "@/lib/appearance/types";
import { getTheme, resolveActiveModules } from "@/lib/appearance/registry";

const SIZE_PX = { compact: 180, standard: 240, full: 300 };

export function AppearancePreview({ schema }: { schema: VisualSchema }) {
  const theme = getTheme(schema.themeId);
  const size = theme.layout.supportedSizes.includes(schema.layout.size)
    ? schema.layout.size
    : theme.layout.defaultSize;
  const isCompact = schema.layout.compact || size === "compact";
  const modules = resolveActiveModules(schema);
  const accent = schema.overrides.accent?.css ?? theme.palette.accent.css;
  const w = SIZE_PX[size];

  const showSubtitle = !isCompact && schema.branding.subtitle && !schema.overrides.hideHeader;
  const upperCase = theme.id === "dark-terminal" || theme.id === "institutional";

  // Simulated value strings (since we have no MT5 runtime here)
  const mockValue = (id: string): { text: string; color?: string } => {
    switch (id) {
      case "eaName": return { text: schema.branding.eaName };
      case "status": return { text: upperCase ? "RUNNING" : "Running" };
      case "symbol": return { text: "EURUSD" };
      case "timeframe": return { text: "M15" };
      case "accountNumber": return { text: "1 234 567" };
      case "broker": return { text: "IC Markets" };
      case "spread": return { text: "7" };
      case "floatingPnl": return { text: "+$12.40", color: theme.palette.positive.css };
      case "dailyPnl": return { text: "+$48.70", color: theme.palette.positive.css };
      case "openTrades": return { text: "2" };
      case "riskMode": return { text: upperCase ? "RISK 1%" : "Risk 1%" };
      case "lotSize": return { text: "0.10" };
      case "dailyTarget": return { text: "+1.0%" };
      case "drawdownLimit": return { text: "−3.0%" };
      case "sessionStatus": return { text: upperCase ? "ACTIVE" : "Active", color: theme.palette.positive.css };
      case "newsFilterStatus": return { text: "Clear", color: theme.palette.muted.css };
      case "licenseStatus": return { text: upperCase ? "VALID" : "Valid", color: theme.palette.positive.css };
      default: return { text: "—" };
    }
  };

  const pad = theme.layout.padding;
  const header = schema.overrides.hideHeader ? 0 : theme.layout.headerHeight;
  const footer = schema.overrides.hideFooter ? 0 : theme.layout.footerHeight;

  return (
    <div
      style={{
        width: w,
        background: theme.palette.panelBg.css,
        border: `1px solid ${theme.palette.panelBorder.css}`,
        borderRadius: 0,
        fontFamily: theme.typography.body.font,
        color: theme.palette.bodyText.css,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Accent bar (modern-glass) */}
      {theme.headerStyle === "accent-bar" && (
        <div style={{ height: 2, background: accent }} />
      )}

      {/* Left accent column (minimal-pro / light-pro) */}
      {(theme.id === "minimal-pro" || theme.id === "light-pro") && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 2,
            background: accent,
          }}
        />
      )}

      {/* Header */}
      {!schema.overrides.hideHeader && (
        <div
          style={{
            height: header,
            background:
              theme.headerStyle === "solid" || theme.headerStyle === "bordered"
                ? theme.palette.headerBg.css
                : "transparent",
            borderBottom:
              theme.headerStyle === "bordered"
                ? `1px solid ${theme.palette.panelBorder.css}`
                : "none",
            padding: `0 ${pad.x}px`,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <div
            style={{
              fontFamily: theme.typography.h1.font,
              fontSize: theme.typography.h1.size,
              fontWeight: theme.typography.h1.weight === "bold" ? 700 : 500,
              color: theme.palette.headerText.css,
              textTransform: upperCase ? "uppercase" : "none",
              letterSpacing: upperCase ? "0.08em" : 0,
            }}
          >
            {schema.branding.eaName}
          </div>
          {showSubtitle && (
            <div
              style={{
                fontFamily: theme.typography.h2.font,
                fontSize: theme.typography.h2.size,
                color: theme.palette.muted.css,
                marginLeft: "auto",
              }}
            >
              {schema.branding.subtitle}
            </div>
          )}
        </div>
      )}

      {/* Body (KPI rows) */}
      <div style={{ padding: `${pad.y}px ${pad.x}px` }}>
        {modules.length === 0 ? (
          <div style={{ textAlign: "center", color: theme.palette.muted.css, fontSize: 10, padding: "8px 0" }}>
            No visible KPI modules — toggle some above.
          </div>
        ) : (
          modules.map((m) => {
            const v = mockValue(m.id);
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  height: theme.layout.rowHeight,
                  marginBottom: theme.layout.moduleSpacing,
                }}
              >
                <span
                  style={{
                    fontFamily: theme.typography.body.font,
                    fontSize: theme.typography.body.size,
                    color: theme.palette.bodyText.css,
                    textTransform: upperCase ? "uppercase" : "none",
                    letterSpacing: upperCase ? "0.06em" : 0,
                  }}
                >
                  {m.label}
                </span>
                <span
                  style={{
                    fontFamily:
                      m.valueKind === "money" || m.valueKind === "number" || m.valueKind === "percent" || m.valueKind === "price" || m.valueKind === "pips"
                        ? theme.typography.mono.font
                        : theme.typography.body.font,
                    fontSize: theme.typography.mono.size,
                    fontVariantNumeric: "tabular-nums",
                    color: v.color ?? theme.palette.valueText.css,
                    fontWeight: theme.kpiEmphasis === "pronounced" ? 700 : 500,
                  }}
                >
                  {v.text}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {!schema.overrides.hideFooter && footer > 0 && (
        <div
          style={{
            height: footer,
            background:
              theme.headerStyle === "solid" || theme.headerStyle === "bordered"
                ? theme.palette.headerBg.css
                : "transparent",
            borderTop: `1px solid ${theme.palette.panelBorder.css}`,
            padding: `0 ${pad.x}px`,
            display: "flex",
            alignItems: "center",
            fontSize: Math.max(theme.typography.body.size - 1, 8),
            color: theme.palette.muted.css,
          }}
        >
          {(schema.branding.creatorName ?? "Built with Zentryx Lab") +
            "  " +
            (schema.branding.versionLabel ?? "v1.0")}
        </div>
      )}
    </div>
  );
}
