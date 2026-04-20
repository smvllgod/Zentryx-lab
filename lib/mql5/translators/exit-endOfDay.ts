import type { Translator } from "../types";

// Close any open position at or after cutoff hour — and block new entries.
// Contributes both a gate (no new trades after cutoff) and position-management
// code (flatten existing).

export const translate_exit_endOfDay: Translator = (node) => {
  const p = node.params as { cutoffHour: number };
  const cIn = `InpEodHour_${sid(node.id)}`;

  return {
    inputs: [
      { name: cIn, type: "int", defaultExpr: String(p.cutoffHour ?? 22), label: "EOD cutoff hour (server)" },
    ],
    gates: [
      { expr: `(ZxHour() < ${cIn})`, reason: "after EOD cutoff" },
    ],
    positionManagement: [
      `// End-of-day flatten (${node.id})
{
   if(ZxHour() >= ${cIn})
   {
      for(int i=PositionsTotal()-1; i>=0; i--) {
         ulong ticket = PositionGetTicket(i);
         if(!PositionSelectByTicket(ticket)) continue;
         if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
         Trade.PositionClose(ticket);
      }
   }
}`,
    ],
    summaryFragments: [`EOD close at ${p.cutoffHour}:00`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
