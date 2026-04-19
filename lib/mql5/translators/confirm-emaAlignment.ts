import type { Translator } from "../types";

// 3-EMA alignment — long-OK when fast > mid > slow; short-OK when fast < mid < slow.
// Classic trend-stack filter.

export const translate_confirm_emaAlignment: Translator = (node) => {
  const p = node.params as { fastPeriod: number; midPeriod: number; slowPeriod: number };
  const fIn = `InpEmaAlignF_${sid(node.id)}`;
  const mIn = `InpEmaAlignM_${sid(node.id)}`;
  const sIn = `InpEmaAlignS_${sid(node.id)}`;
  const hF = `hEmaAlignF_${sid(node.id)}`;
  const hM = `hEmaAlignM_${sid(node.id)}`;
  const hS = `hEmaAlignS_${sid(node.id)}`;

  return {
    inputs: [
      { name: fIn, type: "int", defaultExpr: String(p.fastPeriod ?? 20), label: "Fast EMA" },
      { name: mIn, type: "int", defaultExpr: String(p.midPeriod ?? 50), label: "Mid EMA" },
      { name: sIn, type: "int", defaultExpr: String(p.slowPeriod ?? 200), label: "Slow EMA" },
    ],
    indicators: [
      { handleVar: hF, init: `${hF} = iMA(_Symbol, _Period, ${fIn}, 0, MODE_EMA, PRICE_CLOSE);`, release: `if(${hF} != INVALID_HANDLE) IndicatorRelease(${hF});` },
      { handleVar: hM, init: `${hM} = iMA(_Symbol, _Period, ${mIn}, 0, MODE_EMA, PRICE_CLOSE);`, release: `if(${hM} != INVALID_HANDLE) IndicatorRelease(${hM});` },
      { handleVar: hS, init: `${hS} = iMA(_Symbol, _Period, ${sIn}, 0, MODE_EMA, PRICE_CLOSE);`, release: `if(${hS} != INVALID_HANDLE) IndicatorRelease(${hS});` },
    ],
    entryConditions: [
      { direction: "long", expr: `(BufferValue(${hF},1) > BufferValue(${hM},1) && BufferValue(${hM},1) > BufferValue(${hS},1))` },
      { direction: "short", expr: `(BufferValue(${hF},1) < BufferValue(${hM},1) && BufferValue(${hM},1) < BufferValue(${hS},1))` },
    ],
    summaryFragments: [`EMA(${p.fastPeriod}/${p.midPeriod}/${p.slowPeriod}) aligned`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
