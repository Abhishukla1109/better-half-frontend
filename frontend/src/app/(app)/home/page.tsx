"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ChevronRight, Check } from "lucide-react";
import GreetingCard from "@/components/feed/cards/GreetingCard";
import ConcernCard from "@/components/feed/cards/ConcernCard";
import ProfilingCard from "@/components/feed/cards/ProfilingCard";
import UserMessageCard from "@/components/feed/cards/UserMessageCard";
import { supabase } from "@/lib/supabase/client";

type ProfileLevel = "L0" | "L1" | "L2" | "L3";

interface UserProfile {
  concern: string;
  concerns?: string; // comma-separated list of all selected concerns
  name?: string;
  sex: string;
  age: string;
  diet: string;
  // L3 deepening fields (keyed by bucket question keys)
  [key: string]: string | undefined;
}

/* ── Smart concern qualifier questions ────────────────────────
   Asked immediately after concern selection to sharpen product
   mapping without waiting for the full profiling flow.
   Keys stored in profile match the question-bank keys so they
   automatically deepen personalisation downstream.
   ─────────────────────────────────────────────────────────── */
interface QualifierOption { label: string; value: string; }
interface QualifierDef { question: string; key: string; options: QualifierOption[]; }

const CONCERN_QUALIFIERS: Record<string, (sex?: string) => QualifierDef> = {
  "Hair / beard": () => ({
    question: "What's your main hair concern?",
    key: "hair_concern_type",
    options: [
      { label: "Hair fall & thinning",  value: "thinning"    },
      { label: "Dandruff & itchy scalp", value: "dandruff"   },
      { label: "Slow / no growth",       value: "slow_growth" },
      { label: "Breakage & dryness",     value: "breakage"    },
    ],
  }),
  "Skin / acne": (sex) => ({
    question: "When do you break out most?",
    key: "skin_concern_type",
    options: sex === "female" ? [
      { label: "Before my period", value: "hormonal" },
      { label: "Constantly",       value: "chronic"  },
      { label: "After junk food",  value: "dietary"  },
      { label: "When stressed",    value: "stress"   },
    ] : [
      { label: "Constantly",        value: "chronic"  },
      { label: "After oily food",   value: "dietary"  },
      { label: "When stressed",     value: "stress"   },
      { label: "Randomly / hormonal", value: "hormonal" },
    ],
  }),
  "Energy / gut": () => ({
    question: "What bothers you most?",
    key: "energy_concern_type",
    options: [
      { label: "Low energy all day", value: "low_energy" },
      { label: "Afternoon crash",    value: "afternoon"  },
      { label: "Bloating & gut",     value: "gut"        },
      { label: "Brain fog",          value: "brain_fog"  },
    ],
  }),
  "Weight": () => ({
    question: "What's your main goal?",
    key: "weight_goal",
    options: [
      { label: "Lose fat",     value: "fat_loss"        },
      { label: "Build muscle", value: "muscle_gain"     },
      { label: "Both",         value: "body_recomp"     },
      { label: "Get fitter",   value: "general_fitness" },
    ],
  }),
  "Hormones": (sex) => sex === "female" ? {
    question: "What's your main hormonal concern?",
    key: "hormone_concern_type",
    options: [
      { label: "Irregular periods", value: "irregular"     },
      { label: "PCOS symptoms",     value: "pcos"          },
      { label: "PMS & mood swings", value: "pms"           },
      { label: "Hormonal acne",     value: "hormonal_acne" },
    ],
  } : {
    question: "What are you looking to improve?",
    key: "hormone_concern_type",
    options: [
      { label: "Energy & drive",    value: "energy_drive" },
      { label: "Muscle & strength", value: "muscle"       },
      { label: "Mood & focus",      value: "mood_focus"   },
      { label: "Sleep quality",     value: "sleep"        },
    ],
  },
  "Sleep / mind": () => ({
    question: "What's your main struggle?",
    key: "sleep_concern_type",
    options: [
      { label: "Can't fall asleep", value: "onset"   },
      { label: "Wake up at night",  value: "waking"  },
      { label: "Wake up exhausted", value: "quality" },
      { label: "Anxious mind",      value: "anxiety" },
    ],
  }),
};

