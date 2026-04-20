// Regenerate a template with a live appearance schema wired in so we
// can inspect the ZxLabInit output and verify the panel positions
// correctly for each corner.
// Run with: `npx tsx scripts/gen-panel.ts`.

import { writeFileSync } from "node:fs";
import { compileStrategy } from "../lib/mql5/compiler";
import { TEMPLATE_LIST } from "../lib/templates/catalog";
import { defaultVisualSchema } from "../lib/appearance/types";
import type { PanelCorner } from "../lib/appearance/types";

const tpl = TEMPLATE_LIST.find((t) => t.slug === "one-shot-sniper");
if (!tpl) throw new Error("one-shot-sniper not found");

const corners: PanelCorner[] = ["top-left", "top-right", "bottom-left", "bottom-right"];

for (const corner of corners) {
  const g = tpl.build({ strategyName: `OneShotSniper_${corner}` });
  const appearance = defaultVisualSchema("One-Shot Sniper");
  appearance.layout.corner = corner;
  appearance.layout.offset = { x: 10, y: 30 };
  g.metadata.appearance = appearance;

  const r = compileStrategy(g, {});
  const name = `/tmp/zx/one-shot-sniper-panel-${corner}.mq5`;
  writeFileSync(name, r.source);
  const errs = r.diagnostics.filter((d) => d.level === "error");
  const warns = r.diagnostics.filter((d) => d.level === "warning");
  console.log(
    `${corner.padEnd(14)} ${String(r.source.length).padStart(6)}b  errors:${errs.length}  warnings:${warns.length}`,
  );
  for (const e of errs) console.log(`   ERROR [${e.code}] ${e.message}`);
}
