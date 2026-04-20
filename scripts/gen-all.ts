import { writeFileSync, mkdirSync } from "node:fs";
import { compileStrategy } from "../lib/mql5/compiler";
import { TEMPLATE_LIST } from "../lib/templates/catalog";

mkdirSync("/tmp/zx", { recursive: true });
for (const tpl of TEMPLATE_LIST) {
  try {
    const g = tpl.build({ strategyName: `Test_${tpl.slug}` });
    const r = compileStrategy(g, {});
    writeFileSync(`/tmp/zx/${tpl.slug}.mq5`, r.source);
    const errors = r.diagnostics.filter((d) => d.level === "error").length;
    const warnings = r.diagnostics.filter((d) => d.level === "warning").length;
    console.log(`${tpl.slug}  ${r.source.length}b  errors:${errors}  warnings:${warnings}`);
  } catch (err) {
    console.log(`${tpl.slug}  FAILED: ${(err as Error).message}`);
  }
}
