import type { KpiModuleDefinition, KpiModuleId } from "./types";

// ────────────────────────────────────────────────────────────────────
// KPI module registry
// Each entry knows how to produce the MQL5 expression that evaluates
// to the value string the renderer prints. Requires/globals may add
// once-per-EA helpers (e.g. PnL calculators).
// ────────────────────────────────────────────────────────────────────

const DAILY_PNL_HELPER = `double ZxDailyPnl() {
  datetime startOfDay = iTime(_Symbol, PERIOD_D1, 0);
  double pnl = 0.0;
  HistorySelect(startOfDay, TimeCurrent());
  for(int i=HistoryDealsTotal()-1; i>=0; i--) {
    ulong t = HistoryDealGetTicket(i);
    if(t == 0) continue;
    if(HistoryDealGetInteger(t, DEAL_MAGIC) != InpMagic) continue;
    pnl += HistoryDealGetDouble(t, DEAL_PROFIT) + HistoryDealGetDouble(t, DEAL_SWAP) + HistoryDealGetDouble(t, DEAL_COMMISSION);
  }
  for(int i=PositionsTotal()-1; i>=0; i--) {
    if(!PositionSelectByTicket(PositionGetTicket(i))) continue;
    if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
    pnl += PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
  }
  return pnl;
}`;

const FLOATING_PNL_HELPER = `double ZxFloatingPnl() {
  double pnl = 0.0;
  for(int i=PositionsTotal()-1; i>=0; i--) {
    if(!PositionSelectByTicket(PositionGetTicket(i))) continue;
    if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
    pnl += PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
  }
  return pnl;
}`;

const OPEN_TRADES_HELPER = `int ZxOpenTrades() {
  int n = 0;
  for(int i=PositionsTotal()-1; i>=0; i--) {
    if(!PositionSelectByTicket(PositionGetTicket(i))) continue;
    if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
    n++;
  }
  return n;
}`;

const LAST_LOT_HELPER = `double ZxLastLot() {
  for(int i=PositionsTotal()-1; i>=0; i--) {
    if(!PositionSelectByTicket(PositionGetTicket(i))) continue;
    if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
    return PositionGetDouble(POSITION_VOLUME);
  }
  return 0.0;
}`;

