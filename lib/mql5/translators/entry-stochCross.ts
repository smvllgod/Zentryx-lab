import type { Translator } from "../types";

export const translate_entry_stochCross: Translator = (node) => {
  const p = node.params as {
    kPeriod: number; dPeriod: number; slowing: number;
    overbought: number; oversold: number; direction: string;
  };
  const k = `InpStochK_${sid(node.id)}`;
  const d = `InpStochD_${sid(node.id)}`;
  const s = `InpStochSlow_${sid(node.id)}`;
  const ob = `InpStochOB_${sid(node.id)}`;
  const os = `InpStochOS_${sid(node.id)}`;
  const hS = `hStoch_${sid(node.id)}`;
  const dir = p.direction === "long" ? "long" : p.direction === "short" ? "short" : "both";

  // Stochastic main = buffer 0, signal = buffer 1.
  // Long: %K crosses above %D while in oversold zone.
  const longExpr =
    `(StochBuf(${hS},0,1) > StochBuf(${hS},1,1) && StochBuf(${hS},0,2) <= StochBuf(${hS},1,2) && StochBuf(${hS},0,1) < ${os})`;
  // Short: %K crosses below %D while in overbought zone.
  const shortExpr =
    `(StochBuf(${hS},0,1) < StochBuf(${hS},1,1) && StochBuf(${hS},0,2) >= StochBuf(${hS},1,2) && StochBuf(${hS},0,1) > ${ob})`;

  return {
    inputs: [
      { name: k, type: "int", defaultExpr: String(p.kPeriod), label: "Stoch %K period" },
      { name: d, type: "int", defaultExpr: String(p.dPeriod), label: "Stoch %D period" },
      { name: s, type: "int", defaultExpr: String(p.slowing), label: "Stoch slowing" },
      { name: ob, type: "double", defaultExpr: String(p.overbought), label: "Overbought" },
      { name: os, type: "double", defaultExpr: String(p.oversold), label: "Oversold" },
    ],
    indicators: [
      {
        handleVar: hS,
        init: `${hS} = iStochastic(_Symbol, _Period, ${k}, ${d}, ${s}, MODE_SMA, STO_LOWHIGH);`,
        release: `if(${hS} != INVALID_HANDLE) IndicatorRelease(${hS});`,
      },
    ],
    helpers: [
      `double StochBuf(int handle, int buffer, int shift)
{
   if(handle == INVALID_HANDLE) return 0.0;
   double b[]; if(CopyBuffer(handle, buffer, shift, 1, b) <= 0) return 0.0;
   return b[0];
}`,
    ],
    entryConditions: dir === "both"
      ? [
          { direction: "long", expr: longExpr },
          { direction: "short", expr: shortExpr },
        ]
      : [{ direction: dir, expr: dir === "long" ? longExpr : shortExpr }],
    summaryFragments: [`Stochastic(${p.kPeriod},${p.dPeriod},${p.slowing}) cross`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
