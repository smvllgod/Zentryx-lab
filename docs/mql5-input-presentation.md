# Zentryx Lab — MQL5 Input Presentation System

**Status.** Live since 2026-04 (phases A–D).
**Owner module.** [`lib/mql5/input-presenter.ts`](../lib/mql5/input-presenter.ts).
**Consumer.** [`lib/mql5/template.ts`](../lib/mql5/template.ts) · [`lib/mql5/compiler.ts`](../lib/mql5/compiler.ts) · [`components/builder/ProtectionPanel.tsx`](../components/builder/ProtectionPanel.tsx).

---

## Why it exists

Before Phase A, every generated `.mq5` opened in MetaEditor with a flat, auto-generated dump of input declarations — 30+ lines of `InpXxx_nmo7bz = …` in declaration order with inconsistent labels (`"MA period"`, `"Min ATR (pips)"`, `"ATR period (BE)"`, `"SL × ATR"`). The EA felt auto-generated the moment a buyer opened the Inputs tab.

The presenter transforms that raw output into a **sectioned, premium-looking** parameter tab that reads like a commercial product. It's applied unconditionally on every compile — no opt-in required.

---

## The 13 canonical sections

Emitted in this exact order via MQL5's native `input group "…"` syntax (MT5 build 2940+). Each `input group` renders a collapsible section header in MT5's Parameters tab.

| # | Code             | Title                          | When populated                                                        |
| - | ---------------- | ------------------------------ | --------------------------------------------------------------------- |
| 1 | `product_info`   | PRODUCT INFO                   | When `compile.presentation.product` is set (Packaging tab)            |
| 2 | `license`        | LICENSE                        | When the `licenseKey` protection block is enabled                     |
| 3 | `strategy_core`  | STRATEGY CORE                  | Always — symbol hint, timeframe, magic, trade comment                 |
| 4 | `entry_logic`    | ENTRY LOGIC                    | Entry blocks (`entry.*`, `confirm.*`, `candle.*`, `struct.*`)         |
| 5 | `filters`        | FILTERS                        | `filter.*`, `trend.*`, `momentum.*`, `mtf.*`, `vol.*`                 |
| 6 | `risk_management`| RISK MANAGEMENT                | `risk.*`, `lot.*`, daily-loss / equity-target / emergency stop        |
| 7 | `sl_tp`          | STOP LOSS / TAKE PROFIT        | `exit.fixedTpSl` · `exit.atrBased` · `exit.rrBased`                   |
| 8 | `be_partial`     | BREAK EVEN / PARTIAL CLOSE     | `exit.breakEven` · `manage.partialClose` · `manage.partialCloseAtr`   |
| 9 | `trailing`       | TRAILING STOP                  | `manage.trailingStopAtr` · `manage.chandelierTrail` · `percentTrail`  |
| 10| `session_news`   | SESSION / NEWS FILTERS         | `session.*` · `news.*` · `exit.endOfDay`                              |
| 11| `execution`      | EXECUTION CONTROLS             | `exec.*` · `utility.*` · telemetry inputs                             |
| 12| `advanced`       | ADVANCED OPTIONS               | `grid.*` · `basket.*` · `manage.pyramiding` · `manage.hedge*`         |
| 13| `dashboard`      | VISUAL DASHBOARD               | When `graph.metadata.appearance` is set                               |

Empty sections are skipped — a strategy without a license key never shows a `LICENSE` header.

---

## Presenter presets

Three separator styles, selected via `CompileOptions.presentation.preset`:

| Preset           | Separator style                                     | Use when                        |
| ---------------- | --------------------------------------------------- | ------------------------------- |
| `professional`   | `━━━ STRATEGY CORE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` | Default. Sober and clean.       |
| `premium_seller` | `═══ STRATEGY CORE ═══════════════════════════════` | Marketplace-ready, heavier.     |
| `institutional`  | `--- STRATEGY CORE ---`                             | Minimal / technical / internal. |

No emoji — MT5's Parameters UI doesn't render them reliably across broker builds.

---

## Label cleanup rules

Each `// label` is passed through `cleanLabel()` before emission. Rules applied in order:

1. **Normalise "× ATR" suffix** — `"SL × ATR"` → `"SL (× ATR)"`.
2. **Paren subcategory → em-dash** — `"ATR period (risk)"` → `"ATR Period — Risk"`. Only when the paren content is short, non-format, non-unit.
3. **Unit parens preserved** — `(pips)`, `(points)`, `(%)`, `($)`, `(bars)`, `(× ATR)` stay as parens.
4. **Format hints preserved** — paren content longer than 20 chars OR containing `.,:;"'%\\` stays verbatim (e.g. `("yyyy.mm.dd hh:mm,high;...")`).
5. **Quoted substrings stashed** — anything inside `"…"` is swapped out, protected from title-casing, restored. No more `"Yyyy.Mm.DD Hh:Mm"`.
6. **Abbreviations preserved** — `ATR`, `ADX`, `RSI`, `MACD`, `BB`, `SL`, `TP`, `BE`, `DD`, `CSV`, `URL`, `S/R`, `P/L`, `R/R` stay uppercase anywhere in the label.
7. **Units lowercased** — `pips`, `points`, `bars`, `ticks`, `lots`, `pts` stay lowercase.
8. **Everything else** — Title Case (first letter up, rest lower).
9. **Truncate at 48 chars** — MT5's column ellipsis cutoff.

