import type { Metadata } from "next";
import LegalLayout from "../components/LegalLayout";

export const metadata: Metadata = {
  title: "Contact — Zentryx Lab",
  description:
    "How to reach Zentryx Lab — support, sales, partnerships, press, and security.",
};

export default function ContactPage() {
  return (
    <LegalLayout title="Contact" lastUpdated="April 19, 2026">
      <h2>Email</h2>
      <p>
        We read every email and reply within one business day on weekdays.
      </p>
      <ul>
        <li><strong>General & support</strong> — <a href="mailto:hello@zentryx.tech">hello@zentryx.tech</a></li>
        <li><strong>Sales & partnerships</strong> — <a href="mailto:sales@zentryx.tech">sales@zentryx.tech</a></li>
        <li><strong>Careers</strong> — <a href="mailto:careers@zentryx.tech">careers@zentryx.tech</a></li>
        <li><strong>Press</strong> — <a href="mailto:press@zentryx.tech">press@zentryx.tech</a></li>
        <li><strong>Security / responsible disclosure</strong> — <a href="mailto:security@zentryx.tech">security@zentryx.tech</a></li>
      </ul>

      <h2>Community</h2>
      <p>
        For quick questions, strategy ideas, or bug reports, the community channels are usually the fastest:
      </p>
      <ul>
        <li><strong>Telegram</strong> — <a href="https://t.me/zentryxlab" target="_blank" rel="noopener noreferrer">@zentryxlab</a></li>
        <li><strong>Instagram</strong> — <a href="https://instagram.com/zentryxlab" target="_blank" rel="noopener noreferrer">@zentryxlab</a></li>
        <li><strong>X / Twitter</strong> — <a href="https://x.com/zentryxlab" target="_blank" rel="noopener noreferrer">@zentryxlab</a></li>
      </ul>

      <h2>Before you email support</h2>
      <p>
        Most answers are already in the <a href="/docs">documentation</a> — including the full <a href="/docs">block reference</a>, the <a href="/docs">MQL5 export guide</a>, and the getting-started flow. If you found a bug, include:
      </p>
      <ul>
        <li>Browser + OS version.</li>
        <li>The strategy ID (visible in the URL of your builder).</li>
        <li>A short description of what you did and what happened.</li>
        <li>A screenshot if the issue is visual.</li>
      </ul>

      <h2>Security disclosures</h2>
      <p>
        If you've found a security issue, please email <a href="mailto:security@zentryx.tech">security@zentryx.tech</a> rather than filing a public report. We triage within 24 hours and credit reporters in our advisories if they'd like.
      </p>
    </LegalLayout>
  );
}
