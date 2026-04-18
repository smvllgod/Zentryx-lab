# Zentryx Lab — EA Appearance System

**Purpose.** Let users configure how their exported MT5 Expert Advisor looks on the chart — without giving them a freeform layout editor that will produce broken MQL5. Controlled customisation: theme preset + module toggles + panel position / size / accent.

**Three layers, kept strictly separate:**

| Layer                | Module                              | Concern                          | Source of truth                       |
| -------------------- | ----------------------------------- | -------------------------------- | ------------------------------------- |
| Trading logic        | `lib/blocks/*`                      | What the EA does                 | `StrategyGraph.nodes`                 |
| **EA appearance**    | `lib/appearance/*`                  | **How the panel looks**          | `StrategyGraph.metadata.appearance`   |
| Export protection    | `lib/blocks/configs/protection.ts`  | Where it may run                 | Export-time wizard                    |

## 1 · Architecture

```
lib/appearance/
├── types.ts          # all interfaces + enums (PanelCorner, PanelSize, ThemeId, KpiModuleId, VisualSchema)
├── themes.ts         # 6 professional theme presets — palette + typography + layout rules
├── modules.ts        # 17 KPI modules with MQL5 value expressions + defaults
└── registry.ts       # public API + plan gating + schema validation

lib/mql5/appearance-renderer.ts
                      # VisualSchema → SectionContribution (OBJ_RECTANGLE_LABEL +
                      # OBJ_LABEL creation code, per-tick refresh, OnDeinit cleanup)

components/appearance/
├── AppearancePanel.tsx      # configuration UI (dialog surface)
└── AppearancePreview.tsx    # DOM preview faithful to MQL5 render
```

## 2 · Visual Schema — the single source of truth

```jsonc
{
  "version": 1,
  "themeId": "minimal-pro",
  "branding": {
    "eaName": "Zentryx Trend",
    "subtitle": "Trend follower · H4",   // Pro+
    "creatorName": "Jordan",             // Pro+
    "versionLabel": "v1.0"
  },
  "layout": {
    "corner": "top-right",
    "offset": { "x": 12, "y": 12 },
    "size": "standard",                  // compact | standard | full
    "compact": false
  },
  "modules": {
    "accountNumber": { "visible": false },
    "riskMode": { "visible": true }
  },
  "overrides": {
    "accent": { "css": "#10B981", "mql": "C'16,185,129'" }, // Creator only
    "hideFooter": false,
    "hideHeader": false
  }
}
```

The schema lives inside `StrategyGraph.metadata.appearance` so it's versioned and saved alongside the strategy. Safe to omit — compiler skips the renderer entirely when absent.

## 3 · Theme Registry (6 presets)

Each theme defines: design intent, target user, palette (MQL5-friendly pairs of CSS + `C'r,g,b'` literals), typography (h1/h2/body/mono), header style, border style, KPI emphasis rule, full layout rules (padding, row height, header/footer), recommended modules, compact mode support, and MQL5 rendering notes.

| Theme              | Plan    | Feel                                           | Defaults (corner / size)      | Accent          |
| ------------------ | ------- | ---------------------------------------------- | ----------------------------- | --------------- |
| **Minimal Pro**    | free    | Flat dark panel, emerald left bar              | top-right / standard          | `#10B981`       |
| **Light Pro**      | free    | Clean white, thin border, emerald accent col   | top-right / standard          | `#10B981`       |
| **Classic Trader** | free    | Cream/charcoal, double border                  | top-left / standard           | `#B45309`       |
| **Institutional**  | pro     | Bloomberg-style tabular, navy, uppercase       | top-right / full (no compact) | `#3B82F6`       |
| **Dark Terminal**  | pro     | Pure black, phosphor green, all Consolas       | top-left / standard           | `#10B981`       |
| **Modern Glass**   | pro     | Deep navy, thin inset border, cyan accent bar  | top-right / standard          | `#22D3EE`       |

All colours are serialised as `{ css, mql }` pairs so the React preview renders identically to what MQL5 will draw. No transparency, no gradients, no shadows — MQL5 rectangle objects don't support any of that; the palettes are picked to fake "glass" through colour harmony only.

## 4 · KPI Module Registry (17 modules)

| Module              | Priority | Default | Compact | MQL5 expression                                             |
| ------------------- | -------- | ------- | ------- | ----------------------------------------------------------- |
| `eaName`            | 100      | ✓       | ✓       | `ZxBrandEaName`                                             |
| `status`            | 95       | ✓       | ✓       | `ZxStatus()` (helper)                                       |
| `symbol`            | 90       | ✓       | ✓       | `_Symbol`                                                   |
| `timeframe`         | 85       | ✓       | ✓       | `ZxTfString()` (helper)                                     |
| `floatingPnl`       | 88       | ✓       | ✓       | `DoubleToString(ZxFloatingPnl(), 2)`                        |
| `dailyPnl`          | 86       | ✓       | ✓       | `DoubleToString(ZxDailyPnl(), 2)`                           |
| `openTrades`        | 82       | ✓       | ✓       | `IntegerToString(ZxOpenTrades())`                           |
| `spread`            | 80       | ✓       |         | `SymbolInfoInteger(..., SYMBOL_SPREAD)`                     |
| `sessionStatus`     | 72       | ✓       |         | `ZxSessionLabel`                                            |
| `riskMode`          | 70       | ✓       |         | `ZxRiskModeLabel`                                           |
| `lotSize`           | 66       |         |         | `ZxLastLot()`                                               |
| `dailyTarget`       | 64       |         |         | `ZxDailyTargetLabel`                                        |
| `drawdownLimit`     | 62       |         |         | `ZxDdLimitLabel`                                            |
| `accountNumber`     | 60       |         |         | `ACCOUNT_LOGIN`                                             |
| `newsFilterStatus`  | 56       |         |         | `ZxNewsLabel`                                               |
| `broker`            | 50       |         |         | `ACCOUNT_COMPANY`                                           |
| `licenseStatus`     | 40       |         |         | `ZxLicenseLabel` (Pro)                                      |

