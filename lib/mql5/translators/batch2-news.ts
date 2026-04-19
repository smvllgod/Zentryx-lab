// Batch 2 — news family (7 blocks).
// No native MT5 news-calendar API exists for MQL5 strategy runtime, so the
// user-facing contract is: provide an MQL5 `InpNewsTimes` CSV input of event
// times in the format "yyyy.mm.dd hh:mm,high" (comma-separated list). The
// `pauseAround` / `closeBeforeNews` gates read that list.

import type { Translator } from "../types";

const sid = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);

const NEWS_HELPERS_KEY = `// News helpers: parse CSV list of "yyyy.mm.dd hh:mm,IMPACT" into next-event time
datetime _ParseNewsTimestamp(string s)
{
   // Expected "yyyy.mm.dd hh:mm"
   string datePart[]; int n = StringSplit(s, ' ', datePart);
   if(n < 2) return 0;
   string dParts[]; StringSplit(datePart[0], '.', dParts); if(ArraySize(dParts) < 3) return 0;
   string tParts[]; StringSplit(datePart[1], ':', tParts); if(ArraySize(tParts) < 2) return 0;
   MqlDateTime dt; dt.year=(int)StringToInteger(dParts[0]); dt.mon=(int)StringToInteger(dParts[1]); dt.day=(int)StringToInteger(dParts[2]);
   dt.hour=(int)StringToInteger(tParts[0]); dt.min=(int)StringToInteger(tParts[1]); dt.sec=0;
   return StructToTime(dt);
}
int _NewsMinutesToNext(string csv, bool highOnly)
{
   if(StringLen(csv) == 0) return 999999;
   string events[]; int n = StringSplit(csv, ';', events);
   datetime now = TimeTradeServer();
   int bestFwd = 999999; int bestBack = -999999;
   for(int i=0;i<n;i++) {
      string e = events[i]; StringTrimLeft(e); StringTrimRight(e);
      string parts[]; int m = StringSplit(e, ',', parts);
      if(m < 1) continue;
      datetime t = _ParseNewsTimestamp(parts[0]);
      if(t == 0) continue;
      string impact = (m >= 2) ? parts[1] : "high";
      StringToLower(impact);
      if(highOnly && StringFind(impact, "high") < 0) continue;
      int delta = (int)((t - now) / 60);
      if(delta >= 0 && delta < bestFwd)  bestFwd  = delta;
      if(delta <  0 && delta > bestBack) bestBack = delta;
   }
   // Return minutes to the next event (positive) or minutes since the last (negative).
   if(bestFwd != 999999) return bestFwd;
   if(bestBack != -999999) return bestBack;
   return 999999;
}`;

// ── news.pauseAround
export const translate_news_pauseAround: Translator = (node) => {
  const p = node.params as { beforeMinutes: number; afterMinutes: number; highImpactOnly: boolean };
  const tag = sid(node.id);
  return {
    inputs: [
      { name: `InpNewsCsv_${tag}`, type: "string", defaultExpr: `""`, label: "News CSV (\"yyyy.mm.dd hh:mm,high;...\")" },
      { name: `InpNewsBef_${tag}`, type: "int", defaultExpr: String(p.beforeMinutes ?? 30), label: "Minutes before event" },
      { name: `InpNewsAft_${tag}`, type: "int", defaultExpr: String(p.afterMinutes ?? 30), label: "Minutes after event" },
      { name: `InpNewsHi_${tag}`, type: "bool", defaultExpr: (p.highImpactOnly ?? true) ? "true" : "false", label: "High-impact only" },
    ],
    helpers: [NEWS_HELPERS_KEY],
    gates: [{
      expr: `(StringLen(InpNewsCsv_${tag}) == 0 || (_NewsMinutesToNext(InpNewsCsv_${tag}, InpNewsHi_${tag}) > InpNewsBef_${tag} || _NewsMinutesToNext(InpNewsCsv_${tag}, InpNewsHi_${tag}) < -InpNewsAft_${tag}))`,
      reason: "inside news window",
    }],
    summaryFragments: [`Pause news −${p.beforeMinutes}/+${p.afterMinutes}m`],
  };
};

// ── news.highImpactOnly (flag — bundles with news.pauseAround semantically)
export const translate_news_highImpactOnly: Translator = () => ({
  summaryFragments: [`High-impact news only`],
  // No runtime behavior on its own — the pauseAround block consumes InpNewsHi.
});

