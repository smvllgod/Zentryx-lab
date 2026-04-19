import type { Translator } from "../types";

// Parabolic SAR side — longs only when SAR is below price, shorts when above.
// Uses bar-1 (closed bar) for stability.

export const translate_trend_parabolicSar: Translator = (node) => {
  const p = node.params as { step: number; maxStep: number };
  const sIn = `InpSarStep_${sid(node.id)}`;
  const mIn = `InpSarMax_${sid(node.id)}`;
  const h = `hSar_${sid(node.id)}`;

  return {
    inputs: [
      { name: sIn, type: "double", defaultExpr: String(p.step ?? 0.02), label: "SAR step" },
      { name: mIn, type: "double", defaultExpr: String(p.maxStep ?? 0.2), label: "SAR max step" },
    ],
    indicators: [
      { handleVar: h, init: `${h} = iSAR(_Symbol, _Period, ${sIn}, ${mIn});`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` },
    ],
    entryConditions: [
      { direction: "long", expr: `(BufferValue(${h},1) < iClose(_Symbol, _Period, 1))` },
      { direction: "short", expr: `(BufferValue(${h},1) > iClose(_Symbol, _Period, 1))` },
    ],
    summaryFragments: [`Parabolic SAR(${p.step}, ${p.maxStep}) side`],
  };
};

function sid(id: string) { return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6); }
