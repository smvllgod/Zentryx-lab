// Verify the two new entry blocks (candleOpen + randomPosition)
// compile end-to-end. Builds a minimal strategy for each one and
// dumps the .mq5 to /tmp/zx for inspection.
import { writeFileSync, mkdirSync } from "node:fs";
import { compileStrategy } from "../lib/mql5/compiler";
import { emptyGraph } from "../lib/strategies/types";
import type { StrategyGraph } from "../lib/strategies/types";

mkdirSync("/tmp/zx", { recursive: true });

function build(entryType: string, entryParams: Record<string, unknown>): StrategyGraph {
  const g = emptyGraph({ name: `Test_${entryType}` });
  g.nodes.push(
    {
      id: "n-entry",
      type: entryType,
      category: "entry",
      position: { x: 0, y: 0 },
      params: entryParams,
    },
    {
      id: "n-risk",
      type: "risk.fixedRisk",
      category: "risk",
      position: { x: 1, y: 0 },
      params: { riskPercent: 1 },
    },
    {
      id: "n-lot",
      type: "lot.fromRisk",
      category: "lot",
      position: { x: 2, y: 0 },
      params: {},
    },
    {
      id: "n-sl",
      type: "exit.fixedTpSl",
      category: "exit",
      position: { x: 3, y: 0 },
      params: { takeProfitPips: 40, stopLossPips: 20 },
    },
  );
  g.edges.push(
    { id: "e1", source: "n-entry", target: "n-risk" },
    { id: "e2", source: "n-risk", target: "n-lot" },
    { id: "e3", source: "n-lot", target: "n-sl" },
  );
  return g;
}

const cases = [
  { slug: "candleOpen-both",   type: "entry.candleOpen",      params: { direction: "both", minBodyPips: 0 } },
  { slug: "candleOpen-long",   type: "entry.candleOpen",      params: { direction: "long", minBodyPips: 5 } },
  { slug: "randomPos-random",  type: "entry.randomPosition",  params: { mode: "random" } },
  { slug: "randomPos-long",    type: "entry.randomPosition",  params: { mode: "long" } },
  { slug: "randomPos-short",   type: "entry.randomPosition",  params: { mode: "short" } },
];

for (const c of cases) {
  const g = build(c.type, c.params);
  const r = compileStrategy(g, {});
  const errs = r.diagnostics.filter((d) => d.level === "error");
  const warns = r.diagnostics.filter((d) => d.level === "warning");
  writeFileSync(`/tmp/zx/new-entry-${c.slug}.mq5`, r.source);
  console.log(
    `${c.slug.padEnd(24)} ${String(r.source.length).padStart(6)}b  errors:${errs.length}  warnings:${warns.length}`,
  );
  for (const e of errs) console.log(`   ERROR [${e.code}] ${e.message}`);
  for (const w of warns) console.log(`   WARN  [${w.code}] ${w.message}`);
}
