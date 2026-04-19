import type { Translator } from "../types";

// Higher-TF RSI direction — RSI > 50 allows longs, < 50 allows shorts.

const TF_ENUM: Record<string, string> = {
  M1: "PERIOD_M1", M5: "PERIOD_M5", M15: "PERIOD_M15", M30: "PERIOD_M30",
  H1: "PERIOD_H1", H4: "PERIOD_H4", D1: "PERIOD_D1", W1: "PERIOD_W1", MN1: "PERIOD_MN1",
};

export const translate_mtf_higherTfRsi: Translator = (node) => {
  const p = node.params as { timeframe: string; period: number };
  const pIn = `InpHtfRsiP_${sid(node.id)}`;
  const h = `hHtfRsi_${sid(node.id)}`;
  const tf = TF_ENUM[p.timeframe ?? "H4"] ?? "PERIOD_H4";

  return {
    inputs: [
      { name: pIn, type: "int", defaultExpr: String(p.period ?? 14), label: "HTF RSI period" },
    ],
    indicators: [
      {
        handleVar: h,
        init: `${h} = iRSI(_Symbol, ${tf}, ${pIn}, PRICE_CLOSE);`,
        release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});`,
      },
    ],
    entryConditions: [
      { direction: "long", expr: `(BufferValue(${h},1) > 50)` },
      { direction: "short", expr: `(BufferValue(${h},1) < 50)` },
    ],
    summaryFragments: [`${p.timeframe ?? "H4"} RSI(${p.period}) vs 50`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
