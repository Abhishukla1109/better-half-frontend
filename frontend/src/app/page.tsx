"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="w-full min-h-dvh flex flex-col bg-surface overflow-hidden">

      {/* Top ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[480px] h-[340px] rounded-full bg-primary-container/8 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col flex-1 px-6 pt-16 pb-10 max-w-sm mx-auto w-full">

        {/* Brand mark */}
        <div className="flex items-center gap-2.5 mb-14">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-container/15">
            <Sparkles className="w-4.5 h-4.5 text-primary-container" strokeWidth={1.5} />
          </div>
          <span className="text-[17px] font-extrabold tracking-tight text-on-surface font-[family-name:var(--font-manrope)]">
            BetterHalf
          </span>
        </div>

        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-[36px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-[1.1] tracking-tight mb-4">
            Your health,<br />
            <span className="text-primary-container">finally personal.</span>
          </h1>
          <p className="text-[15px] text-on-surface-variant/70 leading-relaxed">
            Answer a few questions. Get a supplement protocol built specifically for your body — free, in under 60 seconds.
          </p>
        </div>

        {/* Value props */}
        <div className="space-y-3 mb-12">
          {[
            { icon: "✦", title: "AI-matched supplements", desc: "Scored against your exact concern and lifestyle" },
            { icon: "⚡", title: "Ready in 60 seconds", desc: "No forms, no waiting — just a conversation" },
            { icon: "★", title: "Free forever", desc: "No credit card, no sign-up friction" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="text-primary-container text-[15px] leading-none mt-0.5 shrink-0">{item.icon}</span>
              <div>
                <p className="text-[13px] font-bold text-on-surface">{item.title}</p>
                <p className="text-[12px] text-on-surface-variant/55 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="mt-auto space-y-3">
          {/* Demo */}
          <button
            onClick={() => {
              localStorage.removeItem("bh_profile");
              localStorage.setItem("bh_auth", "demo");
              router.push("/home");
            }}
            className="w-full flex items-center justify-between py-4 px-5 rounded-2xl bg-primary-container text-white font-bold text-sm hover:bg-primary transition-colors duration-200 cursor-pointer"
          >
            <span>Try a demo</span>
            <span className="text-lg leading-none">→</span>
          </button>

          {/* Sign in / Sign up */}
          <button
            onClick={() => router.push("/auth")}
            className="w-full flex items-center justify-between py-4 px-5 rounded-2xl border border-primary-container/30 bg-primary-container/8 text-sm font-bold text-primary-container hover:bg-primary-container/15 transition-colors cursor-pointer"
          >
            <span>Sign in / Sign up</span>
            <span className="text-lg leading-none">→</span>
          </button>

          <p className="text-[10px] text-on-surface-variant/35 text-center pt-1">
            Trusted by 2M+ Indians · Made by Mosaic Wellness
          </p>
        </div>

      </div>
    </main>
  );
}
