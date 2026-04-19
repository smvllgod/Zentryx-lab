import type { Translator } from "../types";

// Price vs MA — long-OK only when price > MA, short-OK when price < MA.
// Supports EMA / SMA / WMA via `maType` param.

const MA_MODE: Record<string, string> = {
  ema: "MODE_EMA",
  sma: "MODE_SMA",
  wma: "MODE_LWMA",
};

export const translate_confirm_priceAboveMa: Translator = (node) => {
  const p = node.params as { maType: string; period: number };
  const pIn = `InpPvMaP_${sid(node.id)}`;
  const h = `hPvMa_${sid(node.id)}`;
  const mode = MA_MODE[p.maType ?? "ema"] ?? "MODE_EMA";

  return {
    inputs: [
      { name: pIn, type: "int", defaultExpr: String(p.period ?? 50), label: "MA period" },
    ],
    indicators: [
      {
        handleVar: h,
        init: `${h} = iMA(_Symbol, _Period, ${pIn}, 0, ${mode}, PRICE_CLOSE);`,
        release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});`,
      },
    ],
    entryConditions: [
      { direction: "long", expr: `(iClose(_Symbol, _Period, 1) > BufferValue(${h},1))` },
      { direction: "short", expr: `(iClose(_Symbol, _Period, 1) < BufferValue(${h},1))` },
    ],
    summaryFragments: [`Price vs ${(p.maType ?? "ema").toUpperCase()}(${p.period})`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
