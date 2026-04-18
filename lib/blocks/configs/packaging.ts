import { block } from "../_factory";
import type { BlockDefinition } from "../types";

// ── Marketplace / Packaging (6) · NON-CANVAS ─────────────────────────
// Appear in the marketplace publishing flow.

export const PACKAGING_BLOCKS: BlockDefinition[] = [
  block({
    id: "pkg.listingProfile",
    family: "packaging", subcategory: "listing", name: "Listing Profile",
    short: "Title, subtitle, tags and thumbnail.",
    long: "The core metadata for the marketplace card. Must be present before a listing can be moved from `draft` to `published`.",
    userWhy: "Everything buyers see at a glance. Worth spending 10 minutes on.",
    plan: "creator", priority: "P1", complexity: "basic",
    surface: "packaging", affects: ["export"], codegen: false,
    tags: ["marketplace", "listing"],
    params: [
      { key: "title", label: "Title", kind: "string", default: "",
        validation: [{ kind: "required" }] },
      { key: "subtitle", label: "Subtitle", kind: "string", default: "" },
      { key: "tags", label: "Tags (csv)", kind: "csv", default: "trend" },
      { key: "thumbnailUrl", label: "Thumbnail URL", kind: "string", default: "" },
    ],
  }),
  block({
    id: "pkg.pricingModel",
    family: "packaging", subcategory: "pricing", name: "Pricing Model",
    short: "One-time, subscription, or rental.",
    plan: "creator", priority: "P1", complexity: "basic",
    surface: "packaging", affects: ["export"], codegen: false,
    tags: ["marketplace", "pricing"],
    params: [
      { key: "model", label: "Model", kind: "select", default: "oneTime",
        options: [
          { value: "oneTime", label: "One-time purchase" },
          { value: "subscription", label: "Monthly subscription" },
          { value: "rental", label: "Time-limited rental" },
        ] },
      { key: "priceCents", label: "Price (cents, USD)", kind: "integer", default: 2900,
        validation: [{ kind: "required" }, { kind: "min", value: 0 }] },
      { key: "rentalDays", label: "Rental days", kind: "integer", default: 30,
        visibleWhen: { key: "model", equals: "rental" },
        validation: [{ kind: "min", value: 1 }, { kind: "max", value: 365 }] },
    ],
  }),
  block({
    id: "pkg.presetRiskProfile",
    family: "packaging", subcategory: "preset", name: "Preset Risk Profile",
    short: "Bundle conservative / balanced / aggressive parameter sets.",
    plan: "creator", priority: "P2", complexity: "intermediate",
    surface: "packaging", affects: ["export"], codegen: false,
    tags: ["marketplace", "preset"],
    params: [
      { key: "includeConservative", label: "Include conservative preset", kind: "boolean", default: true },
      { key: "includeBalanced", label: "Include balanced preset", kind: "boolean", default: true },
      { key: "includeAggressive", label: "Include aggressive preset", kind: "boolean", default: false },
    ],
  }),
  block({
    id: "pkg.changelog",
    family: "packaging", subcategory: "listing", name: "Version Changelog",
    short: "Changelog pulled into listing page.",
    plan: "creator", priority: "P2", complexity: "basic",
    surface: "packaging", affects: ["export"], codegen: false,
    tags: ["marketplace", "changelog"],
    params: [
      { key: "version", label: "Version", kind: "string", default: "1.0.0" },
      { key: "notes", label: "Release notes (markdown)", kind: "string", default: "" },
    ],
  }),
  block({
    id: "pkg.docBundle",
    family: "packaging", subcategory: "listing", name: "Documentation Bundle",
    short: "Attach PDF or markdown readme.",
    plan: "creator", priority: "P2", complexity: "basic",
    surface: "packaging", affects: ["export"], codegen: false,
    tags: ["marketplace", "docs"],
    params: [
      { key: "docUrl", label: "Documentation URL", kind: "string", default: "" },
    ],
  }),
  block({
    id: "pkg.setupAssistant",
    family: "packaging", subcategory: "support", name: "Setup Assistant",
    short: "Post-purchase onboarding checklist.",
    plan: "creator", priority: "P3", complexity: "advanced", status: "planned",
    surface: "packaging", affects: ["export"], codegen: false,
    tags: ["marketplace", "onboarding"],
    params: [],
  }),
];
