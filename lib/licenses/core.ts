// Server-side license primitives: key generation, canonicalisation, hashing.
// Uses Node's `crypto` — import only from server code (Netlify functions,
// or Next server components). Safe to import in build-time TS; not meant
// for browser bundles.

import { createHash, randomBytes } from "node:crypto";

// ── Format ──────────────────────────────────────────────────────────
// Keys look like:   ZNTX-XXXX-XXXX-XXXX-XXXX
// 4 groups of 4 Crockford-base32 chars = 80 bits of entropy (~1.2×10²⁴).
//
// We use Crockford's alphabet (no I, L, O, U) to avoid transcription
// mistakes. Case-insensitive on input; canonical form is upper.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // 32 chars — Crockford
const PREFIX = "ZNTX";
const GROUPS = 4;
const CHARS_PER_GROUP = 4;

export interface GeneratedKey {
  /** Plaintext key in canonical form — show once, never store. */
  plaintext: string;
  /** SHA-256 hex of the canonical form (what goes in licenses.key_hash). */
  hash: string;
  /** First 9 chars ("ZNTX-XXXX") — safe to persist for UI listing. */
  prefix: string;
}

/** Generate a fresh license key. */
export function generateLicenseKey(): GeneratedKey {
  const bytes = randomBytes(GROUPS * CHARS_PER_GROUP);
  const body: string[] = [];
  for (let g = 0; g < GROUPS; g++) {
    let chunk = "";
    for (let c = 0; c < CHARS_PER_GROUP; c++) {
      const byte = bytes[g * CHARS_PER_GROUP + c]!;
      chunk += ALPHABET[byte % ALPHABET.length];
    }
    body.push(chunk);
  }
  const plaintext = `${PREFIX}-${body.join("-")}`;
  return {
    plaintext,
    hash: hashLicenseKey(plaintext),
    prefix: `${PREFIX}-${body[0]}`,
  };
}

/**
 * Canonicalise a user-supplied key: upper-case, strip non-alphanumerics,
 * then re-insert dashes in the `ZNTX-XXXX-XXXX-XXXX-XXXX` pattern.
 * Returns null if the input can't be coerced into the expected shape.
 */
export function canonicaliseKey(input: string): string | null {
  if (typeof input !== "string") return null;
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const expectedLen = PREFIX.length + GROUPS * CHARS_PER_GROUP;
  if (raw.length !== expectedLen) return null;
  if (!raw.startsWith(PREFIX)) return null;
  const body = raw.slice(PREFIX.length);
  // Every body char must be in the alphabet (Crockford subset).
  for (const ch of body) {
    if (!ALPHABET.includes(ch)) return null;
  }
  const groups: string[] = [];
  for (let g = 0; g < GROUPS; g++) {
    groups.push(body.slice(g * CHARS_PER_GROUP, (g + 1) * CHARS_PER_GROUP));
  }
  return `${PREFIX}-${groups.join("-")}`;
}

/** SHA-256 hex of the canonical form. Identical string → identical hash. */
export function hashLicenseKey(canonical: string): string {
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/**
 * Hash any user-supplied key after canonicalising it. Returns null if the
 * input is malformed. Safe to use to look up a row in `licenses`.
 */
export function hashUserSuppliedKey(input: string): string | null {
  const canon = canonicaliseKey(input);
  if (!canon) return null;
  return hashLicenseKey(canon);
}

/** First 9 chars for display — `ZNTX-XXXX`. */
export function prefixFromKey(canonical: string): string {
  return canonical.slice(0, PREFIX.length + 1 + CHARS_PER_GROUP);
}
