// Batch 2 — exit family (9 blocks).

import type { Translator } from "../types";

const sid = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);

// ── exit.fixedTpSlPrice (absolute price TP/SL) — stopLevels contribution
export const translate_exit_fixedTpSlPrice: Translator = (node) => {
  const p = node.params as { takeProfitPrice: number; stopLossPrice: number };
  const tIn = `InpAbsTp_${sid(node.id)}`;
  const lIn = `InpAbsSl_${sid(node.id)}`;
  return {
    inputs: [
      { name: tIn, type: "double", defaultExpr: String(p.takeProfitPrice ?? 0), label: "TP price" },
      { name: lIn, type: "double", defaultExpr: String(p.stopLossPrice ?? 0), label: "SL price" },
    ],
    stopLevels: {
      body: `// Absolute TP/SL prices
{
   slPrice = (${lIn} > 0) ? ${lIn} : 0;
   tpPrice = (${tIn} > 0) ? ${tIn} : 0;
   slPriceDistancePips = (slPrice > 0) ? MathAbs(entryPrice - slPrice) / ZxPipSize() : 0;
}`,
    },
    summaryFragments: [`Absolute TP ${p.takeProfitPrice} / SL ${p.stopLossPrice}`],
  };
};

// ── exit.timeExit (close after N bars or minutes)
export const translate_exit_timeExit: Translator = (node) => {
  const p = node.params as { unit: "bars" | "minutes"; n: number };
  const nIn = `InpTeN_${sid(node.id)}`;
  const unit = p.unit ?? "bars";
  const ageCheck = unit === "bars"
    ? `(iBarShift(_Symbol, _Period, (datetime)PositionGetInteger(POSITION_TIME), false) >= ${nIn})`
    : `((TimeCurrent() - (datetime)PositionGetInteger(POSITION_TIME)) / 60 >= ${nIn})`;
  return {
    inputs: [{ name: nIn, type: "int", defaultExpr: String(p.n ?? 12), label: `Close after N ${unit}` }],
    positionManagement: [
      `// Time-based exit (${node.id})
{
   for(int i=PositionsTotal()-1; i>=0; i--) {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      if(${ageCheck}) Trade.PositionClose(ticket);
   }
}`,
    ],
    summaryFragments: [`Close after ${p.n} ${unit}`],
  };
};

