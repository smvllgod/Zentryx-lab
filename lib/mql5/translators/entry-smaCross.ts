import type { Translator } from "../types";

export const translate_entry_smaCross: Translator = (node) => {
  const p = node.params as { fastPeriod: number; slowPeriod: number; direction: string };
  const fast = `InpFastSma_${shortId(node.id)}`;
  const slow = `InpSlowSma_${shortId(node.id)}`;
  const hFast = `hFastSma_${shortId(node.id)}`;
  const hSlow = `hSlowSma_${shortId(node.id)}`;

  const direction = p.direction === "long" ? "long" : p.direction === "short" ? "short" : "both";
  const cross = (dir: "long" | "short") => {
    const op = dir === "long" ? ">" : "<";
    const opPrev = dir === "long" ? "<=" : ">=";
    return `(BufferValue(${hFast},1) ${op} BufferValue(${hSlow},1) && BufferValue(${hFast},2) ${opPrev} BufferValue(${hSlow},2))`;
  };

  return {
    inputs: [
      { name: fast, type: "int", defaultExpr: String(p.fastPeriod), label: "Fast SMA period" },
      { name: slow, type: "int", defaultExpr: String(p.slowPeriod), label: "Slow SMA period" },
    ],
    indicators: [
      { handleVar: hFast, init: `${hFast} = iMA(_Symbol, _Period, ${fast}, 0, MODE_SMA, PRICE_CLOSE);`, release: `if(${hFast} != INVALID_HANDLE) IndicatorRelease(${hFast});` },
      { handleVar: hSlow, init: `${hSlow} = iMA(_Symbol, _Period, ${slow}, 0, MODE_SMA, PRICE_CLOSE);`, release: `if(${hSlow} != INVALID_HANDLE) IndicatorRelease(${hSlow});` },
    ],
    entryConditions:
      direction === "both"
        ? [
            { direction: "long", expr: cross("long") },
            { direction: "short", expr: cross("short") },
          ]
        : [{ direction, expr: cross(direction) }],
    summaryFragments: [`SMA(${p.fastPeriod}) vs SMA(${p.slowPeriod}) cross${direction === "both" ? "" : ` (${direction} only)`}`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
