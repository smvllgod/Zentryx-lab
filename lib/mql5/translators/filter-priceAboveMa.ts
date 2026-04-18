import type { Translator } from "../types";

export const translate_filter_priceAboveMa: Translator = (node) => {
  const p = node.params as { maType: "ema" | "sma" | "wma"; period: number };
  const mode = p.maType === "sma" ? "MODE_SMA" : p.maType === "wma" ? "MODE_LWMA" : "MODE_EMA";
  const period = `InpConfP_${shortId(node.id)}`;
  const h = `hConfMa_${shortId(node.id)}`;

  return {
    inputs: [
      { name: period, type: "int", defaultExpr: String(p.period), label: `${p.maType.toUpperCase()} period` },
    ],
    indicators: [
      { handleVar: h, init: `${h} = iMA(_Symbol, _Period, ${period}, 0, ${mode}, PRICE_CLOSE);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` },
    ],
    entryConditions: [
      { direction: "long", expr: `(iClose(_Symbol,_Period,1) > BufferValue(${h},1))` },
      { direction: "short", expr: `(iClose(_Symbol,_Period,1) < BufferValue(${h},1))` },
    ],
    summaryFragments: [`Price vs ${p.maType.toUpperCase()}(${p.period})`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
