import type { Translator } from "../types";

// ──────────────────────────────────────────────────────────────────
// entry.candleOpen
// ──────────────────────────────────────────────────────────────────
// Open a trade at the open of a new bar, directly in the direction of
// the just-closed previous candle. Bullish close → long. Bearish
// close → short. Pure momentum continuation bet, no indicators.
//
// Timing: the template already gates every entry on ZxIsNewBar(), so
// this fires once per new bar, on its first tick.
//
// Guards:
//   - `direction` limits firing to long-only / short-only / both
//   - `minBodyPips` skips dojis and near-dojis (optional; default 0)
//
// Good pair with: lot.fromRisk + exit.atrBased for a no-indicator
// trend-rider, or grid.basic / lot.martingale for systems that want
// a quick directional seed every bar.
// ──────────────────────────────────────────────────────────────────

export const translate_entry_candleOpen: Translator = (node) => {
  const p = node.params as { direction?: string; minBodyPips?: number };
  const tag = shortId(node.id);
  const minBodyInput = `InpCoMinBody_${tag}`;
  const minBody = p.minBodyPips ?? 0;
  const direction =
    p.direction === "long" ? "long"
    : p.direction === "short" ? "short"
    : "both";

  // Bar 1 = just-closed previous candle (bar 0 is the forming one).
  // Body size in pips: |close - open| / ZxPipSize()
  const bodyExpr =
    `(MathAbs(iClose(_Symbol,_Period,1) - iOpen(_Symbol,_Period,1)) / ZxPipSize() >= ${minBodyInput})`;

  const bullExpr  = `(iClose(_Symbol,_Period,1) > iOpen(_Symbol,_Period,1)) && ${bodyExpr}`;
  const bearExpr  = `(iClose(_Symbol,_Period,1) < iOpen(_Symbol,_Period,1)) && ${bodyExpr}`;

  return {
    inputs: [
      {
        name: minBodyInput,
        type: "double",
        defaultExpr: String(minBody),
        label: "Previous Candle Min Body (pips)",
        section: "entry_logic",
      },
    ],
    entryConditions:
      direction === "both"
        ? [
            { direction: "long",  expr: `(${bullExpr})` },
            { direction: "short", expr: `(${bearExpr})` },
          ]
        : direction === "long"
          ? [{ direction: "long",  expr: `(${bullExpr})` }]
          : [{ direction: "short", expr: `(${bearExpr})` }],
    summaryFragments: [
      `Candle-open follow${minBody > 0 ? ` (≥${minBody} pip body)` : ""}${direction === "both" ? "" : ` (${direction} only)`}`,
    ],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
