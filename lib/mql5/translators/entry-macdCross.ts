import type { Translator } from "../types";

export const translate_entry_macdCross: Translator = (node) => {
  const p = node.params as {
    fastPeriod: number; slowPeriod: number; signalPeriod: number; direction: string;
  };
  const fast = `InpMacdFast_${sid(node.id)}`;
  const slow = `InpMacdSlow_${sid(node.id)}`;
  const sig = `InpMacdSig_${sid(node.id)}`;
  const hMacd = `hMacd_${sid(node.id)}`;
  const dir = p.direction === "long" ? "long" : p.direction === "short" ? "short" : "both";

  // MACD main buffer is index 0, signal is 1.
  const crossUp = `(MacdBuf(${hMacd},0,1) > MacdBuf(${hMacd},1,1) && MacdBuf(${hMacd},0,2) <= MacdBuf(${hMacd},1,2))`;
  const crossDn = `(MacdBuf(${hMacd},0,1) < MacdBuf(${hMacd},1,1) && MacdBuf(${hMacd},0,2) >= MacdBuf(${hMacd},1,2))`;

  return {
    inputs: [
      { name: fast, type: "int", defaultExpr: String(p.fastPeriod), label: "MACD fast EMA" },
      { name: slow, type: "int", defaultExpr: String(p.slowPeriod), label: "MACD slow EMA" },
      { name: sig, type: "int", defaultExpr: String(p.signalPeriod), label: "MACD signal period" },
    ],
    indicators: [
      {
        handleVar: hMacd,
        init: `${hMacd} = iMACD(_Symbol, _Period, ${fast}, ${slow}, ${sig}, PRICE_CLOSE);`,
        release: `if(${hMacd} != INVALID_HANDLE) IndicatorRelease(${hMacd});`,
      },
    ],
    helpers: [
      `double MacdBuf(int handle, int buffer, int shift)
{
   if(handle == INVALID_HANDLE) return 0.0;
   double b[]; if(CopyBuffer(handle, buffer, shift, 1, b) <= 0) return 0.0;
   return b[0];
}`,
    ],
    entryConditions: dir === "both"
      ? [
          { direction: "long", expr: crossUp },
          { direction: "short", expr: crossDn },
        ]
      : [{ direction: dir, expr: dir === "long" ? crossUp : crossDn }],
    summaryFragments: [`MACD(${p.fastPeriod},${p.slowPeriod},${p.signalPeriod}) cross`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
