import type { Translator } from "../types";

// Daily bias — long-OK when today's open-to-current is positive (close > open),
// short-OK when negative. Reads PERIOD_D1 shift 0 (current day).

export const translate_mtf_dailyBias: Translator = () => {
  return {
    entryConditions: [
      { direction: "long", expr: `(iClose(_Symbol, PERIOD_D1, 0) >= iOpen(_Symbol, PERIOD_D1, 0))` },
      { direction: "short", expr: `(iClose(_Symbol, PERIOD_D1, 0) <= iOpen(_Symbol, PERIOD_D1, 0))` },
    ],
    summaryFragments: [`Daily bias (D1 open vs close)`],
  };
};
