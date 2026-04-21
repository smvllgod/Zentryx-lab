# Zentryx Lab — Logic Block Taxonomy (v1.0)

**Purpose.** This document is the single source of truth for the Zentryx Lab block library: what blocks exist, why they exist, how they're grouped, what users see, how each is gated by plan, and how the engineering team should sequence implementation.

**Scope.** MT5 only. 216 blocks across 20 families (22 entry blocks after the 2026-04 addition of `entry.candleOpen` + `entry.randomPosition`). Some families belong on the strategy canvas (trade logic); two families are export / protection / packaging configuration modules and must **not** appear as draggable nodes.

**Taxonomy key.**

| Column           | Values                                                          |
| ---------------- | --------------------------------------------------------------- |
| `plan`           | `free`, `pro`, `creator`                                        |
| `priority`       | `P1` (V1 launch) · `P2` (near-term) · `P3` (roadmap / research) |
| `complexity`     | `basic` · `intermediate` · `advanced`                           |
| `surface`        | `canvas` · `export-config` · `protection-config` · `packaging`  |
| `affects`        | `entry` · `filter` · `risk` · `management` · `exit` · `export`  |
| `mt5`            | `Y` = requires MT5 indicator handle / history access            |
| `codegen`        | `Y` = produces MQL5 code · `N` = metadata only                  |

**ID convention.** `<family-slug>.<block-slug>` — e.g. `trend.emaSlope`, `risk.fixedRisk`, `protection.accountLock`. Family slugs are short; block slugs are lowerCamelCase. The `NodeType` union in `lib/strategies/types.ts` will be re-generated from these IDs in Phase B.

---

## 1 · Family overview

| #  | Family                                | Surface           | Blocks | V1 picks |
| -- | ------------------------------------- | ----------------- | ------ | -------- |
| 1  | Entry Logic                           | canvas            | 24     | 9        |
| 2  | Confirmation Logic                    | canvas            | 12     | 2        |
| 3  | Trend Filters                         | canvas            | 12     | 2        |
| 4  | Momentum Filters                      | canvas            | 10     | 2        |
| 5  | Volatility Filters                    | canvas            | 10     | 1        |
| 6  | Market Structure                      | canvas            | 12     | 0        |
| 7  | Candle Patterns                       | canvas            | 14     | 1        |
| 8  | Session Filters                       | canvas            | 8      | 2        |
| 9  | News / Event Filters                  | canvas            | 7      | 1        |
| 10 | Spread / Execution Filters            | canvas            | 8      | 2        |
| 11 | Risk Models                           | canvas            | 8      | 2        |
| 12 | Lot Sizing                            | canvas            | 10     | 2        |
| 13 | Trade Management                      | canvas            | 14     | 3        |
| 14 | Exit Logic                            | canvas            | 14     | 3        |
| 15 | Basket / Portfolio Logic              | canvas            | 10     | 0        |
| 16 | Grid / Recovery Logic                 | canvas            | 9      | 1        |
| 17 | Multi-Timeframe Logic                 | canvas            | 8      | 1        |
| 18 | Utility / Trade Constraints           | canvas            | 12     | 4        |
| 19 | Strategy Protection / Licensing       | protection-config | 8      | 2 (cfg)  |
| 20 | Marketplace / Packaging configuration | packaging         | 6      | 2 (cfg)  |
| —  | **Total**                             | —                 | **216**| **42**   |

---

## 2 · Block catalogue

> Every row below is a real, production-scoped block with a reason to exist. Column headers: **id · name · subcategory · plan · pri · cpx · mt5 · codegen · short description**. Where two blocks look similar, the description makes the boundary explicit.

### 2.1 · Entry Logic  (24 blocks · canvas · affects=entry)

Classic triggers for opening a position. Exactly one entry block is required (V1 enforces this via validator). Subcategories: `crossover`, `breakout`, `reversal`, `zone`, `pattern-trigger`, `composite`, `price-action`, `seeder`.

| id                          | name                          | sub       | plan    | pri | cpx           | mt5 | codegen | short                                                                                  |
| --------------------------- | ----------------------------- | --------- | ------- | --- | ------------- | --- | ------- | -------------------------------------------------------------------------------------- |
| `entry.emaCross`            | EMA Cross                     | crossover | free    | P1  | basic         | Y   | Y       | Fast EMA crosses slow EMA.                                                             |
| `entry.smaCross`            | SMA Cross                     | crossover | free    | P1  | basic         | Y   | Y       | Fast SMA crosses slow SMA (alt to EMA for testing classics).                           |
| `entry.macdCross`           | MACD Cross                    | crossover | free    | P1  | basic         | Y   | Y       | MACD line crosses signal line.                                                         |
| `entry.macdZeroCross`       | MACD Zero Line                | crossover | pro     | P2  | intermediate  | Y   | Y       | MACD line crosses the zero line (regime flip).                                         |
| `entry.stochCross`          | Stochastic Cross              | crossover | free    | P1  | basic         | Y   | Y       | %K / %D cross in OB / OS zones.                                                        |
| `entry.rsiCross`            | RSI Centerline                | crossover | pro     | P2  | basic         | Y   | Y       | RSI crosses 50 (momentum flip).                                                        |
| `entry.adxCross`            | ADX Regime                    | crossover | pro     | P3  | intermediate  | Y   | Y       | ADX crosses threshold — enter when trend-strength activates.                           |
| `entry.ichimokuKijun`       | Ichimoku Kijun Cross          | crossover | pro     | P3  | advanced      | Y   | Y       | Price crosses Kijun-sen with cloud-side filter.                                        |
| `entry.donchianBreakout`    | Donchian Breakout             | breakout  | pro     | P1  | intermediate  | Y   | Y       | Close outside N-bar Donchian channel.                                                  |
| `entry.bollingerBreak`      | Bollinger Breakout            | breakout  | pro     | P1  | intermediate  | Y   | Y       | Close outside Bollinger envelope.                                                      |
| `entry.previousCandle`      | Previous Candle Break         | breakout  | free    | P1  | basic         | N   | Y       | Break of previous candle high / low.                                                   |
| `entry.candleOpen`          | Candle Open Follow            | price-action | free | P1  | basic         | N   | Y       | Open in the direction of the just-closed candle on every new bar.                      |
| `entry.randomPosition`      | Random Position Seeder        | seeder    | pro     | P2  | basic         | N   | Y       | Fires once on load — random / fixed direction seed for grid / martingale systems.      |
| `entry.nBarBreakout`        | N-Bar High/Low Breakout       | breakout  | pro     | P2  | basic         | N   | Y       | Break of N-bar high / low.                                                             |
| `entry.atrBreakout`         | ATR Volatility Breakout       | breakout  | pro     | P2  | intermediate  | Y   | Y       | Open ± k·ATR hit.                                                                      |
| `entry.sessionBreakout`     | Session Range Breakout        | breakout  | creator | P2  | intermediate  | N   | Y       | Break of the prior session (Asia / London / Custom) range.                             |
| `entry.rsiExtreme`          | RSI Extremes                  | reversal  | free    | P1  | basic         | Y   | Y       | Long when RSI < oversold / short when RSI > overbought.                                |
| `entry.stochExtreme`        | Stochastic Extremes           | reversal  | pro     | P2  | basic         | Y   | Y       | Mirror of RSI extremes with %K/%D.                                                     |
| `entry.bollingerMeanRev`    | Bollinger Mean Reversion      | reversal  | pro     | P2  | intermediate  | Y   | Y       | Close back inside band after touching outer band.                                      |
| `entry.supportResistance`   | Support / Resistance Touch    | zone      | creator | P3  | advanced      | N   | Y       | Enter on first touch of an auto-detected S/R level.                                    |
| `entry.trendlineBreak`      | Trendline Break               | zone      | creator | P3  | advanced      | N   | Y       | Break of an auto-detected swing trendline.                                             |
| `entry.priceActionPinbar`   | Pin Bar Trigger               | pattern-t | pro     | P2  | intermediate  | N   | Y       | Pin-bar reversal (wick/body ratio + trend bias).                                       |
| `entry.engulfingTrigger`    | Engulfing Trigger             | pattern-t | pro     | P2  | intermediate  | N   | Y       | Bullish / bearish engulfing as entry.                                                  |
| `entry.multiSignal`         | Composite Signal Gate         | composite | creator | P3  | advanced      | N   | Y       | Require N of M sub-signals to fire simultaneously.                                     |

