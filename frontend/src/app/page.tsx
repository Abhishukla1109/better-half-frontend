"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { motion, useInView } from "framer-motion";

function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: false });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) { setCount(0); return; }
    let startTime: number | null = null;
    const duration = 1400;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * to));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, to]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function LandingPage() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [isReturning, setIsReturning] = useState(false);
  const [returningName, setReturningName] = useState<string | null>(null);

  useEffect(() => {
    async function checkReturning() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          const raw = localStorage.getItem("bh_profile");
          if (raw) {
            const p = JSON.parse(raw);
            if (p?.diet) { setIsReturning(true); if (p?.name) setReturningName(p.name); return; }
          }
        } catch {}
        const { data } = await supabase.from("profiles").select("data").eq("id", session.user.id).single();
        if (data?.data && Object.keys(data.data as object).length > 0) {
          const p = data.data as Record<string, string>;
          localStorage.setItem("bh_profile", JSON.stringify(p));
          localStorage.setItem("bh_auth", JSON.stringify({ loggedIn: true }));
          setIsReturning(true);
          if (p?.name) setReturningName(p.name);
        } else {
          router.replace("/home");
        }
        return;
      }
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

  // Product ticker — mix of all 3 brands, duplicated for seamless loop
  const tickerItems = [
    { img: "https://i.mscwlns.co/media/misc/pdp_rcl/26166752/1.2_d9def6.jpg?tr=w-200", name: "Biotin Gummies", brand: "Man Matters" },
    { img: "https://i.mscwlns.co/media/misc/pdp_rcl/multivitamin-gummies/Slide%201_cn16xu.jpg?tr=w-200", name: "Multivitamin", brand: "Be Bodywise" },
    { img: "https://i.mscwlns.co/media/misc/pdp/multivitamin-gummies/mvg%202%20-%2030_buso8t.png?tr=w-200", name: "Multivitamin 2+", brand: "Little Joys" },
    { img: "https://i.mscwlns.co/media/misc/pdp_rcl/magnesium-glycinate-gummies-60n/Artboard%201%20%28100%29_lt9fr4.jpg?tr=w-200", name: "Magnesium", brand: "Man Matters" },
    { img: "https://i.mscwlns.co/media/misc/pdp_rcl/1-peptide-ceramide-moisturizer/Product_Hero_4dxycu.jpg?tr=w-200", name: "Peptide Moisturizer", brand: "Be Bodywise" },
    { img: "https://i.mscwlns.co/media/misc/pdp/multivitamin-gummies/MVG%20Immunity%20PDP_cwmlqf.png?tr=w-200", name: "Immunity Gummies", brand: "Little Joys" },
    { img: "https://i.mscwlns.co/mosaic-wellness/image/upload/v1631867343/Man%20Matters/Ashwagandha%20Gummies/Product%20images/Nutrition-matters-1-_1600X1200.jpg?tr=w-200", name: "Ashwagandha", brand: "Man Matters" },
    { img: "https://i.mscwlns.co/media/misc/pdp_rcl/1-salicylic-acid-body-wash/250ml%20-%20Hero_iihi7g.jpg?tr=w-200", name: "Salicylic Wash", brand: "Be Bodywise" },
    { img: "https://i.mscwlns.co/media/misc/pdp_rcl/10-aha-body-scrub/IntroPage%20copy%20%281%29_34ugqb.jpg?tr=w-200", name: "AHA Body Scrub", brand: "Be Bodywise" },
    { img: "https://i.mscwlns.co/media/misc/pdp/multivitamin-gummies/3_1czs5i.jpg?tr=w-200", name: "Kids Gummies", brand: "Little Joys" },
  ];

  const steps = [
    { number: "01", title: "Answer 5 questions", desc: "Tell us your health goals, lifestyle, diet and existing routines. Takes under 60 seconds.", emoji: "📋" },
    { number: "02", title: "Get your AI protocol", desc: "Our engine picks the right products for your exact needs from 50+ options across 3 brands.", emoji: "🧬" },
    { number: "03", title: "Track your progress", desc: "Check in daily, log how you feel, and watch your health score grow over time.", emoji: "📈" },
  ];

  const products = [
    {
      img: "https://i.mscwlns.co/media/misc/pdp_rcl/26166752/1.2_d9def6.jpg?tr=w-600",
      name: "Biotin Hair Gummies",
      brand: "Man Matters",
      concern: "Hair Health",
      color: "from-teal-50 to-emerald-50",
      border: "border-teal-100",
    },
    {
      img: "https://i.mscwlns.co/media/misc/pdp_rcl/multivitamin-gummies/Slide%201_cn16xu.jpg?tr=w-600",
      name: "Multivitamin Gummies",
      brand: "Be Bodywise",
      concern: "Energy & Immunity",
      color: "from-rose-50 to-pink-50",
      border: "border-rose-100",
    },
    {
      img: "https://i.mscwlns.co/media/misc/pdp/multivitamin-gummies/mvg%202%20-%2030_buso8t.png?tr=w-600",
      name: "Multivitamin Gummies 2+",
      brand: "Little Joys",
      concern: "Kids Immunity",
      color: "from-amber-50 to-orange-50",
      border: "border-amber-100",
    },
  ];

  const stats = [
    { to: 100, suffix: "+", label: "Products" },
    { to: 3, suffix: "", label: "Brands" },
    { to: 8, suffix: "", label: "Health concerns" },
    { to: 60, suffix: "s", label: "To build your protocol" },
  ];

  return (
    <main className="w-full min-h-dvh bg-surface flex flex-col">

      {/* ── Nav ── */}
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

      {/* ── HERO ── */}
      <div className="relative flex flex-col items-center justify-center flex-1 px-6 lg:px-16 pt-12 pb-20 text-center min-h-[88dvh] overflow-hidden">
        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(21,89,74,0.07) 0%, transparent 70%)" }}
        />

        <motion.p
          className="text-[12px] font-bold text-primary-container uppercase tracking-widest mb-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          India&apos;s first personalised supplement protocol
        </motion.p>

        <motion.h1
          className="text-[38px] lg:text-[72px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-[1.05] tracking-tight mb-5 max-w-3xl"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.18 }}
        >
          Your personal<br />
          <span className="text-primary-container">health protocol,</span><br />
          built by AI.
        </motion.h1>

        <motion.p
          className="text-[15px] lg:text-[18px] text-on-surface-variant/75 leading-relaxed mb-8 max-w-md"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.32 }}
        >
          Tell us about your health goals. Get a matched supplement stack, daily habits, and progress tracking — personalised for you and your family.
        </motion.p>

        <motion.button
          onClick={handleDemo}
          className="flex items-center gap-3 py-4 px-8 rounded-2xl bg-primary-container text-white font-bold text-[15px] lg:text-[16px] hover:bg-primary transition-colors duration-200 cursor-pointer mb-10"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.46 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <span>Build my protocol in 60 seconds</span>
          <span className="text-xl">→</span>
        </motion.button>

        {/* ── Product ticker ── */}
        <motion.div
          className="w-full relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-16 lg:w-24 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to right, var(--color-surface), transparent)" }} />
          <div className="absolute right-0 top-0 bottom-0 w-16 lg:w-24 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to left, var(--color-surface), transparent)" }} />

          <div className="overflow-hidden">
            <motion.div
              className="flex gap-3"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
            >
              {[...tickerItems, ...tickerItems].map((item, i) => (
                <div key={i} className="shrink-0 flex flex-col items-center gap-2">
                  <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-white border border-outline-variant/10 shadow-sm overflow-hidden flex items-center justify-center p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.img} alt={item.name} className="w-full h-full object-contain" />
                  </div>
                  <p className="text-[10px] lg:text-[11px] font-bold text-on-surface-variant/65 whitespace-nowrap">{item.brand}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Social proof + attribution */}
        <motion.div
          className="mt-6 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.75 }}
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container border border-outline-variant/15">
            <span className="text-[11px]">✦</span>
            <span className="text-[12px] font-semibold text-on-surface-variant/80">100+ products · 3 brands · 8 concerns</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-md overflow-hidden bg-primary-container/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-2.5 h-2.5 text-primary-container" strokeWidth={1.5} />
            </div>
            <p className="text-[12px] text-on-surface-variant/60">By <span className="font-semibold text-on-surface-variant/75">Mosaic Wellness</span> — makers of Man Matters &amp; Be Bodywise</p>
          </div>
        </motion.div>

        {/* Bouncing arrow — no text */}
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
          >
            <ChevronDown className="w-5 h-5 text-on-surface-variant/25" strokeWidth={2} />
          </motion.div>
        </motion.div>
      </div>

      {/* ════════ SCROLL SECTIONS ════════ */}

      {/* ── 4 FEATURE CARDS ── */}
      <section className="px-4 lg:px-16 py-16 lg:py-20 border-t border-outline-variant/10">
        <div className="max-w-4xl mx-auto">
          <motion.p
            className="text-[12px] font-bold text-primary-container uppercase tracking-widest mb-3 text-center"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-60px" }}
            transition={{ duration: 0.4 }}
          >
            Everything you need
          </motion.p>
          <motion.h2
            className="text-[24px] lg:text-[38px] font-extrabold text-on-surface text-center mb-10 font-[family-name:var(--font-manrope)] leading-tight"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-60px" }}
            transition={{ duration: 0.4, delay: 0.08 }}
          >
            Protocol. Products. Progress.
          </motion.h2>

          <div className="grid grid-cols-2 gap-3 lg:gap-4">

            <motion.div
              className="rounded-2xl lg:rounded-3xl p-4 lg:p-5 flex flex-col min-h-[160px] lg:min-h-[220px]"
              style={{ background: "linear-gradient(145deg, rgba(21,89,74,0.12) 0%, rgba(21,89,74,0.05) 100%)", border: "1px solid rgba(21,89,74,0.12)" }}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, margin: "-60px" }}
              transition={{ duration: 0.4, delay: 0.05 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles className="w-3 h-3 text-primary-container" strokeWidth={1.5} />
                <span className="text-[9px] lg:text-[10px] font-bold text-primary-container uppercase tracking-wider">Your Protocol</span>
              </div>
              <p className="text-[14px] lg:text-[20px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-snug mb-2 lg:mb-3">
                Hair &amp; Sleep<span className="hidden lg:inline"><br />&amp; Mind</span>
              </p>
              <div className="flex gap-1 lg:gap-1.5 flex-wrap mb-auto">
                {["💇 Hair", "🌙 Sleep", "⚡ Energy"].map((c) => (
                  <span key={c} className="text-[9px] lg:text-[11px] font-semibold text-primary-container bg-primary-container/12 px-2 lg:px-2.5 py-0.5 lg:py-1 rounded-full">{c}</span>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 bg-primary-container/8 rounded-xl lg:rounded-2xl px-2.5 lg:px-3.5 py-2 lg:py-2.5">
                <span className="text-[14px] lg:text-[18px]">🧬</span>
                <div>
                  <p className="text-[9px] lg:text-[11px] font-bold text-primary-container leading-none">3 products matched</p>
                  <p className="hidden lg:block text-[10px] text-on-surface-variant/50 mt-0.5">Personalised to your profile</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="rounded-2xl lg:rounded-3xl bg-white border border-outline-variant/10 overflow-hidden flex flex-col shadow-sm min-h-[160px] lg:min-h-[220px]"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, margin: "-60px" }}
              transition={{ duration: 0.4, delay: 0.12 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <div className="px-3 lg:px-5 pt-3 lg:pt-5 pb-2 lg:pb-3 border-b border-outline-variant/8">
                <p className="text-[9px] lg:text-[10px] font-bold text-primary-container uppercase tracking-wider">AI-matched</p>
                <p className="text-[12px] lg:text-[16px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] mt-0.5">Your supplements</p>
              </div>
              {[
                { img: "https://i.mscwlns.co/media/misc/pdp_rcl/26166752/1.2_d9def6.jpg?tr=w-200", name: "Biotin Gummies", price: "₹499" },
                { img: "https://i.mscwlns.co/media/misc/pdp_rcl/multivitamin-gummies/Slide%201_cn16xu.jpg?tr=w-200", name: "Multivitamin", price: "₹629" },
                { img: "https://i.mscwlns.co/media/misc/pdp_rcl/magnesium-glycinate-gummies-60n/Artboard%201%20%28100%29_lt9fr4.jpg?tr=w-200", name: "Magnesium", price: "₹549" },
              ].map((p) => (
                <div key={p.name} className="flex items-center gap-2 px-3 lg:px-5 py-1.5 lg:py-2.5 border-b border-outline-variant/6 last:border-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt={p.name} className="w-7 lg:w-10 h-7 lg:h-10 rounded-lg lg:rounded-xl object-contain shrink-0 bg-surface-container-low" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] lg:text-[12px] font-bold text-on-surface truncate">{p.name}</p>
                    <p className="text-[10px] lg:text-[12px] font-extrabold text-primary-container font-[family-name:var(--font-manrope)]">{p.price}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div
              className="rounded-2xl lg:rounded-3xl border border-purple-100 p-4 lg:p-5 flex flex-col shadow-sm min-h-[160px] lg:min-h-[220px]"
              style={{ background: "linear-gradient(145deg, #f5f3ff, #faf9ff)" }}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, margin: "-60px" }}
              transition={{ duration: 0.4, delay: 0.19 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <p className="text-[9px] lg:text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2">Insights</p>
              <p className="text-[12px] lg:text-[16px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] mb-3">Track your progress</p>
              <div className="flex items-center gap-2 flex-1">
                <svg width="52" height="52" viewBox="0 0 90 90" className="shrink-0">
                  <circle cx="45" cy="45" r="38" fill="none" stroke="#ede9fe" strokeWidth="8" />
                  <circle cx="45" cy="45" r="38" fill="none" stroke="url(#lg-feat)" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(72 / 100) * 2 * Math.PI * 38} ${2 * Math.PI * 38}`}
                    transform="rotate(-90 45 45)"
                  />
                  <defs>
                    <linearGradient id="lg-feat" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                  </defs>
                  <text x="45" y="42" textAnchor="middle" fill="#1c1b1f" fontSize="17" fontWeight="800" fontFamily="Manrope,sans-serif">72</text>
                  <text x="45" y="54" textAnchor="middle" fill="#9ca3af" fontSize="8" fontWeight="600">/ 100</text>
                </svg>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-1.5 bg-orange-50 rounded-lg px-2 py-1.5">
                    <span className="text-[11px]">🔥</span>
                    <p className="text-[9px] lg:text-[10px] font-extrabold text-on-surface">14 day streak</p>
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {["⚡","😊","⚡","😴","😊","⚡","⚡"].map((e, i) => (
                      <div key={i} className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center">
                        <span className="text-[8px]">{e}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="rounded-2xl lg:rounded-3xl p-4 lg:p-5 flex flex-col min-h-[160px] lg:min-h-[220px]"
              style={{ background: "linear-gradient(145deg, rgba(21,89,74,0.10) 0%, rgba(21,89,74,0.04) 100%)", border: "1px solid rgba(21,89,74,0.10)" }}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, margin: "-60px" }}
              transition={{ duration: 0.4, delay: 0.26 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <p className="text-[9px] lg:text-[10px] font-bold text-primary-container uppercase tracking-wider mb-1.5">Family</p>
              <p className="text-[12px] lg:text-[18px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-snug mb-3">
                One app,<br />whole family
              </p>
              <div className="flex gap-1.5 mb-auto">
                {[
                  { label: "You",     emoji: "🧑", bg: "bg-teal-50",   border: "border-teal-200",   text: "text-teal-700" },
                  { label: "Partner", emoji: "👩", bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
                  { label: "Kids",    emoji: "👧", bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700" },
                ].map((m) => (
                  <div key={m.label} className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl border ${m.bg} ${m.border}`}>
                    <span className="text-[16px] lg:text-[22px]">{m.emoji}</span>
                    <span className={`text-[8px] lg:text-[10px] font-bold ${m.text}`}>{m.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-1 bg-surface/60 rounded-lg px-2.5 py-1.5">
                <span className="text-[10px]">⚡</span>
                <p className="text-[9px] lg:text-[11px] text-on-surface-variant/60">Protocol in 60s</p>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="px-6 lg:px-16 py-16 lg:py-24 border-t border-outline-variant/10">
        <div className="max-w-2xl mx-auto lg:max-w-4xl">
          <motion.p
            className="text-[12px] font-bold text-primary-container uppercase tracking-widest mb-3 text-center"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-60px" }}
            transition={{ duration: 0.4 }}
          >
            Simple as 1-2-3
          </motion.p>
          <motion.h2
            className="text-[26px] lg:text-[40px] font-extrabold text-on-surface text-center mb-12 font-[family-name:var(--font-manrope)] leading-tight"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-60px" }}
            transition={{ duration: 0.4, delay: 0.08 }}
          >
            Your protocol in 3 steps
          </motion.h2>
          <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                className="flex-1 flex lg:flex-col items-start gap-4 lg:gap-3 bg-surface-container/50 rounded-2xl p-5 border border-outline-variant/10"
                initial={{ opacity: 0, x: -32 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.12 }}
                whileHover={{ x: 4, transition: { duration: 0.2 } }}
              >
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-container/10 shrink-0">
                  <span className="text-[22px]">{step.emoji}</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-primary-container uppercase tracking-wider mb-1">{step.number}</p>
                  <p className="text-[15px] lg:text-[17px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] mb-1.5">{step.title}</p>
                  <p className="text-[14px] text-on-surface-variant/75 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCT SHOWCASE ── */}
      <section className="px-6 lg:px-16 py-16 lg:py-24 border-t border-outline-variant/10" style={{ background: "linear-gradient(180deg, rgba(21,89,74,0.04) 0%, transparent 100%)" }}>
        <div className="max-w-2xl mx-auto lg:max-w-4xl">
          <motion.p
            className="text-[12px] font-bold text-primary-container uppercase tracking-widest mb-3 text-center"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-60px" }}
            transition={{ duration: 0.4 }}
          >
            AI-matched picks
          </motion.p>
          <motion.h2
            className="text-[26px] lg:text-[40px] font-extrabold text-on-surface text-center mb-3 font-[family-name:var(--font-manrope)] leading-tight"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-60px" }}
            transition={{ duration: 0.4, delay: 0.08 }}
          >
            What goes into your protocol
          </motion.h2>
          <motion.p
            className="text-[15px] text-on-surface-variant/70 text-center mb-10 leading-relaxed"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, margin: "-60px" }}
            transition={{ duration: 0.4, delay: 0.14 }}
          >
            Every product matched to your specific profile. Not generic, not random.
          </motion.p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {products.map((p, i) => (
              <motion.div
                key={p.name}
                className={`rounded-2xl overflow-hidden border bg-gradient-to-br ${p.color} ${p.border} cursor-pointer`}
                style={{ transformStyle: "preserve-3d", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: false, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = (e.clientX - rect.left) / rect.width - 0.5;
                  const y = (e.clientY - rect.top) / rect.height - 0.5;
                  e.currentTarget.style.transform = `perspective(700px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) scale(1.03)`;
                  e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "perspective(700px) rotateY(0deg) rotateX(0deg) scale(1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div className="w-full h-52 lg:h-64 bg-white/80 flex items-center justify-center p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt={p.name} className="w-full h-full object-contain" />
                </div>
                <div className="p-4 lg:p-5">
                  <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider mb-1">{p.brand}</p>
                  <p className="text-[15px] lg:text-[17px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-snug mb-1">{p.name}</p>
                  <p className="text-[13px] text-on-surface-variant/65">{p.concern}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="px-6 lg:px-16 py-16 lg:py-24 border-t border-outline-variant/10">
        <div className="max-w-2xl mx-auto lg:max-w-3xl">
          <motion.h2
            className="text-[22px] lg:text-[32px] font-extrabold text-on-surface text-center mb-12 font-[family-name:var(--font-manrope)]"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-60px" }}
            transition={{ duration: 0.4 }}
          >
            Built for real results
          </motion.h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                className="flex flex-col items-center text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <p className="text-[42px] lg:text-[52px] font-extrabold text-primary-container font-[family-name:var(--font-manrope)] leading-none mb-2">
                  <CountUp to={s.to} suffix={s.suffix} />
                </p>
                <p className="text-[14px] text-on-surface-variant/70 font-semibold">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="px-4 lg:px-16 pb-12 lg:pb-20">
        <motion.div
          className="rounded-3xl px-8 py-12 lg:py-16 text-center"
          style={{ background: "linear-gradient(135deg, #004f54 0%, #15594a 100%)" }}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <motion.p
            className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, margin: "-60px" }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            Get started free
          </motion.p>
          <motion.h2
            className="text-[26px] lg:text-[40px] font-extrabold text-white font-[family-name:var(--font-manrope)] leading-tight mb-4"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-60px" }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            Ready to build your<br />health protocol?
          </motion.h2>
          <motion.p
            className="text-[15px] text-white/75 mb-8 max-w-sm mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, margin: "-60px" }}
            transition={{ duration: 0.4, delay: 0.28 }}
          >
            Join thousands building smarter health habits with BetterHalf.

          </motion.p>
          <motion.button
            onClick={handleDemo}
            className="inline-flex items-center gap-3 bg-white text-primary-container font-bold text-[15px] px-8 py-4 rounded-2xl hover:bg-white/90 transition-colors cursor-pointer"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-60px" }}
            transition={{ duration: 0.4, delay: 0.35 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <span>Build my protocol in 60 seconds</span>
            <span className="text-xl">→</span>
          </motion.button>
          <motion.p
            className="mt-5 text-[13px] text-white/55"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, margin: "-60px" }}
            transition={{ duration: 0.4, delay: 0.42 }}
          >
            By Mosaic Wellness · Makers of Man Matters &amp; Be Bodywise
          </motion.p>
        </motion.div>
      </section>

    </main>
  );
}
