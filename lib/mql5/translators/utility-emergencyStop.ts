import type { Translator } from "../types";

// Emergency kill-switch. Two modes:
//  - drawdown: flatten once equity drops ≥ N% from peak seen during this run.
//  - floor:    flatten once equity drops below an absolute $ floor.
// Blocks new entries when latched.

export const translate_utility_emergencyStop: Translator = (node) => {
  const p = node.params as { mode: "drawdown" | "floor"; maxDrawdownPercent: number; equityFloor: number };
  const mode = p.mode ?? "drawdown";
  const ddIn = `InpEmgDd_${sid(node.id)}`;
  const floorIn = `InpEmgFloor_${sid(node.id)}`;
  const stamp = sid(node.id);

  const trigger = mode === "floor"
    ? `(AccountInfoDouble(ACCOUNT_EQUITY) <= ${floorIn})`
    : `(_zxEmgPeak_${stamp} > 0 && (AccountInfoDouble(ACCOUNT_EQUITY) / _zxEmgPeak_${stamp} - 1.0) * 100.0 <= -${ddIn})`;

  return {
    inputs: [
      { name: ddIn, type: "double", defaultExpr: String(p.maxDrawdownPercent ?? 10), label: "Max drawdown from peak (%)" },
      { name: floorIn, type: "double", defaultExpr: String(p.equityFloor ?? 0), label: "Equity floor ($)" },
    ],
    globals: [
      `// Emergency-stop bookkeeping (${node.id})
double _zxEmgPeak_${stamp} = 0.0;
bool   _zxEmgLatched_${stamp} = false;`,
    ],
    gates: [
      { expr: `(!_zxEmgLatched_${stamp})`, reason: "emergency kill-switch latched" },
    ],
    positionManagement: [
      `// Emergency stop (${node.id}) — mode: ${mode}
{
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   if(eq > _zxEmgPeak_${stamp}) _zxEmgPeak_${stamp} = eq;
   if(!_zxEmgLatched_${stamp} && ${trigger})
   {
      _zxEmgLatched_${stamp} = true;
      for(int i=PositionsTotal()-1; i>=0; i--) {
         ulong ticket = PositionGetTicket(i);
         if(!PositionSelectByTicket(ticket)) continue;
         if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
         Trade.PositionClose(ticket);
      }
      Print("Zentryx: emergency kill-switch latched (${mode}).");
   }
}`,
    ],
    summaryFragments: [
      mode === "floor"
        ? `emergency: equity floor $${p.equityFloor}`
        : `emergency: -${p.maxDrawdownPercent}% DD`,
    ],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
