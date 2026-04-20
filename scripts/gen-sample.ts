import { writeFileSync } from "node:fs";
import { compileStrategy } from "../lib/mql5/compiler";
import { TEMPLATE_LIST } from "../lib/templates/catalog";

const slug = process.argv[2] ?? "ema-cross-atr-exit";
const tpl = TEMPLATE_LIST.find((t) => t.slug === slug);
if (!tpl) { console.error("template not found:", slug); process.exit(1); }

const graph = tpl.build({ strategyName: `Test_${slug}` });
const result = compileStrategy(graph, {});
const path = `/tmp/zx/${slug}.mq5`;
writeFileSync(path, result.source, "utf8");
console.log("---- DIAGNOSTICS ----");
for (const d of result.diagnostics) console.log(d.level, d.code, d.message);
console.log("---- WROTE ----", path, result.source.length, "bytes");
