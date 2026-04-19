import { block } from "../_factory";
import type { BlockDefinition } from "../types";

// ── News / Event Filters (7) ─────────────────────────────────────────

export const NEWS_BLOCKS: BlockDefinition[] = [
  block({
    id: "news.pauseAround",
    family: "news", subcategory: "calendar", name: "Pause Around News",
    short: "Block entries X min before / after events.",
    long: "Suspends entries in a configurable window around calendar events. Reads from the bundled `news.csv` unless a CSV Feed block overrides it.",
    userWhy: "The single cheapest way to avoid whipsaws on high-impact releases.",
    plan: "pro", priority: "P1", complexity: "intermediate",
    affects: ["filter"], tags: ["news", "calendar"],
    params: [
      { key: "beforeMinutes", label: "Before event (minutes)", kind: "integer", default: 30, unit: "min",
        validation: [{ kind: "required" }, { kind: "min", value: 0 }, { kind: "max", value: 720 }] },
      { key: "afterMinutes", label: "After event (minutes)", kind: "integer", default: 30, unit: "min",
        validation: [{ kind: "required" }, { kind: "min", value: 0 }, { kind: "max", value: 720 }] },
      { key: "highImpactOnly", label: "High-impact events only", kind: "boolean", default: true },
    ],
  }),
  block({
    id: "news.highImpactOnly",
    family: "news", subcategory: "calendar", name: "High-Impact Only",
    short: "Restricts news logic to high-impact events only.",
    plan: "pro", priority: "P2", complexity: "basic",
    affects: ["filter"], tags: ["news"], params: [],
  }),
  block({
    id: "news.currencyScope",
    family: "news", subcategory: "calendar", name: "Currency Scope",
    short: "Limit news scope to symbol's currencies.",
    plan: "pro", priority: "P2", complexity: "basic",
    affects: ["filter"], tags: ["news"],
    params: [
      { key: "extraCurrencies", label: "Extra currencies (comma-separated)", kind: "csv", default: "" },
    ],
  }),
  block({
    id: "news.closeBeforeNews",
    family: "news", subcategory: "calendar", name: "Close Before News",
    short: "Flatten positions X min before event.",
    plan: "creator", priority: "P2", complexity: "intermediate",
    affects: ["management", "exit"], tags: ["news"],
    params: [
      { key: "beforeMinutes", label: "Minutes before", kind: "integer", default: 15, unit: "min",
        validation: [{ kind: "required" }, { kind: "min", value: 1 }, { kind: "max", value: 720 }] },
    ],
  }),
  block({
    id: "news.dailyMacroBlock",
    family: "news", subcategory: "calendar", name: "FOMC / ECB / NFP Block",
    short: "Block entries on FOMC / ECB / NFP day.",
    plan: "creator", priority: "P3", complexity: "intermediate", status: "beta",
    affects: ["filter"], tags: ["news", "macro"],
    params: [
      { key: "events", label: "Events to block", kind: "multiSelect", default: ["fomc", "ecb", "nfp"],
        options: [{ value: "fomc", label: "FOMC" }, { value: "ecb", label: "ECB" }, { value: "nfp", label: "NFP" }, { value: "boe", label: "BoE" }, { value: "boj", label: "BoJ" }] },
    ],
  }),
  block({
    id: "news.csvFeed",
    family: "news", subcategory: "feed-cfg", name: "Custom News CSV Feed",
    short: "Pick the bundled CSV feed for this EA.",
    plan: "creator", priority: "P2", complexity: "advanced", status: "beta",
    affects: ["filter"], tags: ["news", "feed"],
    params: [
      { key: "feedName", label: "Feed filename", kind: "string", default: "news.csv" },
    ],
  }),
  block({
    id: "news.sentimentFilter",
    family: "news", subcategory: "sentiment", name: "Sentiment Filter",
    short: "Block trades against sentiment bias.",
    plan: "creator", priority: "P3", complexity: "advanced", status: "beta",
    affects: ["filter"], tags: ["sentiment"], params: [],
  }),
];
