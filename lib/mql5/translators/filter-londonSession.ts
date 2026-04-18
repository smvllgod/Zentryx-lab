import type { Translator } from "../types";

export const translate_filter_londonSession: Translator = (node) => {
  const p = node.params as { utcOffset: number };
  const offset = `InpLonOff_${shortId(node.id)}`;

  // London 07:00–16:00 UTC → shift by server offset
  return {
    inputs: [
      { name: offset, type: "int", defaultExpr: String(p.utcOffset), label: "Server UTC offset (hours)" },
    ],
    gates: [{
      expr: `(TimeHour(TimeTradeServer()) >= (7 + ${offset} + 24) % 24 && TimeHour(TimeTradeServer()) < (16 + ${offset} + 24) % 24)`,
      reason: "outside London session",
    }],
    summaryFragments: [`London session only (UTC offset ${p.utcOffset}h)`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
