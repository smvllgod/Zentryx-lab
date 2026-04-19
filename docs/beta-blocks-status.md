# Beta blocks — why they exist, what's missing, and how we promote them

_Last updated: 2026-04-18_

## TL;DR

Zentryx Lab ships with **200 canvas blocks** across 18 families. Of those:

- **~120 blocks are `active`** — they have a block definition **and** an MQL5
  translator, so they compile to real MQL5 code that runs on the MT5 chart.
- **~80 blocks are `beta`** — they have a block definition (label, params,
  validation, UI, analytics) but **no MQL5 translator yet**. Adding a beta
  block to the canvas will place a node on the graph and persist its
  params, but the compiler emits a `stub_node` warning and the block
  **contributes nothing to the generated .mq5 file**.

This doc explains why that gap exists, how to close it safely, and lists
the promotion order.

---

## 1. What "beta" means here

There are five statuses in `BlockStatus` (see `lib/blocks/types.ts`):

| Status | Meaning |
| --- | --- |
| `active` | Fully wired. Block renders on canvas, params validate, compiler emits MQL5. |
| `beta` | Block renders on canvas and params validate, **but MQL5 output is a stub**. User sees a yellow diagnostic instead of a silent no-op. |
| `planned` | Not in the picker yet — reserved for future releases. |
| `deprecated` | Still renders for old graphs but hidden from the picker. |
| `broken` | Hidden everywhere. Used as a kill-switch. |

Today **no block uses `planned`** — every future block lives in `beta`
until its translator lands. The `_factory.ts` default is `active`, so a
block file that forgets `status: "beta"` becomes live on merge. That's
why this file exists: it's the single source of truth for which blocks
are compiling and which are only listed.

## 2. Why translators are separate from block definitions

Block definitions live in `lib/blocks/canvas/*.ts`. They describe
**what the block looks like and what params it accepts**. They are
declarative data — easy to write, safe to bulk-edit.

MQL5 translators live in `lib/mql5/translators/*.ts`. Each exports a
`Translator` function that returns a `SectionContribution` (see
`lib/mql5/types.ts`). Translators are **code generators** — they have
to:

1. Allocate globally-unique MQL5 input names (e.g. `InpAtrPeriod_ab12cd`).
2. Create an MT5 indicator handle (e.g. `hAtr_ab12cd = iATR(...)`).
3. Emit a boolean MQL5 expression for entry conditions, or an
   MQL5 statement block for position management, exit, or gates.
4. Free the handle in `OnDeinit`.

Getting this wrong means the generated EA doesn't compile inside MT5 —
which the user only discovers after copying it to their terminal. So
translators require more care per block than definitions.

The `Translator` registry is a `Partial<Record<NodeType, Translator>>`
(see `lib/mql5/translators/index.ts`). Any node type not in the record
falls through to the stub path in the assembler, which:

- Emits a `stub_node` diagnostic at severity `info` so the compile
  report shows "beta block — no code generated".
- Skips code emission for that node — the rest of the strategy still
  compiles normally.

This is the bridge that lets us ship 200+ block definitions without
gating the entire library on having 200+ translators ready.

## 3. Promotion workflow

For each beta block:

1. **Write a translator** under `lib/mql5/translators/<family>-<id>.ts`.
   Export `translate_<family>_<camelCaseId>`.
2. **Register** it in `lib/mql5/translators/index.ts` under the
   matching `NodeType` key.
3. **Flip the status** in `lib/blocks/canvas/<family>.ts` — remove
   `status: "beta"` (or set `status: "active"` explicitly).
4. **Typecheck**: `npx tsc -p . --noEmit`.
5. **Smoke test**: drop the block into a strategy, export, open the
   `.mq5` inside MT5's MetaEditor, compile. Zero warnings is the bar.

The translator files follow a consistent template (see
`filter-emaSlope.ts` as the canonical reference for a filter, or
`exit-atrBased.ts` for an exit-style contribution).

## 4. Batch 1 — high-value promotions (April 2026)

These are the blocks to promote first because they appear most often in
user strategies (per analytics) and slot into the existing translator
families without needing new section types. Each one is a ≤40-line
translator.

| Block ID | Family | Why it matters |
| --- | --- | --- |
| `trend.smaDirection` | trend | Trend-following baseline. |
| `trend.parabolicSar` | trend | Classic reversal filter. |
| `trend.supertrend` | trend | Most-requested trend overlay. |
| `trend.hullDirection` | trend | Smooth trend with low lag. |
| `confirm.macdSide` | confirmation | MACD histogram alignment. |
| `confirm.stochCross` | confirmation | Stochastic confirmation. |
| `momentum.stochBand` | momentum | Mean-reversion gate. |
| `momentum.cciLevel` | momentum | CCI level filter. |
| `vol.atrAboveAverage` | volatility | High-vol regime gate. |
| `vol.bollingerWidth` | volatility | Squeeze / expansion filter. |
| `session.newYork` | session | NY-only trading hours. |
| `session.asia` | session | Asia-only trading hours. |
| `exec.spreadRatio` | execution | Dynamic spread limit. |
| `exit.endOfDay` | exit | Friday-flat / EOD close. |
| `exit.equityTargetExit` | exit | Daily profit-target stop. |
| `lot.perBalance` | lot | Scale lots with equity. |
| `manage.breakEvenAtrMulti` | management | ATR-anchored break-even. |
| `mtf.higherTfRsi` | mtf | Higher-TF RSI confirmation. |
| `mtf.dailyBias` | mtf | Daily bias bias filter. |
| `utility.emergencyStop` | utility | Account-level kill-switch. |

After Batch 1, ~100 blocks will be `active` and ~80 will remain beta,
weighted toward the advanced families (grid, structure, news, basket).
Those require either new section types (news calendar feed, basket
grouping) or protection-panel coordination, so they're held for Batch 2.

## 5. What users see today

When a user drops a beta block on the canvas and hits **Export MQL5**:

- The compile succeeds.
- The diagnostics panel shows an `info`-level message per beta node:
  `"<block name>" is a preview block — no MQL5 code generated for this
  node.` 
- The `summary.md` lists the node for traceability, tagged `[beta]`.

So the UX is: beta blocks work in the builder (drag, configure,
connect, export) — but the runtime EA ignores them until a translator
lands. After Batch 1 promotes ~20 blocks, the "compiled actively" share
goes from ~60% → ~80% of the library.
