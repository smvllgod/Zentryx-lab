import type { Translator } from "../types";

// Day-of-week whitelist — gate fires only on allowed weekdays.

const DAY_TO_INT: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

export const translate_session_dayOfWeek: Translator = (node) => {
  const p = node.params as { days: string[] };
  const ints = (p.days ?? ["mon", "tue", "wed", "thu", "fri"])
    .map((d) => DAY_TO_INT[d])
    .filter((n) => n !== undefined);
  const maskLiteral = ints.reduce((m, n) => m | (1 << n), 0);
  const mIn = `InpDowMask_${sid(node.id)}`;

  return {
    inputs: [
      { name: mIn, type: "int", defaultExpr: String(maskLiteral), label: "Allowed weekdays (bit-mask: bit 0=Sun, 5=Fri)" },
    ],
    helpers: [
      `bool ZxDowMaskActive(int mask)
{
   MqlDateTime t; TimeToStruct(TimeTradeServer(), t);
   return ((mask & (1 << t.day_of_week)) != 0);
}`,
    ],
    gates: [
      { expr: `ZxDowMaskActive(${mIn})`, reason: "weekday not whitelisted" },
    ],
    summaryFragments: [`Active on ${(p.days ?? []).join(", ")}`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
