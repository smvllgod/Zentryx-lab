import type { Translator } from "../types";

export const translate_entry_emaCross: Translator = (node) => {
  const p = node.params as { fastPeriod: number; slowPeriod: number; direction: string };
  const fast = `InpFast_${shortId(node.id)}`;
  const slow = `InpSlow_${shortId(node.id)}`;
  const hFast = `hFast_${shortId(node.id)}`;
  const hSlow = `hSlow_${shortId(node.id)}`;

  const direction = p.direction === "long" ? "long" : p.direction === "short" ? "short" : "both";
  const cross = (dir: "long" | "short") => {
    const op = dir === "long" ? ">" : "<";
    const opPrev = dir === "long" ? "<=" : ">=";
    return `(BufferValue(${hFast},1) ${op} BufferValue(${hSlow},1) && BufferValue(${hFast},2) ${opPrev} BufferValue(${hSlow},2))`;
  };

  return {
    inputs: [
      { name: fast, type: "int", defaultExpr: String(p.fastPeriod), label: "Fast EMA period" },
      { name: slow, type: "int", defaultExpr: String(p.slowPeriod), label: "Slow EMA period" },
    ],
    indicators: [
      {
        handleVar: hFast,
        init: `${hFast} = iMA(_Symbol, _Period, ${fast}, 0, MODE_EMA, PRICE_CLOSE);`,
        release: `if(${hFast} != INVALID_HANDLE) IndicatorRelease(${hFast});`,
      },
      {
        handleVar: hSlow,
        init: `${hSlow} = iMA(_Symbol, _Period, ${slow}, 0, MODE_EMA, PRICE_CLOSE);`,
        release: `if(${hSlow} != INVALID_HANDLE) IndicatorRelease(${hSlow});`,
      },
    ],
    entryConditions: direction === "both"
      ? [
          { direction: "long", expr: cross("long") },
          { direction: "short", expr: cross("short") },
        ]
      : [{ direction, expr: cross(direction) }],
    summaryFragments: [
      `EMA(${p.fastPeriod}) vs EMA(${p.slowPeriod}) cross${direction === "both" ? "" : ` (${direction} only)`}`,
    ],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