**Conflicts.** An entry block cannot be used as a *Confirmation* in the same graph (the Confirmation family re-uses the same indicators but in a `filter` role).

### 2.2 · Confirmation Logic  (12 blocks · canvas · affects=filter)

Secondary checks that gate the primary entry. They never fire an entry alone; they AND into the entry condition. Subcategories: `indicator`, `volume`, `price-relation`, `time`.

| id                                 | name                            | sub             | plan    | pri | cpx          | mt5 | codegen | short                                                                              |
| ---------------------------------- | ------------------------------- | --------------- | ------- | --- | ------------ | --- | ------- | ---------------------------------------------------------------------------------- |
| `confirm.rsiSide`                  | RSI Side Confirmation           | indicator       | free    | P1  | basic        | Y   | Y       | Only allow long when RSI > level; short when RSI < level.                          |
| `confirm.macdSide`                 | MACD Side Confirmation          | indicator       | pro     | P2  | basic        | Y   | Y       | MACD histogram sign must match signal direction.                                   |
| `confirm.stochSlope`               | Stochastic Slope                | indicator       | pro     | P2  | intermediate | Y   | Y       | %K rising / falling.                                                               |
| `confirm.priceAboveMa`             | Price vs Moving Average         | price-relation  | free    | P1  | basic        | Y   | Y       | Price must be above / below MA of period N.                                        |
| `confirm.priceVsVwap`              | Price vs VWAP                   | price-relation  | creator | P3  | advanced     | Y   | Y       | Price relative to session VWAP (requires tick volume).                             |
| `confirm.emaAlignment`             | EMA Alignment                   | price-relation  | pro     | P2  | intermediate | Y   | Y       | Three EMAs (e.g. 20/50/200) ordered correctly for direction.                       |
| `confirm.higherHigh`               | Structure: Higher High / Low    | price-relation  | creator | P3  | advanced     | N   | Y       | Require last swing HH / HL (long) or LL / LH (short).                              |
| `confirm.atrAboveMa`               | ATR Above MA                    | indicator       | pro     | P3  | intermediate | Y   | Y       | ATR must exceed its own N-period MA (live volatility regime).                      |
| `confirm.tickVolume`               | Tick Volume Spike               | volume          | pro     | P3  | intermediate | Y   | Y       | Bar's tick volume > k × average.                                                   |
| `confirm.obvSlope`                 | OBV Slope                       | volume          | creator | P3  | advanced     | Y   | Y       | On-Balance Volume rising / falling.                                                |
| `confirm.barColor`                 | Candle Color Match              | price-relation  | free    | P2  | basic        | N   | Y       | Prior candle must be bullish / bearish.                                            |
| `confirm.minBarsSinceSignal`       | Cooldown Since Last Trade       | time            | free    | P1  | basic        | N   | Y       | Block entries for N bars after the last one (noise reducer).                       |

### 2.3 · Trend Filters  (12 blocks · canvas · affects=filter)

Block entries when the broader trend disagrees. Distinct from Confirmation in that these tend to use **slower** signals or the higher TF.

| id                              | name                          | sub         | plan    | pri | cpx          | mt5 | codegen | short                                                                                  |
| ------------------------------- | ----------------------------- | ----------- | ------- | --- | ------------ | --- | ------- | -------------------------------------------------------------------------------------- |
| `trend.emaSlope`                | EMA Slope Filter              | slope       | free    | P1  | basic        | Y   | Y       | Slope of EMA(N) must match direction over L bars.                                      |
| `trend.smaDirection`            | SMA Direction                 | slope       | pro     | P2  | basic        | Y   | Y       | Higher-period SMA rising / falling.                                                    |
| `trend.adxStrength`             | ADX Trend Strength            | strength    | pro     | P1  | intermediate | Y   | Y       | ADX above threshold (trend exists).                                                    |
| `trend.adxNonTrend`             | ADX Non-Trend                 | strength    | pro     | P2  | basic        | Y   | Y       | ADX below threshold (ranging regime only).                                             |
| `trend.higherTfEma`             | Higher-TF EMA Alignment       | mtf         | pro     | P1  | intermediate | Y   | Y       | Higher-TF EMA slope must agree.                                                        |
| `trend.ichimokuCloudSide`       | Price vs Ichimoku Cloud       | cloud       | creator | P3  | advanced     | Y   | Y       | Price above / below Kumo cloud.                                                        |
| `trend.hullDirection`           | Hull MA Direction             | slope       | pro     | P2  | intermediate | Y   | Y       | HMA rising / falling — fast trend read.                                                |
| `trend.supertrend`              | Supertrend Side               | flip        | pro     | P2  | intermediate | Y   | Y       | Price relative to Supertrend line.                                                     |
| `trend.parabolicSar`            | Parabolic SAR Side            | flip        | pro     | P2  | basic        | Y   | Y       | Dots below (long-ok) / above (short-ok) price.                                         |
| `trend.aroon`                   | Aroon Trend                   | strength    | creator | P3  | advanced     | Y   | Y       | Aroon-Up vs Aroon-Down dominance.                                                      |
| `trend.dmiDirection`            | DMI Direction                 | strength    | pro     | P3  | intermediate | Y   | Y       | +DI vs −DI dominance.                                                                  |
| `trend.linearRegression`        | Linear Regression Slope       | slope       | creator | P3  | advanced     | Y   | Y       | Sign of N-bar linear-regression slope.                                                 |

### 2.4 · Momentum Filters  (10 blocks · canvas · affects=filter)

Pure oscillator-region filters. Overlaps with Confirmation, but scoped to *blocking* behaviour rather than AND-ing with primary entry.

| id                       | name                 | sub        | plan    | pri | cpx          | mt5 | codegen | short                                                                                 |
| ------------------------ | -------------------- | ---------- | ------- | --- | ------------ | --- | ------- | ------------------------------------------------------------------------------------- |
| `momentum.rsiBand`       | RSI Allowed Band     | oscillator | free    | P1  | basic        | Y   | Y       | Block entries when RSI outside [low, high].                                           |
| `momentum.stochBand`     | Stochastic Band      | oscillator | pro     | P2  | basic        | Y   | Y       | Same for %K.                                                                          |
| `momentum.cciBand`       | CCI Band             | oscillator | pro     | P2  | basic        | Y   | Y       | CCI allowed range.                                                                    |
| `momentum.williamsR`     | Williams %R          | oscillator | creator | P3  | basic        | Y   | Y       | Williams %R allowed range.                                                            |
| `momentum.rocThreshold`  | Rate of Change       | oscillator | pro     | P1  | basic        | Y   | Y       | ROC magnitude must exceed threshold (or must be below).                               |
| `momentum.macdHist`      | MACD Histogram Size  | histogram  | pro     | P2  | basic        | Y   | Y       | Abs histogram value above threshold (confirm impulse).                                |
| `momentum.rsiDivergence` | RSI Divergence       | divergence | creator | P3  | advanced     | Y   | Y       | Detect regular / hidden RSI divergence.                                               |
| `momentum.macdDivergence`| MACD Divergence      | divergence | creator | P3  | advanced     | Y   | Y       | MACD divergence detector.                                                             |
| `momentum.momentumIndex` | Momentum (N-period)  | oscillator | free    | P2  | basic        | Y   | Y       | Close / close-N > 1 (long) or < 1 (short).                                            |
| `momentum.trix`          | TRIX Side            | oscillator | creator | P3  | intermediate | Y   | Y       | TRIX above / below zero.                                                              |