### Before / after

| Raw translator label                       | Emitted in MT5                          |
| ------------------------------------------ | --------------------------------------- |
| `"ATR period (risk)"`                      | `ATR Period — Risk`                     |
| `"ATR multiplier (SL distance)"`           | `ATR Multiplier — SL Distance`          |
| `"Risk %"`                                 | `Risk (%)`                              |
| `"SL × ATR"`                               | `SL (× ATR)`                            |
| `"Min ATR (pips)"`                         | `Min ATR (pips)`                        |
| `"Global max spread (points)"`             | `Global Max Spread (points)`            |
| `"News CSV (\"yyyy.mm.dd hh:mm,high;...\")"`| `News CSV ("yyyy.mm.dd hh:mm,high;...")`|

---

## Section inference (when a translator doesn't set `section`)

Resolution order:

1. **Explicit `section` on the `InputDecl`** — always wins.
2. **Stem → section map** — `STEM_TO_SECTION` in `input-presenter.ts` hard-codes the canonical section for every stem (`InpArRisk`, `InpAtrTrailP`, `InpBkTp`, `InpGaM`, …). New translators can skip setting `section` if their stem is listed.
3. **nodeType prefix heuristic** — `entry.* → entry_logic`, `risk.* | lot.* → risk_management`, `grid.* | basket.* → advanced`, etc. Stamped automatically by the compiler.
4. **Default bucket** — `execution`.

When adding a new translator:
- If the input stem is already in `STEM_TO_SECTION`, do nothing.
- If the input is ambiguous (e.g. a management block that could be `trailing` or `be_partial`), set `section` explicitly on the `InputDecl`.

---

## Within-section ordering

Inputs inside one section are sorted by:

1. `hint: true` pushed to bottom.
2. `orderHint: negative` pulled to top, `positive` pushed to bottom.
3. Type rank: **bool** (toggles) → **int** → **double** → **string**.
4. Original declaration order within the same rank (stable sort).

Example: RISK MANAGEMENT for a strategy using `risk.atrRisk`:
```
input double InpArRisk_xxx       = 1.5;  // Risk (%)
input int    InpArP_xxx          = 14;   // ATR Period — Risk
input double InpArM_xxx          = 2.0;  // ATR Multiplier — SL Distance
```

---

## Packaging UI (Phase C)

Lives in the Protection & Licensing dialog at export time — see `components/builder/ProtectionPanel.tsx`, `PackagingSection` component.

### Preset picker
Three cards rendering a live sample of their separator style. Selection stored in `graph.metadata.packaging.preset`.

### Product metadata fields
Four optional fields that populate the PRODUCT INFO section:

| Field         | Example                              | Renders as                                                                     |
| ------------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| Product Name  | `Donchian Turtle Breakout Pro`       | `input string InpProductName    = "…"; // Product Name`                       |
| Version       | `2.1.0`                              | `input string InpProductVersion = "…"; // Version`                            |
| Vendor        | `Zentryx Labs`                       | `input string InpProductVendor  = "…"; // Vendor`                             |
| Support URL   | `zentryx.tech/support`               | `input string InpSupportUrl     = "…"; // Support URL`                        |

Any blank field is simply omitted from the section. If all four are blank, the PRODUCT INFO section header is skipped entirely.

---

## Runtime-controllable VISUAL DASHBOARD (Phase D)

When `graph.metadata.appearance` is set, the renderer emits four inputs that let the broker-side user reposition the on-chart panel without re-exporting the EA:

```mql5
input group "━━━━━━━━━━━━━━━━━━━━ VISUAL DASHBOARD ━━━━━━━━━━━━━━━━━━━━"
input bool InpShowDashboard    = true;
input int  InpDashboardAnchor  = 1;    // 0 TL, 1 TR, 2 BL, 3 BR
input int  InpDashboardOffsetX = 10;
input int  InpDashboardOffsetY = 30;
```

`ZxLabInit()` reads these at run-time and applies a corner-aware coordinate transform so the panel always renders inside the chart regardless of chosen anchor.

---

## Extension points

### Adding a new section
Edit `input-presenter.ts`:
1. Add the code to the `InputSection` union.
2. Insert into `SECTION_ORDER` at the right index.
3. Add a title in `SECTION_TITLES`.
4. Update this doc.

### Adding new stems
`STEM_TO_SECTION` is the authoritative map. If a new translator uses a stem that could be classified ambiguously, add it here rather than relying on the nodeType heuristic.

### New preset
Add an entry to the `switch(preset)` in `renderSeparator()` with the desired glyph characters. Expose it in `PackagingConfig.preset` union, the `PRESETS` array in `ProtectionPanel.tsx`, and this doc.

---

## Testing

Two smoke scripts live under `scripts/`:

```bash
npx tsx scripts/gen-all.ts         # All 11 × 2 templates — should be 0/0
npx tsx scripts/gen-packaged.ts    # Full Premium Seller preset with license
npx tsx scripts/check-validator.ts # 7 negative + 11 template cases
```

Every canonical template × plain + telemetry mode must pass with 0 errors, 0 warnings. The validator (`lib/mql5/validator.ts`) also post-scans for duplicate input names, missing declarations, and stem-to-section classification mistakes.
