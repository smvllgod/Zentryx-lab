// ──────────────────────────────────────────────────────────────────
// MQL5 post-pass: watermark + obfuscation
// ──────────────────────────────────────────────────────────────────
// Two independent source-level transforms, applied after codegen:
//
//  • Watermark — prepends a comment header (buyer id, timestamp, notice).
//    Used both by the Free-tier auto-watermark and by the user-facing
//    `protection.watermark` block on Pro/Creator exports.
//
//  • Obfuscation — renames every identifier WE generate, strips
//    comments, collapses whitespace. The output still compiles in
//    MetaEditor but hides logic from a casual reader.
//
// Both transforms are optional and independent: you can watermark
// without obfuscating, or obfuscate without watermarking. For Free
// tier we still apply both by default — see `obfuscateMql5()` below,
// kept as a convenience wrapper with the legacy signature.
// ──────────────────────────────────────────────────────────────────

export interface WatermarkOptions {
  /** Identifier shown in the header comment (user id, email, buyer id). */
  userId?: string;
  /** ISO timestamp of the export — for traceability. Omit to suppress. */
  exportedAt?: string;
  /** Additional free-form line appended to the header (e.g. license id). */
  extraNote?: string;
}

export interface ObfuscationOptions {
  /** minimal: rename helpers only. aggressive: rename + strip everything. */
  level?: "minimal" | "aggressive";
}

interface ObfuscateOptions extends WatermarkOptions, ObfuscationOptions {}

// Identifiers that start with these prefixes are ours and safe to rename.
// Every name generator in lib/mql5/translators and lib/mql5/template uses
// one of these. If you add a new prefix, add it here.
const OWNED_PREFIXES = ["Inp", "Zx", "hFast_", "hSlow_", "hRsi_", "hMacd_", "hStoch_", "hAtr_"];

// Helper function names we emit at file scope. Rename them globally.
const OWNED_HELPERS = [
  "ZxPipSize",
  "NormalizeLots",
  "BufferValue",
  "ZxModifySL",
  "ZxIsNewBar",
  "ZxLotForRisk",
  "ZxInSession",
  "ZxHasOpenPosition",
  "ZxOpen",
  "ZxTradesToday",
  "ZxDailyPnlPercent",
  "ZxOpenPositionCount",
  "MacdBuf",
  "StochBuf",
  "AtrPips",
];

// Short alphabet for the renamed identifiers. Keeping them to two chars
// so the file compresses nicely and the output feels deliberately opaque.
const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

function nextName(index: number): string {
  const a = ALPHABET[index % 26];
  const b = ALPHABET[Math.floor(index / 26) % 26];
  return `_${a}${b}`;
}

/**
 * Apply obfuscation only — rename owned identifiers, strip comments.
 * Does NOT prepend a watermark; call `applyWatermark()` separately if
 * you need that. `level` controls aggressiveness:
 *   minimal    — rename identifiers but keep input labels and structure
 *   aggressive — also strip block/line comments and collapse whitespace
 */
export function applyObfuscation(source: string, opts: ObfuscationOptions = {}): string {
  const level = opts.level ?? "aggressive";

  // ── Pass 1: find every owned identifier
  const idRe = /\b[A-Za-z_][A-Za-z0-9_]*\b/g;
  const owned = new Set<string>();
  for (const m of source.matchAll(idRe)) {
    const id = m[0];
    if (OWNED_HELPERS.includes(id)) {
      owned.add(id);
      continue;
    }
    for (const p of OWNED_PREFIXES) {
      if (id.startsWith(p) && id !== p) {
        owned.add(id);
        break;
      }
    }
  }

  // Build a stable mapping — sort so the same source always produces the
  // same rename map, helpful for debugging if Pro users ever see it.
  const map = new Map<string, string>();
  [...owned]
    .sort()
    .forEach((orig, i) => map.set(orig, nextName(i)));

  // ── Pass 2: substitute each owned identifier globally using word
  // boundaries. We do this one id at a time in length order (longest
  // first) to avoid partial-prefix collisions.
  let out = source;
  const ordered = [...map.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [orig, replacement] of ordered) {
    const re = new RegExp(`\\b${escapeRegex(orig)}\\b`, "g");
    out = out.replace(re, replacement);
  }

  if (level === "minimal") return out;

  // ── Aggressive: strip comments & collapse whitespace.
  // Block comments (always internal) — remove entirely.
  out = out.replace(/\/\*[\s\S]*?\*\//g, "");

  // Line comments — keep the ones attached to `input` declarations because
  // MetaTrader shows them in the parameter UI; strip everything else.
  out = out
    .split("\n")
    .map((line) => {
      if (/^\s*input\b/.test(line)) return line; // keep trailing comment, it's a UI label
      const idx = findLineCommentStart(line);
      if (idx === -1) return line;
      return line.slice(0, idx).replace(/\s+$/, "");
    })
    .filter((line) => line.trim().length > 0)
    .join("\n");

  // Collapse horizontal whitespace (preserve newlines).
  out = out.replace(/[ \t]+/g, " ").replace(/ ?\n /g, "\n");

  return out;
}

/**
 * Prepend a watermark comment header. Purely additive — the source is
 * otherwise untouched, so combining with obfuscation is safe.
 */
export function applyWatermark(source: string, opts: WatermarkOptions = {}): string {
  const lines: string[] = [
    `//+-----------------------------------------------------------------+`,
    `// Zentryx Lab — protected export`,
  ];
  if (opts.userId) lines.push(`// account: ${opts.userId}`);
  if (opts.exportedAt) lines.push(`// exported: ${opts.exportedAt}`);
  if (opts.extraNote) lines.push(`// ${opts.extraNote}`);
  lines.push(`// Reverse-engineering, redistribution, or resale is prohibited.`);
  lines.push(`//+-----------------------------------------------------------------+`);
  return lines.join("\n") + "\n" + source;
}

/**
 * Legacy convenience wrapper — Free-tier path still calls this with
 * `userId` + `exportedAt`. Equivalent to aggressive obfuscation followed
 * by a watermark. New code should prefer the split functions.
 */
export function obfuscateMql5(source: string, opts: ObfuscateOptions = {}): string {
  const obf = applyObfuscation(source, { level: opts.level ?? "aggressive" });
  return applyWatermark(obf, {
    userId: opts.userId,
    exportedAt: opts.exportedAt ?? new Date().toISOString(),
    extraNote: opts.extraNote,
  });
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Find the start of a `//` line comment that is NOT inside a string literal.
function findLineCommentStart(line: string): number {
  let inString: '"' | "'" | null = null;
  let escape = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (inString) {
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = ch;
      continue;
    }
    if (ch === "/" && line[i + 1] === "/") return i;
  }
  return -1;
}