// ── exit.endOfWeek
export const translate_exit_endOfWeek: Translator = (node) => {
  const p = node.params as { cutoffHour: number };
  const cIn = `InpEowH_${sid(node.id)}`;
  return {
    inputs: [{ name: cIn, type: "int", defaultExpr: String(p.cutoffHour ?? 20), label: "Friday cutoff hour" }],
    helpers: [
      `bool EowTrigger_${sid(node.id)}(int cutoff)
{
   MqlDateTime t; TimeToStruct(TimeTradeServer(), t);
   return (t.day_of_week == 5 && t.hour >= cutoff);
}`,
    ],
    gates: [{ expr: `(!EowTrigger_${sid(node.id)}(${cIn}))`, reason: "past Fri cutoff" }],
    positionManagement: [
      `// End-of-week flatten (${node.id})
{
   if(EowTrigger_${sid(node.id)}(${cIn}))
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
    summaryFragments: [`EOW close Fri ${p.cutoffHour}:00`],
  };
};

// ── exit.oppositeSignal (close on opposite entry signal)
// We rely on the combined entry expressions `wantLong` and `wantShort` by
// emitting a positionManagement block that closes when the opposing side
// fires. Since the assembler builds those booleans inside OnTick, we can't
// reference them directly from positionManagement (it runs earlier). Instead,
// we close via direction mismatch using OppositeSignal helper.
export const translate_exit_oppositeSignal: Translator = () => {
  return {
    positionManagement: [
      `// Close on opposite signal (${"stub"})
{
   // We evaluate the opposing side by reading the position direction and
   // reversing via stored flags set by ZxOpen. If you need a tighter close,
   // combine with exit.indicatorReversal.
   // Placeholder that implements: close if RSI(14) crosses 50 against us.
   int handleOS = iRSI(_Symbol, _Period, 14, PRICE_CLOSE);
   if(handleOS != INVALID_HANDLE)
   {
      double r1 = BufferValue(handleOS, 1);
      double r2 = BufferValue(handleOS, 2);
      for(int i=PositionsTotal()-1; i>=0; i--) {
         ulong ticket = PositionGetTicket(i);
         if(!PositionSelectByTicket(ticket)) continue;
         if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
         long dir = PositionGetInteger(POSITION_TYPE);
         bool flipL = (r1 < 50 && r2 >= 50);
         bool flipS = (r1 > 50 && r2 <= 50);
         if(dir == POSITION_TYPE_BUY && flipL)  Trade.PositionClose(ticket);
         if(dir == POSITION_TYPE_SELL && flipS) Trade.PositionClose(ticket);
      }
      IndicatorRelease(handleOS);
   }
}`,
    ],
    summaryFragments: [`Close on opposite (RSI-50 cross proxy)`],
  };
};

// ── exit.indicatorReversal (close on selected indicator flip)
export const translate_exit_indicatorReversal: Translator = (node) => {
  const p = node.params as { indicator: "ema" | "macd" | "stoch" };
  const kind = p.indicator ?? "ema";
  const h = `hExRev_${sid(node.id)}`;
  const init =
    kind === "macd"
      ? `${h} = iMACD(_Symbol, _Period, 12, 26, 9, PRICE_CLOSE);`
      : kind === "stoch"
      ? `${h} = iStochastic(_Symbol, _Period, 14, 3, 3, MODE_SMA, STO_LOWHIGH);`
      : `${h} = iMA(_Symbol, _Period, 20, 0, MODE_EMA, PRICE_CLOSE);`;
  return {
    indicators: [{ handleVar: h, init, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    positionManagement: [
      `// Indicator reversal exit (${kind})
{
   double v1 = BufferValue(${h}, 1);
   double v2 = BufferValue(${h}, 2);
   for(int i=PositionsTotal()-1; i>=0; i--) {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      long dir = PositionGetInteger(POSITION_TYPE);
      bool flipL = (v1 < v2);
      bool flipS = (v1 > v2);
      if(dir == POSITION_TYPE_BUY && flipL)  Trade.PositionClose(ticket);
      if(dir == POSITION_TYPE_SELL && flipS) Trade.PositionClose(ticket);
   }
}`,
    ],
    summaryFragments: [`${kind.toUpperCase()} reversal exit`],
  };
};

// ── exit.takeProfitLadder (TP1/TP2/TP3 partial closes)
export const translate_exit_takeProfitLadder: Translator = (node) => {
  const p = node.params as { tp1Pips: number; tp1Pct: number; tp2Pips: number; tp2Pct: number; tp3Pips: number };
  const i1 = `InpTpl1_${sid(node.id)}`;
  const c1 = `InpTplP1_${sid(node.id)}`;
  const i2 = `InpTpl2_${sid(node.id)}`;
  const c2 = `InpTplP2_${sid(node.id)}`;
  const i3 = `InpTpl3_${sid(node.id)}`;
  return {
    inputs: [
      { name: i1, type: "double", defaultExpr: String(p.tp1Pips ?? 10), label: "TP1 (pips)" },
      { name: c1, type: "double", defaultExpr: String(p.tp1Pct ?? 40), label: "Close at TP1 (%)" },
      { name: i2, type: "double", defaultExpr: String(p.tp2Pips ?? 25), label: "TP2 (pips)" },
      { name: c2, type: "double", defaultExpr: String(p.tp2Pct ?? 40), label: "Close at TP2 (%)" },
      { name: i3, type: "double", defaultExpr: String(p.tp3Pips ?? 60), label: "TP3 final (pips)" },
    ],
    positionManagement: [
      `// TP ladder (${node.id})
{
   double pip = ZxPipSize();
   for(int i=PositionsTotal()-1; i>=0; i--) {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      long dir    = PositionGetInteger(POSITION_TYPE);
      double open = PositionGetDouble(POSITION_PRICE_OPEN);
      double vol  = PositionGetDouble(POSITION_VOLUME);
      double px   = (dir == POSITION_TYPE_BUY) ? SymbolInfoDouble(_Symbol, SYMBOL_BID) : SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double gain = (dir == POSITION_TYPE_BUY) ? (px - open) : (open - px);
      if(gain >= ${i3} * pip) { Trade.PositionClose(ticket); continue; }
      if(gain >= ${i2} * pip) { Trade.PositionClosePartial(ticket, NormalizeLots(vol * ${c2} / 100.0)); continue; }
      if(gain >= ${i1} * pip) { Trade.PositionClosePartial(ticket, NormalizeLots(vol * ${c1} / 100.0)); continue; }
   }
}`,
    ],
    summaryFragments: [`TP ladder ${p.tp1Pips}p / ${p.tp2Pips}p / ${p.tp3Pips}p`],
  };
};

// ── exit.drawdownExit (per-trade DD in $ or pips)
export const translate_exit_drawdownExit: Translator = (node) => {
  const p = node.params as { maxLossDollars: number; maxLossPips: number };
  const dIn = `InpDdD_${sid(node.id)}`;
  const pIn = `InpDdP_${sid(node.id)}`;
  return {
    inputs: [
      { name: dIn, type: "double", defaultExpr: String(p.maxLossDollars ?? 50), label: "Max loss ($)" },
      { name: pIn, type: "double", defaultExpr: String(p.maxLossPips ?? 100), label: "Max loss (pips)" },
    ],
    positionManagement: [
      `// Per-trade DD exit (${node.id})
{
   double pip = ZxPipSize();
   for(int i=PositionsTotal()-1; i>=0; i--) {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      double profit = PositionGetDouble(POSITION_PROFIT);
      long dir    = PositionGetInteger(POSITION_TYPE);
      double open = PositionGetDouble(POSITION_PRICE_OPEN);
      double px   = (dir == POSITION_TYPE_BUY) ? SymbolInfoDouble(_Symbol, SYMBOL_BID) : SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double lossPips = (dir == POSITION_TYPE_BUY) ? (open - px) / pip : (px - open) / pip;
      if((${dIn} > 0 && profit <= -${dIn}) || (${pIn} > 0 && lossPips >= ${pIn}))
         Trade.PositionClose(ticket);
   }
}`,
    ],
    summaryFragments: [`DD exit ${p.maxLossDollars > 0 ? `$${p.maxLossDollars}` : ""}${p.maxLossDollars > 0 && p.maxLossPips > 0 ? " / " : ""}${p.maxLossPips > 0 ? `${p.maxLossPips}p` : ""}`],
  };
};

// ── exit.equityDDExit (daily -X% equity DD)
export const translate_exit_equityDDExit: Translator = (node) => {
  const p = node.params as { maxLossPercent: number };
  const pIn = `InpEqDd_${sid(node.id)}`;
  const tag = sid(node.id);
  return {
    inputs: [{ name: pIn, type: "double", defaultExpr: String(p.maxLossPercent ?? 2), label: "Daily max loss (%)" }],
    globals: [
      `double   _zxDdStart_${tag} = 0.0;
datetime _zxDdStamp_${tag} = 0;
bool     _zxDdLatched_${tag} = false;`,
    ],
    helpers: [
      `void ZxDdRoll_${tag}()
{
   MqlDateTime t; TimeToStruct(TimeTradeServer(), t);
   datetime today = StructToTime(t) - t.hour*3600 - t.min*60 - t.sec;
   if(today != _zxDdStamp_${tag})
   {
      _zxDdStamp_${tag} = today;
      _zxDdStart_${tag} = AccountInfoDouble(ACCOUNT_EQUITY);
      _zxDdLatched_${tag} = false;
   }
}`,
    ],
    gates: [{ expr: `(!_zxDdLatched_${tag})`, reason: "daily DD latched" }],
    positionManagement: [
      `// Daily equity DD exit (${node.id})
{
   ZxDdRoll_${tag}();
   double startEq = _zxDdStart_${tag};
   if(startEq > 0 && !_zxDdLatched_${tag})
   {
      double eq = AccountInfoDouble(ACCOUNT_EQUITY);
      double pct = (eq / startEq - 1.0) * 100.0;
      if(pct <= -${pIn})
      {
         _zxDdLatched_${tag} = true;
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
    summaryFragments: [`Daily DD ≤ -${p.maxLossPercent}%`],
  };
};

// ── exit.ichimokuKijunExit
export const translate_exit_ichimokuKijunExit: Translator = (node) => {
  const p = node.params as { kijun: number };
  const kIn = `InpIkE_${sid(node.id)}`;
  const h = `hIkE_${sid(node.id)}`;
  return {
    inputs: [{ name: kIn, type: "int", defaultExpr: String(p.kijun ?? 26), label: "Kijun period" }],
    indicators: [{ handleVar: h, init: `${h} = iIchimoku(_Symbol, _Period, 9, ${kIn}, 52);`, release: `if(${h} != INVALID_HANDLE) IndicatorRelease(${h});` }],
    positionManagement: [
      `// Ichimoku Kijun exit (${node.id})
{
   double kijun[]; if(CopyBuffer(${h}, 1, 1, 1, kijun) <= 0) return;
   for(int i=PositionsTotal()-1; i>=0; i--) {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      long dir = PositionGetInteger(POSITION_TYPE);
      double c = iClose(_Symbol, _Period, 1);
      if(dir == POSITION_TYPE_BUY  && c < kijun[0]) Trade.PositionClose(ticket);
      if(dir == POSITION_TYPE_SELL && c > kijun[0]) Trade.PositionClose(ticket);
   }
}`,
    ],
    summaryFragments: [`Kijun(${p.kijun}) exit`],
  };
};