// Shown when 2+ concerns are selected — asks about the root cause driver instead of
// repeating a question per concern
const MULTI_CONCERN_QUALIFIER: QualifierDef = {
  question: "What do you think is driving most of this?",
  key: "multi_concern_driver",
  options: [
    { label: "Stress & lifestyle",  value: "stress"    },
    { label: "Poor sleep",          value: "poor_sleep" },
    { label: "Diet & gut health",   value: "diet"      },
    { label: "Hormonal changes",    value: "hormonal"  },
  ],
};

const SNEAK_PEEK = [
  { slug: "biotin-zinc-hair",     name: "Biotin Hair Gummies",                  price: 499,  original: 599,  img: "https://i.mscwlns.co/media/misc/pdp_rcl/hair-health-gummies/4%25AHABHARollOn%20%281%29_hk8vt2.jpg?tr=w-400" },
  { slug: "ashwagandha-ksm66",    name: "Ashwagandha Gummies",                  price: 629,  original: 799,  img: "https://i.mscwlns.co/media/misc/pdp_rcl/13222757/Ashwa%20Gummies%20%281%29_jjrtro.png?tr=w-400"           },
  { slug: "whey-protein-isolate", name: "Whey Protein",                         price: 999,  original: 1299, img: "https://i.mscwlns.co/media/misc/pdp/26166740/Whey-Protein-Powder_600X600__mB6ULq4bQ.png?tr=w-400"        },
  { slug: "magnesium-b6",         name: "Magnesium Glycinate Gummies",          price: 899,  original: 1099, img: "https://i.mscwlns.co/media/misc/pdp_rcl/2024494/Magnesium%20Gummies_br8d83.jpg?tr=w-400"                  },
  { slug: "creatine-monohydrate", name: "Micronised Creatine Monohydrate",      price: 549,  original: 699,  img: "https://i.mscwlns.co/media/misc/pdp_rcl/2025071/Creatine%20Powder%20Lemon%20125gm_5bjt7h.png?tr=w-400"    },
];

function bucketAge(age: number): string {
  if (age <= 24) return "18-24";
  if (age <= 34) return "25-34";
  if (age <= 44) return "35-44";
  return "45+";
}

function ageBucketLabel(bucket: string): string {
  const map: Record<string, string> = { "18-24": "18–24", "25-34": "25–34", "35-44": "35–44", "45+": "45+" };
  return map[bucket] ?? bucket;
}

