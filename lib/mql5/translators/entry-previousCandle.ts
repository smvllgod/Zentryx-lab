import type { Translator } from "../types";

export const translate_entry_previousCandle: Translator = (node) => {
  const p = node.params as { direction: string; minRangePips: number };
  const minRange = `InpMinRange_${shortId(node.id)}`;
  const direction = p.direction === "long" ? "long" : p.direction === "short" ? "short" : "both";

  // Previous candle break:
  //   long  -> current bid > High[1] AND (High[1]-Low[1]) >= minRange*pip
  //   short -> current ask < Low[1]  AND (High[1]-Low[1]) >= minRange*pip
  const range = `((iHigh(_Symbol,_Period,1) - iLow(_Symbol,_Period,1)) >= ${minRange} * ZxPipSize())`;

  const exprFor = (dir: "long" | "short") =>
    dir === "long"
      ? `(SymbolInfoDouble(_Symbol, SYMBOL_BID) > iHigh(_Symbol,_Period,1) && ${range})`
      : `(SymbolInfoDouble(_Symbol, SYMBOL_ASK) < iLow(_Symbol,_Period,1) && ${range})`;

  return {
    inputs: [
      {
        name: minRange,
        type: "double",
        defaultExpr: String(p.minRangePips),
        label: "Previous candle min range (pips)",
      },
    ],
    entryConditions:
      direction === "both"
        ? [
            { direction: "long", expr: exprFor("long") },
            { direction: "short", expr: exprFor("short") },
          ]
        : [{ direction, expr: exprFor(direction) }],
    summaryFragments: [
      `previous-candle break (min ${p.minRangePips} pips)${direction === "both" ? "" : ` (${direction} only)`}`,
    ],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
