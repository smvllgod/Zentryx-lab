import type { Translator } from "../types";

// Asia session — 23:00–08:00 UTC. Wraps midnight, so the test is OR-shaped.

export const translate_session_asia: Translator = (node) => {
  const p = node.params as { utcOffset: number };
  const off = `InpAsiaOff_${sid(node.id)}`;

  // 23:00 + off → startH; 08:00 + off → endH
  // Since start > end we test: hour >= startH || hour < endH.
  return {
    inputs: [
      { name: off, type: "int", defaultExpr: String(p.utcOffset ?? 0), label: "Server UTC offset (hours)" },
    ],
    gates: [
      {
        expr: `(ZxHour() >= (23 + ${off} + 24) % 24 || ZxHour() < (8 + ${off} + 24) % 24)`,
        reason: "outside Asia session",
      },
    ],
    summaryFragments: [`Asia session (UTC offset ${p.utcOffset ?? 0}h)`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
