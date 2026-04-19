// Batch 2 — session family (5 blocks).

import type { Translator } from "../types";

const sid = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);

// ── session.customWindow (start/end hour gate, already in filter.session but
// we expose it under its canvas id too)
export const translate_session_customWindow: Translator = (node) => {
  const p = node.params as { startHour: number; endHour: number };
  const sIn = `InpCwStart_${sid(node.id)}`;
  const eIn = `InpCwEnd_${sid(node.id)}`;
  return {
    inputs: [
      { name: sIn, type: "int", defaultExpr: String(p.startHour ?? 8), label: "Start hour (server)" },
      { name: eIn, type: "int", defaultExpr: String(p.endHour ?? 20), label: "End hour (server)" },
    ],
    helpers: [
      `bool CustomWindowOk_${sid(node.id)}(int s, int e)
{
   MqlDateTime t; TimeToStruct(TimeTradeServer(), t);
   if(s == e) return false;
   if(s < e) return (t.hour >= s && t.hour < e);
   return (t.hour >= s || t.hour < e);
}`,
    ],
    gates: [{ expr: `CustomWindowOk_${sid(node.id)}(${sIn}, ${eIn})`, reason: "outside trading window" }],
    summaryFragments: [`${p.startHour}:00–${p.endHour}:00 (server)`],
  };
};

// ── session.london (already in filter.londonSession but with canvas id)
export const translate_session_london: Translator = (node) => {
  const p = node.params as { utcOffset: number };
  const off = `InpLndOff_${sid(node.id)}`;
  return {
    inputs: [{ name: off, type: "int", defaultExpr: String(p.utcOffset ?? 0), label: "Server UTC offset (h)" }],
    gates: [{
      expr: `(TimeHour(TimeTradeServer()) >= (7 + ${off} + 24) % 24 && TimeHour(TimeTradeServer()) < (16 + ${off} + 24) % 24)`,
      reason: "outside London session",
    }],
    summaryFragments: [`London session (UTC offset ${p.utcOffset ?? 0}h)`],
  };
};

// ── session.overlap (London / NY overlap — 12:00–16:00 UTC)
export const translate_session_overlap: Translator = (node) => {
  const p = node.params as { utcOffset: number };
  const off = `InpOvpOff_${sid(node.id)}`;
  return {
    inputs: [{ name: off, type: "int", defaultExpr: String(p.utcOffset ?? 0), label: "Server UTC offset (h)" }],
    gates: [{
      expr: `(TimeHour(TimeTradeServer()) >= (12 + ${off} + 24) % 24 && TimeHour(TimeTradeServer()) < (16 + ${off} + 24) % 24)`,
      reason: "outside LON/NY overlap",
    }],
    summaryFragments: [`London/NY overlap (UTC offset ${p.utcOffset ?? 0}h)`],
  };
};

// ── session.monthOfYear (bitmask over months)
export const translate_session_monthOfYear: Translator = (node) => {
  const p = node.params as { months: number[] };
  const list = (p.months ?? [1,2,3,4,5,6,7,8,9,10,11,12]);
  const mask = list.reduce((m, n) => m | (1 << n), 0);
  const mIn = `InpMoyMask_${sid(node.id)}`;
  return {
    inputs: [{ name: mIn, type: "int", defaultExpr: String(mask), label: "Allowed months (bit-mask: bit 1=Jan..12=Dec)" }],
    helpers: [
      `bool MonthMaskActive_${sid(node.id)}(int mask)
{
   MqlDateTime t; TimeToStruct(TimeTradeServer(), t);
   return ((mask & (1 << t.mon)) != 0);
}`,
    ],
    gates: [{ expr: `MonthMaskActive_${sid(node.id)}(${mIn})`, reason: "month not allowed" }],
    summaryFragments: [`Active months (mask ${mask})`],
  };
};

// ── session.holidayCalendar (CSV of "MM-DD" dates)
// Users enter a comma-separated list of MM-DD; block entries on those days.
export const translate_session_holidayCalendar: Translator = (node) => {
  const hIn = `InpHolDays_${sid(node.id)}`;
  return {
    inputs: [{ name: hIn, type: "string", defaultExpr: `""`, label: `Blocked days (CSV "MM-DD,MM-DD")` }],
    helpers: [
      `bool HolidayOk_${sid(node.id)}(string csv)
{
   if(StringLen(csv) == 0) return true;
   MqlDateTime t; TimeToStruct(TimeTradeServer(), t);
   string today = StringFormat("%02d-%02d", t.mon, t.day);
   string parts[]; int n = StringSplit(csv, ',', parts);
   for(int i=0;i<n;i++) {
      string p = parts[i]; StringTrimLeft(p); StringTrimRight(p);
      if(p == today) return false;
   }
   return true;
}`,
    ],
    gates: [{ expr: `HolidayOk_${sid(node.id)}(${hIn})`, reason: "holiday blocked" }],
    summaryFragments: [`Holiday calendar (CSV)`],
  };
};
