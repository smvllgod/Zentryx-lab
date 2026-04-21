# Zentryx Lab — V1 Block Set

**Status.** Ready to ship. 42 canvas blocks + 2 protection / 2 packaging config modules.
**2026-04 addendum.** Two entry blocks added post-launch: `entry.candleOpen` (Candle Open Follow) and `entry.randomPosition` (Random Position Seeder). Both listed below as rows 6a / 6b.

This is the launch-day block library. Every entry below is:
- Fully metadata-filled (label, summary, long description, user explanation, tags, plan)
- Inspector-ready (param kinds + validation constraints)
- MQL5-compilable (either a full translator or a clearly-labelled `Preview` stub)
- Plan-gated in the UI

## 1 · V1 canvas blocks (40)

| # | Block ID                    | Family       | Plan    | Translator | Why in V1                                                      |
| - | --------------------------- | ------------ | ------- | ---------- | -------------------------------------------------------------- |
| 1 | `entry.emaCross`            | Entry        | free    | Full       | The reference trend-entry. Classic, simple, testable.         |
| 2 | `entry.smaCross`            | Entry        | free    | Full       | Matches textbook golden / death cross exactly.                |
| 3 | `entry.macdCross`           | Entry        | free    | Full       | Staple momentum trigger.                                      |
| 4 | `entry.stochCross`          | Entry        | free    | Full       | OB/OS-zoned stochastic cross.                                 |
| 5 | `entry.previousCandle`      | Entry        | free    | Full       | Cheapest breakout — starter block.                            |
| 5a| `entry.candleOpen`          | Entry        | free    | Full       | Open in direction of the just-closed candle on every new bar. |
| 5b| `entry.randomPosition`      | Entry        | pro     | Full       | One-shot random/fixed seed for grid / martingale starters.    |
| 6 | `entry.rsiExtreme`          | Entry        | free    | Full       | Classic mean-reversion entry.                                 |
| 7 | `entry.donchianBreakout`    | Entry        | pro     | Full       | Robust trend-breakout baseline.                               |
| 8 | `entry.bollingerBreak`      | Entry        | pro     | Preview    | Volatility-aware breakout (to promote from preview in Phase C+).|
| 9 | `entry.priceActionPinbar`   | Entry        | pro     | Preview    | Price-action entry. Beta — MQL5 impl in Phase C+.             |
| 10| `filter.priceAboveMa`       | Confirmation | free    | Full       | "Price vs MA" — the cheapest trend filter you can add.        |
| 11| `filter.emaSlope`           | Trend        | free    | Full       | EMA slope — the second-cheapest trend filter.                 |
| 12| `filter.adx`                | Trend        | pro     | Stub→planned| ADX strength. P2 MQL5 implementation.                         |
| 13| `filter.higherTimeframeTrend`| MTF          | pro     | Stub       | HTF EMA alignment — high-impact filter.                       |
| 14| `filter.rsi`                | Momentum     | free    | Full       | RSI longBelow / shortAbove band (legacy).                     |
| 15| `filter.rsiBand`            | Momentum     | free    | Full       | RSI in [min, max] — cleaner replacement for `filter.rsi`.     |
| 16| `filter.rocThreshold`       | Momentum     | pro     | Full       | Require minimum ROC thrust before entering.                   |
| 17| `filter.atr`                | Volatility   | free    | Full       | ATR min / max in pips (legacy).                               |
| 18| `filter.atrBand`            | Volatility   | free    | Full       | ATR band — explicit min/max semantics.                        |
| 19| `filter.pinBar`             | Candle       | pro     | Preview    | Pin-bar pattern filter (full impl Phase C+).                  |
| 20| `filter.session`            | Session      | free    | Full       | Custom hour window. Every strategy needs one.                 |
| 21| `filter.londonSession`      | Session      | free    | Full       | London preset, UTC-offset aware.                              |
| 22| `filter.dayOfWeek`          | Session      | free    | Stub       | Weekday whitelist.                                            |
| 23| `filter.spreadLimit`        | Execution    | free    | Full       | Best single defence against bad fills.                        |
| 24| `filter.maxDailyTrades`     | Utility      | free    | Full       | Legacy id — kept for saved graphs.                            |
| 25| `filter.maxDailyLoss`       | Utility      | pro     | Full       | Daily DD kill-switch (legacy).                                |
| 26| `news.pauseBeforeNews`      | News         | pro     | Preview    | Pause around events (full implementation Phase C+).           |
| 27| `risk.fixedRisk`            | Risk         | pro     | Full       | Gold-standard risk-% per trade.                               |
| 28| `risk.dailyRiskBudget`      | Risk         | pro     | Full       | Prop-firm compatible daily budget.                            |
| 29| `risk.riskPercent`          | Risk         | pro     | Full       | Legacy combined risk+lot block.                               |
| 30| `lot.fixed`                 | Lot          | free    | Full       | Simplest lot for early testing.                               |
| 31| `lot.fromRisk`              | Lot          | pro     | Full       | Exact lot from risk-% and SL distance.                        |
| 32| `risk.fixedLot`             | Lot (legacy) | free    | Full       | Kept so old graphs load.                                      |
| 33| `manage.breakEven`          | Management   | free    | Full       | The default trade-management move.                            |
| 34| `manage.trailingStop`       | Management   | pro     | Full       | Fixed-pip trailing.                                           |
| 35| `manage.trailingStopAtr`    | Management   | pro     | Full       | The professional default — ATR-aware trailing.                |
| 36| `manage.partialClose`       | Management   | pro     | Full       | "Book half, trail the rest" flow.                             |
| 37| `exit.fixedTpSl`            | Exit         | free    | Full       | Simplest fixed TP/SL.                                         |
| 38| `exit.rrBased`              | Exit         | pro     | Full       | Predictable R:R expectancy.                                   |
| 39| `exit.atrBased`             | Exit         | pro     | Full       | Volatility-aware exits.                                       |
| 40| `exit.timeBasedExit`        | Exit         | free    | Stub       | Close after N hours.                                          |
| 41| `exit.oppositeSignal`       | Exit         | free    | Stub       | "Always in market" for trend systems.                         |
| 42| `grid.basicGrid`            | Grid         | pro     | Preview    | Intro grid — highly requested.                                |
| 43| `utility.oneTradeAtTime`    | Utility      | free    | Full       | Most-used single-trade guard.                                 |
| 44| `utility.maxOpenPositions`  | Utility      | free    | Full       | Position cap.                                                 |
| 45| `utility.slippageControl`   | Utility      | free    | Stub       | Slippage hard limit.                                          |
| 46| `utility.emergencyStop`     | Utility      | pro     | Stub       | Equity kill-switch.                                           |
| 47| `utility.onlyNewBar`        | Utility      | free    | Full       | Stops intra-bar flipping.                                     |

