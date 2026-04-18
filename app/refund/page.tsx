import type { Metadata } from "next";
import LegalLayout from "../components/LegalLayout";

export const metadata: Metadata = {
  title: "Refund Policy — Zentryx Lab",
  description: "Zentryx Lab refund and cancellation policy.",
};

export default function RefundPage() {
  return (
    <LegalLayout title="Refund Policy" lastUpdated="April 18, 2025">
      <h2>1. Overview</h2>
      <p>
        We want you to be satisfied with Zentryx Lab. This Refund Policy outlines when and how refunds are granted for our subscription plans and Marketplace purchases.
      </p>

      <h2>2. Subscription Plans</h2>
      <h3>2.1 Free Plan</h3>
      <p>The Free plan has no cost and therefore no refunds apply.</p>

      <h3>2.2 Pro & Creator Plans — 7-Day Money-Back Guarantee</h3>
      <p>
        If you are not satisfied with your Pro or Creator subscription, you may request a full refund within <strong>7 days</strong> of your initial purchase. To qualify:
      </p>
      <ul>
        <li>The refund request must be submitted within 7 days of the charge date</li>
        <li>This applies to first-time subscriptions only (not renewals)</li>
        <li>Your account must not have made more than 5 strategy exports</li>
      </ul>

      <h3>2.3 Renewals</h3>
      <p>
        Subscription renewals are non-refundable. We send a renewal reminder email 7 days before each billing cycle. It is your responsibility to cancel before renewal if you no longer wish to use the Service.
      </p>

      <h3>2.4 Annual Plans</h3>
      <p>
        Annual plans are eligible for a prorated refund within the first 30 days if you have made fewer than 10 exports. After 30 days, annual plans are non-refundable.
      </p>

      <h2>3. Marketplace Purchases</h2>
      <p>
        Due to the digital nature of strategy files, Marketplace purchases are <strong>generally non-refundable</strong> once the file has been downloaded or accessed.
      </p>
      <p>Exceptions where a refund may be granted:</p>
      <ul>
        <li>The strategy file was corrupted or failed to import in MetaTrader 5</li>
        <li>The strategy's description materially misrepresented its function</li>
        <li>A duplicate purchase was made within 24 hours</li>
      </ul>
      <p>
        Marketplace refund requests must be submitted within <strong>48 hours</strong> of purchase and must include a description of the issue and any error logs from MetaTrader 5.
      </p>

      <h2>4. How to Request a Refund</h2>
      <p>To request a refund, please contact us at <a href="mailto:billing@zentryx.studio">billing@zentryx.studio</a> with:</p>
      <ul>
        <li>Your registered email address</li>
        <li>The order or transaction ID</li>
        <li>The reason for your refund request</li>
      </ul>
      <p>
        We process refund requests within <strong>3 business days</strong>. Approved refunds are returned to the original payment method within 5–10 business days depending on your bank.
      </p>

      <h2>5. Chargebacks</h2>
      <p>
        If you initiate a chargeback without first contacting us, we reserve the right to suspend your account pending resolution. We encourage you to reach out to us first — we are committed to resolving any billing issues fairly.
      </p>

      <h2>6. Contact</h2>
      <p>
        For billing questions, contact <a href="mailto:billing@zentryx.studio">billing@zentryx.studio</a>.
      </p>
    </LegalLayout>
  );
}
