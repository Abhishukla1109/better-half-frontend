"use client";

import { useRouter } from "next/navigation";

export default function ContactPage() {
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
            Contact Us
          </h1>
          <p className="text-[14px] text-on-surface-variant/70 mt-1">
            BetterHalf wants to make expert advice and healthcare more accessible — to everyone. Reach out to us for any queries or issues you might be facing.
          </p>
        </div>

        <div className="space-y-6 text-[14px] text-on-surface-variant leading-relaxed">

          <div className="bg-surface-container rounded-2xl p-5 space-y-1">
            <p className="font-bold text-on-surface text-[15px]">📞 Call us</p>
            <a href="tel:+917607027607" className="text-primary-container underline text-[15px] font-semibold">
              +91 76070 27607
            </a>
            <p className="text-[13px] text-on-surface-variant/60">Mon – Sat, 9 AM to 6 PM</p>
          </div>

          <div className="bg-surface-container rounded-2xl p-5 space-y-1">
            <p className="font-bold text-on-surface text-[15px]">✉️ Email us</p>
            <a href="mailto:support@betterhalforyou.com" className="text-primary-container underline">
              support@betterhalforyou.com
            </a>
            <p className="text-[13px] text-on-surface-variant/60">We typically respond within 24–48 hours.</p>
          </div>

          <div className="bg-surface-container rounded-2xl p-5 space-y-1">
            <p className="font-bold text-on-surface text-[15px]">📍 Address</p>
            <p>Mosaic Wellness Pvt. Ltd.</p>
            <p>Lodha iThink, 6th Floor,</p>
            <p>Chirak Nagar, Thane West,</p>
            <p>Thane, Maharashtra – 400601</p>
          </div>

          <div className="bg-surface-container rounded-2xl p-5 space-y-1">
            <p className="font-bold text-on-surface text-[15px]">⚠️ Grievance Officer</p>
            <p className="font-semibold text-on-surface">Mr. Mridul Muralidharan</p>
            <p>Senior Director, Mosaic Wellness Private Limited</p>
            <p>Phone: <a href="tel:+918128688128" className="text-primary-container underline">+91 81286 88128</a></p>
            <p>Email: <a href="mailto:grievances@mosaicwellness.in" className="text-primary-container underline">grievances@mosaicwellness.in</a></p>
            <p className="text-[13px] text-on-surface-variant/60">Mon – Sat, 09:00 – 18:00</p>
          </div>

        </div>
      </div>
    </div>
  );
}
