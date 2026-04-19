import type { Metadata } from "next";
import LegalLayout from "../components/LegalLayout";

export const metadata: Metadata = {
  title: "Careers — Zentryx Lab",
  description:
    "Open roles at Zentryx Lab. We're a small, remote-first team building a no-code MT5 Expert Advisor builder.",
};

export default function CareersPage() {
  return (
    <LegalLayout title="Careers at Zentryx Lab" lastUpdated="April 19, 2026">
      <h2>Who we hire</h2>
      <p>
        Zentryx Lab is a small, remote-first team. We hire for judgment, ownership, and craft — not for logos on a résumé. If you want to work directly on a product traders actually use, and you like shipping over planning, we want to hear from you.
      </p>

      <h2>How we work</h2>
      <ul>
        <li><strong>Remote-first, async by default.</strong> Two loose overlaps a week; the rest is deep work.</li>
        <li><strong>Ship small, ship often.</strong> Every change ships behind a flag; every feature has a rollback path.</li>
        <li><strong>Write things down.</strong> Proposals, post-mortems, and onboarding docs are part of the job, not an afterthought.</li>
        <li><strong>Real users, real P/L.</strong> We ship to traders running live accounts, so quality bars are non-negotiable.</li>
      </ul>

      <h2>Open roles</h2>
      <p>
        We don't have public roles open right now — but we're always collecting introductions for roles that typically open when we grow:
      </p>
      <ul>
        <li><strong>Senior Full-Stack Engineer</strong> — TypeScript, Next.js, Postgres. Bonus if you've shipped MQL5 or a code generator before.</li>
        <li><strong>Senior Product Designer</strong> — complex interfaces, canvas tools, data-dense dashboards. Portfolio &gt; CV.</li>
        <li><strong>Quant Developer / Trading Engineer</strong> — has live experience with MT4/MT5 or a prop-firm account. Writes clean MQL5 and can spec new blocks end-to-end.</li>
        <li><strong>Developer Advocate / Content</strong> — build templates, record tutorials, run the community. Must trade.</li>
      </ul>

      <h2>Interested?</h2>
      <p>
        Send us a short note at <a href="mailto:careers@zentryx.tech">careers@zentryx.tech</a>. Tell us:
      </p>
      <ul>
        <li>What you'd want to work on here and why.</li>
        <li>One thing you've shipped that you're proud of — link is fine.</li>
        <li>Anything you'd do differently if you ran the product for a week.</li>
      </ul>
      <p>
        We read every note. We reply to every one we can move forward — usually within a week.
      </p>
    </LegalLayout>
  );
}