export const KPI_MODULES: Record<KpiModuleId, KpiModuleDefinition> = {
  eaName: {
    id: "eaName",
    label: "EA",
    description: "The EA display name from branding.",
    mql5ValueExpr: `ZxBrandEaName`,   // global string constant emitted by the renderer
    valueKind: "text",
    priority: 100,
    defaultVisible: true,
    defaultCompact: true,
    columnWidth: "wide",
  },
  status: {
    id: "status",
    label: "Status",
    description: "Running / Paused / News-blocked / DD-locked.",
    mql5ValueExpr: `ZxStatus()`,
    mql5Requires: [
      `string ZxStatus() {
  if(!ZxAllowTrading) return "PAUSED";
  if(ZxDailyLocked)   return "DD-LOCKED";
  if(ZxNewsBlocked)   return "NEWS-BLK";
  return "RUNNING";
}`,
      `bool ZxAllowTrading = true;
bool ZxDailyLocked = false;
bool ZxNewsBlocked = false;`,
    ],
    valueKind: "status",
    priority: 95,
    defaultVisible: true,
    defaultCompact: true,
    columnWidth: "narrow",
  },
  symbol: {
    id: "symbol",
    label: "Symbol",
    description: "_Symbol.",
    mql5ValueExpr: `_Symbol`,
    valueKind: "text",
    priority: 90,
    defaultVisible: true,
    defaultCompact: true,
    columnWidth: "narrow",
  },
  timeframe: {
    id: "timeframe",
    label: "TF",
    description: "Chart period as string (M1, M5, H1, …).",
    mql5ValueExpr: `ZxTfString()`,
    mql5Requires: [
      `string ZxTfString() {
  switch(_Period) {
    case PERIOD_M1:  return "M1";
    case PERIOD_M5:  return "M5";
    case PERIOD_M15: return "M15";
    case PERIOD_M30: return "M30";
    case PERIOD_H1:  return "H1";
    case PERIOD_H4:  return "H4";
    case PERIOD_D1:  return "D1";
    case PERIOD_W1:  return "W1";
    case PERIOD_MN1: return "MN";
  }
  return EnumToString(_Period);
}`,
    ],
    valueKind: "text",
    priority: 85,
    defaultVisible: true,
    defaultCompact: true,
    columnWidth: "narrow",
  },
  accountNumber: {
    id: "accountNumber",
    label: "Account",
    description: "MT5 login number.",
    mql5ValueExpr: `IntegerToString((long)AccountInfoInteger(ACCOUNT_LOGIN))`,
    valueKind: "text",
    priority: 60,
    defaultVisible: false,
    defaultCompact: false,
    columnWidth: "narrow",
  },
  broker: {
    id: "broker",
    label: "Broker",
    description: "Broker company and server.",
    mql5ValueExpr: `AccountInfoString(ACCOUNT_COMPANY)`,
    valueKind: "text",
    priority: 50,
    defaultVisible: false,
    defaultCompact: false,
    columnWidth: "wide",
  },
  spread: {
    id: "spread",
    label: "Spread",
    description: "Current spread in points.",
    mql5ValueExpr: `IntegerToString((int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD))`,
    valueKind: "number",
    priority: 80,
    defaultVisible: true,
    defaultCompact: false,
    columnWidth: "narrow",
  },
  floatingPnl: {
    id: "floatingPnl",
    label: "Floating",
    description: "Open P/L across positions of this EA's magic.",
    mql5ValueExpr: `DoubleToString(ZxFloatingPnl(), 2)`,
    mql5Requires: [FLOATING_PNL_HELPER],
    valueKind: "money",
    priority: 88,
    defaultVisible: true,
    defaultCompact: true,
    columnWidth: "narrow",
  },
  dailyPnl: {
    id: "dailyPnl",
    label: "Daily P/L",
    description: "Today's realised + floating P/L.",
    mql5ValueExpr: `DoubleToString(ZxDailyPnl(), 2)`,
    mql5Requires: [DAILY_PNL_HELPER],
    valueKind: "money",
    priority: 86,
    defaultVisible: true,
    defaultCompact: true,
    columnWidth: "narrow",
  },
  openTrades: {
    id: "openTrades",
    label: "Open",
    description: "Number of open positions for this EA.",
    mql5ValueExpr: `IntegerToString(ZxOpenTrades())`,
    mql5Requires: [OPEN_TRADES_HELPER],
    valueKind: "number",
    priority: 82,
    defaultVisible: true,
    defaultCompact: true,
    columnWidth: "narrow",
  },
  riskMode: {
    id: "riskMode",
    label: "Risk",
    description: "Active risk model (Fixed / Risk% / ATR …).",
    mql5ValueExpr: `ZxRiskModeLabel`,
    valueKind: "text",
    priority: 70,
    defaultVisible: true,
    defaultCompact: false,
    columnWidth: "narrow",
    requiresBlockFamily: ["risk"],
  },
  lotSize: {
    id: "lotSize",
    label: "Lot",
    description: "Last computed lot size (from the most recent open position or the default lot).",
    mql5ValueExpr: `DoubleToString(ZxLastLot(), 2)`,
    mql5Requires: [LAST_LOT_HELPER],
    valueKind: "number",
    priority: 66,
    defaultVisible: false,
    defaultCompact: false,
    columnWidth: "narrow",
  },
  dailyTarget: {
    id: "dailyTarget",
    label: "Target",
    description: "Daily profit target from the equity-target exit block.",
    mql5ValueExpr: `ZxDailyTargetLabel`,
    valueKind: "percent",
    priority: 64,
    defaultVisible: false,
    defaultCompact: false,
    columnWidth: "narrow",
    requiresBlockFamily: ["exit"],
  },
  drawdownLimit: {
    id: "drawdownLimit",
    label: "DD Limit",
    description: "Daily loss / drawdown limit from utility.maxDailyLoss or emergency stop.",
    mql5ValueExpr: `ZxDdLimitLabel`,
    valueKind: "percent",
    priority: 62,
    defaultVisible: false,
    defaultCompact: false,
    columnWidth: "narrow",
    requiresBlockFamily: ["utility"],
  },
  sessionStatus: {
    id: "sessionStatus",
    label: "Session",
    description: "Within / outside configured trading session.",
    mql5ValueExpr: `ZxSessionLabel`,
    valueKind: "status",
    priority: 72,
    defaultVisible: true,
    defaultCompact: false,
    columnWidth: "narrow",
    requiresBlockFamily: ["session", "filter"],
  },
  newsFilterStatus: {
    id: "newsFilterStatus",
    label: "News",
    description: "Whether a news window is currently blocking entries.",
    mql5ValueExpr: `ZxNewsLabel`,
    valueKind: "status",
    priority: 56,
    defaultVisible: false,
    defaultCompact: false,
    columnWidth: "narrow",
    requiresBlockFamily: ["news"],
  },
  licenseStatus: {
    id: "licenseStatus",
    label: "License",
    description: "License check state (valid / expired / grace).",
    mql5ValueExpr: `ZxLicenseLabel`,
    valueKind: "status",
    priority: 40,
    defaultVisible: false,
    defaultCompact: false,
    columnWidth: "narrow",
    plan: "pro",
  },
};

export const ALL_MODULES: KpiModuleDefinition[] = Object.values(KPI_MODULES).sort(
  (a, b) => b.priority - a.priority,
);

export function getModule(id: KpiModuleId): KpiModuleDefinition {
  return KPI_MODULES[id];
}

/**
 * Resolve which modules are active for a given schema, ordered by priority.
 * Applies defaults for any module not explicitly listed.
 */
export function resolveActiveModules(
  schema: import("./types").VisualSchema,
): KpiModuleDefinition[] {
  const isCompact = schema.layout.compact || schema.layout.size === "compact";
  const out: KpiModuleDefinition[] = [];
  for (const m of ALL_MODULES) {
    const override = schema.modules[m.id];
    const visible = override ? override.visible : m.defaultVisible;
    if (!visible) continue;
    if (isCompact && !m.defaultCompact) continue;
    out.push(m);
  }
  return out;
}
