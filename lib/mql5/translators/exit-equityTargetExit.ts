import type { Translator } from "../types";

// Daily equity target — once today's gain ≥ target %, flatten all positions
// and block new entries for the rest of the day.

export const translate_exit_equityTargetExit: Translator = (node) => {
  const p = node.params as { targetPercent: number };
  const tIn = `InpEqTgt_${sid(node.id)}`;

  return {
    inputs: [
      { name: tIn, type: "double", defaultExpr: String(p.targetPercent ?? 1), label: "Daily target (%)" },
    ],
    globals: [
      `// Daily equity target bookkeeping (${node.id})
double   _zxDayStartEquity_${sid(node.id)} = 0.0;
datetime _zxDayStamp_${sid(node.id)}       = 0;
bool     _zxDayTargetHit_${sid(node.id)}   = false;`,
    ],
    helpers: [
      `void ZxRollDay_${sid(node.id)}()
{
   MqlDateTime t; TimeToStruct(TimeTradeServer(), t);
   datetime today = StructToTime(t) - t.hour*3600 - t.min*60 - t.sec;
   if(today != _zxDayStamp_${sid(node.id)})
   {
      _zxDayStamp_${sid(node.id)} = today;
      _zxDayStartEquity_${sid(node.id)} = AccountInfoDouble(ACCOUNT_EQUITY);
      _zxDayTargetHit_${sid(node.id)} = false;
   }
}`,
    ],
    gates: [
      { expr: `(!_zxDayTargetHit_${sid(node.id)})`, reason: "daily equity target reached" },
    ],
    positionManagement: [
      `// Daily equity target (${node.id})
{
   ZxRollDay_${sid(node.id)}();
   double startEq = _zxDayStartEquity_${sid(node.id)};
   if(startEq > 0 && !_zxDayTargetHit_${sid(node.id)})
   {
      double eq = AccountInfoDouble(ACCOUNT_EQUITY);
      double pct = (eq / startEq - 1.0) * 100.0;
      if(pct >= ${tIn})
      {
         _zxDayTargetHit_${sid(node.id)} = true;
         for(int i=PositionsTotal()-1; i>=0; i--) {
            ulong ticket = PositionGetTicket(i);
            if(!PositionSelectByTicket(ticket)) continue;
            if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
            Trade.PositionClose(ticket);
         }
      }
   }
}`,
    ],
    summaryFragments: [`daily equity target +${p.targetPercent}%`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
