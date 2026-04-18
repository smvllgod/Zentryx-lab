import type { Translator } from "../types";

export const translate_filter_atr: Translator = (node) => {
  const p = node.params as { period: number; minAtrPips: number; maxAtrPips: number };
  const period = `InpAtrPeriod_${sid(node.id)}`;
  const minV = `InpAtrMin_${sid(node.id)}`;
  const maxV = `InpAtrMax_${sid(node.id)}`;
  const hA = `hAtr_${sid(node.id)}`;

  return {
    inputs: [
      { name: period, type: "int", defaultExpr: String(p.period), label: "ATR period" },
      { name: minV, type: "double", defaultExpr: String(p.minAtrPips), label: "Min ATR (pips)" },
      { name: maxV, type: "double", defaultExpr: String(p.maxAtrPips), label: "Max ATR (pips)" },
    ],
    indicators: [
      {
        handleVar: hA,
        init: `${hA} = iATR(_Symbol, _Period, ${period});`,
        release: `if(${hA} != INVALID_HANDLE) IndicatorRelease(${hA});`,
      },
    ],
    helpers: [
      `double AtrPips(int handle)
{
   if(handle == INVALID_HANDLE) return 0.0;
   double b[]; if(CopyBuffer(handle, 0, 1, 1, b) <= 0) return 0.0;
   return b[0] / ZxPipSize();
}`,
    ],
    gates: [
      { expr: `(AtrPips(${hA}) >= ${minV} && AtrPips(${hA}) <= ${maxV})`, reason: "ATR outside allowed band" },
    ],
    summaryFragments: [`ATR(${p.period}) ∈ [${p.minAtrPips}, ${p.maxAtrPips}] pips`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
