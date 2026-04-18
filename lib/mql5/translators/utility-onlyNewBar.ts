import type { Translator } from "../types";

export const translate_utility_onlyNewBar: Translator = () => ({
  globals: [`datetime g_LastBarTime = 0;`],
  gates: [{
    expr: `IsNewBar()`,
    reason: "not a new bar",
  }],
  helpers: [
    `bool IsNewBar() {
  datetime t = iTime(_Symbol, _Period, 0);
  if(t == g_LastBarTime) return false;
  g_LastBarTime = t;
  return true;
}`,
  ],
  summaryFragments: [`Enter only on new bar`],
});
