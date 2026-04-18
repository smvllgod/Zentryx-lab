// Feature-flag resolution. Current implementation reads from an in-memory
// set (seeded from a Supabase `feature_flags` table in Phase D admin).
// Components should call `useFlags()` via the auth-context bridge when
// flag data is wired end-to-end; for now the registry seeds an empty set.

export type FlagSet = Set<string>;

export const EMPTY_FLAGS: FlagSet = new Set();

export function hasFlag(flags: FlagSet | undefined, name: string): boolean {
  return flags ? flags.has(name) : false;
}

export function flagsFromList(list: string[] | undefined | null): FlagSet {
  return new Set(list ?? []);
}

// Well-known flag names used across block definitions. Keep this list
// curated — do not let arbitrary string flags leak into the registry.
export const KNOWN_FLAGS = [
  "beta.smc",           // Smart-Money Concepts blocks
  "beta.divergence",    // divergence detectors
  "beta.mtf",           // multi-TF advanced
  "beta.grid",          // advanced grid / recovery
  "beta.protection",    // beta protection modules
] as const;

export type KnownFlag = (typeof KNOWN_FLAGS)[number];
