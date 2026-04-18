import type { Metadata } from "next";
import LegalLayout from "../components/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service — Zentryx Lab",
  description: "Terms and conditions for using the Zentryx Lab platform.",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="April 18, 2025">
      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using the Zentryx Lab platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
      </p>

      <h2>2. Description of Service</h2>
      <p>
        Zentryx Lab is a no-code visual strategy builder that allows users to design, configure, and export automated trading strategies (Expert Advisors) compatible with MetaTrader 4 and MetaTrader 5. The Service does not execute trades, manage funds, or provide investment advice.
      </p>

      <h2>3. Important Disclaimer — Trading Risk</h2>
      <p>
        <strong>Algorithmic trading involves substantial risk of loss. Zentryx Lab is a software tool only.</strong> We do not provide financial, investment, or trading advice. Past performance of any strategy does not guarantee future results. You are solely responsible for:
      </p>
      <ul>
        <li>The strategies you create and export</li>
        <li>Backtesting and validating your strategies in MetaTrader 5</li>
        <li>Any trading losses incurred from using exported Expert Advisors</li>
        <li>Compliance with your broker's terms of service</li>
        <li>Compliance with applicable financial regulations in your jurisdiction</li>
      </ul>

      <h2>4. Accounts and Registration</h2>
      <p>
        You must create an account to use the Service. You are responsible for maintaining the confidentiality of your credentials and for all activities under your account. You must be at least 18 years old to register.
      </p>

      <h2>5. Intellectual Property</h2>
      <h3>5.1 Platform</h3>
      <p>
        Zentryx Lab and all associated software, design, trademarks, and content are owned by Zentryx and protected by applicable intellectual property laws.
      </p>
      <h3>5.2 Your Content</h3>
      <p>
        You retain ownership of the strategies you create. By using the Service, you grant Zentryx a limited license to store and process your strategy data solely to provide the Service.
      </p>
      <h3>5.3 Exported Files</h3>
      <p>
        Exported Expert Advisor files (.ex4, .ex5) are yours to use personally. Redistribution or resale of exported EAs outside the Zentryx Marketplace requires a Creator plan.
      </p>

      <h2>6. Marketplace</h2>
      <p>
        The Zentryx Marketplace allows Creator plan subscribers to list and sell strategies. By listing a strategy:
      </p>
      <ul>
        <li>You confirm you have the right to sell it</li>
        <li>You agree to our 70/30 revenue split (70% to creator)</li>
        <li>You accept responsibility for the strategy's described performance claims</li>
        <li>Zentryx reserves the right to remove listings that violate these Terms</li>
      </ul>

      <h2>7. Prohibited Uses</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Reverse-engineer, decompile, or disassemble the platform</li>
        <li>Use the Service for any unlawful purpose</li>
        <li>Attempt to gain unauthorized access to any systems</li>
        <li>Share your account credentials with third parties</li>
        <li>Use automated scripts to scrape or abuse the platform</li>
        <li>Misrepresent strategy performance in Marketplace listings</li>
      </ul>

      <h2>8. Payment and Subscriptions</h2>
      <p>
        Paid plans are billed monthly or annually via Stripe. Subscriptions auto-renew until cancelled. You may cancel at any time through your account settings. Cancellation takes effect at the end of the current billing period.
      </p>

      <h2>9. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, Zentryx shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or trading capital, arising from your use of the Service.
      </p>

      <h2>10. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless Zentryx, its officers, directors, and employees from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.
      </p>

      <h2>11. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the jurisdiction in which Zentryx operates, without regard to conflict of law principles.
      </p>

      <h2>12. Changes to Terms</h2>
      <p>
        We reserve the right to modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms.
      </p>

      <h2>13. Contact</h2>
      <p>
        For questions about these Terms, contact us at <a href="mailto:legal@zentryx.studio">legal@zentryx.studio</a>.
      </p>
    </LegalLayout>
  );
}
