"use client";

import { useRouter } from "next/navigation";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[16px] font-bold text-on-surface mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function ReturnsPage() {
  const router = useRouter();
  return (
    <div className="min-h-dvh bg-surface">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <button
            onClick={() => window.history.length > 1 ? router.back() : router.replace("/")}
            className="text-[13px] text-on-surface-variant/60 hover:text-on-surface-variant mb-6 inline-block cursor-pointer"
          >
            ← Back
          </button>
          <h1 className="text-[24px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] mb-2">
            Cancellations &amp; Refunds Policy
          </h1>
          <p className="text-[13px] text-on-surface-variant/60">Last updated: June 2026</p>
        </div>

        <div className="space-y-8 text-[14px] text-on-surface-variant leading-relaxed">

          <Section title="How can I cancel my order?">
            <p>
              You can cancel your order from your order history page on the Website (My Orders). Cancellation of an order can be requested at any time before delivery. A cancellation button will be displayed against eligible orders.
            </p>
            <p>For prepaid orders:</p>
            <ul className="space-y-2 list-disc list-inside">
              <li>
                If the order is in <strong>&quot;Confirmed&quot;</strong> status, refunds can be processed either to your BetterHalf Wallet (instantaneous) or to your original source of payment (5–7 days post initiation). You can choose between the two.
              </li>
              <li>
                For all orders in statuses prior to delivery, the refund will be processed to your original source of payment.
              </li>
              <li>
                For orders that have been shipped (&quot;Shipped&quot; or &quot;In-Transit&quot;), on cancellation a communication will be sent to our logistics partner to return the order. Returns are typically initiated within 24 hours of cancellation. Refunds will be processed only once the return has been initiated. We will be unable to refund if the order gets delivered.
              </li>
            </ul>
          </Section>

          <Section title="How will I know about the status of my cancellation or refund?">
            <ul className="space-y-2 list-disc list-inside">
              <li>You will receive a communication on WhatsApp / SMS when cancellation is successful.</li>
              <li>You will receive a communication on WhatsApp / SMS when a refund reference ID has been shared by our payment partner. Refunds should typically reach your original source of payment 5–7 days after that.</li>
            </ul>
          </Section>

          <Section title="Can I return my order?">
            <p>
              We do not accept returns. However, in the following rare scenarios, we will be happy to send a replacement if the request is raised within 7 days of delivery:
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li>Wrong products delivered</li>
              <li>Missing products in the order</li>
              <li>Damaged products delivered</li>
              <li>Expired products delivered</li>
            </ul>
            <p>
              To raise a replacement request, message us on WhatsApp at{" "}
              <a href="https://wa.me/918655758196" className="text-primary-container underline">+91 86557 58196</a>.
              Our customer support team may ask for additional information before processing the request. Once approved, a new order ID will be generated and visible in your order history.
            </p>
          </Section>

          <Section title="Miscellaneous">
            <ul className="space-y-2 list-disc list-inside">
              <li>Refunds processed to your BetterHalf Wallet are valid for 12 months and can be used against subsequent orders.</li>
              <li>Any amount uploaded into the digital wallet cannot be refunded back to the original source of payment.</li>
              <li>In rare cases, there could be failures at the payment partner&apos;s end and a refund reference ID may not be generated. In such cases, please reach out to us on WhatsApp at <a href="https://wa.me/918655758196" className="text-primary-container underline">+91 86557 58196</a>. We will investigate and, if valid, send a separate refund link within 24 hours.</li>
            </ul>
          </Section>

          <Section title="Contact Us">
            <p>
              If you have any questions about this policy, contact us on WhatsApp at{" "}
              <a href="https://wa.me/918655758196" className="text-primary-container underline">+91 86557 58196</a>{" "}
              or email{" "}
              <a href="mailto:support@betterhalforyou.com" className="text-primary-container underline">support@betterhalforyou.com</a>.
            </p>
          </Section>

        </div>
      </div>
    </div>
  );
}