### 2.5 · Volatility Filters  (10 blocks · canvas · affects=filter)

Regime filters based on ATR, BB width, variance, etc.

| id                          | name                          | sub            | plan    | pri | cpx          | mt5 | codegen | short                                                                                  |
| --------------------------- | ----------------------------- | -------------- | ------- | --- | ------------ | --- | ------- | -------------------------------------------------------------------------------------- |
| `vol.atrBand`               | ATR Allowed Range             | atr            | free    | P1  | basic        | Y   | Y       | ATR(period) must be between [min, max] pips.                                           |
| `vol.atrAboveAverage`       | ATR Above Its Average         | atr            | pro     | P2  | intermediate | Y   | Y       | ATR above N-period ATR average.                                                        |
| `vol.atrBelowAverage`       | ATR Below Its Average         | atr            | pro     | P2  | intermediate | Y   | Y       | ATR below average — low-vol regime only.                                               |
| `vol.bbWidth`               | Bollinger Bandwidth           | bands          | pro     | P2  | intermediate | Y   | Y       | BB width above / below threshold (squeeze or expansion).                               |
| `vol.keltnerInside`         | Inside Keltner Channel        | bands          | creator | P3  | advanced     | Y   | Y       | Price inside Keltner ± k×ATR (squeeze confirmation).                                   |
| `vol.stdDevThreshold`       | Std-Dev Threshold             | statistical    | creator | P3  | intermediate | Y   | Y       | Close-to-close σ above / below threshold.                                              |
| `vol.dailyRange`            | Daily Range Used              | range-used     | pro     | P2  | intermediate | N   | Y       | Block entries after N% of typical daily range is already used.                         |
| `vol.volatilityRatio`       | Short/Long ATR Ratio          | atr            | creator | P3  | advanced     | Y   | Y       | ATR(fast) / ATR(slow) thresholded — regime change detector.                            |
| `vol.gapFilter`             | Overnight Gap Filter          | event          | pro     | P2  | basic        | N   | Y       | Block entries if the bar gapped > k pips.                                              |
| `vol.weekendCarry`          | Weekend Carry Filter          | event          | pro     | P2  | basic        | N   | Y       | Block entries Fri after HH:MM (no weekend hold).                                       |

### 2.6 · Market Structure  (12 blocks · canvas · affects=filter)

Price-structure reads: swings, HH/LL, zones, fractals, order blocks.

| id                         | name                       | sub        | plan    | pri | cpx          | mt5 | codegen | short                                                                               |
| -------------------------- | -------------------------- | ---------- | ------- | --- | ------------ | --- | ------- | ----------------------------------------------------------------------------------- |
| `struct.swingHigherHigh`   | Swing: HH/HL               | swings     | creator | P3  | advanced     | N   | Y       | Long only after a confirmed HH + HL sequence.                                       |
| `struct.swingLowerLow`     | Swing: LL/LH               | swings     | creator | P3  | advanced     | N   | Y       | Short variant.                                                                      |
| `struct.bosBreakOfStructure`| Break of Structure         | structure  | creator | P3  | advanced     | N   | Y       | Confirmed BOS on swing high / low.                                                  |
| `struct.chochChange`       | Change of Character (CHoCH)| structure  | creator | P3  | advanced     | N   | Y       | Shift from bearish to bullish structure (or vice versa).                            |
| `struct.fractalFilter`     | Bill Williams Fractal      | fractals   | pro     | P3  | intermediate | Y   | Y       | Require a fresh fractal up / down within N bars.                                    |
| `struct.supportResistance` | S/R Proximity              | levels     | creator | P3  | advanced     | N   | Y       | Block entries within X pips of a detected S/R level.                                |
| `struct.pivotPoint`        | Pivot Point Zones          | levels     | pro     | P2  | intermediate | N   | Y       | Classic pivot levels: require price at / above / below a specific pivot.            |
| `struct.supplyDemandZone`  | Supply / Demand Zones      | zones      | creator | P3  | advanced     | N   | Y       | Detect & respect recent supply / demand rectangles.                                 |
| `struct.orderBlock`        | Order Block Filter         | smc        | creator | P3  | advanced     | N   | Y       | Simple ICT-style order-block proximity.                                             |
| `struct.fairValueGap`      | Fair Value Gap             | smc        | creator | P3  | advanced     | N   | Y       | Price must have revisited a detected FVG.                                           |
| `struct.roundNumber`       | Round-Number Proximity     | levels     | pro     | P3  | basic        | N   | Y       | Only trade within / outside X pips of round numbers (00 / 50).                      |
| `struct.priorDayExtreme`   | Prior-Day High/Low         | levels     | pro     | P2  | intermediate | N   | Y       | Require price above / below prior day's high / low.                                 |

### 2.7 · Candle Patterns  (14 blocks · canvas · affects=filter)

Single- and multi-bar pattern detectors. Used as **filters**; for pattern-based *entries* see 2.1 Entry Logic.

| id                          | name                   | sub        | plan    | pri | cpx          | mt5 | codegen | short                                                                             |
| --------------------------- | ---------------------- | ---------- | ------- | --- | ------------ | --- | ------- | --------------------------------------------------------------------------------- |
| `candle.pinBar`             | Pin Bar (Hammer / ShS) | single     | pro     | P1  | intermediate | N   | Y       | Wick/body ratio with direction bias.                                              |
| `candle.doji`               | Doji                   | single     | pro     | P2  | basic        | N   | Y       | Body < body-tolerance × range.                                                    |
| `candle.marubozu`           | Marubozu               | single     | pro     | P2  | basic        | N   | Y       | Full-body candle (no wicks).                                                      |
| `candle.engulfing`          | Engulfing              | two-bar    | pro     | P2  | intermediate | N   | Y       | Bullish / bearish engulfing.                                                      |
| `candle.harami`             | Harami                 | two-bar    | creator | P3  | intermediate | N   | Y       | Inside-bar reversal.                                                              |
| `candle.insideBar`          | Inside Bar             | two-bar    | pro     | P2  | basic        | N   | Y       | Current high<prev high AND current low>prev low (range compression).              |
| `candle.outsideBar`         | Outside Bar            | two-bar    | pro     | P3  | basic        | N   | Y       | Current high>prev high AND current low<prev low (expansion).                      |
| `candle.morningStar`        | Morning Star           | multi-bar  | creator | P3  | advanced     | N   | Y       | 3-bar bullish reversal.                                                           |
| `candle.eveningStar`        | Evening Star           | multi-bar  | creator | P3  | advanced     | N   | Y       | 3-bar bearish reversal.                                                           |
| `candle.threeWhiteSoldiers` | Three White Soldiers   | multi-bar  | creator | P3  | advanced     | N   | Y       | Three consecutive strong bullish bars.                                            |
| `candle.threeBlackCrows`    | Three Black Crows      | multi-bar  | creator | P3  | advanced     | N   | Y       | Bearish mirror.                                                                   |
| `candle.piercing`           | Piercing / Dark Cloud  | two-bar    | creator | P3  | intermediate | N   | Y       | Classic reversal pair.                                                            |
| `candle.tweezer`            | Tweezer Top / Bottom   | two-bar    | creator | P3  | intermediate | N   | Y       | Matching wicks reversal.                                                          |
| `candle.rangeFilter`        | Bar Range Filter       | single     | pro     | P2  | basic        | N   | Y       | Bar range (pips) must exceed / not exceed threshold.                              |

