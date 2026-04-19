// ──────────────────────────────────────────────────────────────────
// Strategy template catalog
// ──────────────────────────────────────────────────────────────────
// Each template is a pure factory that returns a ready-to-save
// StrategyGraph. Node ids are generated fresh per instantiation so
// that cloning a template many times never produces colliding ids.
//
// Design notes:
// - Every template is self-contained: entry + filters + risk + exit.
// - Node types used here MUST have a translator registered in
//   lib/mql5/translators/index.ts (verified by typecheck via NodeType).
// - Positions are laid out on a conceptual grid (x = column by category,
//   y = row within category). Builder auto-fits on load.

import type { StrategyGraph, NodeCategory, NodeType } from "@/lib/strategies/types";
import { STRATEGY_GRAPH_VERSION } from "@/lib/strategies/types";
import type { Template } from "./types";

// ── helpers ────────────────────────────────────────────────────────

let _idCounter = 0;
function nid(): string {
  _idCounter = (_idCounter + 1) % 1e9;
  return `n_${Date.now().toString(36)}_${_idCounter.toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function nodeAt(
  col: number,
  row: number,
  type: NodeType,
  category: NodeCategory,
  params: Record<string, unknown>,
  label?: string,
) {
  return {
    id: nid(),
    type,
    category,
    label,
    position: { x: col * 260, y: row * 130 },
    params,
  };
}

function wire(nodes: Array<{ id: string }>): Array<{ id: string; source: string; target: string }> {
  const edges: Array<{ id: string; source: string; target: string }> = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ id: nid(), source: nodes[i].id, target: nodes[i + 1].id });
  }
  return edges;
}

function makeGraph(opts: {
  name: string;
  description: string;
  symbol?: string;
  timeframe?: StrategyGraph["metadata"]["timeframe"];
  magic?: number;
  nodes: ReturnType<typeof nodeAt>[];
}): StrategyGraph {
  return {
    version: STRATEGY_GRAPH_VERSION,
    platform: "mt5",
    metadata: {
      name: opts.name,
      description: opts.description,
      symbol: opts.symbol ?? "EURUSD",
      timeframe: opts.timeframe ?? "M15",
      magicNumber: opts.magic ?? 20260420,
      tradeComment: "Zentryx Lab",
    },
    nodes: opts.nodes,
    edges: wire(opts.nodes),
    canvas: { zoom: 1, position: { x: 0, y: 0 } },
  };
}

// ──────────────────────────────────────────────────────────────────
// Templates
// ──────────────────────────────────────────────────────────────────

const emaCrossProEur: Template = {
  slug: "ema-cross-atr-exit",
  name: "EMA Cross Pro — Trend Follower",
  category: "trend",
  difficulty: "beginner",
  risk: "medium",
  tagline: "20/50 EMA cross with ADX trend filter and ATR-based exits.",
  emoji: "📈",
  accent: "#10b981",
  featured: true,
  description:
    "A clean, hands-off trend-following EA. Enters on a 20/50 EMA crossover, only when ADX confirms a trending market, and pairs every signal with an ATR-based stop-loss + 2R take-profit. Break-even kicks in at 1× ATR profit, and an ATR trailing stop rides the rest of the move.",
  howItWorks: [
    "Waits for the fast EMA (20) to cross above the slow EMA (50) for longs (mirror for shorts).",
    "Filters out chop with ADX(14) ≥ 22 — the EA only fires when a real trend is present.",
    "Sizes each position from a 1% risk-of-equity model, using the ATR stop distance to compute the lot.",
    "Places SL at 1.5× ATR(14) below entry and TP at 3× ATR (1:2 R:R).",
    "Moves SL to break-even once price has advanced by 1× ATR, then trails with ATR×2.5.",
  ],
  whenItWorks: [
    "Directional markets with sustained trends (daily ranges > 80 pips on majors).",
    "H1 / H4 on EURUSD, GBPUSD, XAUUSD.",
    "Sessions with active order flow (London + NY overlap).",
  ],
  whenItFails: [
    "Tight ranges and news days — the EMA will whipsaw you into losses.",
    "Low-ADX regimes (below 18) — filter does help but not every time.",
  ],
  recommendedSymbols: ["EURUSD", "GBPUSD", "XAUUSD"],
  recommendedTimeframes: ["H1", "H4"],
  minBalanceUsd: 500,
  caveats: [
    "1% risk per trade — over 4-5 losers in a row the account can dip 4-5%.",
    "Performance is highly TF-dependent. Prefer H4 for majors, H1 only for XAUUSD.",
  ],
  build: ({ strategyName }) => {
    const entry = nodeAt(0, 0, "entry.emaCross", "entry", { fastPeriod: 20, slowPeriod: 50, direction: "both" }, "EMA 20/50 cross");
    const trend = nodeAt(1, 0, "trend.adxStrength", "filter", { period: 14, minAdx: 22 }, "ADX trend filter");
    const spread = nodeAt(1, 1, "utility.maxSpread", "utility", { maxSpreadPoints: 25 }, "Spread guard");
    const newBar = nodeAt(1, 2, "utility.onlyNewBar", "utility", {}, "One eval per bar");
    const risk = nodeAt(2, 0, "risk.atrRisk", "risk", { riskPercent: 1, atrPeriod: 14, slMultiplier: 1.5 }, "ATR risk 1%");
    const lot = nodeAt(2, 1, "lot.fromRisk", "lot", {}, "Lot from risk");
    const exit = nodeAt(3, 0, "exit.atrBased", "exit", { atrPeriod: 14, slMultiplier: 1.5, tpMultiplier: 3 }, "ATR exit");
    const be = nodeAt(3, 1, "manage.breakEvenAtrMulti", "management", { atrPeriod: 14, multiplier: 1 }, "BE at 1× ATR");
    const trail = nodeAt(3, 2, "manage.trailingStopAtr", "management", { period: 14, multiplier: 2.5 }, "ATR trailing");
    return makeGraph({
      name: strategyName,
      description: "EMA cross trend follower with ATR exits, BE and ATR trailing.",
      symbol: "EURUSD",
      timeframe: "H1",
      nodes: [entry, trend, spread, newBar, risk, lot, exit, be, trail],
    });
  },
};

const donchianBreakout: Template = {
  slug: "donchian-breakout-turtle",
  name: "Donchian Turtle — 20/10 Breakout",
  category: "breakout",
  difficulty: "intermediate",
  risk: "medium",
  tagline: "20-bar breakout, 10-bar exit, ATR trail. The turtle classic, modernised.",
  emoji: "🐢",
  accent: "#3b82f6",
  featured: true,
  description:
    "A faithful translation of the classic Turtle breakout system. Enters on a close outside the 20-bar Donchian channel with a trend alignment filter and volatility guard. SL is ATR-based, and the trail rides the runner until it reverses.",
  howItWorks: [
    "Long when close breaks above the 20-bar high; short on the mirror.",
    "Requires price to be on the correct side of the 50-bar EMA (trend alignment).",
    "Blocks entries in dead-volatility regimes (ATR < 6 pips on majors).",
    "Sizes lots via 1.5% risk with 2× ATR stop.",
    "Trails with 2.5× ATR — the original system uses a 10-bar opposite-extreme exit, we approximate with a generous ATR trail.",
  ],
  whenItWorks: [
    "Expanding markets — post-consolidation breakouts, new highs / lows.",
    "Trending majors + XAUUSD on H4 and D1.",
  ],
  whenItFails: [
    "Choppy / range-bound markets — breakouts become fake-outs.",
    "News spikes intraday — prefer H4 / D1 to avoid noise.",
  ],
  recommendedSymbols: ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD"],
  recommendedTimeframes: ["H4", "D1"],
  minBalanceUsd: 1000,
  caveats: [
    "Fewer signals than a trend-follower — budget for drawdown-then-big-winner pattern.",
    "Position sizing is 1.5% per trade; cap overall portfolio exposure if running multiple symbols.",
  ],
  build: ({ strategyName }) => {
    const entry = nodeAt(0, 0, "entry.donchianBreakout", "entry", { period: 20, direction: "both" }, "20-bar Donchian");
    const align = nodeAt(1, 0, "confirm.priceAboveMa", "filter", { maType: "ema", period: 50 }, "Above/below EMA 50");
    const volGate = nodeAt(1, 1, "vol.atrBand", "filter", { period: 14, minAtrPips: 6, maxAtrPips: 350 }, "ATR ∈ [6, 350]");
    const spread = nodeAt(1, 2, "utility.maxSpread", "utility", { maxSpreadPoints: 30 });
    const newBar = nodeAt(1, 3, "utility.onlyNewBar", "utility", {});
    const risk = nodeAt(2, 0, "risk.atrRisk", "risk", { riskPercent: 1.5, atrPeriod: 14, slMultiplier: 2 }, "ATR risk 1.5%");
    const lot = nodeAt(2, 1, "lot.fromRisk", "lot", {});
    const exit = nodeAt(3, 0, "exit.atrBased", "exit", { atrPeriod: 14, slMultiplier: 2, tpMultiplier: 6 }, "ATR exit");
    const trail = nodeAt(3, 1, "manage.trailingStopAtr", "management", { period: 14, multiplier: 2.5 }, "ATR trail");
    return makeGraph({
      name: strategyName,
      description: "Donchian 20 breakout with EMA alignment and ATR trail.",
      symbol: "EURUSD",
      timeframe: "H4",
      magic: 20260421,
      nodes: [entry, align, volGate, spread, newBar, risk, lot, exit, trail],
    });
  },
};

const rsiMeanReversion: Template = {
  slug: "rsi-mean-reversion",
  name: "RSI Mean Reversion",
  category: "mean-reversion",
  difficulty: "intermediate",
  risk: "medium",
  tagline: "Fade overstretched moves in ranging markets, with a strict cooldown.",
  emoji: "🔄",
  accent: "#f59e0b",
  description:
    "A counter-trend EA that fires when RSI pushes into an extreme and reverses back into the band. The ADX non-trend filter keeps it out of strong trends, and a 30-minute cooldown after any SL prevents revenge-trading during a losing regime.",
  howItWorks: [
    "Long when RSI crosses back above 30 after touching the oversold zone (mirror for shorts).",
    "ADX < 22 — we want a ranging market; strong trends kill mean-reverters.",
    "Reward-to-risk ratio of 1:1 keeps winners predictable.",
    "30-minute cooldown after a SL hit stops the EA from re-entering into the same losing move.",
  ],
  whenItWorks: [
    "Ranging markets with ATR that stays in a narrow band.",
    "XAUUSD M15 / M30, EURUSD M15 during Asia session.",
  ],
  whenItFails: [
    "Strong directional moves — the ADX filter helps but won't catch them all.",
    "News releases that push through multiple standard deviations in a single bar.",
  ],
  recommendedSymbols: ["EURUSD", "XAUUSD", "USDJPY"],
  recommendedTimeframes: ["M15", "M30"],
  minBalanceUsd: 300,
  caveats: [
    "Fades work until they don't — always pair with an emergency stop (we include one).",
    "Win rate is high but one large loss can wipe 5+ winners.",
  ],
  build: ({ strategyName }) => {
    const entry = nodeAt(0, 0, "entry.rsiExtreme", "entry", { period: 14, overbought: 70, oversold: 30, onReentry: true, direction: "both" }, "RSI reversal");
    const nonTrend = nodeAt(1, 0, "trend.adxNonTrend", "filter", { period: 14, maxAdx: 22 }, "ADX range mode");
    const spread = nodeAt(1, 1, "utility.maxSpread", "utility", { maxSpreadPoints: 20 });
    const newBar = nodeAt(1, 2, "utility.onlyNewBar", "utility", {});
    const cooldown = nodeAt(1, 3, "utility.cooldownAfterSl", "utility", { minutes: 30 }, "Cooldown after SL");
    const risk = nodeAt(2, 0, "risk.fixedRisk", "risk", { riskPercent: 0.75 }, "Risk 0.75%");
    const lot = nodeAt(2, 1, "lot.fromRisk", "lot", {});
    const exit = nodeAt(3, 0, "exit.rrBased", "exit", { stopLossPips: 20, rr: 1 }, "R:R 1:1");
    const emergency = nodeAt(3, 1, "utility.emergencyStop", "utility", { mode: "drawdown", maxDrawdownPercent: 8, equityFloor: 0 }, "Emergency stop -8%");
    return makeGraph({
      name: strategyName,
      description: "RSI mean reversion with ADX range filter and SL cooldown.",
      symbol: "XAUUSD",
      timeframe: "M15",
      magic: 20260422,
      nodes: [entry, nonTrend, spread, newBar, cooldown, risk, lot, exit, emergency],
    });
  },
};

const bollingerSqueezeBreak: Template = {
  slug: "bollinger-squeeze-break",
  name: "Bollinger Squeeze Breakout",
  category: "breakout",
  difficulty: "intermediate",
  risk: "medium",
  tagline: "Wait for a volatility squeeze, then trade the expansion.",
  emoji: "💥",
  accent: "#a855f7",
  description:
    "Identifies periods of low volatility (BB bandwidth below a threshold) then enters on the directional break of the upper or lower band. Expansion-after-contraction is one of the most reliable regime transitions in FX.",
  howItWorks: [
    "BB bandwidth must have been below 0.0035 (squeeze) on the prior bar.",
    "Enter long on a close above the upper band, short on a close below the lower band.",
    "ATR volatility gate ensures we only trade when the post-squeeze has teeth.",
    "Stops are 1× ATR, targets 3× ATR (1:3 R:R).",
  ],
  whenItWorks: [
    "Major pairs emerging from a long consolidation range.",
    "XAUUSD H1 / H4 after Asia consolidation before London.",
  ],
  whenItFails: [
    "False breakouts — the squeeze signals an expansion, not a direction.",
    "Low-liquidity sessions where the expansion fizzles.",
  ],
  recommendedSymbols: ["EURUSD", "GBPUSD", "XAUUSD"],
  recommendedTimeframes: ["M30", "H1", "H4"],
  minBalanceUsd: 500,
  caveats: [
    "Expect 40-45% win rate but high R:R — trust the system over a sample of ~30 trades.",
  ],
  build: ({ strategyName }) => {
    const entry = nodeAt(0, 0, "entry.bollingerBreak", "entry", { period: 20, deviation: 2, direction: "both" }, "BB break");
    const squeeze = nodeAt(1, 0, "vol.bbWidth", "filter", { period: 20, deviation: 2, widthThreshold: 0.0035, mode: "below" }, "Squeeze filter");
    const volGate = nodeAt(1, 1, "vol.atrBand", "filter", { period: 14, minAtrPips: 4, maxAtrPips: 400 }, "ATR guard");
    const spread = nodeAt(1, 2, "utility.maxSpread", "utility", { maxSpreadPoints: 25 });
    const newBar = nodeAt(1, 3, "utility.onlyNewBar", "utility", {});
    const risk = nodeAt(2, 0, "risk.atrRisk", "risk", { riskPercent: 1, atrPeriod: 14, slMultiplier: 1 });
    const lot = nodeAt(2, 1, "lot.fromRisk", "lot", {});
    const exit = nodeAt(3, 0, "exit.atrBased", "exit", { atrPeriod: 14, slMultiplier: 1, tpMultiplier: 3 });
    return makeGraph({
      name: strategyName,
      description: "Bollinger squeeze breakout with ATR-based exits.",
      symbol: "XAUUSD",
      timeframe: "H1",
      magic: 20260423,
      nodes: [entry, squeeze, volGate, spread, newBar, risk, lot, exit],
    });
  },
};

const propFirmSafe: Template = {
  slug: "prop-firm-safe",
  name: "Prop-Firm Safe — Conservative Trend",
  category: "prop-firm",
  difficulty: "intermediate",
  risk: "low",
  tagline: "Built to survive FTMO / MFF / The5ers: 0.5% risk, daily DD cap, news pause.",
  emoji: "🛡️",
  accent: "#10b981",
  featured: true,
  description:
    "A conservative EA engineered around prop-firm rules. Max daily loss is hard-capped, news windows pause entries, Friday carry is avoided, and risk per trade stays at 0.5%. Meant to pass evaluations and preserve funded accounts — not to make you rich fast.",
  howItWorks: [
    "EMA 20/50 cross entry, only aligned with the 200 EMA (long-term bias).",
    "Risk is fixed at 0.5% per trade — within prop-firm daily-loss rules even on a bad day.",
    "Daily loss latched at -3% (auto-pause till midnight UTC).",
    "News window pause (30 min before / after). User plugs their own news CSV.",
    "No weekend carry: closes all positions Friday after 20:00 server.",
    "Emergency kill-switch at -6% account drawdown from peak.",
  ],
  whenItWorks: [
    "Prop-firm challenges and funded accounts where preservation > profit.",
    "Boring majors on H1 / H4.",
  ],
  whenItFails: [
    "Under-trading periods — the filter stack is strict by design.",
    "Explosive news days if your news CSV isn't up to date.",
  ],
  recommendedSymbols: ["EURUSD", "USDJPY", "GBPUSD"],
  recommendedTimeframes: ["H1", "H4"],
  minBalanceUsd: 10000,
  caveats: [
    "You MUST supply the news CSV input at runtime (see docs → News blocks).",
    "Tuned for prop-firm daily-loss rules of ~5%. Loosen if your prop firm is more permissive.",
  ],
  build: ({ strategyName }) => {
    const entry = nodeAt(0, 0, "entry.emaCross", "entry", { fastPeriod: 20, slowPeriod: 50, direction: "both" });
    const bias = nodeAt(1, 0, "confirm.priceAboveMa", "filter", { maType: "ema", period: 200 }, "EMA 200 bias");
    const session = nodeAt(1, 1, "session.customWindow", "session", { startHour: 7, endHour: 19 }, "Window 07-19 server");
    const news = nodeAt(1, 2, "news.pauseAround", "news", { beforeMinutes: 30, afterMinutes: 30, highImpactOnly: true }, "News pause");
    const weekend = nodeAt(1, 3, "vol.weekendCarry", "filter", { cutoffHour: 20 }, "No Fri > 20:00");
    const spread = nodeAt(1, 4, "utility.maxSpread", "utility", { maxSpreadPoints: 20 });
    const newBar = nodeAt(1, 5, "utility.onlyNewBar", "utility", {});
    const risk = nodeAt(2, 0, "risk.atrRisk", "risk", { riskPercent: 0.5, atrPeriod: 14, slMultiplier: 1.5 }, "0.5% per trade");
    const lot = nodeAt(2, 1, "lot.fromRisk", "lot", {});
    const dailyDd = nodeAt(2, 2, "exit.equityDDExit", "exit", { maxLossPercent: 3 }, "Daily -3% stop");
    const exit = nodeAt(3, 0, "exit.atrBased", "exit", { atrPeriod: 14, slMultiplier: 1.5, tpMultiplier: 2 }, "ATR 1:1.33");
    const be = nodeAt(3, 1, "manage.breakEvenAtrMulti", "management", { atrPeriod: 14, multiplier: 1 });
    const emergency = nodeAt(3, 2, "utility.emergencyStop", "utility", { mode: "drawdown", maxDrawdownPercent: 6, equityFloor: 0 }, "Kill -6%");
    return makeGraph({
      name: strategyName,
      description: "Prop-firm safe: 0.5% risk, -3% daily DD, news + weekend guards, -6% kill.",
      symbol: "EURUSD",
      timeframe: "H1",
      magic: 20260424,
      nodes: [entry, bias, session, news, weekend, spread, newBar, risk, lot, dailyDd, exit, be, emergency],
    });
  },
};

const londonOpenScalper: Template = {
  slug: "london-open-scalper",
  name: "London Open Scalper",
  category: "scalper",
  difficulty: "intermediate",
  risk: "medium",
  tagline: "Fast breakouts during the London open, session-bounded, tight risk.",
  emoji: "🏙️",
  accent: "#ef4444",
  description:
    "A session scalper that wakes up for the London open, trades 10-bar breakouts for the first 4 hours, then goes to bed. Uses tight ATR-based stops and a daily trade cap to stay disciplined.",
  howItWorks: [
    "Trades only 07:00-11:00 server (adjust UTC offset for your broker).",
    "10-bar N-bar breakout entry (M5) — momentum is the signal.",
    "Spread gate at 20 points — London open can spike spreads.",
    "Max 3 trades per day to avoid overtrading.",
    "Tight 1:1 R:R with a 12-pip stop; moves to BE after +6 pips.",
  ],
  whenItWorks: [
    "European majors at London open: GBPUSD, EURUSD, EURGBP.",
    "Days with strong pre-London consolidation.",
  ],
  whenItFails: [
    "Flat London opens (Mondays, post-bank-holidays).",
    "Widening spreads on exotics — stick to the pairs listed.",
  ],
  recommendedSymbols: ["GBPUSD", "EURUSD", "EURGBP"],
  recommendedTimeframes: ["M5", "M15"],
  minBalanceUsd: 500,
  caveats: [
    "Session hours assume server time = UTC. Set utcOffset on the session block if your broker is off-UTC.",
  ],
  build: ({ strategyName }) => {
    const entry = nodeAt(0, 0, "entry.nBarBreakout", "entry", { period: 10, direction: "both" }, "10-bar break");
    const session = nodeAt(1, 0, "session.customWindow", "session", { startHour: 7, endHour: 11 }, "07-11 server");
    const spread = nodeAt(1, 1, "utility.maxSpread", "utility", { maxSpreadPoints: 20 });
    const maxDaily = nodeAt(1, 2, "utility.maxDailyTrades", "utility", { maxTrades: 3 }, "Max 3 / day");
    const newBar = nodeAt(1, 3, "utility.onlyNewBar", "utility", {});
    const cooldown = nodeAt(1, 4, "utility.cooldownAfterSl", "utility", { minutes: 20 });
    const risk = nodeAt(2, 0, "risk.fixedRisk", "risk", { riskPercent: 0.5 });
    const lot = nodeAt(2, 1, "lot.fromRisk", "lot", {});
    const exit = nodeAt(3, 0, "exit.rrBased", "exit", { stopLossPips: 12, rr: 1 }, "12p / 1:1");
    const be = nodeAt(3, 1, "exit.breakEven", "management", { triggerPips: 6, offsetPips: 1 });
    return makeGraph({
      name: strategyName,
      description: "London-open scalper with 10-bar breakouts and 3-trade daily cap.",
      symbol: "GBPUSD",
      timeframe: "M5",
      magic: 20260425,
      nodes: [entry, session, spread, maxDaily, newBar, cooldown, risk, lot, exit, be],
    });
  },
};

const multiTfMomentum: Template = {
  slug: "multi-tf-momentum",
  name: "Multi-TF Momentum — H4 Bias + M15 Trigger",
  category: "multi-tf",
  difficulty: "intermediate",
  risk: "medium",
  tagline: "Higher-TF trend says where, MACD on M15 says when.",
  emoji: "🎯",
  accent: "#6366f1",
  description:
    "Couples a H4 EMA-slope bias filter with a M15 MACD crossover trigger. Trades only fire when both agree. Added ATR exits and break-even keep winners healthy, a trailing stop rides runners.",
  howItWorks: [
    "H4 EMA(50) slope must match the intended direction (long if rising, short if falling).",
    "On M15, enter when MACD(12,26,9) crosses in the same direction.",
    "Classic 1.5× ATR stop, 3× ATR target.",
    "BE after 1× ATR profit + ATR trailing at 2× ATR.",
  ],
  whenItWorks: [
    "Trending markets with clear H4 direction: EURUSD, USDJPY, XAUUSD.",
    "Post-news consolidations that resolve in the H4 direction.",
  ],
  whenItFails: [
    "When M15 MACD fires early and H4 reverses shortly after.",
    "Low-liquidity periods where M15 is noise.",
  ],
  recommendedSymbols: ["EURUSD", "USDJPY", "XAUUSD"],
  recommendedTimeframes: ["M15"],
  minBalanceUsd: 500,
  build: ({ strategyName }) => {
    const entry = nodeAt(0, 0, "entry.macdCross", "entry", { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, direction: "both" }, "MACD trigger");
    const htf = nodeAt(1, 0, "mtf.higherTfAlignment", "filter", { timeframe: "H4", maType: "ema", period: 50 }, "H4 EMA 50 slope");
    const spread = nodeAt(1, 1, "utility.maxSpread", "utility", { maxSpreadPoints: 25 });
    const newBar = nodeAt(1, 2, "utility.onlyNewBar", "utility", {});
    const risk = nodeAt(2, 0, "risk.atrRisk", "risk", { riskPercent: 1, atrPeriod: 14, slMultiplier: 1.5 });
    const lot = nodeAt(2, 1, "lot.fromRisk", "lot", {});
    const exit = nodeAt(3, 0, "exit.atrBased", "exit", { atrPeriod: 14, slMultiplier: 1.5, tpMultiplier: 3 });
    const be = nodeAt(3, 1, "manage.breakEvenAtrMulti", "management", { atrPeriod: 14, multiplier: 1 });
    const trail = nodeAt(3, 2, "manage.trailingStopAtr", "management", { period: 14, multiplier: 2 });
    return makeGraph({
      name: strategyName,
      description: "MTF momentum: H4 bias + M15 MACD trigger, ATR exits and trailing.",
      symbol: "USDJPY",
      timeframe: "M15",
      magic: 20260426,
      nodes: [entry, htf, spread, newBar, risk, lot, exit, be, trail],
    });
  },
};

const goldTrendH4: Template = {
  slug: "gold-trend-h4",
  name: "Gold Trend Hunter (XAUUSD H4)",
  category: "trend",
  difficulty: "intermediate",
  risk: "medium",
  tagline: "Tuned for XAUUSD H4 — wider stops, stricter trend filter.",
  emoji: "🥇",
  accent: "#f59e0b",
  description:
    "Gold is gold — it moves big and doesn't respect tight stops. This template ships an ADX + EMA alignment trend-follower with 2× ATR stops and a 1:2.5 R:R, purpose-tuned for XAUUSD H4. Includes weekend carry protection (gold hates Monday gaps).",
  howItWorks: [
    "Entry on 20/50 EMA cross with ADX(14) ≥ 24 (strong trend required).",
    "Additional H4 EMA 200 bias filter — no counter-big-picture trades.",
    "Risk 1% with 2× ATR stop — gold needs room.",
    "Targets 2.5× risk; break-even at +1.5× ATR.",
    "Fridays flattened at 19:00 to avoid weekend gap exposure.",
  ],
  whenItWorks: [
    "Gold trends in response to macro / inflation narratives.",
    "Breakout-from-consolidation setups on H4.",
  ],
  whenItFails: [
    "Ping-pong days with no clear direction.",
    "Central bank decisions (guard with news block if running live).",
  ],
  recommendedSymbols: ["XAUUSD"],
  recommendedTimeframes: ["H4"],
  minBalanceUsd: 2000,
  caveats: [
    "Gold point value varies widely by broker. Test lot size in MT5 first.",
    "If your broker quotes XAUUSD in 2 decimals, ATR-based distances are automatically scaled.",
  ],
  build: ({ strategyName }) => {
    const entry = nodeAt(0, 0, "entry.emaCross", "entry", { fastPeriod: 20, slowPeriod: 50, direction: "both" });
    const adx = nodeAt(1, 0, "trend.adxStrength", "filter", { period: 14, minAdx: 24 });
    const bias = nodeAt(1, 1, "confirm.priceAboveMa", "filter", { maType: "ema", period: 200 });
    const weekend = nodeAt(1, 2, "exit.endOfWeek", "exit", { cutoffHour: 19 }, "Friday 19:00 flat");
    const spread = nodeAt(1, 3, "utility.maxSpread", "utility", { maxSpreadPoints: 35 });
    const newBar = nodeAt(1, 4, "utility.onlyNewBar", "utility", {});
    const risk = nodeAt(2, 0, "risk.atrRisk", "risk", { riskPercent: 1, atrPeriod: 14, slMultiplier: 2 });
    const lot = nodeAt(2, 1, "lot.fromRisk", "lot", {});
    const exit = nodeAt(3, 0, "exit.atrBased", "exit", { atrPeriod: 14, slMultiplier: 2, tpMultiplier: 5 });
    const be = nodeAt(3, 1, "manage.breakEvenAtrMulti", "management", { atrPeriod: 14, multiplier: 1.5 });
    return makeGraph({
      name: strategyName,
      description: "XAUUSD H4 trend follower with 2× ATR stops, EMA 200 bias and Friday flat.",
      symbol: "XAUUSD",
      timeframe: "H4",
      magic: 20260427,
      nodes: [entry, adx, bias, weekend, spread, newBar, risk, lot, exit, be],
    });
  },
};

const atrGridBasket: Template = {
  slug: "atr-grid-basket",
  name: "ATR Grid — Basket TP",
  category: "grid",
  difficulty: "advanced",
  risk: "high",
  tagline: "Volatility-aware grid with basket take-profit and hard equity kill-switch.",
  emoji: "🕸️",
  accent: "#0ea5e9",
  description:
    "A grid system that spaces additions by ATR instead of fixed pips, so it adapts to market volatility. The whole basket closes at a $ profit target or -5% equity emergency. Designed for sideways / oscillating markets on low-spread majors.",
  howItWorks: [
    "First order fires on a basic directional trigger (EMA 20/50 cross).",
    "While in profit/DD, the EA adds an order every 1.5× ATR(14) against the open position.",
    "Cap: 5 orders. Lot size is flat.",
    "Basket closes all when aggregate profit reaches $50 — or immediately at -5% equity.",
    "Hard spread cap of 20 points to avoid cascading fills during spikes.",
  ],
  whenItWorks: [
    "Ranging majors where volatility oscillates around a mean.",
    "Low-spread brokers — grids are spread-sensitive.",
  ],
  whenItFails: [
    "Trending markets that run against the grid direction.",
    "High-impact news — always add a news pause on live.",
  ],
  recommendedSymbols: ["EURUSD", "USDJPY"],
  recommendedTimeframes: ["M15", "H1"],
  minBalanceUsd: 5000,
  caveats: [
    "Grids are capital-intensive. Start with 5k+ and understand the worst case.",
    "ALWAYS keep the emergency stop enabled. Grids without a kill-switch eventually blow up.",
  ],
  build: ({ strategyName }) => {
    const entry = nodeAt(0, 0, "entry.emaCross", "entry", { fastPeriod: 20, slowPeriod: 50, direction: "both" });
    const spread = nodeAt(1, 0, "utility.maxSpread", "utility", { maxSpreadPoints: 20 });
    const newBar = nodeAt(1, 1, "utility.onlyNewBar", "utility", {});
    const risk = nodeAt(2, 0, "risk.fixedLot", "risk", { lots: 0.05 }, "Fixed 0.05 lot");
    const lot = nodeAt(2, 1, "lot.fixed", "lot", { lots: 0.05 });
    const exit = nodeAt(3, 0, "exit.atrBased", "exit", { atrPeriod: 14, slMultiplier: 3, tpMultiplier: 6 }, "Wide ATR stop");
    const grid = nodeAt(4, 0, "grid.atrSpaced", "grid", { atrPeriod: 14, multiplier: 1.5, maxOrders: 5 }, "ATR grid × 5");
    const basketTp = nodeAt(4, 1, "basket.totalProfitTarget", "management", { targetDollars: 50 }, "Basket TP $50");
    const emergency = nodeAt(4, 2, "basket.emergencyBasket", "management", { maxDdPercent: 5 }, "Emergency -5%");
    return makeGraph({
      name: strategyName,
      description: "ATR-spaced grid with $50 basket TP and -5% equity kill-switch.",
      symbol: "EURUSD",
      timeframe: "M15",
      magic: 20260428,
      nodes: [entry, spread, newBar, risk, lot, exit, grid, basketTp, emergency],
    });
  },
};

const martingaleRecovery: Template = {
  slug: "martingale-recovery",
  name: "Martingale Recovery — Capped",
  category: "martingale",
  difficulty: "advanced",
  risk: "very-high",
  tagline: "High-risk recovery grid with hard caps and emergency stop. Study the caveats.",
  emoji: "🎲",
  accent: "#ef4444",
  description:
    "A martingale recovery strategy with strict guardrails. Orders scale up 1.8× after each loser, capped at 4 steps. Daily loss latched at -4%, account-level emergency at -7%. Designed to be understood, not blindly deployed.",
  howItWorks: [
    "Initial entry on RSI extreme reversal (counter-trend mean reversion).",
    "Every SL hit triggers a next-order lot size of prev × 1.8, up to 4 consecutive multiplications.",
    "Basket TP at +$30 resets the cycle.",
    "Daily loss at -4% → EA pauses until UTC midnight.",
    "Account emergency kill at -7% total DD.",
    "Spread hard cap 15 points — martingales die from spread.",
  ],
  whenItWorks: [
    "Mean-reverting markets with controllable volatility.",
    "When deployed with a bankroll that can absorb a 4-step losing streak.",
  ],
  whenItFails: [
    "Strong trending markets — martingales consistently lose to trends.",
    "Account undercapitalised for the multiplier curve.",
    "Brokers with widening spreads under stress.",
  ],
  recommendedSymbols: ["EURUSD"],
  recommendedTimeframes: ["M15"],
  minBalanceUsd: 10000,
  caveats: [
    "⚠ HIGH RISK. Martingales produce smooth equity curves until they blow up.",
    "Never remove the emergency stop or daily-loss latch.",
    "Understand that after 4 losses you're 1.8⁴ = 10.5× your starting lot. Calibrate accordingly.",
    "Not allowed on most prop-firm accounts.",
  ],
  build: ({ strategyName }) => {
    const entry = nodeAt(0, 0, "entry.rsiExtreme", "entry", { period: 14, overbought: 70, oversold: 30, onReentry: true, direction: "both" });
    const nonTrend = nodeAt(1, 0, "trend.adxNonTrend", "filter", { period: 14, maxAdx: 22 });
    const spread = nodeAt(1, 1, "utility.maxSpread", "utility", { maxSpreadPoints: 15 });
    const newBar = nodeAt(1, 2, "utility.onlyNewBar", "utility", {});
    const dailyDd = nodeAt(1, 3, "utility.maxDailyLoss", "utility", { maxLossPercent: 4 }, "Daily -4%");
    const lot = nodeAt(2, 0, "lot.martingale", "lot", { baseLot: 0.05, multiplier: 1.8, maxSteps: 4 }, "Martingale 1.8× × 4");
    const exit = nodeAt(3, 0, "exit.atrBased", "exit", { atrPeriod: 14, slMultiplier: 1.2, tpMultiplier: 1.2 });
    const basketTp = nodeAt(3, 1, "basket.totalProfitTarget", "management", { targetDollars: 30 }, "Basket TP $30");
    const emergency = nodeAt(3, 2, "utility.emergencyStop", "utility", { mode: "drawdown", maxDrawdownPercent: 7, equityFloor: 0 }, "Kill -7%");
    return makeGraph({
      name: strategyName,
      description: "Capped martingale recovery with RSI mean-reversion entry and hard guardrails.",
      symbol: "EURUSD",
      timeframe: "M15",
      magic: 20260429,
      nodes: [entry, nonTrend, spread, newBar, dailyDd, lot, exit, basketTp, emergency],
    });
  },
};

const oneShotSniper: Template = {
  slug: "one-shot-sniper",
  name: "One-Shot Sniper — Triple Confirmation",
  category: "one-shot",
  difficulty: "intermediate",
  risk: "low",
  tagline: "One trade at a time, three filters must agree, strict 1:2 R:R.",
  emoji: "🎯",
  accent: "#14b8a6",
  description:
    "A low-frequency, high-precision EA. Requires EMA alignment, MACD direction, and RSI side to all agree before firing — and only one trade is ever open at a time. When it's right, it's usually right by a lot.",
  howItWorks: [
    "Three independent filters must confirm the direction: 3-EMA alignment, MACD histogram side, RSI > 50 (long) / < 50 (short).",
    "One-trade-at-a-time enforced — no overlapping positions.",
    "Max 2 trades per day to avoid forcing signals.",
    "Risk 0.75%, ATR stop 1.5×, TP 3× (1:2 R:R).",
  ],
  whenItWorks: [
    "Any clean trend on H1 / H4 majors and XAUUSD.",
    "Great as the first EA on a fresh prop-firm account.",
  ],
  whenItFails: [
    "Low-signal weeks — you'll go days without an entry.",
    "Very choppy markets where filters disagree non-stop.",
  ],
  recommendedSymbols: ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD"],
  recommendedTimeframes: ["H1", "H4"],
  minBalanceUsd: 500,
  build: ({ strategyName }) => {
    const entry = nodeAt(0, 0, "entry.emaCross", "entry", { fastPeriod: 20, slowPeriod: 50, direction: "both" });
    const align = nodeAt(1, 0, "confirm.emaAlignment", "filter", { fastPeriod: 20, midPeriod: 50, slowPeriod: 200 }, "3-EMA alignment");
    const macd = nodeAt(1, 1, "confirm.macdSide", "filter", { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }, "MACD side");
    const rsi = nodeAt(1, 2, "confirm.rsiSide", "filter", { period: 14, longAbove: 50, shortBelow: 50 }, "RSI side");
    const oneAtATime = nodeAt(1, 3, "utility.oneTradeAtTime", "utility", {});
    const maxDaily = nodeAt(1, 4, "utility.maxDailyTrades", "utility", { maxTrades: 2 });
    const spread = nodeAt(1, 5, "utility.maxSpread", "utility", { maxSpreadPoints: 25 });
    const newBar = nodeAt(1, 6, "utility.onlyNewBar", "utility", {});
    const risk = nodeAt(2, 0, "risk.atrRisk", "risk", { riskPercent: 0.75, atrPeriod: 14, slMultiplier: 1.5 });
    const lot = nodeAt(2, 1, "lot.fromRisk", "lot", {});
    const exit = nodeAt(3, 0, "exit.atrBased", "exit", { atrPeriod: 14, slMultiplier: 1.5, tpMultiplier: 3 });
    const be = nodeAt(3, 1, "manage.breakEvenAtrMulti", "management", { atrPeriod: 14, multiplier: 1 });
    return makeGraph({
      name: strategyName,
      description: "Triple-confirmation sniper with one-trade-at-a-time and tight risk.",
      symbol: "EURUSD",
      timeframe: "H1",
      magic: 20260430,
      nodes: [entry, align, macd, rsi, oneAtATime, maxDaily, spread, newBar, risk, lot, exit, be],
    });
  },
};

// ──────────────────────────────────────────────────────────────────
// Exports
// ──────────────────────────────────────────────────────────────────

export const TEMPLATE_LIST: Template[] = [
  emaCrossProEur,
  propFirmSafe,
  donchianBreakout,
  goldTrendH4,
  oneShotSniper,
  bollingerSqueezeBreak,
  rsiMeanReversion,
  multiTfMomentum,
  londonOpenScalper,
  atrGridBasket,
  martingaleRecovery,
];

export function getTemplateBySlug(slug: string): Template | null {
  return TEMPLATE_LIST.find((t) => t.slug === slug) ?? null;
}

export const FEATURED_TEMPLATES = TEMPLATE_LIST.filter((t) => t.featured);
