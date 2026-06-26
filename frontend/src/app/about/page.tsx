"use client";

import { useRouter } from "next/navigation";

export default function AboutPage() {
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
            About Us
          </h1>
        </div>

        <div className="space-y-8 text-[14px] text-on-surface-variant leading-relaxed">

          <section>
            <h2 className="text-[16px] font-bold text-on-surface mb-3">We built BetterHalf because health is personal</h2>
            <p>
              No two people are the same — different bodies, different goals, different lifestyles. Yet most wellness products are built for everyone, which means they&apos;re truly built for no one.
            </p>
            <p className="mt-3">
              BetterHalf changes that. We use AI to understand your unique health profile and build a personalised supplement protocol just for you — in under two minutes. Whether it&apos;s hair fall, skin concerns, weight, energy, sleep, or hormonal balance, your protocol is curated to your biology, your age, and your lifestyle.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-on-surface mb-3">Built for the whole family</h2>
            <p>
              Health isn&apos;t just about you. BetterHalf lets you build personalised protocols for your partner and your kids — all in one place. One app, one household, fully personalised for each person.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-on-surface mb-3">Backed by Mosaic Wellness</h2>
            <p>
              BetterHalf is operated by Mosaic Wellness Private Limited, one of India&apos;s most trusted digital health companies. Mosaic Wellness builds science-backed, clinically formulated wellness products through brands millions of Indians already trust — Man Matters, Be Bodywise, and Little Joys.
            </p>
            <p className="mt-3">
              Every product on BetterHalf comes from this same trusted stable — so you know exactly what you&apos;re putting in your body.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-on-surface mb-3">Our promise</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>Personalisation that actually means something</li>
              <li>Products that are clinically formulated, not just marketed</li>
              <li>No confusing options — just a clear protocol built for you</li>
              <li>Your health data stays private and is never sold</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-on-surface mb-3">Registered Office</h2>
            <div className="bg-surface-container rounded-xl p-4 space-y-1">
              <p className="font-semibold text-on-surface">Mosaic Wellness Private Limited</p>
              <p>Lodha iThink, 6th Floor,</p>
              <p>Chirak Nagar, Thane West,</p>
              <p>Thane, Maharashtra – 400601</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
