// Regenerate one template with a fully populated presentation config,
// so we can eyeball the PRODUCT INFO / LICENSE / VISUAL DASHBOARD
// sections in action. Run with: `npx tsx scripts/gen-packaged.ts`.
import { writeFileSync } from "node:fs";
import { compileStrategy } from "../lib/mql5/compiler";
import { TEMPLATE_LIST } from "../lib/templates/catalog";

const tpl = TEMPLATE_LIST.find((t) => t.slug === "donchian-breakout-turtle");
if (!tpl) throw new Error("donchian-breakout-turtle not found");

const g = tpl.build({ strategyName: "Donchian_Turtle_Packaged" });

const r = compileStrategy(g, {
  presentation: {
    preset: "premium_seller",
    product: {
      name: "Donchian Turtle Breakout Pro",
      version: "2.1.0",
      vendor: "Zentryx Labs",
      supportUrl: "zentryx.tech/support",
    },
  },
  protections: {
    licenseKey: {
      server: "https://license.zentryx.tech/v1/check",
      graceMode: true,
    },
  },
});

writeFileSync("/tmp/zx/donchian-PREMIUM.mq5", r.source);
console.log(
  `OK ${r.source.length}b  errors:${r.diagnostics.filter((d) => d.level === "error").length}  warnings:${r.diagnostics.filter((d) => d.level === "warning").length}`,
);
for (const d of r.diagnostics) {
  console.log(`   ${d.level} [${d.code}] ${d.message}`);
}
