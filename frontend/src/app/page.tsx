"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function LandingPage() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [isReturning, setIsReturning] = useState(false);
  const [returningName, setReturningName] = useState<string | null>(null);

  useEffect(() => {
    async function checkReturning() {
      // 1. Check real Supabase session first (covers cross-device / cleared cache)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Try localStorage profile first (fast path)
        try {
          const raw = localStorage.getItem("bh_profile");
          if (raw) {
            const p = JSON.parse(raw);
            if (p?.diet) { setIsReturning(true); if (p?.name) setReturningName(p.name); return; }
          }
        } catch {}
        // Fallback: load profile from Supabase
        const { data } = await supabase.from("profiles").select("data").eq("id", session.user.id).single();
        if (data?.data && Object.keys(data.data as object).length > 0) {
          const p = data.data as Record<string, string>;
          localStorage.setItem("bh_profile", JSON.stringify(p));
          localStorage.setItem("bh_auth", JSON.stringify({ loggedIn: true }));
          setIsReturning(true);
          if (p?.name) setReturningName(p.name);
        } else {
          // Signed in but no profile yet → go to onboarding
          router.replace("/home");
        }
        return;
      }

      // 2. No real session — check demo localStorage fallback
      try {
        if (localStorage.getItem("bh_auth")) {
          const raw = localStorage.getItem("bh_profile");
          if (raw) {
            const p = JSON.parse(raw);
            if (p?.diet) { setIsReturning(true); if (p?.name) setReturningName(p.name); }
          }
        }
      } catch {}
    }
    checkReturning();
  }, [router]);

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
              Your personal<br />
              <span className="text-primary-container">health protocol,</span><br />
              built by AI.
            </h1>
            <p className="text-[15px] lg:text-[16px] text-on-surface-variant/65 leading-relaxed mb-8 lg:mb-10">
              Tell us about your health goals. Get a matched supplement stack, daily habits, and progress tracking — personalised for you and your family.
            </p>
            <button
              onClick={handleDemo}
              className="flex items-center justify-between w-full py-4 px-6 rounded-2xl bg-primary-container text-white font-bold text-[15px] hover:bg-primary transition-colors duration-200 cursor-pointer"
            >
              <span>Get my free protocol</span>
              <span className="text-xl leading-none">→</span>
            </button>
            <p className="mt-5 text-[12px] text-on-surface-variant/35">
              Made by Mosaic Wellness
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
              </div>
              <p className="text-[20px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-snug mb-3">
                Hair Health &amp;<br />Sleep &amp; Mind
              </p>
              <div className="flex gap-1.5 flex-wrap mb-4">
                {["💇 Hair", "🌙 Sleep", "⚡ Energy"].map((c) => (
                  <span key={c} className="text-[11px] font-semibold text-primary-container bg-primary-container/12 px-2.5 py-1 rounded-full">{c}</span>
                ))}
              </div>
              <div className="mt-auto flex items-center gap-2 bg-primary-container/8 rounded-2xl px-3.5 py-2.5">
                <span className="text-[18px]">🧬</span>
                <div>
                  <p className="text-[11px] font-bold text-primary-container leading-none">3 products matched</p>
                  <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Personalised to your profile</p>
                </div>
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
                  { img: "https://i.mscwlns.co/media/misc/pdp_rcl/biotin-hair-gummies-sample/7__3__WgbxQHKdS.png?tr=w-200", name: "Biotin Hair Gummies",      brand: "Man Matters", price: "₹499", pct: "88%" },
                  { img: "https://i.mscwlns.co/mosaic-wellness/image/upload/v1631867343/Man%20Matters/Ashwagandha%20Gummies/Product%20images/Nutrition-matters-1-_1600X1200.jpg?tr=w-200", name: "Ashwagandha Gummies", brand: "Man Matters", price: "₹629", pct: "79%" },
                  { img: "https://i.mscwlns.co/media/misc/pdp_rcl/2024494/Magnesium%20Gummies_br8d83.jpg?tr=w-200",                                                                        name: "Magnesium Gummies",         brand: "Man Matters", price: "₹549", pct: "74%" },
                ].map((p) => (
                  <div key={p.name} className="flex items-center gap-3 px-5 py-2.5 border-b border-outline-variant/6 last:border-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.img} alt={p.name} className="w-10 h-10 rounded-xl object-contain shrink-0 bg-surface-container-low" />
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

            {/* Card 3 — Insights preview */}
            <div className="rounded-3xl border border-purple-100 p-5 flex flex-col shadow-sm" style={{ background: "linear-gradient(145deg, #f5f3ff, #faf9ff)" }}>
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-3">Your Insights</p>
              <p className="text-[16px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] mb-4">Track your progress</p>
              <div className="flex items-center gap-4 flex-1">
                {/* Mini vitality ring */}
                <svg width="72" height="72" viewBox="0 0 90 90" className="shrink-0">
                  <circle cx="45" cy="45" r="38" fill="none" stroke="#ede9fe" strokeWidth="8" />
                  <circle cx="45" cy="45" r="38" fill="none" stroke="url(#lg-landing)" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(72 / 100) * 2 * Math.PI * 38} ${2 * Math.PI * 38}`}
                    transform="rotate(-90 45 45)"
                  />
                  <defs>
                    <linearGradient id="lg-landing" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                  </defs>
                  <text x="45" y="42" textAnchor="middle" fill="#1c1b1f" fontSize="17" fontWeight="800" fontFamily="Manrope,sans-serif">72</text>
                  <text x="45" y="54" textAnchor="middle" fill="#9ca3af" fontSize="8" fontWeight="600">/ 100</text>
                </svg>
                <div className="flex-1 space-y-2.5">
                  <div className="flex items-center gap-2 bg-orange-50 rounded-xl px-3 py-2">
                    <span className="text-[15px]">🔥</span>
                    <div>
                      <p className="text-[11px] font-extrabold text-on-surface">14 day streak</p>
                      <p className="text-[9px] text-on-surface-variant/45">Supplement consistency</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {["⚡","😊","⚡","😴","😊","⚡","⚡"].map((e, i) => (
                      <div key={i} className="flex flex-col items-center gap-0.5">
                        <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
                          <span className="text-[10px]">{e}</span>
                        </div>
                        <span className="text-[8px] text-on-surface-variant/30">{["S","M","T","W","T","F","S"][i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4 — Family Profiles */}
            <div
              className="rounded-3xl p-5 flex flex-col justify-between overflow-hidden"
              style={{ background: "linear-gradient(145deg, rgba(21,89,74,0.10) 0%, rgba(21,89,74,0.04) 100%)", border: "1px solid rgba(21,89,74,0.10)" }}
            >
              <div>
                <p className="text-[10px] font-bold text-primary-container uppercase tracking-wider mb-2">Family Profiles</p>
                <p className="text-[18px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-snug mb-4">
                  One app for the whole family
                </p>
                <div className="flex gap-2.5">
                  {[
                    { label: "You",     emoji: "🧑", bg: "bg-teal-50",   border: "border-teal-200",   text: "text-teal-700" },
                    { label: "Partner", emoji: "🧑‍🤝‍🧑", bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
                    { label: "Kids",    emoji: "👧",  bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700" },
                  ].map((m) => (
                    <div key={m.label} className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl border ${m.bg} ${m.border}`}>
                      <span className="text-[22px]">{m.emoji}</span>
                      <span className={`text-[10px] font-bold ${m.text}`}>{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 bg-surface/60 rounded-xl px-3.5 py-2.5">
                <span className="text-[13px]">⚡</span>
                <p className="text-[11px] text-on-surface-variant/60">Protocol ready in under 60 seconds</p>
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
              </div>
              <p className="text-[15px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-snug mb-2.5">
                Hair Health &amp;<br />Sleep &amp; Mind
              </p>
              <div className="flex gap-1 flex-wrap mb-3">
                {["💇 Hair", "🌙 Sleep", "⚡ Energy"].map((c) => (
                  <span key={c} className="text-[10px] font-semibold text-primary-container bg-primary-container/12 px-2 py-0.5 rounded-full">{c}</span>
                ))}
              </div>
              <div className="mt-auto flex items-center gap-2 bg-primary-container/8 rounded-xl px-3 py-2">
                <span className="text-[14px]">🧬</span>
                <p className="text-[10px] font-bold text-primary-container">3 products matched</p>
              </div>
            </div>

            {/* Card 2 — Supplements */}
            <div className="snap-start shrink-0 w-[220px] rounded-2xl bg-white border border-outline-variant/10 overflow-hidden flex flex-col shadow-sm">
              <div className="px-4 pt-4 pb-2.5 border-b border-outline-variant/8">
                <p className="text-[9px] font-bold text-primary-container uppercase tracking-wider">AI-matched picks</p>
                <p className="text-[13px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] mt-0.5">Your supplements</p>
              </div>
              {[
                { img: "https://i.mscwlns.co/media/misc/pdp_rcl/biotin-hair-gummies-sample/7__3__WgbxQHKdS.png?tr=w-200", name: "Biotin Hair Gummies", price: "₹499", pct: "88%" },
                { img: "https://i.mscwlns.co/mosaic-wellness/image/upload/v1631867343/Man%20Matters/Ashwagandha%20Gummies/Product%20images/Nutrition-matters-1-_1600X1200.jpg?tr=w-200", name: "Ashwagandha Gummies", price: "₹629", pct: "79%" },
              ].map((p) => (
                <div key={p.name} className="flex items-center gap-2.5 px-4 py-2.5 border-b border-outline-variant/6 last:border-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt={p.name} className="w-9 h-9 rounded-xl object-contain shrink-0 bg-surface-container-low" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-on-surface leading-snug truncate">{p.name}</p>
                    <p className="text-[11px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">{p.price}</p>
                  </div>
                  <span className="text-[9px] font-bold text-white bg-primary-container px-1.5 py-0.5 rounded-full shrink-0">{p.pct}</span>
                </div>
              ))}
            </div>

            {/* Card 3 — Insights */}
            <div className="snap-start shrink-0 w-[220px] rounded-2xl border border-purple-100 p-4 flex flex-col shadow-sm" style={{ background: "linear-gradient(145deg, #f5f3ff, #faf9ff)" }}>
              <p className="text-[9px] font-bold text-purple-400 uppercase tracking-wider mb-2">Your Insights</p>
              <p className="text-[13px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] mb-3">Track your progress</p>
              <div className="flex items-center gap-3">
                <svg width="58" height="58" viewBox="0 0 90 90" className="shrink-0">
                  <circle cx="45" cy="45" r="38" fill="none" stroke="#ede9fe" strokeWidth="8" />
                  <circle cx="45" cy="45" r="38" fill="none" stroke="url(#lg-mob)" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(72 / 100) * 2 * Math.PI * 38} ${2 * Math.PI * 38}`}
                    transform="rotate(-90 45 45)"
                  />
                  <defs>
                    <linearGradient id="lg-mob" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                  </defs>
                  <text x="45" y="42" textAnchor="middle" fill="#1c1b1f" fontSize="17" fontWeight="800" fontFamily="Manrope,sans-serif">72</text>
                  <text x="45" y="54" textAnchor="middle" fill="#9ca3af" fontSize="8" fontWeight="600">/ 100</text>
                </svg>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-1.5 bg-orange-50 rounded-xl px-2.5 py-1.5">
                    <span className="text-[13px]">🔥</span>
                    <p className="text-[10px] font-extrabold text-on-surface">14 day streak</p>
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {["⚡","😊","⚡","😴","😊","⚡","⚡"].map((e, i) => (
                      <div key={i} className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
                        <span className="text-[9px]">{e}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4 — Family */}
            <div className="snap-start shrink-0 w-[200px] rounded-2xl p-4 flex flex-col justify-between"
              style={{ background: "linear-gradient(145deg, rgba(21,89,74,0.10) 0%, rgba(21,89,74,0.04) 100%)", border: "1px solid rgba(21,89,74,0.10)" }}>
              <div>
                <p className="text-[9px] font-bold text-primary-container uppercase tracking-wider mb-1.5">Family Profiles</p>
                <p className="text-[15px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-snug mb-3">
                  One app for the whole family
                </p>
                <div className="flex gap-2">
                  {[
                    { label: "You",     emoji: "🧑", bg: "bg-teal-50",   border: "border-teal-200",   text: "text-teal-700" },
                    { label: "Partner", emoji: "🧑‍🤝‍🧑", bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
                    { label: "Kids",    emoji: "👧",  bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700" },
                  ].map((m) => (
                    <div key={m.label} className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border ${m.bg} ${m.border}`}>
                      <span className="text-[18px]">{m.emoji}</span>
                      <span className={`text-[9px] font-bold ${m.text}`}>{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 bg-surface/60 rounded-xl px-3 py-2">
                <span className="text-[11px]">⚡</span>
                <p className="text-[10px] text-on-surface-variant/60">Protocol in under 60s</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </main>
  );
}