### 2.8 · Session Filters  (8 blocks · canvas · affects=filter)

| id                        | name                  | sub          | plan    | pri | cpx          | mt5 | codegen | short                                                                          |
| ------------------------- | --------------------- | ------------ | ------- | --- | ------------ | --- | ------- | ------------------------------------------------------------------------------ |
| `session.customWindow`    | Custom Hour Window    | hours        | free    | P1  | basic        | N   | Y       | Trade only between `startHour`–`endHour` (server time).                        |
| `session.london`          | London Session        | preset       | free    | P1  | basic        | N   | Y       | Preset 07:00–16:00 UTC (server-offset aware).                                  |
| `session.newYork`         | New York Session      | preset       | free    | P2  | basic        | N   | Y       | Preset 12:00–21:00 UTC.                                                        |
| `session.asia`            | Asia Session          | preset       | pro     | P2  | basic        | N   | Y       | Preset 23:00–08:00 UTC.                                                        |
| `session.overlap`         | Session Overlap Only  | preset       | pro     | P2  | intermediate | N   | Y       | London/NY overlap (12:00–16:00 UTC).                                           |
| `session.dayOfWeek`       | Day of Week           | day          | free    | P2  | basic        | N   | Y       | Whitelist of weekdays.                                                         |
| `session.monthOfYear`     | Month of Year         | day          | pro     | P3  | basic        | N   | Y       | Whitelist of months.                                                           |
| `session.holidayCalendar` | Holiday Calendar      | event        | creator | P3  | advanced     | N   | Y       | Block entries on known broker holidays (from a static table).                  |

### 2.9 · News / Event Filters  (7 blocks · canvas · affects=filter)

All rely on an optional news feed (csv/json bundled with the EA, or chart comment polling). V1 ships a simple CSV-upload model.

| id                              | name                     | sub       | plan    | pri | cpx          | mt5 | codegen | short                                                                           |
| ------------------------------- | ------------------------ | --------- | ------- | --- | ------------ | --- | ------- | ------------------------------------------------------------------------------- |
| `news.pauseAround`              | Pause Around News        | calendar  | pro     | P1  | intermediate | N   | Y       | Block entries X min before / after events matching filters.                     |
| `news.highImpactOnly`           | High-Impact Filter       | calendar  | pro     | P2  | basic        | N   | Y       | Apply pause only to high-impact events.                                         |
| `news.currencyScope`            | Currency Scope           | calendar  | pro     | P2  | basic        | N   | Y       | Limit news scope to currencies in the symbol.                                   |
| `news.closeBeforeNews`          | Close Before News        | calendar  | creator | P2  | intermediate | N   | Y       | Flatten positions X min before the event.                                       |
| `news.dailyMacroBlock`          | FOMC / ECB Days          | calendar  | creator | P3  | intermediate | N   | Y       | Block trading on FOMC / ECB / NFP release day.                                  |
| `news.csvFeed`                  | Custom News CSV Feed     | feed-cfg  | creator | P2  | advanced     | N   | Y       | Configure which bundled CSV feed to use.                                        |
| `news.sentimentFilter`          | Sentiment Filter         | sentiment | creator | P3  | advanced     | N   | Y       | Block trades against sentiment bias (requires external feed).                   |

### 2.10 · Spread / Execution Filters  (8 blocks · canvas · affects=filter)

| id                           | name                       | sub       | plan    | pri | cpx          | mt5 | codegen | short                                                                          |
| ---------------------------- | -------------------------- | --------- | ------- | --- | ------------ | --- | ------- | ------------------------------------------------------------------------------ |
| `exec.spreadLimit`           | Max Spread (points)        | spread    | free    | P1  | basic        | N   | Y       | Skip entries when spread exceeds limit.                                        |
| `exec.spreadRatio`           | Spread / ATR Ratio         | spread    | pro     | P2  | intermediate | Y   | Y       | Block entries when spread > k × ATR (realism gate).                            |
| `exec.slippageControl`       | Max Slippage (points)      | slippage  | free    | P1  | basic        | N   | Y       | Reject orders over N points of slippage.                                       |
| `exec.minStopsLevel`         | Broker Stops-Level Check   | broker    | pro     | P2  | intermediate | N   | Y       | Respect broker min-stop distance on SL/TP.                                     |
| `exec.freezeLevel`           | Freeze-Level Check         | broker    | pro     | P3  | intermediate | N   | Y       | Block modifications within freeze level.                                       |
| `exec.minEquity`             | Minimum Equity             | account   | pro     | P2  | basic        | N   | Y       | Block entries below equity floor.                                              |
| `exec.marginLevelFloor`      | Margin-Level Floor         | account   | pro     | P2  | intermediate | N   | Y       | Block new trades if margin-level% < threshold.                                 |
| `exec.symbolWhitelist`       | Allowed Symbols            | broker    | pro     | P2  | basic        | N   | Y       | Only run on symbols in the list.                                               |

### 2.11 · Risk Models  (8 blocks · canvas · affects=risk)

Defines **risk budget** — abstract. Converted to lots by a Lot Sizing block.

| id                         | name                       | sub       | plan    | pri | cpx          | mt5 | codegen | short                                                                              |
| -------------------------- | -------------------------- | --------- | ------- | --- | ------------ | --- | ------- | ---------------------------------------------------------------------------------- |
| `risk.fixedRisk`           | Fixed-Risk per Trade       | budget    | pro     | P1  | basic        | N   | Y       | Risk X% of equity per trade.                                                       |
| `risk.fixedCashRisk`       | Fixed Cash Risk            | budget    | pro     | P1  | basic        | N   | Y       | Risk $X per trade (balance-independent).                                           |
| `risk.kellyFraction`       | Kelly Fraction             | budget    | creator | P3  | advanced     | N   | Y       | Size by (fractional) Kelly — experimental.                                         |
| `risk.atrRisk`             | ATR-Based Risk             | budget    | pro     | P2  | intermediate | Y   | Y       | Risk X% where SL = k×ATR.                                                          |
| `risk.dailyRiskBudget`     | Daily Risk Budget          | budget    | pro     | P1  | intermediate | N   | Y       | Max Y% risk allocated per day across all trades.                                   |
| `risk.weeklyRiskBudget`    | Weekly Risk Budget         | budget    | creator | P2  | intermediate | N   | Y       | Same, weekly window.                                                               |
| `risk.drawdownScale`       | Drawdown Risk Scaler       | adaptive  | creator | P3  | advanced     | N   | Y       | Auto-reduce risk after X% open DD.                                                 |
| `risk.equityCurveStop`     | Equity-Curve Kill Switch   | adaptive  | creator | P3  | advanced     | N   | Y       | Stop all trading when equity curve breaks its own MA.                              |

### 2.12 · Lot Sizing  (10 blocks · canvas · affects=risk)

Converts a risk budget into a concrete MT5 lot. Graph must contain exactly one Lot Sizing block.

