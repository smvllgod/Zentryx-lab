// Public entry for `lib/blocks`. Re-exports everything a consumer
// should reasonably reach for. Keep this surface stable — the builder
// UI, MQL5 compiler and admin dashboard all import from here.

export * from "./types";
export * from "./categories";
export {
  BLOCK_REGISTRY,
  ALL_CANVAS_BLOCKS,
  ALL_CONFIG_BLOCKS,
  getBlock,
  getBlockBySlug,
  listBlocks,
  searchBlocks,
  groupByFamily,
  defaultParamValues,
  type BlockFilter,
} from "./registry";
export {
  planAtLeast,
  isBlockAvailable,
  blocksForPlan,
  premiumBlockIds,
} from "./plans";
export {
  validateBlockParams,
  type ParamValidationError,
  type ValidationResult as BlockValidationResult,
} from "./validation";
export {
  EMPTY_FLAGS,
  flagsFromList,
  hasFlag,
  KNOWN_FLAGS,
  type FlagSet,
  type KnownFlag,
} from "./flags";
export {
  applyAnalytics,
  rankByPopularity,
  rankByUsage,
  type BlockAnalyticsRow,
} from "./analytics";
