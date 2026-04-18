// ──────────────────────────────────────────────────────────────────
// MQL5 obfuscator — Free-tier IP protection without a real compiler.
// ──────────────────────────────────────────────────────────────────
// Goal: the output still compiles in MetaEditor and behaves identically,
// but someone opening the file in a text editor sees no human-readable
// logic, no helper names, no comments.
//
// Strategy:
//   1. Rename every identifier WE generate (patterns: Inp*, h* with
//      `_<hash>` suffix, our Zx* helpers, our internal function names).
//      We never touch MQL5 reserved words, std-lib identifiers, or
//      MetaQuotes Trade class methods — those must stay intact.
//   2. Strip "// ..." single-line comments EXCEPT the ones that label
//      an `input` declaration (MT5 shows these in the Strategy Tester
//      UI — stripping would make the EA unusable).
//   3. Strip /* ... */ block comments entirely (always internal).
//   4. Collapse runs of whitespace on intra-line boundaries while
//      keeping line breaks so the file stays diff-stable.
//   5. Prepend an invisible watermark: a commented user id + timestamp
//      so leaked files trace back to a specific account.
// ──────────────────────────────────────────────────────────────────

interface ObfuscateOptions {
  /** Account id or email — goes into the watermark comment. */
  userId?: string;
  /** ISO timestamp of the export — for traceability. */
  exportedAt?: string;
}

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

export function obfuscateMql5(source: string, opts: ObfuscateOptions = {}): string {
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

  // ── Pass 3: strip comments.
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

  // ── Pass 4: collapse horizontal whitespace (preserve newlines).
  out = out.replace(/[ \t]+/g, " ").replace(/ ?\n /g, "\n");

  // ── Pass 5: watermark + banner
  const watermark =
    `//+-----------------------------------------------------------------+\n` +
    `// Zentryx Lab — protected export\n` +
    `// account: ${opts.userId ?? "anonymous"}\n` +
    `// exported: ${opts.exportedAt ?? new Date().toISOString()}\n` +
    `// Reverse-engineering, redistribution, or resale is prohibited.\n` +
    `//+-----------------------------------------------------------------+\n`;

  return watermark + out;
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