Priority drives render order; `defaultCompact` decides which modules survive compact mode. `mql5Requires[]` injects helper functions once (e.g. `ZxDailyPnl()` reads history + open positions scoped to `InpMagic`).

## 5 · MQL5 Renderer Architecture

`renderAppearance(schema)` produces a `SectionContribution` that merges into the main compiler pipeline:

- **`helpers[]`** — three blocks: `ZxCreateRect/ZxCreateLabel/ZxSetLabelText` primitives, the generated `ZxLabInit()` / `ZxLabDeinit()` functions, and any module-specific helpers.
- **`globals[]`** — `ZxBrandEaName`, subtitle, creator, version + the shared status-label globals.
- **`onInitCode[]`** — `ZxLabInit();` — runs after indicator handles are created.
- **`onDeinitCode[]`** — `ZxLabDeinit();` — deletes every object with the `ZxLab_` prefix.
- **`positionManagement[]`** — per-tick refresh block (throttled to 1 sec) that updates each KPI label text and colour.

Object model:

| Object               | Use                                                 |
| -------------------- | --------------------------------------------------- |
| `OBJ_RECTANGLE_LABEL`| Panel background, header background, accent bars, double borders (rendered as two stacked rects) |
| `OBJ_LABEL`          | EA name, subtitle, KPI labels, KPI values, footer   |
| `OBJ_BITMAP_LABEL`   | Reserved for Creator-only logo support (roadmap)    |

Every object receives:
- `OBJPROP_CORNER` — matches `layout.corner`
- `OBJPROP_XDISTANCE` / `OBJPROP_YDISTANCE` — computed deterministically from theme paddings + row index
- `OBJPROP_SELECTABLE = false` / `OBJPROP_HIDDEN = true` — so users can't accidentally drag the panel or see it in the object list

Uppercase themes (Dark Terminal, Institutional) call `ToUpper()` on labels at emit time, not at runtime.

## 6 · Export Flow Integration

Three entry points:

1. **Builder top bar — "Appearance" button.** Opens `AppearancePanel` in a dialog. Modifications patch `graph.metadata.appearance`; user clicks Save to persist. Full preview + theme picker + modules toggle + layout settings in one screen.
2. **Compiler** — `compileStrategy(graph)` calls `renderAppearance(schema)` after trade-logic translators if `graph.metadata.appearance` exists. Missing schema = no panel in the exported EA. Failures downgrade to warning diagnostics; the EA compiles without a panel.
3. **Export wizard** (future) — if the user skipped Appearance in the builder, show a one-time "Configure panel or skip" step. Out of V1 scope.

## 7 · Plan Gating

Controlled in `lib/appearance/registry.ts`:

- **Themes**
  - Free: Minimal Pro, Light Pro, Classic Trader
  - Pro:  All Free + Institutional, Dark Terminal, Modern Glass
  - Creator: All

- **Branding features** (`brandingFeaturesForPlan`)
  - Free:    EA name + version label only. Creator name locked to "Built with Zentryx Lab".
  - Pro:     + subtitle, custom creator name.
  - Creator: + accent colour override, hide header / hide footer.

- **Modules** — all modules available on Free except `licenseStatus` (Pro+).

## 8 · Recommended V1 shipment

- **Themes shipped active:** Minimal Pro (default), Light Pro, Classic Trader, Institutional, Dark Terminal, Modern Glass — all 6.
- **KPI modules shipped active:** all 17.
- **Panel sizes supported at launch:** compact / standard / full (minus Institutional which drops compact).
- **Corners:** all four.
- **Creator-only:** accent override + hide-header + hide-footer.
- **Roadmap:** bitmap logos (`OBJ_BITMAP_LABEL`), custom theme author (Creator), multiple panels / charts, optional background transparency via `OBJPROP_BACK=true` + repainting tricks.

## 9 · File map

| File                                                      | What it is                                                      |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| `lib/appearance/types.ts`                                 | All interfaces, enums, schema default factory.                  |
| `lib/appearance/themes.ts`                                | Theme registry (6 themes).                                      |
| `lib/appearance/modules.ts`                               | KPI module registry (17 modules) + `resolveActiveModules`.      |
| `lib/appearance/registry.ts`                              | Public re-exports + plan gating + `validateVisualSchema`.       |
| `lib/mql5/appearance-renderer.ts`                         | VisualSchema → SectionContribution MQL5 emitter.                |
| `lib/mql5/compiler.ts`                                    | Calls `renderAppearance` when `metadata.appearance` exists.     |
| `lib/mql5/template.ts`                                    | Wires `onInitCode` / `onDeinitCode` into OnInit / OnDeinit.     |
| `components/appearance/AppearancePanel.tsx`               | The configuration UI (theme / branding / layout / modules).     |
| `components/appearance/AppearancePreview.tsx`             | DOM preview faithful to the MQL5 render.                        |
| `app/builder/page.tsx`                                    | "Appearance" button in the top bar → opens dialog.              |
