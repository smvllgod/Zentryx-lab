// ──────────────────────────────────────────────────────────────────
// Strategy graph — the *source of truth* for any strategy.
// Generated MQL5 code is derived from this; never the other way round.
// ──────────────────────────────────────────────────────────────────

export type Platform = "mt5";

export type NodeCategory =
  | "entry"
  | "filter"        // legacy wide bucket: confirmation / trend / momentum / vol / exec / mtf / structure / candles
  | "risk"          // risk model only
  | "lot"           // lot-sizer — separated from risk in the V1 taxonomy
  | "management"    // BE, trailing, partial close
  | "exit"
  | "grid"
  | "session"
  | "news"
  | "utility";

// Concrete node types. Adding a new node type means: add literal here,
// register in NODE_DEFINITIONS, implement (or skip) a translator.
export type NodeType =
  // Entry
  | "entry.emaCross"
  | "entry.smaCross"
  | "entry.previousCandle"
  | "entry.macdCross"
  | "entry.stochCross"
  | "entry.bollingerBreak"
  | "entry.donchianBreakout"
  | "entry.priceActionPinbar"
  | "entry.trendlineBreak"
  | "entry.rsiExtreme"
  // Confirmation / trend / momentum / vol / exec / mtf (legacy bucket: "filter")
  | "filter.rsi"
  | "filter.session"
  | "filter.spreadLimit"
  | "filter.atr"
  | "filter.adx"
  | "filter.higherTimeframeTrend"
  | "filter.dayOfWeek"
  | "filter.maxDailyTrades"
  | "filter.maxDailyLoss"
  | "filter.priceAboveMa"           // V1 addition
  | "filter.emaSlope"               // V1 addition
  | "filter.rocThreshold"           // V1 addition
  | "filter.rsiBand"                // V1 addition
  | "filter.pinBar"                 // V1 addition
  | "filter.londonSession"          // V1 addition
  | "filter.atrBand"                // V1 addition
  // Risk model
  | "risk.fixedRisk"                // V1 addition — dedicated risk budget
  | "risk.dailyRiskBudget"          // V1 addition
  // Lot sizing
  | "lot.fixed"                     // V1 addition
  | "lot.fromRisk"                  // V1 addition
  | "risk.fixedLot"                 // legacy alias for lot.fixed
  | "risk.riskPercent"              // legacy alias for lot.fromRisk + risk.fixedRisk bundle
  | "risk.fixedRatio"
  | "risk.volatilityScaled"
  // Trade management (legacy bucket: "exit")
  | "manage.breakEven"
  | "manage.trailingStop"
  | "manage.trailingStopAtr"
  | "manage.partialClose"
  | "exit.trailingStop"             // legacy alias
  | "exit.breakEven"                // legacy alias
  | "exit.atrTrailing"              // legacy alias
  | "exit.partialClose"             // legacy alias
  // Exit
  | "exit.fixedTpSl"
  | "exit.rrBased"                  // V1 addition
  | "exit.atrBased"                 // V1 addition
  | "exit.timeBasedExit"
  | "exit.oppositeSignal"
  | "exit.chandelierExit"
  // Grid
  | "grid.basicGrid"
  // News
  | "news.pauseBeforeNews"
  // Utility
  | "utility.oneTradeAtTime"
  | "utility.maxOpenPositions"
  | "utility.maxDailyTrades"         // V1 addition (moved from filter)
  | "utility.maxDailyLoss"           // V1 addition (moved from filter)
  | "utility.slippageControl"
  | "utility.emergencyStop"
  | "utility.onlyNewBar"             // V1 addition
  // Any additional block id from the modular registry (lib/blocks/*).
  // The intersection with `string` keeps autocomplete on the literal
  // union while accepting any string at runtime. Compiler treats
  // unknown types as preview-only (warning, no code gen).
  | (string & {});

export interface StrategyNode<P = Record<string, unknown>> {
  id: string;
  type: NodeType;
  category: NodeCategory;
  label?: string;
  position: { x: number; y: number };
  params: P;
}

export interface StrategyEdge {
  id: string;
  source: string;
  target: string;
}

export interface StrategyMetadata {
  name: string;
  description?: string;
  symbol?: string;
  timeframe?: Timeframe;
  magicNumber?: number;
  /** Shown in MT5 History as the "comment" of every opened trade. */
  tradeComment?: string;
  /**
   * Optional EA visual appearance configuration.
   * See `lib/appearance/types.ts` for the full schema.
   * Stored as-is in Supabase; the MQL5 compiler pulls it at export time.
   */
  appearance?: import("../appearance/types").VisualSchema;
  /**
   * Packaging config — drives the MT5 Inputs-tab presentation:
   * which preset (professional / premium_seller / institutional) and
   * what metadata populates the PRODUCT INFO section.
   * Consumed by `CompileOptions.presentation` at export time.
   */
  packaging?: {
    preset: "professional" | "premium_seller" | "institutional";
    product?: {
      name?: string;
      version?: string;
      vendor?: string;
      supportUrl?: string;
    };
  };
}

export type Timeframe =
  | "M1" | "M5" | "M15" | "M30"
  | "H1" | "H4" | "D1" | "W1" | "MN1";

export interface CanvasState {
  zoom: number;
  position: { x: number; y: number };
}

export interface StrategyGraph {
  version: number;
  platform: Platform;
  metadata: StrategyMetadata;
  nodes: StrategyNode[];
  edges: StrategyEdge[];
  canvas: CanvasState;
}

export const STRATEGY_GRAPH_VERSION = 1;

export function emptyGraph(metadata: Partial<StrategyMetadata> = {}): StrategyGraph {
  return {
    version: STRATEGY_GRAPH_VERSION,
    platform: "mt5",
    metadata: {
      name: metadata.name ?? "Untitled Strategy",
      description: metadata.description,
      symbol: metadata.symbol ?? "EURUSD",
      timeframe: metadata.timeframe ?? "M15",
      magicNumber: metadata.magicNumber ?? 20260418,
      tradeComment: metadata.tradeComment ?? "Zentryx Lab",
    },
    nodes: [],
    edges: [],
    canvas: { zoom: 1, position: { x: 0, y: 0 } },
  };
}

// Canonical downstream direction for connection validation.
// Connections should flow: entry → filter → session/news → risk → exit → grid/utility.
export const CATEGORY_ORDER: NodeCategory[] = [
  "entry",
  "filter",
  "session",
  "news",
  "risk",
  "lot",
  "management",
  "exit",
  "grid",
  "utility",
];
