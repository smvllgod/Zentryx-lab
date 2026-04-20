import { writeFileSync, mkdirSync } from "node:fs";
import { compileStrategy } from "../lib/mql5/compiler";
import { TEMPLATE_LIST } from "../lib/templates/catalog";

mkdirSync("/tmp/zx", { recursive: true });

// Compile every template twice — once as a plain export and once with
// telemetry wired in — so regressions like the "InpTelemetryUrl never
// emitted" bug surface here before users hit them.
const MODES: Array<{ label: string; opts: Parameters<typeof compileStrategy>[1] }> = [
  { label: "plain", opts: {} },
  {
    label: "+telemetry",
    opts: {
      telemetry: {
        token: "00000000-0000-0000-0000-000000000001",
        endpoint: "https://example.com/.netlify/functions/strategy-telemetry",
      },
    },
  },
];

for (const tpl of TEMPLATE_LIST) {
  for (const mode of MODES) {
    try {
      const g = tpl.build({ strategyName: `Test_${tpl.slug}` });
      const r = compileStrategy(g, mode.opts);
      writeFileSync(`/tmp/zx/${tpl.slug}${mode.label === "plain" ? "" : ".tele"}.mq5`, r.source);
      const errors = r.diagnostics.filter((d) => d.level === "error");
      const warnings = r.diagnostics.filter((d) => d.level === "warning");
      console.log(
        `${tpl.slug.padEnd(28)} ${mode.label.padEnd(12)} ${String(r.source.length).padStart(6)}b  errors:${errors.length}  warnings:${warnings.length}`,
      );
      for (const e of errors) console.log(`    ERROR [${e.code}] ${e.message}`);
      for (const w of warnings) console.log(`    WARN  [${w.code}] ${w.message}`);
    } catch (err) {
      console.log(`${tpl.slug} ${mode.label} FAILED: ${(err as Error).message}`);
    }
  }
}
