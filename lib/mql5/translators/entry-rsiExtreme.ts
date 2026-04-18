import type { Translator } from "../types";

export const translate_entry_rsiExtreme: Translator = (node) => {
  const p = node.params as { period: number; overbought: number; oversold: number; onReentry?: boolean; direction: string };
  const period = `InpRsiP_${shortId(node.id)}`;
  const ob = `InpRsiOB_${shortId(node.id)}`;
  const os = `InpRsiOS_${shortId(node.id)}`;
  const h = `hRsi_${shortId(node.id)}`;

  const longExpr = p.onReentry
    ? `(BufferValue(${h},1) > ${os} && BufferValue(${h},2) <= ${os})`
    : `(BufferValue(${h},1) < ${os})`;
  const shortExpr = p.onReentry
    ? `(BufferValue(${h},1) < ${ob} && BufferValue(${h},2) >= ${ob})`
    : `(BufferValue(${h},1) > ${ob})`;

  const direction = p.direction === "long" ? "long" : p.direction === "short" ? "short" : "both";

  return {
    inputs: [
      { name: period, type: "int", defaultExpr: String(p.period), label: "RSI period" },
      { name: ob, type: "double", defaultExpr: String(p.overbought), label: "Overbought level" },
      { name: os, type: "double", defaultExpr: String(p.oversold), label: "Oversold level" },
    ],
    indicators: [
      { handleVar: h, init: `${h} = iRSI(_Symbol, _Period, ${period}, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` },
    ],
    entryConditions:
      direction === "both"
        ? [
            { direction: "long", expr: longExpr },
            { direction: "short", expr: shortExpr },
          ]
        : [{ direction, expr: direction === "long" ? longExpr : shortExpr }],
    summaryFragments: [`RSI(${p.period}) extremes ${p.oversold}/${p.overbought}`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
