import type { Translator } from "../types";

// Spread / ATR ratio gate. Blocks entries when current spread > k × ATR.
// Spread is read in points; ATR is read in price terms and converted to points.

export const translate_exec_spreadRatio: Translator = (node) => {
  const p = node.params as { atrPeriod: number; maxRatio: number };
  const aIn = `InpSprRatA_${sid(node.id)}`;
  const rIn = `InpSprRatR_${sid(node.id)}`;
  const h = `hSprRatAtr_${sid(node.id)}`;

  return {
    inputs: [
      { name: aIn, type: "int", defaultExpr: String(p.atrPeriod ?? 14), label: "ATR period (spread gate)" },
      { name: rIn, type: "double", defaultExpr: String(p.maxRatio ?? 0.15), label: "Max spread / ATR" },
    ],
    indicators: [
      { handleVar: h, init: `${h} = iATR(_Symbol, _Period, ${aIn});`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` },
    ],
    helpers: [
      `double SpreadOverAtr(int handle)
{
   if(handle == INVALID_HANDLE) return 0.0;
   double atr = BufferValue(handle, 1);
   if(atr <= 0) return 1.0; // fail-open (block trading) if ATR not ready
   double point  = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   double spread = (double)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) * point;
   return spread / atr;
}`,
    ],
    gates: [
      { expr: `(SpreadOverAtr(${h}) <= ${rIn})`, reason: "spread too wide vs ATR" },
    ],
    summaryFragments: [`spread / ATR(${p.atrPeriod}) ≤ ${p.maxRatio}`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