// ── news.currencyScope (adds extra currencies to scope; no-op helper)
export const translate_news_currencyScope: Translator = (node) => {
  const p = node.params as { extraCurrencies: string };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpNewsCur_${tag}`, type: "string", defaultExpr: `"${(p.extraCurrencies ?? "").replace(/"/g,'\\"')}"`, label: "Extra currencies (CSV)" }],
    summaryFragments: [`Currency scope (extra ${p.extraCurrencies ?? ""})`],
  };
};

// ── news.closeBeforeNews
export const translate_news_closeBeforeNews: Translator = (node) => {
  const p = node.params as { beforeMinutes: number };
  const tag = sid(node.id);
  return {
    inputs: [
      { name: `InpNewsCbCsv_${tag}`, type: "string", defaultExpr: `""`, label: "News CSV (close-before)" },
      { name: `InpNewsCbMin_${tag}`, type: "int", defaultExpr: String(p.beforeMinutes ?? 15), label: "Minutes before event" },
    ],
    helpers: [NEWS_HELPERS_KEY],
    positionManagement: [
      `// Close before news (${node.id})
{
   if(StringLen(InpNewsCbCsv_${tag}) > 0)
   {
      int m = _NewsMinutesToNext(InpNewsCbCsv_${tag}, true);
      if(m >= 0 && m <= InpNewsCbMin_${tag})
      {
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
    summaryFragments: [`Close ${p.beforeMinutes}m before news`],
  };
};

// ── news.dailyMacroBlock (block entries on days matching macro events)
export const translate_news_dailyMacroBlock: Translator = (node) => {
  const p = node.params as { events: string[] };
  const tag = sid(node.id);
  const list = (p.events ?? ["fomc","ecb","nfp"]).join(",");
  return {
    inputs: [
      { name: `InpMacroNews_${tag}`, type: "string", defaultExpr: `""`, label: "News CSV (macro block — \"yyyy.mm.dd hh:mm,IMPACT,LABEL;...\")" },
      { name: `InpMacroCsv_${tag}`, type: "string", defaultExpr: `"${list}"`, label: "Macro event tokens (CSV)" },
    ],
    helpers: [NEWS_HELPERS_KEY,
      `bool MacroEventToday_${tag}(string csv, string macros)
{
   if(StringLen(csv) == 0 || StringLen(macros) == 0) return false;
   MqlDateTime now; TimeToStruct(TimeTradeServer(), now);
   string evs[]; int n = StringSplit(csv, ';', evs);
   string ms[]; StringSplit(macros, ',', ms);
   for(int i=0;i<n;i++) {
      string e = evs[i]; StringTrimLeft(e); StringTrimRight(e);
      string parts[]; int m = StringSplit(e, ',', parts);
      if(m < 1) continue;
      datetime t = _ParseNewsTimestamp(parts[0]);
      if(t == 0) continue;
      MqlDateTime etime; TimeToStruct(t, etime);
      if(etime.year != now.year || etime.mon != now.mon || etime.day != now.day) continue;
      string label = (m >= 3) ? parts[2] : "";
      StringToLower(label);
      for(int j=0;j<ArraySize(ms);j++) {
         string tok = ms[j]; StringToLower(tok); StringTrimLeft(tok); StringTrimRight(tok);
         if(StringLen(tok) > 0 && StringFind(label, tok) >= 0) return true;
      }
   }
   return false;
}`,
    ],
    gates: [{ expr: `(!MacroEventToday_${tag}(InpMacroNews_${tag}, InpMacroCsv_${tag}))`, reason: "macro event today" }],
    summaryFragments: [`Block on ${(p.events ?? []).join("/")}`],
  };
};

// ── news.csvFeed (just names a CSV feed file; informational)
export const translate_news_csvFeed: Translator = (node) => {
  const p = node.params as { feedName: string };
  const tag = sid(node.id);
  return {
    inputs: [{ name: `InpNewsFeed_${tag}`, type: "string", defaultExpr: `"${(p.feedName ?? "news.csv").replace(/"/g,'\\"')}"`, label: "News feed filename" }],
    summaryFragments: [`News feed: ${p.feedName ?? "news.csv"}`],
  };
};

// ── news.sentimentFilter (bias via equity growth proxy — informational)
export const translate_news_sentimentFilter: Translator = () => ({
  summaryFragments: [`Sentiment filter (placeholder)`],
});