export default function HomePage() {
  const [showSplash, setShowSplash] = useState(true);
  const [ageSlider, setAgeSlider] = useState(26);
  const [level, setLevel] = useState<ProfileLevel>("L0");
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [userMessages, setUserMessages] = useState<string[]>([]);
  // Name state
  const [name, setName] = useState<string>("");
  const [nameText, setNameText] = useState<string>("");
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [nameEditing, setNameEditing] = useState(false);

  // All selected concerns (multi-select from ConcernCard)
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);

  // Protocol generation overlay
  const [showGenerating, setShowGenerating] = useState(false);
  const [generatingPhase, setGeneratingPhase] = useState<"generating" | "ready">("generating");

  // Tracks whether we've attempted to restore state — prevents saving before restore
  const [restored, setRestored] = useState(false);

  const router = useRouter();

  // Bump this whenever the saved-state shape changes — auto-clears old data
  const STATE_VERSION = "bh_v2";

  // Restore onboarding state from localStorage on mount
  useEffect(() => {
    // If onboarding is complete (profile with diet exists), go straight to protocol
    // — UNLESS the user explicitly navigated back to edit (?edit=true)
    const isEditMode = window.location.search.includes("edit=true");
    if (!isEditMode) {
      try {
        const raw = localStorage.getItem("bh_profile");
        if (raw) {
          const p = JSON.parse(raw);
          if (p?.diet) { router.replace("/protocol"); return; }
        }
      } catch {}
    }

    // ?reset clears everything and starts fresh (used for testing / demos)
    if (window.location.search.includes("reset")) {
      localStorage.removeItem("bh_onboarding_state");
      localStorage.removeItem("bh_profile");
      localStorage.removeItem("bh_protocol_built");
      window.history.replaceState({}, "", window.location.pathname);
      setRestored(true);
      return;
    }

    try {
      const saved = localStorage.getItem("bh_onboarding_state");
      if (saved) {
        const state = JSON.parse(saved) as {
          _version?: string;
          name?: string;
          selectedConcerns?: string[];
          profile?: Partial<UserProfile>;
          level?: ProfileLevel;
          userMessages?: string[];
        };

        // Old version data — clear it silently and start fresh
        if (state._version !== STATE_VERSION) {
          localStorage.removeItem("bh_onboarding_state");
          localStorage.removeItem("bh_profile");
          localStorage.removeItem("bh_protocol_built");
          setRestored(true);
          return;
        }

        if (state.name) { setName(state.name); setNameSubmitted(true); }
        if (state.selectedConcerns?.length) setSelectedConcerns(state.selectedConcerns);
        if (state.profile) setProfile(state.profile);
        if (state.level) setLevel(state.level);
        if (state.userMessages) setUserMessages(state.userMessages);
        if (state.level && state.level !== "L0") setNameSubmitted(true);
        setShowSplash(false);
      }
    } catch {}
    setRestored(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist onboarding state to localStorage after every relevant change
  useEffect(() => {
    if (!restored) return;
    if (level === "L0" && selectedConcerns.length === 0) return; // nothing to save yet
    try {
      localStorage.setItem("bh_onboarding_state", JSON.stringify({
        _version: STATE_VERSION,
        name, selectedConcerns, profile, level, userMessages,
      }));
    } catch {}
  }, [name, selectedConcerns, profile, level, userMessages, restored, STATE_VERSION]);

  const scrollToCard = useCallback((cardId: string) => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.getElementById(cardId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 180);
    });
  }, []);

  const handleConcernSelect = useCallback((concerns: string[]) => {
    setSelectedConcerns(concerns);
    setProfile((p) => ({ ...p, concern: concerns[0], concerns: concerns.join(",") }));
    // Multi-concern → umbrella question. Single concern with qualifier → that question.
    // Otherwise advance straight to L1.
    const isMulti = concerns.length > 1;
    const hasSingleQualifier = !isMulti && concerns[0] && CONCERN_QUALIFIERS[concerns[0]];
    if (isMulti || hasSingleQualifier) {
      scrollToCard("card-qualifier");
    } else {
      setLevel("L1");
      scrollToCard("card-diet");
    }
  }, [scrollToCard]);

  const handleQualifierAnswer = useCallback((key: string, value: string) => {
    if (key) setProfile((p) => ({ ...p, [key]: value }));
    setLevel("L1");
    scrollToCard("card-diet");
  }, [scrollToCard]);

  const handleConcernText = useCallback((text: string) => {
    setUserMessages((m) => [...m, text]);
    const lower = text.toLowerCase();
    let matched = "Energy / gut";
    if (lower.includes("hair") || lower.includes("bald") || lower.includes("beard")) matched = "Hair / beard";
    else if (lower.includes("skin") || lower.includes("acne") || lower.includes("pimple")) matched = "Skin / acne";
    else if (lower.includes("weight") || lower.includes("fat") || lower.includes("thin")) matched = "Weight";
    else if (lower.includes("hormone") || lower.includes("pcos") || lower.includes("period")) matched = "Hormones";
    else if (lower.includes("sleep") || lower.includes("stress") || lower.includes("anxiety") || lower.includes("mind")) matched = "Sleep / mind";
    setSelectedConcerns([matched]);
    setProfile((p) => ({ ...p, concern: matched, concerns: matched }));
    setLevel("L1");
    scrollToCard("card-diet");
  }, [scrollToCard]);

  const handleNameSubmit = useCallback((submittedName: string) => {
    const trimmed = submittedName.trim();
    if (trimmed) {
      setName(trimmed);
      setProfile((p) => ({ ...p, name: trimmed }));
    }
    setNameSubmitted(true);
    setNameEditing(false);
    scrollToCard("card-sex");
  }, [scrollToCard]);

  const handleSexSelect = useCallback((sex: string) => {
    setProfile((p) => ({ ...p, sex }));
    scrollToCard("card-age");
  }, [scrollToCard]);

  const handleAgeSelect = useCallback((age: string) => {
    setProfile((p) => ({ ...p, age }));
    scrollToCard("card-concern");
  }, [scrollToCard]);

  const handleDietSelect = useCallback((diet: string) => {
    const fullProfile = {
      ...profile,
      diet,
      concerns: selectedConcerns.join(","),
      name: name || undefined,
    };
    setProfile((p) => ({ ...p, diet }));
    setLevel("L3");
    localStorage.setItem("bh_profile", JSON.stringify(fullProfile));

    // Persist to Supabase (fire-and-forget, doesn't block UI)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from("profiles").upsert({ id: session.user.id, data: fullProfile }).then(() => {});
      }
    });

    setGeneratingPhase("generating");
    setShowGenerating(true);
    setTimeout(() => setGeneratingPhase("ready"), 2800);
  }, [profile, selectedConcerns, name]);

  /* ═══════════════════════════════════════════════════════
     PROTOCOL GENERATION + FAKE AUTH OVERLAY
     — checked before L3 so it renders on top when transitioning
     ═══════════════════════════════════════════════════════ */
  if (showGenerating) {
    return (
      <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-surface px-6">

        {/* Generating phase */}
        {generatingPhase === "generating" && (
          <div className="flex flex-col items-center text-center animate-fade-in-up">
            {/* Pulsing ring */}
            <div className="relative flex items-center justify-center w-24 h-24 mb-8">
              <div className="absolute inset-0 rounded-full bg-primary-container/15 animate-ping" style={{ animationDuration: "1.4s" }} />
              <div className="absolute inset-2 rounded-full bg-primary-container/10" />
              <Sparkles className="relative w-9 h-9 text-primary-container" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-extrabold text-on-surface font-[family-name:var(--font-manrope)] mb-3">
              Building your protocol…
            </h2>
            <p className="text-sm text-on-surface-variant/70 max-w-xs leading-relaxed">
              Analysing your profile across 6.5M Indian health journeys to find your exact match.
            </p>
            {/* Animated progress dots */}
            <div className="flex gap-2 mt-8">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary-container/40 animate-pulse"
                  style={{ animationDelay: `${i * 250}ms` }}
                />
              ))}
            </div>
            {/* Step labels that cycle */}
            <div className="mt-6 space-y-1.5 text-left w-full max-w-xs">
              {["Matching your concern profile", "Scoring 86 products", "Personalising daily routine"].map((step, i) => (
                <div key={i} className="flex items-center gap-2.5 animate-fade-in-up" style={{ animationDelay: `${i * 600 + 200}ms` }}>
                  <div className="w-4 h-4 rounded-full bg-primary-container/15 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-primary-container" strokeWidth={2.5} />
                  </div>
                  <span className="text-xs text-on-surface-variant/60">{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ready phase */}
        {generatingPhase === "ready" && (
          <div className="flex flex-col items-center text-center animate-fade-in-up w-full max-w-xs">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary-container/15 mb-6">
              <Check className="w-9 h-9 text-primary-container" strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-extrabold text-on-surface font-[family-name:var(--font-manrope)] mb-2">
              Your protocol is ready!
            </h2>
            <p className="text-sm text-on-surface-variant/70 leading-relaxed mb-8">
              We&apos;ve built a personalised plan based on your profile.
            </p>
            <button
              onClick={() => router.replace("/protocol")}
              className="w-full py-4 rounded-2xl bg-primary-container text-white font-bold text-base hover:bg-primary transition-colors duration-200 cursor-pointer"
            >
              View my protocol →
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     SPLASH SCREEN — first-time welcome
     ═══════════════════════════════════════════════════════ */
  if (showSplash) {
    return (
      <div
        className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-surface splash-exit"
        onAnimationEnd={(e) => {
          if (e.animationName === "splashExit") setShowSplash(false);
        }}
      >
        {/* Ambient glow */}
        <div className="absolute w-72 h-72 rounded-full bg-primary-container/10 splash-glow" />

        {/* Logo mark */}
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-container/15 mb-8 splash-text-1">
          <Sparkles className="w-7 h-7 text-primary-container" strokeWidth={1.5} />
        </div>

        {/* Welcome text */}
        <h1 className="text-2xl font-extrabold text-primary text-center leading-snug tracking-tight font-[family-name:var(--font-manrope)] splash-text-1 px-8">
          Welcome{name ? `, ${name}` : ""}.
        </h1>
        <p className="text-base text-on-surface-variant text-center mt-3 max-w-xs leading-relaxed splash-text-2 px-8">
          Let&apos;s start your personalised health journey.
        </p>

        {/* Subtle brand footer */}
        <p className="absolute bottom-8 text-[10px] text-on-surface-variant/30 uppercase tracking-widest splash-text-2">
          BetterHalf
        </p>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     L0 → L2: ONBOARDING CONVERSATION
     ═══════════════════════════════════════════════════════ */
  return (
    <div className="px-4 py-4">
      <div className="flex flex-col gap-3">

        {/* L0: Greeting */}
        <GreetingCard
          name={name}
          contextLine="I work best the more I know about you. No forms — just a conversation."
        />

        {/* What you'll get strip */}
        <div className="feed-card px-4 py-3.5 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center justify-between gap-2">
            {[
              { icon: "✦", label: "Personalised supplement protocol" },
              { icon: "⏱", label: "Ready in 60 seconds" },
              { icon: "★", label: "Follow up, not forgotten" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1 flex-1 text-center">
                <span className="text-[15px] leading-none text-primary-container">{item.icon}</span>
                <span className="text-[10px] font-semibold text-on-surface-variant/70 leading-tight">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Name — first thing, right after greeting */}
        <div id="card-name" className="feed-card-ai p-5 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
          {nameSubmitted && !nameEditing ? (
            <div className="flex items-center gap-2 animate-fade-in-up flex-wrap">
              <p className="text-sm text-on-surface-variant">I&apos;ll call you</p>
              <span className="inline-block px-4 py-2.5 rounded-xl bg-primary-container/15 border border-primary-container/20 text-sm font-semibold text-primary-container">
                {name || "friend"}
              </span>
              <button
                onClick={() => setNameEditing(true)}
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-container-low cursor-pointer transition-colors"
                aria-label="Edit name"
              >
                <svg className="w-3.5 h-3.5 text-on-surface-variant/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
              </button>
            </div>
          ) : (
            <>
              <p className="text-base text-on-surface leading-relaxed">What should I call you?</p>
              <div className="mt-3 flex items-center gap-2 bg-surface-container-low rounded-xl px-4 py-3 border border-outline-variant/15">
                <input
                  type="text"
                  value={nameText}
                  onChange={(e) => setNameText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleNameSubmit(nameText); }}
                  placeholder="Your name"
                  className="flex-1 bg-transparent text-base text-on-surface placeholder:text-on-surface-variant/40 outline-none"
                  autoFocus
                />
                {nameText.trim() && (
                  <button
                    onClick={() => handleNameSubmit(nameText)}
                    className="text-sm font-semibold text-primary cursor-pointer hover:text-primary-container transition-colors"
                  >
                    Continue
                  </button>
                )}
              </div>
              <button
                onClick={() => handleNameSubmit("")}
                className="mt-2 text-xs text-on-surface-variant/50 cursor-pointer hover:text-on-surface-variant transition-colors"
              >
                Skip
              </button>
            </>
          )}
        </div>

        {/* Step 1: Gender — visual tile card */}
        <div id="card-sex" className="feed-card-ai p-5 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
          <p className="text-base text-on-surface leading-relaxed">Who are we building this for?</p>

          {!profile.sex ? (
            <>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {/* Male tile */}
                <button
                  onClick={() => handleSexSelect("male")}
                  className="group relative flex flex-col justify-end overflow-hidden rounded-2xl border-2 border-outline-variant/10 hover:border-primary-container/50 transition-all duration-200 cursor-pointer h-[148px]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/concerns/hair-male.jpg" alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                  <div className="relative px-3.5 pb-3.5 text-left">
                    <p className="text-[10px] font-semibold text-white/65 uppercase tracking-wider leading-none mb-0.5">For me</p>
                    <p className="text-[15px] font-extrabold text-white leading-tight">A man</p>
                  </div>
                </button>

                {/* Female tile */}
                <button
                  onClick={() => handleSexSelect("female")}
                  className="group relative flex flex-col justify-end overflow-hidden rounded-2xl border-2 border-outline-variant/10 hover:border-rose-300/60 transition-all duration-200 cursor-pointer h-[148px]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/concerns/hair-female.jpg" alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                  <div className="relative px-3.5 pb-3.5 text-left">
                    <p className="text-[10px] font-semibold text-white/65 uppercase tracking-wider leading-none mb-0.5">For me</p>
                    <p className="text-[15px] font-extrabold text-white leading-tight">A woman</p>
                  </div>
                </button>
              </div>
              <button
                onClick={() => handleSexSelect("undisclosed")}
                className="mt-3 text-xs text-on-surface-variant/45 cursor-pointer hover:text-on-surface-variant transition-colors"
              >
                I&apos;d rather not say
              </button>
            </>
          ) : (
            <div className="mt-3 flex items-center gap-3 animate-fade-in-up">
              {profile.sex !== "undisclosed" && (
                <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-outline-variant/15">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={profile.sex === "male" ? "/images/concerns/hair-male.jpg" : "/images/concerns/hair-female.jpg"}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <span className="flex-1 text-sm font-semibold text-primary-container">
                {profile.sex === "male" ? "For me — a man" : profile.sex === "female" ? "For me — a woman" : "I'd rather not say"}
              </span>
              <button
                onClick={() => {
                  setProfile((p) => ({ ...p, sex: undefined, age: undefined, concern: undefined, concerns: undefined }));
                  setSelectedConcerns([]);
                  setLevel("L0");
                }}
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-container-low cursor-pointer transition-colors shrink-0"
                aria-label="Edit selection"
              >
                <svg className="w-3.5 h-3.5 text-on-surface-variant/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
              </button>
            </div>
          )}
        </div>

        {/* Marketplace sneak peek — visible before gender selection */}
        {!profile.sex && (
          <div className="feed-card overflow-hidden animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-bold text-on-surface">Rather browse first?</p>
                <p className="text-[11px] text-on-surface-variant/55 mt-0.5">Explore our full range without any forms</p>
              </div>
              <button
                onClick={() => router.push("/explore?from=skip")}
                className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-primary-container hover:text-primary transition-colors cursor-pointer mt-0.5"
              >
                See all <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Product scroll strip */}
            <div className="flex gap-3 px-4 pb-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {SNEAK_PEEK.map((p) => (
                <button
                  key={p.slug}
                  onClick={() => router.push(`/explore/product/${p.slug}`)}
                  className="flex-shrink-0 w-[108px] text-left cursor-pointer group"
                >
                  <div className="w-full h-[96px] rounded-xl overflow-hidden bg-surface-container-low mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.img}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <p className="text-[11px] font-semibold text-on-surface leading-tight line-clamp-2 mb-1">{p.name}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-bold text-on-surface">₹{p.price}</span>
                    <span className="text-[10px] text-on-surface-variant/40 line-through">₹{p.original}</span>
                  </div>
                </button>
              ))}
              {/* Browse all end cap */}
              <button
                onClick={() => router.push("/explore?from=skip")}
                className="flex-shrink-0 w-[80px] flex flex-col items-center justify-center gap-2 rounded-xl border border-outline-variant/15 bg-surface-container-lowest cursor-pointer hover:bg-primary-container/5 hover:border-primary-container/30 transition-colors h-[96px]"
              >
                <span className="text-2xl">→</span>
                <span className="text-[10px] font-bold text-primary-container text-center leading-tight">Browse all</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Age — shown after gender */}
        {profile.sex && (
          <div id="card-age" className="feed-card-ai p-5 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <p className="text-base text-on-surface leading-relaxed">And roughly how old are you?</p>

            {profile.age ? (
              <div className="mt-3 flex items-center gap-2 animate-fade-in-up">
                <span className="inline-block px-4 py-2.5 rounded-xl bg-primary-container/15 border border-primary-container/20 text-sm font-semibold text-primary-container">
                  {ageBucketLabel(profile.age)} years old
                </span>
                <button
                  onClick={() => {
                    setProfile((p) => ({ ...p, age: undefined, concern: undefined, concerns: undefined }));
                    setSelectedConcerns([]);
                    setLevel("L0");
                  }}
                  className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-container-low cursor-pointer transition-colors"
                  aria-label="Edit age"
                >
                  <svg className="w-3.5 h-3.5 text-on-surface-variant/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
                </button>
              </div>
            ) : (
              <>
                <div className="mt-6 mb-1 flex flex-col items-center">
                  <span className="text-[64px] font-extrabold text-primary-container leading-none tracking-tight">{ageSlider}</span>
                  <span className="text-xs text-on-surface-variant/50 mt-1 uppercase tracking-widest font-semibold">years old</span>
                </div>

                <div className="px-1 mt-5 mb-5">
                  <input
                    type="range"
                    min={18}
                    max={65}
                    value={ageSlider}
                    onChange={(e) => setAgeSlider(Number(e.target.value))}
                    className="w-full h-[6px] rounded-full cursor-pointer appearance-none"
                    style={{
                      accentColor: "var(--color-primary-container)",
                      background: `linear-gradient(to right, var(--color-primary-container) 0%, var(--color-primary-container) ${((ageSlider - 18) / (65 - 18)) * 100}%, #e4e2de ${((ageSlider - 18) / (65 - 18)) * 100}%, #e4e2de 100%)`,
                    }}
                  />
                  <div className="flex justify-between mt-2">
                    <span className="text-[11px] text-on-surface-variant/40 font-medium">18</span>
                    <span className="text-[11px] text-on-surface-variant/40 font-medium">65+</span>
                  </div>
                </div>

                <button
                  onClick={() => handleAgeSelect(bucketAge(ageSlider))}
                  className="w-full py-3 rounded-xl bg-primary-container text-sm font-semibold text-white cursor-pointer hover:bg-primary transition-colors duration-200"
                >
                  Continue
                </button>
                <button
                  onClick={() => handleAgeSelect("unknown")}
                  className="mt-2 text-xs text-on-surface-variant/50 cursor-pointer hover:text-on-surface-variant transition-colors"
                >
                  Rather not say
                </button>
              </>
            )}
          </div>
        )}

        {/* Step 3: Concerns — gender-aware, shown after sex + age */}
        {profile.sex && profile.age && (
          <div id="card-concern">
            <ConcernCard
              sex={profile.sex}
              onSelect={handleConcernSelect}
              onTextSubmit={handleConcernText}
            />
          </div>
        )}

        {/* Smart qualifier — shown right after concern selection */}
        {level === "L0" && selectedConcerns.length > 0 && (() => {
          let qualifier: QualifierDef | null = null;
          if (selectedConcerns.length > 1) {
            qualifier = MULTI_CONCERN_QUALIFIER;
          } else {
            const qualifierFn = CONCERN_QUALIFIERS[selectedConcerns[0]];
            qualifier = qualifierFn ? qualifierFn(profile.sex) : null;
          }
          if (!qualifier) return null;
          return (
            <div id="card-qualifier" className="feed-card-ai p-5 animate-fade-in-up">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-primary-container" strokeWidth={1.5} />
                <span className="text-[11px] font-semibold text-primary-container uppercase tracking-wider">
                  One quick thing
                </span>
              </div>
              <p className="text-base text-on-surface leading-snug mb-4">{qualifier.question}</p>
              <div className="grid grid-cols-2 gap-2">
                {qualifier.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleQualifierAnswer(qualifier.key, opt.value)}
                    className="chip-option py-3 px-3.5 rounded-xl border border-outline-variant/15 bg-surface-container-lowest text-[13px] font-semibold text-on-surface text-left hover:border-primary-container/40 hover:bg-primary-container/5 transition-all duration-200 cursor-pointer"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleQualifierAnswer("", "")}
                className="mt-3 text-xs text-on-surface-variant/45 cursor-pointer hover:text-on-surface-variant transition-colors"
              >
                Skip this
              </button>
            </div>
          );
        })()}

        {userMessages.length > 0 && level !== "L0" && (
          <UserMessageCard message={userMessages[0]} />
        )}

        {/* L1: Profiling — diet only (sex + age now collected before concerns) */}
        {level !== "L0" && (
          <div id="card-diet">
            <ProfilingCard
              question="What does your diet look like mostly?"
              reason="Diet type directly affects which nutrients you might be missing."
              options={[
                { label: "Vegetarian", value: "veg",     emoji: "🥦" },
                { label: "Non-veg",    value: "non-veg", emoji: "🍗" },
                { label: "Vegan",      value: "vegan",   emoji: "🌱" },
                { label: "Eggetarian", value: "egg",     emoji: "🥚" },
              ]}
              onSelect={handleDietSelect}
              onSkip={() => handleDietSelect("unknown")}
              layout="grid"
              delay={200}
            />
          </div>
        )}

      </div>
    </div>
  );
}
