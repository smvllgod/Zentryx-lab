import { block } from "../_factory";
import type { BlockDefinition } from "../types";

// ── Strategy Protection / Licensing (8) · NON-CANVAS ─────────────────
// These appear in the Export wizard as a "Protection & Licensing"
// step — never as draggable canvas blocks.

export const PROTECTION_BLOCKS: BlockDefinition[] = [
  block({
    id: "protection.accountLock",
    family: "protection", subcategory: "account", name: "Bind to Account Number",
    short: "EA will only run on whitelisted MT5 logins.",
    long: "Compiles a check against `AccountInfoInteger(ACCOUNT_LOGIN)` into OnInit. If the account isn't in the list, the EA exits immediately. Accepts a comma-separated list of login numbers.",
    userWhy: "Sell / share EAs without fear — they only run where you say they do.",
    plan: "pro", priority: "P1", complexity: "intermediate",
    surface: "protection-config", affects: ["export"],
    tags: ["protection", "license"],
    params: [
      { key: "accounts", label: "Allowed accounts (comma-separated)", kind: "csv", default: "",
        validation: [{ kind: "required" }] },
      { key: "onFailureMessage", label: "Denial message", kind: "string", default: "Not authorised on this account." },
    ],
  }),
  block({
    id: "protection.expiryDate",
    family: "protection", subcategory: "time", name: "Expiry Date",
    short: "EA self-disables past a UTC timestamp.",
    long: "OnInit / OnTick both gate against `TimeCurrent()`. After the deadline the EA refuses to trade and logs a warning.",
    userWhy: "Rentals, promotions, time-limited demos — all one checkbox away.",
    plan: "pro", priority: "P1", complexity: "basic",
    surface: "protection-config", affects: ["export"],
    tags: ["protection", "expiry"],
    params: [
      { key: "expiresAt", label: "Expires at (UTC)", kind: "date", default: "",
        validation: [{ kind: "required" }] },
    ],
  }),
  block({
    id: "protection.brokerLock",
    family: "protection", subcategory: "broker", name: "Bind to Broker",
    short: "Lock to a specific broker company string.",
    plan: "pro", priority: "P2", complexity: "basic",
    surface: "protection-config", affects: ["export"],
    tags: ["protection"],
    params: [
      { key: "allowedCompany", label: "Allowed broker company (contains)", kind: "string", default: "",
        validation: [{ kind: "required" }] },
    ],
  }),
  block({
    id: "protection.demoOnly",
    family: "protection", subcategory: "account", name: "Demo-Only Flag",
    short: "Refuse to trade on live accounts.",
    plan: "pro", priority: "P2", complexity: "basic",
    surface: "protection-config", affects: ["export"],
    tags: ["protection"], params: [],
  }),
  block({
    id: "protection.licenseKey",
    family: "protection", subcategory: "license", name: "License Key + Server",
    short: "Check signed key against a remote license server.",
    long: "OnInit makes one HTTPS call to a Zentryx-hosted license endpoint. If the key is invalid or expired, the EA exits. Resilient to transient network failure (grace mode).",
    plan: "creator", priority: "P2", complexity: "advanced", status: "beta",
    surface: "protection-config", affects: ["export"],
    tags: ["protection", "license", "creator"],
    params: [
      { key: "server", label: "License server", kind: "string", default: "https://license.zentryx.lab/v1/check",
        validation: [{ kind: "required" }] },
      { key: "product", label: "Product slug", kind: "string", default: "",
        validation: [{ kind: "required" }] },
      { key: "graceMode", label: "Allow trading when license-check fails (grace)", kind: "boolean", default: true },
    ],
  }),
  block({
    id: "protection.obfuscation",
    family: "protection", subcategory: "source", name: "Name / Constant Obfuscation",
    short: "Rename helpers, inline constants to deter reverse engineering.",
    plan: "creator", priority: "P3", complexity: "advanced", status: "planned",
    surface: "protection-config", affects: ["export"],
    tags: ["protection", "obfuscation"],
    params: [
      { key: "level", label: "Level", kind: "select", default: "minimal",
        options: [{ value: "minimal", label: "Minimal (rename helpers)" }, { value: "aggressive", label: "Aggressive (inline + rename)" }] },
    ],
  }),
  block({
    id: "protection.watermark",
    family: "protection", subcategory: "source", name: "Source Watermark",
    short: "Add generator / timestamp / buyer-id comment.",
    plan: "pro", priority: "P2", complexity: "basic",
    surface: "protection-config", affects: ["export"],
    tags: ["protection"],
    params: [
      { key: "buyerId", label: "Buyer identifier", kind: "string", default: "" },
      { key: "includeTimestamp", label: "Include build timestamp", kind: "boolean", default: true },
    ],
  }),
  block({
    id: "protection.ipLock",
    family: "protection", subcategory: "runtime", name: "IP / Region Lock",
    short: "Region check via external ping on OnInit.",
    plan: "creator", priority: "P3", complexity: "advanced", status: "planned",
    surface: "protection-config", affects: ["export"],
    tags: ["protection", "geo"],
    params: [
      { key: "allowedCountries", label: "Allowed ISO2 countries (csv)", kind: "csv", default: "US,GB,FR,DE" },
    ],
  }),
];
