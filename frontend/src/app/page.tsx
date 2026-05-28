"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Sun, Moon } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [isReturning, setIsReturning] = useState(false);
  const [returningName, setReturningName] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem("bh_auth")) {
        const raw = localStorage.getItem("bh_profile");
        if (raw) {
          const p = JSON.parse(raw);
          // Only treat as returning if they have a completed profile
          if (p?.diet) {
            setIsReturning(true);
            if (p?.name) setReturningName(p.name);
          }
        }
      }
    } catch {}
  }, []);

  const handleSplashEnd = (e: React.AnimationEvent) => {
    if (e.animationName !== "splashExit") return;
    if (isReturning) router.replace("/protocol");
    else setShowSplash(false);
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
          {isReturning ? `Welcome back${returningName ? `, ${returningName}` : ""}.` : "Welcome."}
        </h1>
        <p className="text-base text-on-surface-variant text-center mt-3 max-w-xs leading-relaxed splash-text-2 px-8">
          {isReturning ? "Taking you to your protocol." : "Let's build your personalised health journey."}
        </p>
        <p className="absolute bottom-8 text-[10px] text-on-surface-variant/30 uppercase tracking-widest splash-text-2">BetterHalf</p>
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

      {/* ── Nav ─────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 lg:px-12 py-4 border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary-container/15">
            <Sparkles className="w-3.5 h-3.5 text-primary-container" strokeWidth={1.5} />
          </div>
          <span className="text-[16px] font-extrabold tracking-tight text-on-surface font-[family-name:var(--font-manrope)]">BetterHalf</span>
        </div>
        <button
          onClick={() => router.push("/auth")}
          className="text-sm font-semibold text-on-surface-variant hover:text-primary-container transition-colors cursor-pointer"
        >
          Sign in
        </button>
      </header>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">

        {/* ── LEFT ─────────────────────────────────────── */}
        <div className="flex flex-col justify-center px-8 lg:px-16 py-14 lg:py-0 lg:w-[44%] lg:shrink-0">
          <div
            className="fixed inset-0 pointer-events-none lg:hidden"
            style={{ background: "linear-gradient(180deg, rgba(21,89,74,0.08) 0%, transparent 50%)" }}
          />
          <div className="relative max-w-[440px]">
            <p className="text-[11px] font-bold text-primary-container uppercase tracking-widest mb-5">AI Health Companion</p>
            <h1 className="text-[34px] lg:text-[52px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-[1.05] tracking-tight mb-4">
              Your health,<br />
              <span className="text-primary-container">finally personal.</span>
            </h1>
            <p className="text-[15px] lg:text-[16px] text-on-surface-variant/65 leading-relaxed mb-8 lg:mb-10">
              Answer 4 questions. Get a supplement protocol, daily habits, and AI coaching — built specifically for your body.
            </p>
            <button
              onClick={handleDemo}
              className="flex items-center justify-between w-full py-4 px-6 rounded-2xl bg-primary-container text-white font-bold text-[15px] hover:bg-primary transition-colors duration-200 cursor-pointer"
            >
              <span>Get my free protocol</span>
              <span className="text-xl leading-none">→</span>
            </button>
            <p className="mt-5 text-[12px] text-on-surface-variant/35">
              Trusted by 2M+ Indians · Made by Mosaic Wellness
            </p>
          </div>
        </div>

        {/* ── RIGHT: 2×2 card grid ─────────────────────── */}
        <div
          className="hidden lg:block flex-1 p-6"
          style={{ background: "linear-gradient(160deg, rgba(21,89,74,0.06) 0%, rgba(21,89,74,0.02) 100%)" }}
        >
          <div className="h-full grid grid-cols-2 grid-rows-2 gap-4">

            {/* Card 1 — Personalised Protocol */}
            <div
              className="rounded-3xl p-5 flex flex-col overflow-hidden"
              style={{ background: "linear-gradient(145deg, rgba(21,89,74,0.12) 0%, rgba(21,89,74,0.05) 100%)", border: "1px solid rgba(21,89,74,0.12)" }}
            >
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-primary-container" strokeWidth={1.5} />
                <span className="text-[10px] font-bold text-primary-container uppercase tracking-wider">Your Protocol</span>
                <span className="ml-auto text-[11px] font-extrabold text-primary-container">91%</span>
              </div>
              <p className="text-[20px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-snug mb-3">
                Hair Health &amp;<br />Sleep &amp; Mind
              </p>
              <div className="flex gap-1.5 flex-wrap mb-4">
                {["💇 Hair", "🌙 Sleep", "⚡ Energy"].map((c) => (
                  <span key={c} className="text-[11px] font-semibold text-primary-container bg-primary-container/12 px-2.5 py-1 rounded-full">{c}</span>
                ))}
              </div>
              <div className="mt-auto">
                <p className="text-[10px] text-on-surface-variant/40 mb-1.5">Profile depth</p>
                <div className="flex gap-1">
                  {[1,2,3,4,5,6].map((i) => (
                    <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= 4 ? "bg-primary-container" : "bg-primary-container/15"}`} />
                  ))}
                </div>
                <p className="text-[10px] text-on-surface-variant/40 mt-1">4 of 6 insights unlocked</p>
              </div>
            </div>

            {/* Card 2 — Product Picks */}
            <div className="rounded-3xl bg-white border border-outline-variant/10 overflow-hidden flex flex-col shadow-sm">
              <div className="px-5 pt-5 pb-3 border-b border-outline-variant/8">
                <p className="text-[10px] font-bold text-primary-container uppercase tracking-wider">AI-matched picks</p>
                <p className="text-[16px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] mt-0.5">Your supplements</p>
              </div>
              <div className="flex-1 overflow-hidden">
                {[
                  { img: "/images/products/biotin.jpg",      name: "Biotin Hair Gummies",  brand: "Man Matters", price: "₹499", pct: "88%" },
                  { img: "/images/products/ashwagandha.jpg", name: "Ashwagandha KSM-66",   brand: "Man Matters", price: "₹629", pct: "76%" },
                  { img: "/images/products/magnesium.jpg",   name: "Magnesium Bisglycinate",brand: "Wellbeing",  price: "₹549", pct: "71%" },
                ].map((p) => (
                  <div key={p.name} className="flex items-center gap-3 px-5 py-2.5 border-b border-outline-variant/6 last:border-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.img} alt={p.name} className="w-10 h-10 rounded-xl object-cover shrink-0 bg-surface-container" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] text-on-surface-variant/40 font-semibold">{p.brand}</p>
                      <p className="text-[12px] font-bold text-on-surface leading-snug truncate">{p.name}</p>
                      <p className="text-[12px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">{p.price}</p>
                    </div>
                    <span className="text-[10px] font-bold text-white bg-primary-container px-2 py-1 rounded-full shrink-0">{p.pct}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3 — Daily Habits */}
            <div className="rounded-3xl bg-white border border-outline-variant/10 p-5 flex flex-col shadow-sm">
              <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-wider mb-3">Daily routine</p>
              <p className="text-[16px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] mb-4">Built around your day</p>
              <div className="space-y-2.5 flex-1">
                <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-100/80 px-3.5 py-3">
                  <Sun className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wider leading-none mb-1">Morning</p>
                    <p className="text-[12px] font-semibold text-on-surface leading-snug">Take with breakfast for best absorption</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl bg-indigo-50 border border-indigo-100/80 px-3.5 py-3">
                  <Moon className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider leading-none mb-1">Evening</p>
                    <p className="text-[12px] font-semibold text-on-surface leading-snug">Dim lights 1hr before target bedtime</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4 — AI Personalisation */}
            <div
              className="rounded-3xl p-5 flex flex-col justify-between overflow-hidden"
              style={{ background: "linear-gradient(145deg, rgba(21,89,74,0.10) 0%, rgba(21,89,74,0.04) 100%)", border: "1px solid rgba(21,89,74,0.10)" }}
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-primary-container/15 flex items-center justify-center mb-4">
                  <Sparkles className="w-5 h-5 text-primary-container" strokeWidth={1.5} />
                </div>
                <p className="text-[10px] font-bold text-primary-container uppercase tracking-wider mb-2">AI Coaching</p>
                <p className="text-[18px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-snug">
                  Gets smarter every visit
                </p>
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { value: "6.5M+", label: "Indian health journeys" },
                  { value: "< 60s", label: "To your first protocol" },
                ].map((s) => (
                  <div key={s.value} className="flex items-center justify-between bg-surface/60 rounded-xl px-3.5 py-2.5">
                    <p className="text-[11px] text-on-surface-variant/60">{s.label}</p>
                    <p className="text-[15px] font-extrabold text-primary-container font-[family-name:var(--font-manrope)]">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ── Mobile: horizontal scroll of all 4 feature cards ── */}
        <div className="lg:hidden pb-12">
          <div className="flex gap-3 overflow-x-auto px-6 pb-1" style={{ scrollbarWidth: "none" }}>

            {/* Card 1 — Protocol */}
            <div className="snap-start shrink-0 w-[220px] rounded-2xl p-4 flex flex-col"
              style={{ background: "linear-gradient(145deg, rgba(21,89,74,0.12) 0%, rgba(21,89,74,0.05) 100%)", border: "1px solid rgba(21,89,74,0.12)" }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3 h-3 text-primary-container" strokeWidth={1.5} />
                <span className="text-[9px] font-bold text-primary-container uppercase tracking-wider">Your Protocol</span>
                <span className="ml-auto text-[11px] font-extrabold text-primary-container">91%</span>
              </div>
              <p className="text-[15px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-snug mb-2.5">
                Hair Health &amp;<br />Sleep &amp; Mind
              </p>
              <div className="flex gap-1 flex-wrap mb-3">
                {["💇 Hair", "🌙 Sleep", "⚡ Energy"].map((c) => (
                  <span key={c} className="text-[10px] font-semibold text-primary-container bg-primary-container/12 px-2 py-0.5 rounded-full">{c}</span>
                ))}
              </div>
              <div className="mt-auto">
                <div className="flex gap-1">
                  {[1,2,3,4,5,6].map((i) => (
                    <div key={i} className={`flex-1 h-1 rounded-full ${i <= 4 ? "bg-primary-container" : "bg-primary-container/15"}`} />
                  ))}
                </div>
                <p className="text-[9px] text-on-surface-variant/40 mt-1">4 of 6 insights unlocked</p>
              </div>
            </div>

            {/* Card 2 — Supplements */}
            <div className="snap-start shrink-0 w-[220px] rounded-2xl bg-white border border-outline-variant/10 overflow-hidden flex flex-col shadow-sm">
              <div className="px-4 pt-4 pb-2.5 border-b border-outline-variant/8">
                <p className="text-[9px] font-bold text-primary-container uppercase tracking-wider">AI-matched picks</p>
                <p className="text-[13px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] mt-0.5">Your supplements</p>
              </div>
              {[
                { img: "/images/products/biotin.jpg",      name: "Biotin Hair Gummies", price: "₹499", pct: "88%" },
                { img: "/images/products/ashwagandha.jpg", name: "Ashwagandha KSM-66",  price: "₹629", pct: "76%" },
              ].map((p) => (
                <div key={p.name} className="flex items-center gap-2.5 px-4 py-2.5 border-b border-outline-variant/6 last:border-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt={p.name} className="w-9 h-9 rounded-xl object-cover shrink-0 bg-surface-container" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-on-surface leading-snug truncate">{p.name}</p>
                    <p className="text-[11px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">{p.price}</p>
                  </div>
                  <span className="text-[9px] font-bold text-white bg-primary-container px-1.5 py-0.5 rounded-full shrink-0">{p.pct}</span>
                </div>
              ))}
            </div>

            {/* Card 3 — Daily Routine */}
            <div className="snap-start shrink-0 w-[220px] rounded-2xl bg-white border border-outline-variant/10 p-4 flex flex-col shadow-sm">
              <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-wider mb-2">Daily routine</p>
              <p className="text-[13px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] mb-3">Built around your day</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-100/80 px-3 py-2.5">
                  <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="text-[8px] font-bold text-amber-600 uppercase tracking-wider leading-none mb-0.5">Morning</p>
                    <p className="text-[11px] font-semibold text-on-surface leading-snug">Take with breakfast for best absorption</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-xl bg-indigo-50 border border-indigo-100/80 px-3 py-2.5">
                  <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-wider leading-none mb-0.5">Evening</p>
                    <p className="text-[11px] font-semibold text-on-surface leading-snug">Dim lights 1hr before target bedtime</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4 — AI Coaching */}
            <div className="snap-start shrink-0 w-[200px] rounded-2xl p-4 flex flex-col justify-between"
              style={{ background: "linear-gradient(145deg, rgba(21,89,74,0.10) 0%, rgba(21,89,74,0.04) 100%)", border: "1px solid rgba(21,89,74,0.10)" }}>
              <div>
                <div className="w-8 h-8 rounded-xl bg-primary-container/15 flex items-center justify-center mb-3">
                  <Sparkles className="w-4 h-4 text-primary-container" strokeWidth={1.5} />
                </div>
                <p className="text-[9px] font-bold text-primary-container uppercase tracking-wider mb-1.5">AI Coaching</p>
                <p className="text-[15px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-snug">
                  Gets smarter every visit
                </p>
              </div>
              <div className="mt-4 space-y-1.5">
                {[
                  { value: "6.5M+", label: "Indian health journeys" },
                  { value: "< 60s", label: "To your first protocol" },
                ].map((s) => (
                  <div key={s.value} className="flex items-center justify-between bg-surface/60 rounded-xl px-3 py-2">
                    <p className="text-[10px] text-on-surface-variant/60">{s.label}</p>
                    <p className="text-[13px] font-extrabold text-primary-container font-[family-name:var(--font-manrope)]">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </main>
  );
}
