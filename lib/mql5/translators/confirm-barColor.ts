import type { Translator } from "../types";

// Prior-candle color match — long-OK when bar `offset` is bullish
// (close > open), short-OK when bearish.

export const translate_confirm_barColor: Translator = (node) => {
  const p = node.params as { candleOffset: number };
  const oIn = `InpBarClr_${sid(node.id)}`;

  return {
    inputs: [
      { name: oIn, type: "int", defaultExpr: String(p.candleOffset ?? 1), label: "Candle offset" },
    ],
    entryConditions: [
      { direction: "long", expr: `(iClose(_Symbol, _Period, ${oIn}) > iOpen(_Symbol, _Period, ${oIn}))` },
      { direction: "short", expr: `(iClose(_Symbol, _Period, ${oIn}) < iOpen(_Symbol, _Period, ${oIn}))` },
    ],
    summaryFragments: [`Prior candle color (offset ${p.candleOffset ?? 1})`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
