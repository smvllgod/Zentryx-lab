import type { Translator } from "../types";

export const translate_filter_session: Translator = (node) => {
  const p = node.params as { startHour: number; endHour: number };
  const startVar = `InpSessionStart_${shortId(node.id)}`;
  const endVar = `InpSessionEnd_${shortId(node.id)}`;

  // Window helper allows wrap-around (start > end == overnight session).
  const expr = `ZxInSession(${startVar}, ${endVar})`;

  return {
    inputs: [
      { name: startVar, type: "int", defaultExpr: String(p.startHour), label: "Session start hour" },
      { name: endVar, type: "int", defaultExpr: String(p.endHour), label: "Session end hour" },
    ],
    helpers: [
      `// Returns true when the current server hour is inside [start,end). Supports wrap-around.
bool ZxInSession(int startHour, int endHour)
{
   MqlDateTime t; TimeToStruct(TimeCurrent(), t);
   if(startHour == endHour) return false;
   if(startHour < endHour) return (t.hour >= startHour && t.hour < endHour);
   return (t.hour >= startHour || t.hour < endHour);
}`,
    ],
    gates: [
      { expr, reason: "outside trading session" },
    ],
    summaryFragments: [`session ${p.startHour}:00–${p.endHour}:00`],
  };
};

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
}
