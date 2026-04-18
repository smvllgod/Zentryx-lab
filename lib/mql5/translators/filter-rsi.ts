import type { Translator } from "../types";

export const translate_filter_rsi: Translator = (node) => {
  const p = node.params as { period: number; longBelow: number; shortAbove: number };
  const period = `InpRsiPeriod_${shortId(node.id)}`;
  const longBelow = `InpRsiLongBelow_${shortId(node.id)}`;
  const shortAbove = `InpRsiShortAbove_${shortId(node.id)}`;
  const handle = `hRsi_${shortId(node.id)}`;

  return {
    inputs: [
      { name: period, type: "int", defaultExpr: String(p.period), label: "RSI period" },
      { name: longBelow, type: "double", defaultExpr: String(p.longBelow), label: "RSI: longs only when below" },
      { name: shortAbove, type: "double", defaultExpr: String(p.shortAbove), label: "RSI: shorts only when above" },
    ],
    indicators: [
      {
        handleVar: handle,
        init: `${handle} = iRSI(_Symbol, _Period, ${period}, PRICE_CLOSE);`,
        release: `if(${handle} != INVALID_HANDLE) IndicatorRelease(${handle});`,
      },
    ],
    entryConditions: [
      { direction: "long", expr: `(BufferValue(${handle},1) < ${longBelow})` },
      { direction: "short", expr: `(BufferValue(${handle},1) > ${shortAbove})` },
    ],
    summaryFragments: [`RSI(${p.period}) within band`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
