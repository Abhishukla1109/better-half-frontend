"use client";

import { useRouter } from "next/navigation";

export default function PrivacyPage() {
  const router = useRouter();
  return (
    <div className="min-h-dvh bg-surface">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => window.history.length > 1 ? router.back() : router.replace("/")}
            className="text-[13px] text-on-surface-variant/60 hover:text-on-surface-variant mb-6 inline-block cursor-pointer"
          >
            ← Back
          </button>
          <h1 className="text-[24px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] mb-2">
            Privacy Policy
          </h1>
          <p className="text-[13px] text-on-surface-variant/60">
            Last updated: June 2026
          </p>
        </div>

        <div className="space-y-8 text-[14px] text-on-surface-variant leading-relaxed">

          <section>
            <h2 className="text-[16px] font-bold text-on-surface mb-3">Who we are</h2>
            <p>
              BetterHalf is a personalised health and wellness platform operated by Mosaic Wellness Pvt. Ltd., Mumbai, India. We help you discover supplement protocols tailored to your health goals across our brands — Man Matters, Be Bodywise, and Little Joys.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-on-surface mb-3">What data we collect</h2>
            <ul className="space-y-2 list-none">
              {[
                { label: "Email address", reason: "To create and identify your account" },
                { label: "Name", reason: "To personalise your experience" },
                { label: "Gender and age", reason: "To match products to your biology and life stage" },
                { label: "Health concerns", reason: "To generate your personalised supplement protocol" },
                { label: "Purchase history", reason: "To improve future recommendations" },
                { label: "Usage data", reason: "Pages visited, products viewed, events in the app — collected via Mixpanel to improve the product" },
              ].map((item) => (
                <li key={item.label} className="flex flex-col gap-0.5 pl-3 border-l-2 border-primary-container/20">
                  <span className="font-semibold text-on-surface">{item.label}</span>
                  <span className="text-[13px]">{item.reason}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-on-surface mb-3">How we use your data</h2>
            <p className="mb-3">We use your data solely to:</p>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Generate and personalise your health protocol</li>
              <li>Recommend products relevant to your goals</li>
              <li>Maintain your account and purchase history</li>
              <li>Improve BetterHalf as a product</li>
              <li>Send you updates about your protocol (only if you opt in)</li>
            </ul>
            <p className="mt-3">
              We do not sell your data. We do not use your health data for advertising. We do not share your personal data with third parties except as described below.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-on-surface mb-3">Third party services</h2>
            <p className="mb-3">We use the following services to operate BetterHalf:</p>
            <ul className="space-y-2">
              {[
                { name: "Supabase", purpose: "Account authentication and profile storage" },
                { name: "Shopify", purpose: "Product catalogue and order processing" },
                { name: "Mixpanel", purpose: "Anonymous usage analytics to understand how users move through the app" },
              ].map((s) => (
                <li key={s.name} className="flex gap-2">
                  <span className="font-semibold text-on-surface min-w-[90px]">{s.name}</span>
                  <span>{s.purpose}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3">
              Each of these services has their own privacy policy and handles data per their respective terms.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-on-surface mb-3">Health data</h2>
            <p>
              Information you share about your health concerns, goals, and body is sensitive. We treat it as such. This data is used exclusively to generate your personalised protocol and is never shared with advertisers, insurers, or any third party outside the services listed above. You can delete your profile and all associated health data at any time from the Profile section.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-on-surface mb-3">Your rights</h2>
            <p className="mb-3">Under India&apos;s Digital Personal Data Protection Act (DPDP) 2023, you have the right to:</p>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Know what data we hold about you</li>
              <li>Correct inaccurate data</li>
              <li>Delete your data and account</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email us at{" "}
              <a href="mailto:abhishek.shukla@mosaicwellness.in" className="text-primary-container underline">
                abhishek.shukla@mosaicwellness.in
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-on-surface mb-3">Data retention</h2>
            <p>
              We retain your data for as long as your account is active. If you delete your account, your personal data is removed within 30 days. Anonymous usage analytics (Mixpanel) are retained for 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-on-surface mb-3">Contact</h2>
            <p>
              Questions about this policy? Reach us at{" "}
              <a href="mailto:abhishek.shukla@mosaicwellness.in" className="text-primary-container underline">
                abhishek.shukla@mosaicwellness.in
              </a>
              {" "}or write to Mosaic Wellness Pvt. Ltd., Mumbai, Maharashtra, India.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
