import type { Translator } from "../types";

export const translate_entry_donchianBreakout: Translator = (node) => {
  const p = node.params as { period: number; direction: string };
  const period = `InpDon_${shortId(node.id)}`;
  const direction = p.direction === "long" ? "long" : p.direction === "short" ? "short" : "both";

  const longExpr = `(iClose(_Symbol,_Period,1) > iHigh(_Symbol,_Period,iHighest(_Symbol,_Period,MODE_HIGH,${period},2)))`;
  const shortExpr = `(iClose(_Symbol,_Period,1) < iLow(_Symbol,_Period,iLowest(_Symbol,_Period,MODE_LOW,${period},2)))`;

  return {
    inputs: [
      { name: period, type: "int", defaultExpr: String(p.period), label: "Donchian period" },
    ],
    entryConditions:
      direction === "both"
        ? [
            { direction: "long", expr: longExpr },
            { direction: "short", expr: shortExpr },
          ]
        : [{ direction, expr: direction === "long" ? longExpr : shortExpr }],
    summaryFragments: [`Donchian(${p.period}) breakout`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