| id                          | name                          | sub         | plan    | pri | cpx          | mt5 | codegen | short                                                                               |
| --------------------------- | ----------------------------- | ----------- | ------- | --- | ------------ | --- | ------- | ----------------------------------------------------------------------------------- |
| `lot.fixed`                 | Fixed Lot                     | flat        | free    | P1  | basic        | N   | Y       | Always trade the same lot.                                                          |
| `lot.perBalance`            | Lot per Balance               | scaled      | free    | P1  | basic        | N   | Y       | `lot = base × (balance / $1000)` clamp to min.                                      |
| `lot.fromRisk`              | Lot From Risk %               | risk-aware  | pro     | P1  | intermediate | N   | Y       | Lot computed from `risk %` & SL distance.                                           |
| `lot.fromCashRisk`          | Lot From Cash Risk            | risk-aware  | pro     | P1  | intermediate | N   | Y       | Lot computed from fixed cash risk & SL.                                             |
| `lot.fixedRatio`            | Fixed Ratio (Ryan Jones)      | anti-martin | creator | P3  | advanced     | N   | Y       | Scale lots per delta-dollars equity gain.                                           |
| `lot.antiMartingale`        | Anti-Martingale               | anti-martin | creator | P3  | advanced     | N   | Y       | Scale up after wins, reset after losses.                                            |
| `lot.martingale`            | Martingale (guarded)          | martin      | creator | P3  | advanced     | N   | Y       | Multiplier after losses — **gated with hard cap**.                                  |
| `lot.volatilityScaled`      | Volatility-Scaled Lot         | vol-aware   | pro     | P2  | intermediate | Y   | Y       | Target constant cash risk; reduce lot as ATR rises.                                 |
| `lot.equityTiered`          | Tiered by Equity              | tiered      | pro     | P2  | intermediate | N   | Y       | Different base lots by equity brackets.                                             |
| `lot.percentOfAccount`      | Percent-of-Account            | flat        | pro     | P2  | basic        | N   | Y       | `lot = (equity × pct) / contract-size`.                                             |

### 2.13 · Trade Management  (14 blocks · canvas · affects=management)

Runs on open positions. Multiple blocks may coexist — each modifies SL/TP or partials.

| id                                | name                              | sub         | plan    | pri | cpx          | mt5 | codegen | short                                                                              |
| --------------------------------- | --------------------------------- | ----------- | ------- | --- | ------------ | --- | ------- | ---------------------------------------------------------------------------------- |
| `manage.breakEven`                | Break-Even                        | sl          | free    | P1  | basic        | N   | Y       | Move SL to entry after +X pips.                                                    |
| `manage.breakEvenAtrMulti`        | ATR-Multiple Break-Even           | sl          | pro     | P2  | intermediate | Y   | Y       | BE when profit ≥ k × ATR.                                                          |
| `manage.trailingStop`             | Trailing Stop (fixed pips)        | trail       | pro     | P1  | intermediate | N   | Y       | Step-trail after activation.                                                       |
| `manage.trailingStopAtr`          | ATR Trailing Stop                 | trail       | pro     | P1  | intermediate | Y   | Y       | Trail by k × ATR.                                                                  |
| `manage.chandelierTrail`          | Chandelier Trailing               | trail       | creator | P2  | advanced     | Y   | Y       | Highest-high minus k × ATR.                                                        |
| `manage.percentTrail`             | Percent Trailing                  | trail       | pro     | P2  | intermediate | N   | Y       | Trail at X% of price.                                                              |
| `manage.stepTrail`                | Step (Ratchet) Trail              | trail       | pro     | P2  | intermediate | N   | Y       | Advance SL every +N pips.                                                          |
| `manage.partialClose`             | Partial Close                     | partial     | pro     | P1  | intermediate | N   | Y       | Close X% at first TP.                                                              |
| `manage.partialCloseAtr`          | ATR Partial Close                 | partial     | pro     | P2  | intermediate | Y   | Y       | Close X% when profit ≥ k × ATR.                                                    |
| `manage.pyramiding`               | Pyramiding                        | scale-in    | creator | P3  | advanced     | N   | Y       | Add position every N pips in-profit (caps enforced).                               |
| `manage.antiPyramiding`           | Scale-Out on Weakness             | scale-out   | creator | P3  | advanced     | N   | Y       | Reduce size when momentum fades.                                                   |
| `manage.reentryCooldown`          | Re-entry Cooldown                 | behaviour   | free    | P2  | basic        | N   | Y       | Block reopen for N min after a close.                                              |
| `manage.hedgeAgainstDd`           | Hedge Against Drawdown            | hedge       | creator | P3  | advanced     | N   | Y       | Open offsetting trade if DD > threshold (hedging accounts only).                   |
| `manage.convertToBreakEven`       | Convert Loser to BE (smart)       | sl          | creator | P3  | advanced     | N   | Y       | BE+offset once opposing signal appears but not yet triggered.                      |

### 2.14 · Exit Logic  (14 blocks · canvas · affects=exit)

Hard exits that decide "close this position now". Must have at least one unless a Trade Management block carries SL/TP implicitly.

| id                                 | name                          | sub        | plan    | pri | cpx          | mt5 | codegen | short                                                                                |
| ---------------------------------- | ----------------------------- | ---------- | ------- | --- | ------------ | --- | ------- | ------------------------------------------------------------------------------------ |
| `exit.fixedTpSl`                   | Fixed TP / SL (pips)          | fixed      | free    | P1  | basic        | N   | Y       | Hard TP and SL in pips.                                                              |
| `exit.fixedTpSlPrice`              | Fixed TP / SL (price)         | fixed      | pro     | P2  | basic        | N   | Y       | Hard TP / SL as absolute prices.                                                     |
| `exit.rrBased`                     | R:R Exit                      | rr         | pro     | P1  | basic        | N   | Y       | TP = N × risk distance.                                                              |
| `exit.atrBased`                    | ATR TP / SL                   | atr        | pro     | P1  | intermediate | Y   | Y       | TP / SL = k × ATR.                                                                   |
| `exit.timeExit`                    | Time-Based Exit               | time       | free    | P1  | basic        | N   | Y       | Close after N bars / minutes.                                                        |
| `exit.endOfDay`                    | End-of-Day Exit               | time       | free    | P2  | basic        | N   | Y       | Close before server day end.                                                         |
| `exit.endOfWeek`                   | End-of-Week Exit              | time       | pro     | P2  | basic        | N   | Y       | Flatten Friday before HH:MM.                                                         |
| `exit.oppositeSignal`              | Close on Opposite Signal      | signal     | free    | P1  | basic        | N   | Y       | Close when entry rule fires opposite direction.                                      |
| `exit.indicatorReversal`           | Indicator Reversal Exit       | signal     | pro     | P2  | intermediate | Y   | Y       | Close on specified indicator flip (EMA / MACD / etc).                                |
| `exit.takeProfitLadder`            | TP Ladder                     | multi      | creator | P2  | advanced     | N   | Y       | Close portions at TP1/TP2/TP3.                                                       |
| `exit.drawdownExit`                | Per-Trade DD Exit             | dd         | pro     | P2  | basic        | N   | Y       | Close at −$X or −Y pips.                                                             |
| `exit.equityTargetExit`            | Daily Equity Target Exit      | equity     | pro     | P2  | intermediate | N   | Y       | Close all & stop at +X% equity for the day.                                          |
| `exit.equityDDExit`                | Daily Equity DD Exit          | equity     | pro     | P2  | intermediate | N   | Y       | Close all & stop at −X% for the day (mirror).                                        |
| `exit.ichimokuKijunExit`           | Ichimoku Kijun Exit           | indicator  | creator | P3  | advanced     | Y   | Y       | Close when price crosses Kijun.                                                      |

### 2.15 · Basket / Portfolio Logic  (10 blocks · canvas · affects=management)

Operations across multiple open positions (same-symbol or cross-symbol).

