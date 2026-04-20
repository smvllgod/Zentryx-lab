import type { Translator } from "../types";

// New York session — 12:00–21:00 UTC, shifted by server offset.

export const translate_session_newYork: Translator = (node) => {
  const p = node.params as { utcOffset: number };
  const off = `InpNyOff_${sid(node.id)}`;

  return {
    inputs: [
      { name: off, type: "int", defaultExpr: String(p.utcOffset ?? 0), label: "Server UTC offset (hours)" },
    ],
    gates: [
      {
        expr: `(ZxHour() >= (12 + ${off} + 24) % 24 && ZxHour() < (21 + ${off} + 24) % 24)`,
        reason: "outside New York session",
      },
    ],
    summaryFragments: [`New York session (UTC offset ${p.utcOffset ?? 0}h)`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