> The table above shows 47 rows intentionally — users see 40 visible items in the library because 7 of them are legacy aliases / duplicates of promoted blocks and are hidden from the library UI (but kept in the registry for graph backwards-compat). The NodeLibrary filters out `(legacy)`-labelled entries.

## 2 · Plan split

**Free (19 visible).** emaCross, smaCross, macdCross, stochCross, previousCandle, rsiExtreme, priceAboveMa, emaSlope, rsi, rsiBand, atr, atrBand, session, londonSession, dayOfWeek, spreadLimit, breakEven, fixedTpSl, timeBasedExit, oppositeSignal, oneTradeAtTime, maxOpenPositions, onlyNewBar, slippageControl, lot.fixed, filter.maxDailyTrades.

**Pro (18 visible).** donchianBreakout, bollingerBreak, pinBar (filter), rocThreshold, adx, higherTimeframeTrend, maxDailyLoss, fixedRisk, dailyRiskBudget, lot.fromRisk, trailingStop, trailingStopAtr, partialClose, rrBased, atrBased, grid.basic, emergencyStop, pauseBeforeNews, pinBar (entry).

**Creator (3 visible).** chandelierExit, trendlineBreak, a couple of roadmap previews (treated as "preview" badge only in V1).

## 3 · Strategic styles unlocked in V1

| Strategy style       | V1 block combinations (examples)                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Classic trend**    | `emaCross` + `emaSlope` + `spreadLimit` + `fixedRisk` + `lot.fromRisk` + `manage.trailingStopAtr` + `exit.atrBased` + `onlyNewBar` |
| **Reversal / mean-revert** | `rsiExtreme` (onReentry) + `adx` (non-trend) + `atrBand` + `fixedRisk` + `lot.fromRisk` + `exit.rrBased` + `manage.breakEven` |
| **Breakout**         | `donchianBreakout` + `londonSession` + `atrBand` + `fixedRisk` + `lot.fromRisk` + `manage.trailingStopAtr` + `utility.onlyNewBar`|
| **Session scalp**    | `previousCandle` + `session` (custom) + `spreadLimit` + `lot.fixed` + `exit.fixedTpSl` + `utility.maxDailyTrades` |
| **Prop-firm safe**   | Any entry + `dailyRiskBudget` + `maxDailyLoss` + `emergencyStop` + `lot.fromRisk` + `exit.atrBased` |
| **Pattern-play**     | `priceActionPinbar` + `priceAboveMa` + `fixedRisk` + `exit.rrBased` |
| **Momentum scalp**   | `entry.candleOpen` (minBody≥5) + `filter.spreadLimit` + `lot.fixed` + `exit.fixedTpSl` |
| **Grid starter**     | `entry.randomPosition` + `grid.atrSpaced` + `basket.totalProfitTarget` + `lot.martingale` |

## 4 · What we're NOT shipping in V1 (roadmap)

Everything P2/P3 in `docs/block-taxonomy.md` stays `planned` or `beta` in the registry. Highest-demand roadmap items for Phase C+:

1. **Smart-money concepts** — BOS, CHoCH, FVG, order blocks (all in `struct.*`).
2. **Divergence detectors** — RSI / MACD divergence (`momentum.rsiDivergence`, `momentum.macdDivergence`).
3. **Basket / portfolio** — full basket TP/SL engine.
4. **News CSV feed** — deeper news-calendar block.
5. **Creator-tier lot sizing** — fixed-ratio, anti-martingale, Kelly fractional.
6. **Advanced protection** — IP-lock, license-server, obfuscation level.

These appear in the admin dashboard (Phase D) as `planned` rows, ready to flip to `active` once implemented.

## 5 · How Phase C wires into the builder

- `NODE_DEFINITIONS` in `lib/strategies/nodes.ts` is the V1 source of truth for the builder. Legacy IDs kept so saved graphs load.
- The richer `lib/blocks/` registry (214 entries) powers the admin dashboard, analytics, and future taxonomy work. When a Phase-D admin flips a `planned` block to `active`, the new block surfaces in the builder via a small bridge introduced in Phase D.
- `PREMIUM_NODE_TYPES` updated with the V1 additions.
- MQL5 translators added for every V1 block with a `Full` rating. Preview / Stub blocks compile with a warning diagnostic.

— V1 block set · ready to ship.
