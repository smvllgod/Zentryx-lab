import type { Translator } from "../types";

// ──────────────────────────────────────────────────────────────────
// entry.randomPosition
// ──────────────────────────────────────────────────────────────────
// Fires EXACTLY ONCE per EA lifetime: on the first new bar after
// attachment, open a position in a random (or fixed) direction. No
// indicators, no filters — just a directional seed.
//
// Designed as the starter entry for grid / martingale / basket
// systems that need an initial leg to build their ladder from. Once
// the first position is open, downstream management blocks take
// over — the random trigger never fires again.
//
// Mode options:
//   - "random" — 50/50 roll at runtime
//   - "long"   — always opens long
//   - "short"  — always opens short
//
// The rolled direction is cached in a global, and a "fired" flag
// stops subsequent bars from re-triggering. The template's existing
// `!PositionSelect(_Symbol)` gate means we also won't duplicate if
// the position is still open.
// ──────────────────────────────────────────────────────────────────

export const translate_entry_randomPosition: Translator = (node) => {
  const p = node.params as { mode?: "random" | "long" | "short" };
  const tag = shortId(node.id);
  const mode = p.mode === "long" || p.mode === "short" ? p.mode : "random";

  const gDir = `_zxRandDir_${tag}`;    // 0 = long, 1 = short, -1 = unset
  const gFired = `_zxRandFired_${tag}`;
  const fnName = `ZxRandomEntry_${tag}`;

  // Seed-once initializer — emitted as part of the helper so we don't
  // rely on the initializer order of file-scope globals.
  const initDirCode =
    mode === "long"
      ? `${gDir} = 0;`
      : mode === "short"
        ? `${gDir} = 1;`
        : `MathSrand((int)(TimeLocal() ^ (int)AccountInfoInteger(ACCOUNT_LOGIN))); ${gDir} = MathRand() % 2;`;

  const helper = `bool ${fnName}(bool checkLong)
{
   // One-shot directional seed: rolls once, fires once, then mute.
   if(${gFired}) return false;
   if(${gDir} == -1) { ${initDirCode} }
   bool match = checkLong ? (${gDir} == 0) : (${gDir} == 1);
   if(match) ${gFired} = true;
   return match;
}`;

  return {
    globals: [`int ${gDir} = -1;\nbool ${gFired} = false;`],
    helpers: [helper],
    entryConditions: [
      { direction: "long",  expr: `${fnName}(true)` },
      { direction: "short", expr: `${fnName}(false)` },
    ],
    summaryFragments: [
      mode === "random"
        ? "Random one-shot seed"
        : `One-shot ${mode} seed`,
    ],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
