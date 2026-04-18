import type { Metadata } from "next";
import LegalLayout from "../components/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy — Zentryx Lab",
  description: "How Zentryx Lab collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="April 18, 2025">
      <h2>1. Introduction</h2>
      <p>
        Zentryx Lab ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our platform.
      </p>

      <h2>2. Information We Collect</h2>
      <h3>2.1 Information You Provide</h3>
      <ul>
        <li>Account registration data (name, email address, password)</li>
        <li>Billing and payment information processed by our payment provider (Stripe)</li>
        <li>Profile information and preferences</li>
        <li>Communications you send us (support requests, feedback)</li>
        <li>Strategy configurations and builder data you create on the platform</li>
      </ul>
      <h3>2.2 Automatically Collected Information</h3>
      <ul>
        <li>Log data (IP address, browser type, pages visited, time spent)</li>
        <li>Device information (operating system, screen resolution)</li>
        <li>Cookies and similar tracking technologies</li>
        <li>Usage analytics (features used, export counts, session duration)</li>
      </ul>

      <h2>3. How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Provide, maintain, and improve our platform</li>
        <li>Process transactions and send related information</li>
        <li>Send transactional emails (account confirmations, export notifications)</li>
        <li>Send marketing communications (with your consent)</li>
        <li>Respond to support requests</li>
        <li>Monitor and analyze usage patterns to improve UX</li>
        <li>Detect and prevent fraudulent or abusive use</li>
        <li>Comply with legal obligations</li>
      </ul>

      <h2>4. Cookies</h2>
      <p>
        We use cookies and similar tracking technologies to track activity on our platform and hold certain information. Cookies are files with a small amount of data which may include an anonymous unique identifier.
      </p>
      <p>
        You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. If you do not accept cookies, some portions of our service may not function properly.
      </p>
      <p>Types of cookies we use:</p>
      <ul>
        <li><strong>Essential cookies:</strong> Required for the platform to function</li>
        <li><strong>Analytics cookies:</strong> Help us understand how visitors use the platform</li>
        <li><strong>Marketing cookies:</strong> Used to track visitors across websites for advertising purposes (only with consent)</li>
      </ul>

      <h2>5. Data Sharing</h2>
      <p>We do not sell your personal data. We may share your information with:</p>
      <ul>
        <li><strong>Service providers:</strong> Stripe (payments), hosting providers, analytics services</li>
        <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
        <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
      </ul>

      <h2>6. Data Retention</h2>
      <p>
        We retain your personal data for as long as your account is active or as needed to provide you services. You may request deletion of your account and associated data at any time by contacting us at <a href="mailto:privacy@zentryx.studio">privacy@zentryx.studio</a>.
      </p>

      <h2>7. Your Rights (GDPR)</h2>
      <p>If you are located in the European Economic Area, you have the following rights:</p>
      <ul>
        <li><strong>Right to access:</strong> Request a copy of your personal data</li>
        <li><strong>Right to rectification:</strong> Request correction of inaccurate data</li>
        <li><strong>Right to erasure:</strong> Request deletion of your personal data</li>
        <li><strong>Right to data portability:</strong> Receive your data in a structured format</li>
        <li><strong>Right to object:</strong> Object to processing of your personal data</li>
        <li><strong>Right to withdraw consent:</strong> Withdraw consent at any time</li>
      </ul>

      <h2>8. Data Security</h2>
      <p>
        We implement appropriate technical and organizational security measures to protect your information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.
      </p>

      <h2>9. Children's Privacy</h2>
      <p>
        Our platform is not intended for users under the age of 18. We do not knowingly collect personal information from minors. If you believe we have collected data from a minor, please contact us immediately.
      </p>

      <h2>10. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
      </p>

      <h2>11. Contact Us</h2>
      <p>
        If you have questions about this Privacy Policy, please contact us at{" "}
        <a href="mailto:privacy@zentryx.studio">privacy@zentryx.studio</a>.
      </p>
    </LegalLayout>
  );
}
