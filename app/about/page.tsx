import type { Metadata } from "next";
import LegalLayout from "../components/LegalLayout";

export const metadata: Metadata = {
  title: "About — Zentryx Lab",
  description:
    "Who builds Zentryx Lab, why we built a no-code MT5 strategy builder, and where we're taking it next.",
};

export default function AboutPage() {
  return (
    <LegalLayout title="About Zentryx Lab" lastUpdated="April 19, 2026">
      <h2>What we're building</h2>
      <p>
        <strong>Zentryx Lab</strong> is a no-code visual builder for MetaTrader 5 Expert Advisors. You compose a strategy from logic blocks — entries, filters, exits, risk controls, trade management — and the platform compiles it to clean, production-grade MQL5 you can drop into MT5 and run.
      </p>
      <p>
        We ship 200+ battle-tested blocks covering trend, momentum, volatility, session, news, structure, candle patterns, grid, and portfolio logic. Every block is backed by a real MQL5 translator, so what you wire in the builder is exactly what runs on your chart.
      </p>

      <h2>Why we exist</h2>
      <p>
        Automated trading should not require learning MQL5. Traders who understand their edge shouldn't have to spend three months fighting compiler errors and broker quirks before they can backtest an idea. We want that loop to take 30 seconds, not a weekend.
      </p>
      <p>
        So we built Zentryx Lab around three commitments:
      </p>
      <ul>
        <li><strong>Every block is live.</strong> No stubs, no "coming soon" badges on the canvas. If it's in the picker, it compiles.</li>
        <li><strong>The MQL5 we emit is readable.</strong> Deterministic output, named inputs, clean sections — you can inspect it, tweak it, or hand it to a developer.</li>
        <li><strong>You keep your work.</strong> Exports are plain .mq5 files on your disk. No runtime dependency on our servers to trade.</li>
      </ul>

      <h2>The team</h2>
      <p>
        Zentryx Lab is an independent product built by a small team of traders, engineers, and designers. We trade our own accounts with strategies built in the lab — the product is only as good as what we're willing to run live.
      </p>

      <h2>Where we're going</h2>
      <p>
        Near-term focus is on deepening the platform where users already rely on it: faster iteration loops (in-browser backtesting, strategy templates), better distribution (creator profiles, marketplace improvements), and broader reach (MT4 export). We ship small, ship often, and announce what's shipped rather than what's promised.
      </p>

      <h2>Want to talk?</h2>
      <p>
        Email <a href="mailto:hello@zentryx.tech">hello@zentryx.tech</a> or reach us via the <a href="/contact">contact</a> page.
      </p>
    </LegalLayout>
  );
}