| id                            | name                          | sub         | plan    | pri | cpx          | mt5 | codegen | short                                                                              |
| ----------------------------- | ----------------------------- | ----------- | ------- | --- | ------------ | --- | ------- | ---------------------------------------------------------------------------------- |
| `basket.totalProfitTarget`    | Basket TP ($)                 | tp          | pro     | P2  | intermediate | N   | Y       | Close ALL once net open profit ≥ $X.                                               |
| `basket.totalLossStop`        | Basket SL ($)                 | sl          | pro     | P2  | intermediate | N   | Y       | Close ALL once net open loss ≤ −$X.                                                |
| `basket.profitPct`            | Basket TP (%)                 | tp          | pro     | P2  | intermediate | N   | Y       | Close ALL once basket P/L ≥ X% equity.                                             |
| `basket.lossPct`              | Basket SL (%)                 | sl          | pro     | P2  | intermediate | N   | Y       | Mirror.                                                                            |
| `basket.lockInProfit`         | Lock-In Profit                | behaviour   | creator | P3  | advanced     | N   | Y       | After +X, set basket SL to lock +Y.                                                |
| `basket.hedgedClose`          | Close Hedged Pair Together    | behaviour   | creator | P3  | advanced     | N   | Y       | Close long + short together on condition.                                          |
| `basket.symbolGroup`          | Symbol Group                  | scope       | creator | P3  | intermediate | N   | Y       | Define which symbols share basket rules.                                           |
| `basket.correlationCap`       | Correlation Cap               | portfolio   | creator | P3  | advanced     | N   | Y       | Cap simultaneous trades on correlated pairs.                                       |
| `basket.magicScope`           | Per-Magic Scope               | scope       | pro     | P2  | basic        | N   | Y       | Apply rules only to trades with this magic number.                                 |
| `basket.emergencyBasket`      | Basket Emergency Stop         | emergency   | pro     | P2  | basic        | N   | Y       | Nuke all trades on equity DD threshold.                                            |

### 2.16 · Grid / Recovery Logic  (9 blocks · canvas · affects=management)

High-risk recovery systems — always require a Risk Model and emergency caps. Pro/Creator only.

| id                            | name                           | sub        | plan    | pri | cpx          | mt5 | codegen | short                                                                               |
| ----------------------------- | ------------------------------ | ---------- | ------- | --- | ------------ | --- | ------- | ----------------------------------------------------------------------------------- |
| `grid.basic`                  | Basic Grid                     | grid       | pro     | P1  | intermediate | N   | Y       | Add positions every N pips against DD.                                              |
| `grid.atrSpaced`              | ATR-Spaced Grid                | grid       | pro     | P2  | intermediate | Y   | Y       | Grid step = k × ATR.                                                                |
| `grid.martingaleGrid`         | Martingale Grid                | recovery   | creator | P3  | advanced     | N   | Y       | Grid with lot multiplier (capped).                                                  |
| `grid.antiGrid`               | Anti-Grid (Reverse)            | grid       | creator | P3  | advanced     | N   | Y       | Grid in the direction of trend.                                                    |
| `grid.pyramidGrid`            | Pyramid Grid (profit-only)     | recovery   | creator | P3  | advanced     | N   | Y       | Add only while in profit.                                                           |
| `grid.averagingDown`          | Simple Averaging               | recovery   | creator | P3  | intermediate | N   | Y       | Fixed-lot averaging down, capped.                                                   |
| `grid.recoveryOnOppositeSig`  | Recovery on Opposite Signal    | recovery   | creator | P3  | advanced     | N   | Y       | Add against trend on entry-rule flip.                                               |
| `grid.hedgeRecovery`          | Hedge Recovery                 | recovery   | creator | P3  | advanced     | N   | Y       | Open inverse position when DD > threshold.                                          |
| `grid.smartClose`             | Smart Grid Close               | exit       | creator | P3  | advanced     | N   | Y       | Close entire grid at computed break-even + target.                                  |

### 2.17 · Multi-Timeframe Logic  (8 blocks · canvas · affects=filter)

Read a second timeframe deliberately, in addition to the graph's primary TF.

| id                          | name                         | sub          | plan    | pri | cpx          | mt5 | codegen | short                                                                              |
| --------------------------- | ---------------------------- | ------------ | ------- | --- | ------------ | --- | ------- | ---------------------------------------------------------------------------------- |
| `mtf.higherTfAlignment`     | Higher-TF Trend Alignment    | direction    | pro     | P1  | intermediate | Y   | Y       | Higher-TF EMA / SMA alignment with entry direction.                                |
| `mtf.higherTfRsi`           | Higher-TF RSI                | momentum     | pro     | P2  | intermediate | Y   | Y       | RSI at higher TF must match direction.                                             |
| `mtf.higherTfMacd`          | Higher-TF MACD               | momentum     | pro     | P2  | intermediate | Y   | Y       | MACD sign at higher TF agrees.                                                     |
| `mtf.lowerTfTrigger`        | Lower-TF Trigger             | trigger      | creator | P3  | advanced     | Y   | Y       | Require a matching trigger on a lower TF before entry.                             |
| `mtf.dailyBias`             | Daily Bias                   | bias         | pro     | P2  | intermediate | Y   | Y       | Daily close > / < daily open → only long / short.                                  |
| `mtf.weeklyBias`            | Weekly Bias                  | bias         | creator | P3  | intermediate | Y   | Y       | Weekly direction gate.                                                             |
| `mtf.htfStructure`          | HTF Market Structure         | structure    | creator | P3  | advanced     | N   | Y       | HTF HH/LL required.                                                                |
| `mtf.htfVolatility`         | HTF Volatility Regime        | volatility   | creator | P3  | advanced     | Y   | Y       | ATR on HTF must be within band.                                                    |

### 2.18 · Utility / Trade Constraints  (12 blocks · canvas · affects=management)

Global behaviour tweaks. Often the difference between "works" and "blows up on live".

| id                                 | name                            | sub       | plan    | pri | cpx          | mt5 | codegen | short                                                                              |
| ---------------------------------- | ------------------------------- | --------- | ------- | --- | ------------ | --- | ------- | ---------------------------------------------------------------------------------- |
| `utility.oneTradeAtTime`           | One Trade At A Time             | count     | free    | P1  | basic        | N   | Y       | Block new trades while one is open (this magic / symbol).                          |
| `utility.maxOpenPositions`         | Max Open Positions              | count     | free    | P1  | basic        | N   | Y       | Hard cap on simultaneous positions.                                                |
| `utility.maxDailyTrades`           | Max Daily Trades                | count     | free    | P1  | basic        | N   | Y       | Stop opening after N trades today.                                                 |
| `utility.maxDailyLoss`             | Max Daily Loss (%)              | risk-gate | pro     | P1  | intermediate | N   | Y       | Pause for the day after −X% equity.                                                |
| `utility.maxWeeklyLoss`            | Max Weekly Loss                 | risk-gate | pro     | P2  | intermediate | N   | Y       | Mirror, weekly.                                                                    |
| `utility.maxConsecutiveLosses`     | Max Consecutive Losses          | behaviour | pro     | P2  | intermediate | N   | Y       | Pause after N losses in a row.                                                     |
| `utility.emergencyStop`            | Emergency Equity Stop           | emergency | pro     | P1  | intermediate | N   | Y       | Flatten all when equity < floor / DD > ceiling.                                    |
| `utility.maxSpread`                | Global Max Spread               | execution | free    | P1  | basic        | N   | Y       | Global spread cap.                                                                 |
| `utility.minBalance`               | Minimum Balance                 | account   | pro     | P2  | basic        | N   | Y       | Refuse to trade under balance floor.                                               |
| `utility.onlyNewBar`               | Only On New Bar                 | tick      | free    | P1  | basic        | N   | Y       | Run entry logic once per bar.                                                      |
| `utility.cooldownAfterSl`          | Cooldown After SL Hit           | behaviour | pro     | P2  | basic        | N   | Y       | Pause N minutes after SL hit.                                                      |
| `utility.cooldownAfterTp`          | Cooldown After TP Hit           | behaviour | pro     | P3  | basic        | N   | Y       | Pause N minutes after TP hit.                                                      |

