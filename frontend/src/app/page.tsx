"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

const SAMPLE_PICKS = [
  { emoji: "💊", name: "Biotin Hair Gummies",      note: "Doctor's pick · hair fall",    price: "₹499" },
  { emoji: "🌿", name: "Ashwagandha KSM-66",       note: "Bestseller · stress & energy", price: "₹629" },
  { emoji: "💧", name: "Omega-3 Fish Oil 1250mg",  note: "Purity-tested · heart & brain", price: "₹549" },
  { emoji: "☀️", name: "Vitamin D3 + K2",          note: "Deficiency fix · immunity",     price: "₹399" },
];

export default function LandingPage() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [isReturning, setIsReturning] = useState(false);
  const [returningName, setReturningName] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem("bh_auth")) {
        setIsReturning(true);
        const raw = localStorage.getItem("bh_profile");
        if (raw) {
          const p = JSON.parse(raw);
          if (p?.name) setReturningName(p.name);
        }
      }
    } catch {}
  }, []);

  const handleSplashEnd = (e: React.AnimationEvent) => {
    if (e.animationName !== "splashExit") return;
    if (isReturning) {
      router.replace("/protocol");
    } else {
      setShowSplash(false);
    }
  };

  if (showSplash) {
    return (
      <div
        className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-surface splash-exit"
        onAnimationEnd={handleSplashEnd}
      >
        <div className="absolute w-72 h-72 rounded-full bg-primary-container/10 splash-glow" />
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-container/15 mb-8 splash-text-1">
          <Sparkles className="w-7 h-7 text-primary-container" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-extrabold text-primary text-center leading-snug tracking-tight font-[family-name:var(--font-manrope)] splash-text-1 px-8">
          {isReturning
            ? `Welcome back${returningName ? `, ${returningName}` : ""}.`
            : "Welcome."}
        </h1>
        <p className="text-base text-on-surface-variant text-center mt-3 max-w-xs leading-relaxed splash-text-2 px-8">
          {isReturning
            ? "Taking you to your protocol."
            : "Let's build your personalised health journey."}
        </p>
        <p className="absolute bottom-8 text-[10px] text-on-surface-variant/30 uppercase tracking-widest splash-text-2">
          BetterHalf
        </p>
      </div>
    );
  }

  const handleDemo = () => {
    localStorage.removeItem("bh_profile");
    localStorage.setItem("bh_auth", "demo");
    router.push("/home");
  };

  return (
    <main className="w-full min-h-dvh bg-surface flex flex-col">

      {/* ── Top nav bar (desktop) ─────────────────────────── */}
      <header className="hidden lg:flex items-center justify-between px-12 py-5 border-b border-outline-variant/10">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary-container/15">
            <Sparkles className="w-3.5 h-3.5 text-primary-container" strokeWidth={1.5} />
          </div>
          <span className="text-[16px] font-extrabold tracking-tight text-on-surface font-[family-name:var(--font-manrope)]">
            BetterHalf
          </span>
        </div>
        <div className="flex items-center gap-6">
          <p className="text-[12px] text-on-surface-variant/50">Trusted by 2M+ Indians · Made by Mosaic Wellness</p>
          <button
            onClick={() => router.push("/auth")}
            className="text-sm font-semibold text-on-surface-variant hover:text-primary-container transition-colors cursor-pointer"
          >
            Sign in
          </button>
        </div>
      </header>

      {/* ── Two-column desktop / single-column mobile ───── */}
      <div className="flex flex-col lg:flex-row flex-1">

        {/* ── LEFT: Hero + CTAs ─────────────────────────── */}
        <div className="flex flex-col flex-1 lg:max-w-[520px] px-6 lg:px-14 pt-14 lg:pt-16 pb-10 lg:pb-16 lg:justify-center">

          {/* Mobile brand mark */}
          <div className="flex items-center gap-2.5 mb-12 lg:hidden">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-container/15">
              <Sparkles className="w-4 h-4 text-primary-container" strokeWidth={1.5} />
            </div>
            <span className="text-[17px] font-extrabold tracking-tight text-on-surface font-[family-name:var(--font-manrope)]">
              BetterHalf
            </span>
          </div>

          {/* Warm gradient (mobile only — desktop right panel provides colour) */}
          <div
            className="fixed inset-0 pointer-events-none lg:hidden"
            style={{ background: "linear-gradient(180deg, rgba(21,89,74,0.10) 0%, rgba(21,89,74,0.03) 40%, transparent 65%)" }}
          />

          {/* Hero */}
          <div className="relative mb-8">
            <h1 className="text-[38px] lg:text-[46px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-[1.08] tracking-tight mb-4">
              Your health,<br />
              <span className="text-primary-container">finally personal.</span>
            </h1>
            <p className="text-[15px] lg:text-[16px] text-on-surface-variant/70 leading-relaxed max-w-sm">
              Answer 4 questions. Get a supplement protocol built for your exact body — free, in under 60 seconds.
            </p>
          </div>

          {/* Mobile: sample protocol preview */}
          <div
            className="mb-7 rounded-2xl border border-outline-variant/10 overflow-hidden lg:hidden"
            style={{ background: "linear-gradient(135deg, rgba(21,89,74,0.09) 0%, rgba(21,89,74,0.03) 100%)" }}
          >
            <div className="p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles className="w-3 h-3 text-primary-container" strokeWidth={1.5} />
                <span className="text-[9px] font-bold text-primary-container uppercase tracking-wider">Sample protocol · 94% match</span>
              </div>
              <div className="space-y-2">
                {SAMPLE_PICKS.slice(0, 2).map((item) => (
                  <div key={item.name} className="flex items-center gap-3 bg-surface/70 rounded-xl px-3 py-2.5">
                    <span className="text-xl leading-none shrink-0">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-on-surface leading-none truncate">{item.name}</p>
                      <p className="text-[9px] text-on-surface-variant/50 mt-0.5">{item.note}</p>
                    </div>
                    <p className="text-[12px] font-extrabold text-on-surface shrink-0">{item.price}</p>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-on-surface-variant/40 text-center mt-2.5">Built for a 26-yr vegetarian man · hair &amp; energy</p>
            </div>
          </div>

          {/* Feature chips */}
          <div className="flex flex-wrap gap-2 mb-8 relative">
            {[
              { icon: "🧬", label: "AI-personalised" },
              { icon: "⚡", label: "60 seconds" },
              { icon: "🆓", label: "Free forever" },
            ].map((chip) => (
              <span
                key={chip.label}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-primary-container bg-primary-container/10 border border-primary-container/15 px-3 py-1.5 rounded-full"
              >
                <span className="text-[13px] leading-none">{chip.icon}</span>
                {chip.label}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="mt-auto lg:mt-0 space-y-3 relative max-w-sm">
            <button
              onClick={handleDemo}
              className="w-full flex items-center justify-between py-4 px-5 rounded-2xl bg-primary-container text-white font-bold text-sm hover:bg-primary transition-colors duration-200 cursor-pointer"
            >
              <span>Get my free protocol</span>
              <span className="text-lg leading-none">→</span>
            </button>

            <button
              onClick={() => router.push("/auth")}
              className="w-full flex items-center justify-between py-4 px-5 rounded-2xl border border-outline-variant/20 text-sm font-semibold text-on-surface-variant hover:border-primary-container/30 hover:text-primary-container transition-colors cursor-pointer"
            >
              <span>Sign in / Sign up</span>
              <span className="text-lg leading-none opacity-50">→</span>
            </button>

            <p className="text-[10px] text-on-surface-variant/35 text-center pt-1 lg:hidden">
              Trusted by 2M+ Indians · Made by Mosaic Wellness
            </p>
          </div>
        </div>

        {/* ── RIGHT: Visual panel (desktop only) ─────────── */}
        <div
          className="hidden lg:flex flex-1 items-center justify-center px-16 py-16"
          style={{ background: "linear-gradient(145deg, rgba(21,89,74,0.08) 0%, rgba(21,89,74,0.04) 50%, rgba(21,89,74,0.02) 100%)" }}
        >
          <div className="w-full max-w-[400px]">

            {/* Protocol card */}
            <div className="rounded-3xl border border-outline-variant/12 overflow-hidden shadow-lg bg-surface">
              {/* Card header */}
              <div
                className="px-5 py-4 flex items-center gap-2"
                style={{ background: "linear-gradient(135deg, rgba(21,89,74,0.12) 0%, rgba(21,89,74,0.05) 100%)" }}
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary-container/20">
                  <Sparkles className="w-3.5 h-3.5 text-primary-container" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-primary-container uppercase tracking-wider leading-none">Sample protocol</p>
                  <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Built for a 26-yr vegetarian man · hair &amp; energy</p>
                </div>
                <div className="ml-auto flex items-center gap-1 bg-primary-container/15 rounded-full px-2.5 py-1">
                  <span className="text-[11px] font-extrabold text-primary-container">94%</span>
                  <span className="text-[9px] text-primary-container/70">match</span>
                </div>
              </div>

              {/* Product list */}
              <div className="p-3 space-y-2">
                {SAMPLE_PICKS.map((item) => (
                  <div key={item.name} className="flex items-center gap-3 rounded-xl px-3 py-3 border border-outline-variant/8 hover:border-primary-container/20 hover:bg-primary-container/3 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-xl shrink-0">
                      {item.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-on-surface leading-none truncate">{item.name}</p>
                      <p className="text-[10px] text-on-surface-variant/50 mt-0.5">{item.note}</p>
                    </div>
                    <p className="text-[13px] font-extrabold text-on-surface shrink-0">{item.price}</p>
                  </div>
                ))}
              </div>

              {/* Card footer */}
              <div className="px-4 py-3 border-t border-outline-variant/8 flex items-center justify-between">
                <p className="text-[10px] text-on-surface-variant/40">Personalised from 6.5M Indian health journeys</p>
                <button
                  onClick={handleDemo}
                  className="text-[11px] font-bold text-primary-container hover:text-primary cursor-pointer transition-colors"
                >
                  Get mine →
                </button>
              </div>
            </div>

            {/* Stat pills below card */}
            <div className="flex gap-3 mt-4">
              {[
                { value: "6.5M+", label: "health journeys analysed" },
                { value: "< 60s", label: "to your protocol" },
                { value: "100%", label: "free, always" },
              ].map((s) => (
                <div key={s.value} className="flex-1 rounded-2xl border border-outline-variant/10 bg-surface px-3 py-3 text-center">
                  <p className="text-[15px] font-extrabold text-primary-container leading-none">{s.value}</p>
                  <p className="text-[9px] text-on-surface-variant/50 mt-1 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>
    </main>
  );
}
