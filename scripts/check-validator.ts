// Smoke check for lib/mql5/validator.ts — feeds each known-bad fragment
// through the validator and asserts it produces at least one matching
// diagnostic. Run with: `npx tsx scripts/check-validator.ts`.
//
// Also confirms every canonical template passes the validator clean.

import { validateMql5Source } from "../lib/mql5/validator";
import { compileStrategy } from "../lib/mql5/compiler";
import { TEMPLATE_LIST } from "../lib/templates/catalog";

type Case = { name: string; src: string; expectCode: string };

const WRAPPER = (body: string) => `#property strict
void ZxOpen(ENUM_ORDER_TYPE direction)
{
   bool   isLong              = true;
   double entryPrice          = 0.0;
   double slPrice             = 0.0;
   double tpPrice             = 0.0;
   double slPriceDistancePips = 0.0;
${body}
}
`;

const CASES: Case[] = [
  {
    name: "AccountInfoDouble 2-arg",
    src: WRAPPER(`double ml = 0; AccountInfoDouble(ACCOUNT_MARGIN_LEVEL, ml);`),
    expectCode: "mql5_bad_account_info_double",
  },
  {
    name: "r.position without ulong cast",
    src: WRAPPER(`MqlTradeRequest r; r.position = PositionGetInteger(POSITION_TICKET);`),
    expectCode: "mql5_missing_ulong_cast",
  },
  {
    name: "unbalanced braces",
    src: WRAPPER(`if(true) { Print("hi"); `),
    expectCode: "mql5_unbalanced_braces",
  },
  {
    name: "duplicate function",
    src: `double RiskPercentPerTrade() { return 1.0; }
double RiskPercentPerTrade() { return 2.0; }
`,
    expectCode: "mql5_duplicate_function",
  },
  {
    name: "deprecated TimeHour",
    src: WRAPPER(`int h = TimeHour(TimeTradeServer());`),
    expectCode: "mql5_deprecated_fn",
  },
  {
    name: "isLong leak into OnTick",
    src: `void OnTick() { if(isLong) Print("leaked"); }
void ZxOpen(ENUM_ORDER_TYPE direction)
{
   bool isLong = true;
   Print(isLong);
}
`,
    expectCode: "mql5_zxopen_leak",
  },
];

let failures = 0;

console.log("── Negative cases ────────────────────────────────────────");
for (const c of CASES) {
  const diags = validateMql5Source(c.src);
  const matched = diags.some((d) => d.code === c.expectCode);
  console.log(`${matched ? "OK " : "FAIL "} ${c.name} (expected ${c.expectCode})`);
  if (!matched) {
    failures++;
    console.log(`   got: ${diags.map((d) => d.code).join(", ") || "(none)"}`);
  }
}

console.log("\n── Templates (must be clean) ────────────────────────────");
for (const tpl of TEMPLATE_LIST) {
  const g = tpl.build({ strategyName: `Validator_${tpl.slug}` });
  const r = compileStrategy(g, {});
  const errs = r.diagnostics.filter((d) => d.level === "error");
  const warns = r.diagnostics.filter((d) => d.level === "warning");
  if (errs.length > 0) {
    failures++;
    console.log(`FAIL ${tpl.slug} — ${errs.length} error(s):`);
    for (const e of errs) console.log(`   [${e.code}] ${e.message}`);
  } else if (warns.length > 0) {
    console.log(`OK  ${tpl.slug} (${warns.length} warning(s))`);
    for (const w of warns) console.log(`   [${w.code}] ${w.message}`);
  } else {
    console.log(`OK  ${tpl.slug}`);
  }
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll checks passed.");