### 2.19 · Strategy Protection / Licensing  (8 blocks · **protection-config** · affects=export)

**Not canvas blocks.** Surfaced in the Export wizard as a "Protection & Licensing" step. Gated to Pro (basic) and Creator (advanced) plans.

| id                           | name                         | sub             | plan    | pri | cpx          | mt5 | codegen | short                                                                                |
| ---------------------------- | ---------------------------- | --------------- | ------- | --- | ------------ | --- | ------- | ------------------------------------------------------------------------------------ |
| `protection.accountLock`     | Bind to Account Number       | account         | pro     | P1  | intermediate | N   | Y       | Compile MQL5 that exits OnInit unless `AccountInfoInteger(ACCOUNT_LOGIN) IN list`.   |
| `protection.expiryDate`      | Expiry Date                  | time            | pro     | P1  | basic        | N   | Y       | EA self-disables past a UTC timestamp.                                               |
| `protection.brokerLock`      | Bind to Broker               | broker          | pro     | P2  | basic        | N   | Y       | Lock to `AccountInfoString(ACCOUNT_COMPANY)`.                                        |
| `protection.demoOnly`        | Demo-Only Flag               | account         | pro     | P2  | basic        | N   | Y       | Refuse to trade on live accounts.                                                    |
| `protection.licenseKey`      | License Key + Server         | license         | creator | P2  | advanced     | N   | Y       | Check signed key against remote license server on OnInit.                            |
| `protection.obfuscation`     | Name / Constant Obfuscation  | source          | creator | P3  | advanced     | N   | Y       | Rename helpers, inline constants to deter reverse engineering.                       |
| `protection.watermark`       | Source Watermark             | source          | pro     | P2  | basic        | N   | Y       | Add generator / timestamp / buyer-id comment.                                        |
| `protection.ipLock`          | IP / Region Lock             | runtime         | creator | P3  | advanced     | N   | Y       | Region check via external ping on OnInit (best-effort).                              |

### 2.20 · Marketplace / Packaging  (6 blocks · **packaging** · affects=export)

Also not canvas. Configures the listing bundle.

| id                                 | name                         | sub          | plan    | pri | cpx          | mt5 | codegen | short                                                                           |
| ---------------------------------- | ---------------------------- | ------------ | ------- | --- | ------------ | --- | ------- | ------------------------------------------------------------------------------- |
| `pkg.listingProfile`               | Marketplace Listing Profile  | listing      | creator | P1  | basic        | N   | N       | Title, subtitle, tags, thumbnail for the listing.                               |
| `pkg.pricingModel`                 | Pricing Model                | pricing      | creator | P1  | basic        | N   | N       | One-time vs subscription vs rental.                                             |
| `pkg.presetRiskProfile`            | Preset Risk Profile          | preset       | creator | P2  | intermediate | N   | N       | Bundle `conservative / balanced / aggressive` parameter sets.                   |
| `pkg.changelog`                    | Version Changelog            | listing      | creator | P2  | basic        | N   | N       | Changelog text pulled into listing.                                             |
| `pkg.docBundle`                    | Documentation Bundle         | listing      | creator | P2  | basic        | N   | N       | Attach PDF or markdown readme.                                                  |
| `pkg.setupAssistant`               | Setup Assistant Config       | support      | creator | P3  | advanced     | N   | N       | Post-purchase onboarding checklist.                                             |

---

## 3 · V1 launch set — 42 blocks

Chosen to give buyers *realistic, non-embarrassing* strategies on day one: trend following, breakout, mean reversion, session trading, and structured risk. Everything below is implementable with existing MQL5 primitives and the existing `SectionContribution` compiler — no research-grade blocks.

**Entry (9).** `entry.emaCross`, `entry.smaCross`, `entry.macdCross`, `entry.stochCross`, `entry.previousCandle`, `entry.candleOpen`, `entry.randomPosition`, `entry.donchianBreakout`, `entry.bollingerBreak`, `entry.rsiExtreme`.

**Confirmation (2).** `confirm.rsiSide`, `confirm.priceAboveMa`, `confirm.minBarsSinceSignal`.

**Trend filter (2).** `trend.emaSlope`, `trend.adxStrength`.

**Momentum (2).** `momentum.rsiBand`, `momentum.rocThreshold`.

**Volatility (1).** `vol.atrBand`.

**Candle (1).** `candle.pinBar`.

**Session (2).** `session.customWindow`, `session.london`.

**News (1).** `news.pauseAround`.

**Execution (2).** `exec.spreadLimit`, `exec.slippageControl`.

**Risk (2).** `risk.fixedRisk`, `risk.dailyRiskBudget`.

**Lot (2).** `lot.fixed`, `lot.fromRisk`.

**Trade management (3).** `manage.breakEven`, `manage.trailingStop`, `manage.trailingStopAtr`, `manage.partialClose`.

**Exit (3).** `exit.fixedTpSl`, `exit.rrBased`, `exit.atrBased`, `exit.timeExit`, `exit.oppositeSignal`.

**Grid (1).** `grid.basic`.

**MTF (1).** `mtf.higherTfAlignment`.

**Utility (4).** `utility.oneTradeAtTime`, `utility.maxOpenPositions`, `utility.maxDailyTrades`, `utility.maxDailyLoss`, `utility.emergencyStop`, `utility.onlyNewBar`.

**Protection config (2).** `protection.accountLock`, `protection.expiryDate`.

**Packaging (2).** `pkg.listingProfile`, `pkg.pricingModel`.

(Some of the above names show ≥ the advertised count; trim during Phase C to land exactly at 40 canvas blocks + 4 config. The P1 pool is deliberately generous to give flexibility at implementation time.)

### Why each category made V1

- **Strong trend coverage** — EMA/SMA/MACD crosses, EMA slope, ADX, MTF alignment, trailing stops.
- **Breakout coverage** — Donchian, Bollinger, previous-candle break.
- **Reversal coverage** — RSI extremes, pin bar, RSI band filter.
- **Realistic sessions & news** — custom hours + London preset + news pause → no "Asia-session EA that loses every Fri NFP".
- **Real risk model** — fixed-risk % tied to ATR-based exits gives testable, explainable R-multiples.
- **Trade management users will actually use** — break-even, trailing (fixed + ATR), partial close, time exit. Covers ~80% of what new users copy from YouTube.
- **Guardrails** — one-trade-at-a-time, max daily trades/loss, emergency stop. Matches prop-firm rule shapes.
- **Protection teaser** — `protection.accountLock` + `protection.expiryDate` unlocks "I can sell this without losing my IP" for Pro users immediately.

---

## 4 · Roadmap blocks (P2 / P3)

These exist in the taxonomy but should **not** ship in V1. Prioritise by user demand measured from V1 analytics (Phase D hooks this into the admin dashboard).

**Near-term (P2, 60–90 days).** MACD zero-cross, session overlaps, ATR breakout, volatility squeeze, RR-based exit, equity target/DD exit, engulfing, inside bar, prior-day extreme, daily bias, percent trailing, partial-close ATR, cooldown after SL, min-stops level, max consecutive losses, news high-impact filter, CSV feed, weekly risk budget, fixed-ratio lot.

**Research (P3, 6–12 months).** Everything labelled `advanced` in structure, SMC (order blocks / FVG / BOS / CHoCH), divergence detectors (RSI / MACD), Kelly sizing, equity-curve stop, hedge recovery, smart grid close, IP-lock, obfuscation, custom-feed sentiment, correlation cap, setup assistant.

These stay in the registry as `status: "planned"` so the admin dashboard can publish them behind a feature flag when ready (see Phase B registry design below, § 5.4).

---

## 5 · Registry architecture recommendation

Full implementation lands in Phase B; this section fixes the shape.

### 5.1 · Folder layout

```
lib/blocks/
├── types.ts                      # BlockId, Category, Plan, Complexity, Surface,
│                                  # Affect, BlockStatus, BlockDefinition, Param schemas.
├── categories.ts                 # Canonical 20-family metadata (labels, colours, order).
├── registry.ts                   # Aggregates all category files into BLOCK_REGISTRY,
│                                  # exposes getBlock / search / filter / group APIs.
├── plans.ts                      # Re-export of plan gating helpers scoped to blocks.
├── analytics.ts                  # Read-model for usage_count, popularity, last_used.
├── flags.ts                      # Feature-flag evaluation (remote + local).
│
├── canvas/                       # One file per family — named exports of BlockDefinition[].
│   ├── entry.ts
│   ├── confirmation.ts
│   ├── trend.ts
│   ├── momentum.ts
│   ├── volatility.ts
│   ├── structure.ts
│   ├── candles.ts
│   ├── session.ts
│   ├── news.ts
│   ├── execution.ts
│   ├── risk.ts
│   ├── lot.ts
│   ├── management.ts
│   ├── exit.ts
│   ├── basket.ts
│   ├── grid.ts
│   ├── mtf.ts
│   └── utility.ts
│
└── configs/                      # Export / protection / packaging — non-canvas.
    ├── protection.ts
    └── packaging.ts
```

Tree-shakable: a builder that only renders the canvas imports `canvas/*`; the export wizard imports `configs/*`. Compiler sees them through `registry.ts`.

### 5.2 · Core type shape (preview)

```ts
export type BlockId = string & { readonly __block: unique symbol };

export type BlockFamily =
  | "entry" | "confirmation" | "trend" | "momentum" | "volatility"
  | "structure" | "candles" | "session" | "news" | "execution"
  | "risk" | "lot" | "management" | "exit" | "basket" | "grid"
  | "mtf" | "utility" | "protection" | "packaging";

export type BlockPlan = "free" | "pro" | "creator";
export type BlockPriority = "P1" | "P2" | "P3";
export type BlockComplexity = "basic" | "intermediate" | "advanced";
export type BlockSurface = "canvas" | "export-config" | "protection-config" | "packaging";
export type BlockAffect = "entry" | "filter" | "risk" | "management" | "exit" | "export";
export type BlockStatus = "active" | "beta" | "planned" | "disabled";

export interface BlockDefinition {
  id: BlockId;                          // e.g. brand("trend.emaSlope")
  slug: string;                         // "ema-slope" — URL friendly
  family: BlockFamily;
  subcategory: string;                  // per-family sub-label
  displayName: string;
  shortDescription: string;             // one-line
  longDescription: string;              // inspector paragraph
  userExplanation: string;              // "Plain-English": why do I want this?
  plan: BlockPlan;
  priority: BlockPriority;
  complexity: BlockComplexity;
  surface: BlockSurface;
  status: BlockStatus;
  affects: BlockAffect[];
  requiresMt5Indicator: boolean;
  producesCode: boolean;
  params: BlockParamSpec[];
  compatibleWith: BlockFamily[];
  incompatibleWith: BlockFamily[];
  tags: string[];                       // search tags ("trend", "mean-reversion")
  flags?: string[];                     // feature flags required
  analytics?: { popularity?: number; usageCount?: number };
}
```

Plus a discriminated `BlockParamSpec` (number / integer / select / boolean / time / symbol / timeframe / direction / multi-select / csv), each with `validation: ValidationRule[]`. Existing `ParamSpec` migrates to this richer shape — the inspector is backwards-compatible because the new union is a superset.

### 5.3 · Validation rules (data, not code)

Validation moves from ad-hoc functions in `validators.ts` to a declarative list so admins can add simple rules without redeploy:

```ts
type ValidationRule =
  | { kind: "min"; value: number; message?: string }
  | { kind: "max"; value: number }
  | { kind: "step"; value: number }
  | { kind: "required" }
  | { kind: "lessThan"; otherKey: string; message?: string }   // e.g. fast < slow
  | { kind: "greaterThan"; otherKey: string }
  | { kind: "oneOf"; values: (string | number)[] }
  | { kind: "regex"; pattern: string }
  | { kind: "custom"; ruleId: string };                        // registry in validators/
```

Cross-node rules (like "only one Risk Model", "Lot Sizing requires a Risk Model") stay in code in `lib/blocks/rules/` — one pure function per rule.

### 5.4 · Status, flags, analytics

- **`status`**: `active` = in production; `beta` = shown with badge, behind optional feature flag; `planned` = hidden from builder, visible only in admin dashboard; `disabled` = hard-off (admin switch).
- **`flags`**: optional string array per block. The builder resolves flags via a `FlagProvider` (local JSON + Supabase `feature_flags` table). Pairs with admin toggle in Phase D.
- **`analytics`**: read-model computed server-side nightly in a `block_analytics` materialised view; surfaced in admin heatmap.

### 5.5 · Migration strategy from the existing `lib/strategies/nodes.ts`

1. Generate deprecated aliases: every old `NodeType` (e.g. `"entry.emaCross"`) maps 1:1 to a new `BlockId`. No renames in V1.
2. `NODE_DEFINITIONS` becomes a derived export of `BLOCK_REGISTRY.filter(b => b.surface === "canvas")`.
3. MQL5 translators stay keyed by `BlockId`. Existing translators require zero changes.
4. `PREMIUM_NODE_TYPES` derives from `BLOCK_REGISTRY.filter(b => b.plan !== "free").map(b => b.id)`.

### 5.6 · Public API surface

```ts
getBlock(id: BlockId): BlockDefinition | undefined
listBlocks(filter?: BlockFilter): BlockDefinition[]
searchBlocks(query: string, filter?: BlockFilter): BlockDefinition[]
groupByFamily(blocks: BlockDefinition[]): Record<BlockFamily, BlockDefinition[]>
defaultParamValues(id: BlockId): Record<string, unknown>
validateBlockParams(id: BlockId, params: Record<string, unknown>): ValidationResult
isBlockAvailable(id: BlockId, ctx: { plan: BlockPlan; flags: FlagSet }): boolean
```

Admin-only helpers (`setBlockStatus`, `toggleFlag`) live in `lib/admin/blocks.ts` and never ship to the client bundle.

---

## 6 · What's deferred

- Anything requiring a **second price-stream** (tick-backed OBV, real VWAP) — P3 until we know cost.
- **Strategy A/B forking** and genetic optimisation — not a block; a separate feature.
- **Python/MT4 export** — the taxonomy is MT5-first by design. Translators would need re-implementation per platform.

## 7 · Appendix — conflict matrix

| Family          | Conflicts with                                  | Rule                                                         |
| --------------- | ----------------------------------------------- | ------------------------------------------------------------ |
| Entry           | multiple `Entry`                                | Exactly one entry block.                                      |
| Risk            | multiple `Risk Model`                           | Exactly one risk model.                                       |
| Lot             | multiple `Lot Sizing`                           | Exactly one lot-sizing block.                                 |
| Grid            | `martingale` flavours with no `utility.emergencyStop` | Warn if no emergency stop + martingale grid.          |
| Protection      | any two of (`accountLock`, `licenseKey`)        | Accepted, but `licenseKey` takes precedence at runtime.      |
| Packaging       | no `listingProfile` but `status=published`      | Validator blocks publishing to marketplace.                   |

— End of taxonomy v1.0 —
