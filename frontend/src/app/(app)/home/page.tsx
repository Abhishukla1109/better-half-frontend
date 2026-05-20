"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, ShoppingCart, ChevronRight, Check, Lock, X, Utensils, Pill, Stethoscope, Brain, Activity, Droplets, ClipboardList, ArrowLeft, CircleCheck, ExternalLink } from "lucide-react";
import { shopifyProductUrl } from "@/lib/shopify-url";
import { getTreatmentTypesForConcern } from "@/data/treatment-types";
import type { TreatmentType, TreatmentProduct } from "@/data/treatment-types";
import TreatmentTypeSheet from "@/components/feed/TreatmentTypeSheet";
import GreetingCard from "@/components/feed/cards/GreetingCard";
import ConcernCard from "@/components/feed/cards/ConcernCard";
import InsightCard from "@/components/feed/cards/InsightCard";
import ProfilingCard from "@/components/feed/cards/ProfilingCard";
import NudgeCard from "@/components/feed/cards/NudgeCard";
import SupplementCard from "@/components/feed/cards/SupplementCard";
import ExpertCard from "@/components/feed/cards/ExpertCard";
import MealPhotoCard from "@/components/feed/cards/MealPhotoCard";
import SliderCard from "@/components/feed/cards/SliderCard";
import UserMessageCard from "@/components/feed/cards/UserMessageCard";
import BuildingProtocolCard from "@/components/feed/cards/BuildingProtocolCard";
import FeedInput from "@/components/feed/FeedInput";

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

// Protocol suggestions per concern
const protocolSuggestions: Record<string, { supplements: { name: string; brand: string; timing: string; slug: string }[]; reasoning: string }> = {
  "Hair / beard": {
    supplements: [
      { name: "Iron + Vitamin C", brand: "Be Bodywise", timing: "Morning", slug: "iron-vitamin-c" },
      { name: "Biotin + Zinc", brand: "Man Matters", timing: "Evening", slug: "biotin-zinc-hair" },
    ],
    reasoning: "Based on your profile, iron and biotin gaps are the most likely contributors. This protocol targets follicle strength and growth cycle support.",
  },
  "Skin / acne": {
    supplements: [
      { name: "Daily Probiotics", brand: "Be Bodywise", timing: "Morning", slug: "daily-probiotics" },
      { name: "Ashwagandha KSM-66", brand: "Root Labs", timing: "Evening", slug: "ashwagandha-ksm66" },
    ],
    reasoning: "Probiotics address the gut-skin axis, while ashwagandha reduces cortisol-driven breakouts. This covers the two most common internal drivers of adult acne.",
  },
  "Energy / gut": {
    supplements: [
      { name: "Iron + Vitamin C", brand: "Be Bodywise", timing: "Morning", slug: "iron-vitamin-c" },
      { name: "Daily Probiotics", brand: "Be Bodywise", timing: "Before lunch", slug: "daily-probiotics" },
    ],
    reasoning: "Iron and B12 are your energy foundations. Probiotics help your gut absorb what you eat — fixing the root cause, not the symptom.",
  },
  "Weight": {
    supplements: [
      { name: "Whey Protein Isolate", brand: "OWN", timing: "Post-workout", slug: "whey-protein-isolate" },
      { name: "Ashwagandha KSM-66", brand: "Root Labs", timing: "Evening", slug: "ashwagandha-ksm66" },
    ],
    reasoning: "Protein preserves muscle while losing fat and keeps you full. Ashwagandha manages cortisol, which drives stress-eating and belly fat storage.",
  },
  "Hormones": {
    supplements: [
      { name: "Ashwagandha KSM-66", brand: "Root Labs", timing: "Morning", slug: "ashwagandha-ksm66" },
      { name: "Iron + Vitamin C", brand: "Be Bodywise", timing: "With lunch", slug: "iron-vitamin-c" },
    ],
    reasoning: "Ashwagandha regulates cortisol — the master switch for hormonal balance. Iron supports the pathways that produce and regulate hormones.",
  },
  "Sleep / mind": {
    supplements: [
      { name: "Magnesium B6", brand: "Root Labs", timing: "30 min before bed", slug: "magnesium-b6" },
      { name: "Ashwagandha KSM-66", brand: "Root Labs", timing: "Evening", slug: "ashwagandha-ksm66" },
    ],
    reasoning: "Magnesium activates your parasympathetic nervous system. Ashwagandha reduces cortisol so your brain can actually wind down.",
  },
};

// Protocol buckets — each has questions that feed Protocol Depth
interface BucketQuestion {
  key: string;
  question: string;
  reason: string;
  options: { label: string; value: string }[];
}

interface ProtocolBucket {
  id: string;
  label: string;
  icon: string;
  questions: BucketQuestion[];
  isExternal?: boolean; // for buckets that aren't question-based
}

const protocolBuckets: ProtocolBucket[] = [
  {
    id: "basic",
    label: "Basic Details",
    icon: "check",
    questions: [], // already done via onboarding
  },
  {
    id: "supplements",
    label: "Details & Existing Supplements",
    icon: "pill",
    questions: [
      {
        key: "existingSupplements",
        question: "Are you currently taking any supplements or medicines?",
        reason: "Knowing this helps avoid conflicts and unnecessary overlap.",
        options: [
          { label: "Yes, a few", value: "yes" },
          { label: "Nothing right now", value: "none" },
          { label: "Not sure", value: "unsure" },
        ],
      },
      {
        key: "allergies",
        question: "Any known allergies or intolerances?",
        reason: "This ensures nothing in your protocol triggers a reaction.",
        options: [
          { label: "None", value: "none" },
          { label: "Lactose", value: "lactose" },
          { label: "Gluten", value: "gluten" },
          { label: "Other", value: "other" },
        ],
      },
    ],
  },
  {
    id: "history",
    label: "History & Concern Depth",
    icon: "clipboard",
    questions: [
      {
        key: "concernDuration",
        question: "How long have you been noticing your primary concern?",
        reason: "Duration helps estimate whether this is acute or chronic.",
        options: [
          { label: "A few weeks", value: "weeks" },
          { label: "A few months", value: "months" },
          { label: "6+ months", value: "6months" },
          { label: "Years", value: "years" },
        ],
      },
      {
        key: "familyHistory",
        question: "Does anyone in your family deal with something similar?",
        reason: "Genetics play a significant role in your protocol design.",
        options: [
          { label: "Yes", value: "yes" },
          { label: "No", value: "no" },
          { label: "Not sure", value: "unsure" },
        ],
      },
      {
        key: "previousTreatment",
        question: "Have you tried anything for this before?",
        reason: "Knowing what didn't work helps the AI avoid repeating it.",
        options: [
          { label: "Yes, supplements", value: "supplements" },
          { label: "Yes, prescription", value: "prescription" },
          { label: "Home remedies", value: "remedies" },
          { label: "Nothing yet", value: "none" },
        ],
      },
    ],
  },
  {
    id: "lifestyle",
    label: "Lifestyle Details",
    icon: "activity",
    questions: [
      {
        key: "sleep",
        question: "How's your sleep been generally?",
        reason: "Sleep quality directly affects how your body uses supplements.",
        options: [
          { label: "Rarely good", value: "poor" },
          { label: "Hit or miss", value: "variable" },
          { label: "Mostly fine", value: "good" },
        ],
      },
      {
        key: "activityLevel",
        question: "How active are you on a typical day?",
        reason: "Activity level determines protein targets and recovery needs.",
        options: [
          { label: "Desk-bound", value: "sedentary" },
          { label: "Light activity", value: "light" },
          { label: "Regularly active", value: "active" },
          { label: "Athlete", value: "athlete" },
        ],
      },
      {
        key: "waterIntake",
        question: "Roughly how much water do you drink daily?",
        reason: "Hydration directly affects supplement absorption and gut health.",
        options: [
          { label: "< 1 litre", value: "low" },
          { label: "1–2 litres", value: "moderate" },
          { label: "2–3 litres", value: "good" },
          { label: "3+ litres", value: "high" },
        ],
      },
    ],
  },
  {
    id: "health-data",
    label: "Sync Health Data",
    icon: "droplets",
    questions: [],
    isExternal: true,
  },
  {
    id: "blood-test",
    label: "Blood Test",
    icon: "droplets",
    questions: [],
    isExternal: true,
  },
  {
    id: "expert",
    label: "Medical Expert Evaluation",
    icon: "stethoscope",
    questions: [],
    isExternal: true,
  },
];

// Flatten all questions for depth calculation
const allBucketQuestions = protocolBuckets.flatMap((b) => b.questions);
const depthPerQuestion = 60 / Math.max(allBucketQuestions.length, 1); // 10% base + up to 70% from questions, 20% from external

/* ── Shuffling Hint: cycles through unselected types' whyNeeded ── */
function ShufflingHint({ types, selections, allSelected }: {
  types: TreatmentType[];
  selections: Record<string, { product: TreatmentProduct; status: string }>;
  allSelected: boolean;
}) {
  const unselected = types.filter((t) => !selections[t.id]);
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (unselected.length <= 1) return;
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIdx((prev) => (prev + 1) % unselected.length);
        setFading(false);
      }, 200);
    }, 4000);
    return () => clearInterval(interval);
  }, [unselected.length]);

  if (allSelected || unselected.length === 0) return null;
  const current = unselected[idx % unselected.length];

  return (
    <div className="flex items-start gap-2 px-4 py-2.5 bg-primary-fixed/5 border-t border-outline-variant/8 overflow-hidden">
      <Sparkles className="w-3.5 h-3.5 text-primary-container shrink-0 mt-0.5" strokeWidth={1.5} />
      <p className={`text-xs text-on-surface-variant leading-snug transition-opacity duration-200 ${fading ? "opacity-0" : "opacity-100"}`}>
        <span className="font-semibold text-primary-container">{current.label}:</span>{" "}
        {current.whyNeeded}
      </p>
    </div>
  );
}

export default function HomePage() {
  const [showSplash, setShowSplash] = useState(true);
  const [level, setLevel] = useState<ProfileLevel>("L0");
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [userMessages, setUserMessages] = useState<string[]>([]);
  const [protocolAccepted, setProtocolAccepted] = useState(false);
  const [protocolReady, setProtocolReady] = useState(false);
  const [hasSupply, setHasSupply] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [answeredHistory, setAnsweredHistory] = useState<string[]>([]);
  // Treatment type selections: typeId → { product, status }
  const [typeSelections, setTypeSelections] = useState<Record<string, { product: TreatmentProduct; status: "plan" | "using" | "other" }>>({});
  const [activeTypeSheet, setActiveTypeSheet] = useState<TreatmentType | null>(null);
  const [buildPlanMode, setBuildPlanMode] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);

  // Name state
  const [name, setName] = useState<string>("");
  const [nameText, setNameText] = useState<string>("");
  const [nameSubmitted, setNameSubmitted] = useState(false);

  // All selected concerns (multi-select from ConcernCard)
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);

  // Tracks whether we've attempted to restore state — prevents saving before restore
  const [restored, setRestored] = useState(false);

  const router = useRouter();
  const feedRef = useRef<HTMLDivElement>(null);

  // Bump this whenever the saved-state shape changes — auto-clears old data
  const STATE_VERSION = "bh_v2";

  // Restore onboarding state from localStorage on mount
  useEffect(() => {
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
          protocolAccepted?: boolean;
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
        if (state.protocolAccepted) setProtocolAccepted(true);
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
        name, selectedConcerns, profile, level, userMessages, protocolAccepted,
      }));
    } catch {}
  }, [name, selectedConcerns, profile, level, userMessages, protocolAccepted, restored, STATE_VERSION]);

  // Protocol depth calculation
  const answeredQuestions = allBucketQuestions.filter((q) => profile[q.key]);
  const protocolDepth = Math.min(
    Math.round(10 + answeredQuestions.length * depthPerQuestion),
    70 // max 70% from questions, remaining 30% from external buckets
  );

  // Bucket completion status
  const getBucketStatus = (bucket: ProtocolBucket) => {
    if (bucket.id === "basic") return "done";
    if (bucket.isExternal) return "locked";
    if (bucket.questions.length === 0) return "locked";
    const answered = bucket.questions.filter((q) => profile[q.key]).length;
    if (answered === bucket.questions.length) return "done";
    if (answered > 0) return "partial";
    return "pending";
  };

  // Next unanswered question across all buckets (for the bottom sheet)
  const nextQuestion = allBucketQuestions.find((q) => !profile[q.key]);
  // Which bucket is the next question in?
  const nextBucketForSheet = protocolBuckets.find((b) =>
    b.questions.some((q) => q.key === nextQuestion?.key)
  );

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
    setLevel("L1");
    scrollToCard("card-name");
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
    scrollToCard("card-name");
  }, [scrollToCard]);

  const handleNameSubmit = useCallback((submittedName: string) => {
    const trimmed = submittedName.trim();
    if (trimmed) {
      setName(trimmed);
      setProfile((p) => ({ ...p, name: trimmed }));
    }
    setNameSubmitted(true);
    scrollToCard("card-sex");
  }, [scrollToCard]);

  const handleSexSelect = useCallback((sex: string) => {
    setProfile((p) => ({ ...p, sex }));
    scrollToCard("card-age");
  }, [scrollToCard]);

  const handleAgeSelect = useCallback((age: string) => {
    setProfile((p) => ({ ...p, age }));
    scrollToCard("card-diet");
  }, [scrollToCard]);

  const handleDietSelect = useCallback((diet: string) => {
    setProfile((p) => ({ ...p, diet }));
    setLevel("L2");
    setProtocolReady(false);
    scrollToCard("card-building");
  }, [scrollToCard]);

  const handleProtocolBuilt = useCallback(() => {
    const fullProfile = {
      ...profile,
      concerns: selectedConcerns.join(","),
      name: name || undefined,
    };
    localStorage.setItem("bh_profile", JSON.stringify(fullProfile));
    localStorage.setItem("bh_onboarding_state", JSON.stringify({
      name, selectedConcerns, profile: fullProfile, level: "L3",
      userMessages, protocolAccepted: true,
    }));
    router.push("/protocol");
  }, [profile, selectedConcerns, name, userMessages, router]);

  const handleAcceptProtocol = useCallback(() => {
    setProtocolAccepted(true);
    setLevel("L3");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleDeepeningAnswer = useCallback((key: string, value: string) => {
    setProfile((p) => ({ ...p, [key]: value }));
    setAnsweredHistory((h) => [...h.filter((k) => k !== key), key]);
  }, []);

  const handleSheetBack = useCallback(() => {
    if (answeredHistory.length === 0) {
      setSheetOpen(false);
      return;
    }
    const lastKey = answeredHistory[answeredHistory.length - 1];
    setProfile((p) => { const next = { ...p }; delete next[lastKey]; return next; });
    setAnsweredHistory((h) => h.slice(0, -1));
  }, [answeredHistory]);

  const handleFeedInput = useCallback((message: string) => {
    setUserMessages((m) => [...m, message]);
    // Check if user mentions having supply
    const lower = message.toLowerCase();
    if (lower.includes("already have") || lower.includes("i have") || lower.includes("bought") || lower.includes("ordered")) {
      setHasSupply(true);
    }
  }, []);

  // Auto-advance: after selecting a type, open the next unselected one
  const advanceToNext = useCallback((justSelectedId: string) => {
    if (!buildPlanMode) {
      setActiveTypeSheet(null);
      return;
    }
    const types = getTreatmentTypesForConcern(profile.concern || "");
    const justIdx = types.findIndex((t) => t.id === justSelectedId);
    const next = types.find((t, i) => i > justIdx && !typeSelections[t.id] && t.id !== justSelectedId)
      || types.find((t) => !typeSelections[t.id] && t.id !== justSelectedId);
    if (next) {
      // Swap content in-place — sheet stays mounted, no close/reopen
      setActiveTypeSheet(next);
    } else {
      setActiveTypeSheet(null);
      setBuildPlanMode(false);
    }
  }, [buildPlanMode, profile.concern, typeSelections]);

  const handleTypeAddToPlan = useCallback((typeId: string, product: TreatmentProduct) => {
    setTypeSelections((prev) => ({ ...prev, [typeId]: { product, status: "plan" } }));
    advanceToNext(typeId);
  }, [advanceToNext]);

  const handleTypeAlreadyUsing = useCallback((typeId: string, product: TreatmentProduct) => {
    setTypeSelections((prev) => ({ ...prev, [typeId]: { product, status: "using" } }));
    setHasSupply(true);
    advanceToNext(typeId);
  }, [advanceToNext]);

  const handleTypeUsingOther = useCallback((typeId: string) => {
    setTypeSelections((prev) => ({ ...prev, [typeId]: { product: { id: "other", name: "Custom", brand: "", size: "", price: 0, mrp: 0, usp: "", slug: "", image: "", tags: [] }, status: "other" } }));
    advanceToNext(typeId);
  }, [advanceToNext]);

  const concern = profile.concern || "";
  const protocol = protocolSuggestions[concern];
  const treatmentTypes = getTreatmentTypesForConcern(concern);
  const allTypesSelected = treatmentTypes.length > 0 && treatmentTypes.every((t) => typeSelections[t.id]);

  /* ═══════════════════════════════════════════════════════
     L3: PROFILED HOME — completely different screen
     ═══════════════════════════════════════════════════════ */
  // Track header visibility for sticky depth bar positioning
  const [headerVisible, setHeaderVisible] = useState(true);

  useEffect(() => {
    if (level !== "L3") return;

    const observer = new MutationObserver(() => {
      const header = document.querySelector("[data-header-visible]");
      if (header) {
        setHeaderVisible(header.getAttribute("data-header-visible") === "true");
      }
    });

    const header = document.querySelector("[data-header-visible]");
    if (header) {
      observer.observe(header, { attributes: true, attributeFilter: ["data-header-visible"] });
      setHeaderVisible(header.getAttribute("data-header-visible") === "true");
    }

    return () => observer.disconnect();
  }, [level]);

  // Lock body scroll + hide header when sheet is open
  useEffect(() => {
    if (sheetOpen) {
      document.body.style.overflow = "hidden";
      const header = document.querySelector("[data-header-visible]") as HTMLElement;
      if (header) header.style.transform = "translateY(-100%)";
    } else {
      document.body.style.overflow = "";
      const header = document.querySelector("[data-header-visible]") as HTMLElement;
      if (header) header.style.transform = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sheetOpen]);

  // Bucket icon resolver
  const bucketIcon = (icon: string, className: string) => {
    const props = { className, strokeWidth: 1.5 };
    switch (icon) {
      case "check": return <Check {...props} />;
      case "pill": return <Pill {...props} />;
      case "clipboard": return <ClipboardList {...props} />;
      case "activity": return <Activity {...props} />;
      case "droplets": return <Droplets {...props} />;
      case "stethoscope": return <Stethoscope {...props} />;
      default: return <Sparkles {...props} />;
    }
  };

  if (level === "L3" && protocolAccepted && protocol) {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    return (
      <div ref={feedRef}>
        {/* ── Protocol Depth Bar ── */}
        <div
          className={`px-4 py-3 bg-surface/95 backdrop-blur-sm transition-all duration-300 ease-out ${
            sheetOpen ? "sticky z-[60]" : "relative z-10"
          }`}
          style={{ top: sheetOpen ? "0px" : undefined }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-on-surface-variant">Protocol Depth</span>
            <span className="text-xs font-bold text-primary-container">{protocolDepth}%</span>
          </div>
          <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-container to-primary rounded-full transition-all duration-700 ease-out"
              style={{ width: `${protocolDepth}%` }}
            />
          </div>
        </div>

        <div className="px-4 pb-4">

        {/* ── Greeting ── */}
        <div className="feed-card-ai p-5 mb-3 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-container/20 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-primary-container" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-primary font-[family-name:var(--font-manrope)] leading-tight">
                {timeGreeting}, {name}.
              </h1>
              <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
                Your protocol is set. Here&apos;s your recommended treatment plan.
              </p>
            </div>
          </div>
        </div>

        {/* ── Treatment Plan ── */}
        {(() => {
          const selectedCount = treatmentTypes.filter((t) => typeSelections[t.id]).length;
          const totalPrice = treatmentTypes.reduce((sum, t) => {
            const sel = typeSelections[t.id];
            return sum + (sel?.product.price || 0);
          }, 0);
          const totalMrp = treatmentTypes.reduce((sum, t) => {
            const sel = typeSelections[t.id];
            return sum + (sel?.product.mrp || 0);
          }, 0);

          return (
            <div className="mb-4 animate-fade-in-up rounded-2xl bg-surface-container-lowest border border-outline-variant/10 overflow-hidden shadow-sm" style={{ animationDelay: "150ms" }}>
              {/* ── Header band ── */}
              <div className="bg-gradient-to-r from-primary-container to-primary px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-extrabold text-white font-[family-name:var(--font-manrope)]">
                      Your Treatment Plan
                    </h2>
                    <p className="text-[11px] text-white/60 mt-0.5">
                      Personalised for your profile
                    </p>
                  </div>
                  {/* Progress ring */}
                  <div className="relative w-10 h-10">
                    <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="white" strokeWidth="3"
                        strokeDasharray={`${(selectedCount / treatmentTypes.length) * 97.4} 97.4`}
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                      {selectedCount}/{treatmentTypes.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Product items — connected list inside the widget ── */}
              <div className="divide-y divide-outline-variant/8">
                {treatmentTypes.map((t, idx) => {
                  const selection = typeSelections[t.id];
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTypeSheet(t)}
                      className="w-full text-left cursor-pointer hover:bg-surface-container-low/40 transition-colors duration-150"
                    >
                      <div className="flex items-start gap-3 px-4 py-3.5">
                        {/* Step number / check */}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 ${
                          selection
                            ? "bg-primary-container text-white"
                            : "bg-surface-container-high text-on-surface-variant"
                        }`}>
                          {selection ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : idx + 1}
                        </div>

                        {/* Thumbnail */}
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selection?.product.image || t.image}
                            alt={t.label}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          {selection ? (
                            <>
                              <p className="text-sm font-semibold text-on-surface leading-snug">{selection.product.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-sm font-bold text-on-surface">₹{selection.product.price}</span>
                                {selection.product.mrp > selection.product.price && (
                                  <span className="text-xs text-on-surface-variant line-through">₹{selection.product.mrp}</span>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-semibold text-on-surface">Choose your {t.label}</p>
                              <p className="text-xs text-on-surface-variant mt-0.5">{t.timing}</p>
                            </>
                          )}
                        </div>

                        {/* Select CTA */}
                        {!selection ? (
                          <span className="text-xs font-semibold text-primary-container shrink-0 mt-0.5">Select</span>
                        ) : (
                          <span className="text-xs text-on-surface-variant shrink-0 mt-0.5">Change</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* ── Shuffling hint — cycles through unselected types ── */}
              <ShufflingHint types={treatmentTypes} selections={typeSelections} allSelected={allTypesSelected} />

              {/* ── Footer: price + CTA — always visible ── */}
              <div className="px-4 py-3.5 bg-surface-container-low/30 border-t border-outline-variant/8">
                {selectedCount > 0 ? (
                  <>
                    {/* Price line */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">
                          ₹{totalPrice}
                        </span>
                        {totalMrp > totalPrice && (
                          <>
                            <span className="text-sm text-on-surface-variant line-through">₹{totalMrp}</span>
                            <span className="text-xs font-semibold text-primary-container bg-primary-fixed/15 px-1.5 py-0.5 rounded">
                              Save ₹{totalMrp - totalPrice}
                            </span>
                          </>
                        )}
                      </div>
                      {!allTypesSelected && (
                        <span className="text-xs text-on-surface-variant">
                          {treatmentTypes.length - selectedCount} remaining
                        </span>
                      )}
                    </div>

                    {allTypesSelected ? (
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold text-on-surface-variant/60 text-center uppercase tracking-wider">
                          Your protocol · ready to order
                        </p>
                        {treatmentTypes.map((type) => {
                          const sel = typeSelections[type.id];
                          if (!sel || sel.status === "other") return null;
                          return (
                            <a
                              key={type.id}
                              href={shopifyProductUrl(sel.product.slug)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full flex items-center justify-between gap-3 py-3 px-4 rounded-xl bg-surface-container-lowest border border-outline-variant/10 hover:border-primary-container/40 transition-all active:scale-[0.99]"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-on-surface truncate">{sel.product.name}</p>
                                <p className="text-xs text-on-surface-variant">&#8377;{sel.product.price}</p>
                              </div>
                              <span className="flex items-center gap-1 text-xs font-bold text-primary-container shrink-0">
                                Buy <ExternalLink className="w-3 h-3" strokeWidth={2.5} />
                              </span>
                            </a>
                          );
                        })}
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const next = treatmentTypes.find((t) => !typeSelections[t.id]);
                          if (next) setActiveTypeSheet(next);
                        }}
                        className="w-full py-3 rounded-xl bg-primary-container text-sm font-semibold text-white cursor-pointer hover:bg-primary transition-colors"
                      >
                        Continue · {selectedCount} of {treatmentTypes.length} selected
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => { setBuildPlanMode(true); setActiveTypeSheet(treatmentTypes[0]); }}
                    className="w-full py-3 rounded-xl bg-primary-container text-sm font-semibold text-white cursor-pointer hover:bg-primary transition-colors"
                  >
                    Build your plan
                  </button>
                )}

                <p className="text-[11px] text-on-surface-variant text-center mt-2">
                  Free shipping · Cancel anytime · Doctor-approved
                </p>
              </div>
            </div>
          );
        })()}

        {/* ── Treatment Type Bottom Sheet ── */}
        {activeTypeSheet && (
          <TreatmentTypeSheet
            type={activeTypeSheet}
            onClose={() => setActiveTypeSheet(null)}
            onAddToPlan={handleTypeAddToPlan}
            onAlreadyUsing={handleTypeAlreadyUsing}
            onUsingOther={handleTypeUsingOther}
          />
        )}

        {/* ── Supplement Logging (only if user has supply) ── */}
        {hasSupply && (
          <div className="mb-3 animate-fade-in-up">
            <SupplementCard
              supplements={protocol.supplements}
              dayCount={1}
              onAction={() => {}}
              delay={0}
            />
          </div>
        )}

        {/* ── Protocol Buckets ── */}
        <div className="mb-3 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/50 mb-2 px-1">
            Sharpen your protocol
          </p>
          <div className="feed-card p-4">
            <div className="space-y-1">
              {protocolBuckets.map((bucket, idx) => {
                const status = getBucketStatus(bucket);
                return (
                  <div
                    key={bucket.id}
                    className="flex items-center gap-3 py-2.5"
                  >
                    {/* Status icon */}
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
                      status === "done"
                        ? "bg-primary-container/20"
                        : status === "partial"
                        ? "bg-tertiary-fixed/20"
                        : status === "locked"
                        ? "bg-surface-container-high/50"
                        : "bg-surface-container-low"
                    }`}>
                      {status === "done" ? (
                        <Check className="w-4 h-4 text-primary-container" strokeWidth={2} />
                      ) : status === "locked" ? (
                        <Lock className="w-3.5 h-3.5 text-on-surface-variant/30" strokeWidth={1.5} />
                      ) : (
                        bucketIcon(bucket.icon, `w-4 h-4 ${status === "partial" ? "text-tertiary-container" : "text-on-surface-variant/50"}`)
                      )}
                    </div>

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        status === "done"
                          ? "text-primary-container"
                          : status === "locked"
                          ? "text-on-surface-variant/40"
                          : "text-on-surface"
                      }`}>
                        {idx + 1}. {bucket.label}
                      </p>
                      {status === "partial" && (
                        <p className="text-[10px] text-tertiary-container">
                          {bucket.questions.filter((q) => profile[q.key]).length}/{bucket.questions.length} answered
                        </p>
                      )}
                    </div>

                    {/* Status badge */}
                    {status === "done" && (
                      <span className="text-[10px] font-semibold text-primary-container bg-primary-container/10 px-2 py-0.5 rounded-full">
                        Done
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* CTA to open bottom sheet */}
            {nextQuestion && (
              <button
                onClick={() => setSheetOpen(true)}
                className="mt-4 w-full py-3 rounded-xl bg-primary-container text-sm font-semibold text-white cursor-pointer hover:bg-primary transition-colors duration-200"
              >
                Complete your protocol
              </button>
            )}
          </div>
        </div>

        {/* ── What you get at 100% ── */}
        <div className="mb-3 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
          <div className="feed-card-ai p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary-container" strokeWidth={1.5} />
              <span className="text-xs font-semibold text-primary-container uppercase tracking-wider">
                At 100% Protocol Depth you get
              </span>
            </div>
            <p className="text-sm font-semibold text-on-surface mb-3">
              A fully personalised regime with:
            </p>
            <div className="space-y-2.5">
              {[
                { icon: Utensils, text: "Diet Plan tailored to your body, goals, and preferences" },
                { icon: Pill, text: "Medicine & Supplements protocol designed for your specific gaps" },
                { icon: Stethoscope, text: "Health Coach for ongoing assistance and support" },
                { icon: Activity, text: "Health & Progress Monitoring with weekly visual tracking" },
                { icon: Brain, text: "AI Model trained around your needs — instant actionable insights and answers to every concern" },
                { icon: Stethoscope, text: "Access to medical experts who have in-depth knowledge about you" },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-container/10 shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-primary-container" strokeWidth={1.5} />
                  </div>
                  <span className="text-sm text-on-surface leading-relaxed">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Lifestyle nudges ── */}
        {answeredQuestions.length >= 1 && (
          <NudgeCard
            question="Would you be stepping out today?"
            pillarTag="Lifestyle"
            options={[
              { label: "Yeah", value: "yes" },
              { label: "Maybe", value: "maybe" },
              { label: "Nah, home", value: "no" },
            ]}
            onSelect={() => {}}
            delay={100}
          />
        )}

        {answeredQuestions.length >= 3 && (
          <ExpertCard
            reason="Your profile is taking shape. A specialist can review your protocol and refine it based on clinical assessment."
            doctorName="Dr. Priya Sharma"
            specialty="Dermatologist \u00b7 Hair specialist"
            rating={4.8}
            consultCount="2,400+"
            price={499}
            duration="15 min"
            nextSlot="Today, 4:30 PM"
            delay={200}
          />
        )}

        <FeedInput
          onSend={handleFeedInput}
          placeholder="Something on your mind?"
        />
        </div>

        {/* ── Bottom Sheet for Protocol Questions ── */}
        {sheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-on-surface/40"
              style={{ animation: "fadeInUp 150ms ease-out" }}
              onClick={() => setSheetOpen(false)}
            />

            {/* Sheet — sits below the depth bar (which is z-60) */}
            <div
              className="relative w-full bg-surface rounded-t-3xl overflow-hidden animate-fade-in-up"
              style={{ animationDuration: "250ms", maxHeight: "70dvh" }}
            >
              {/* Sheet header: back arrow + bucket label + close */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <button
                  onClick={handleSheetBack}
                  className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container-low cursor-pointer transition-colors"
                  aria-label={answeredHistory.length > 0 ? "Previous question" : "Close"}
                >
                  <ArrowLeft className="w-5 h-5 text-on-surface" strokeWidth={1.5} />
                </button>
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  {nextBucketForSheet?.label || "Complete"}
                </span>
                <button
                  onClick={() => setSheetOpen(false)}
                  className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container-low cursor-pointer transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-on-surface-variant" strokeWidth={2} />
                </button>
              </div>

              {/* Question content */}
              <div className="px-5 pb-8 overflow-y-auto" style={{ maxHeight: "calc(70dvh - 60px)" }}>
                {nextQuestion ? (
                  <div className="animate-fade-in-up" key={nextQuestion.key}>
                    <p className="text-xl font-semibold text-on-surface leading-snug mb-1 mt-4 font-[family-name:var(--font-manrope)]">
                      {nextQuestion.question}
                    </p>
                    <p className="text-sm text-on-surface-variant/60 mb-6 leading-relaxed">
                      {nextQuestion.reason}
                    </p>

                    {/* Options — single select with chevron-right */}
                    <div className="space-y-2">
                      {nextQuestion.options.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            handleDeepeningAnswer(nextQuestion.key, opt.value);
                            const remaining = allBucketQuestions.filter(
                              (q) => q.key !== nextQuestion.key && !profile[q.key]
                            );
                            if (remaining.length === 0) {
                              setTimeout(() => setSheetOpen(false), 400);
                            }
                          }}
                          className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-surface-container-low border border-outline-variant/10 text-sm font-medium text-on-surface hover:border-primary-container/40 cursor-pointer transition-all duration-200 active:scale-[0.98]"
                        >
                          <span>{opt.label}</span>
                          <ChevronRight className="w-4 h-4 text-on-surface-variant/30" strokeWidth={1.5} />
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => handleDeepeningAnswer(nextQuestion.key, "skipped")}
                      className="mt-5 w-full text-center text-xs text-on-surface-variant/50 cursor-pointer hover:text-on-surface-variant transition-colors py-2"
                    >
                      Skip this question
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12 animate-fade-in-up">
                    <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-primary-container" strokeWidth={2} />
                    </div>
                    <p className="text-lg font-semibold text-on-surface font-[family-name:var(--font-manrope)]">
                      All questions answered!
                    </p>
                    <p className="text-sm text-on-surface-variant mt-2 leading-relaxed max-w-xs mx-auto">
                      Your protocol is now much sharper. Connect health data or book an expert to reach 100%.
                    </p>
                    <button
                      onClick={() => setSheetOpen(false)}
                      className="mt-6 px-8 py-3 rounded-xl bg-primary-container text-sm font-semibold text-white cursor-pointer hover:bg-primary transition-colors"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </div>
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

        {/* L0: Greeting + concern */}
        <GreetingCard
          name={name}
          contextLine="I work best the more I know about you. No forms — just a conversation."
        />
        <ConcernCard onSelect={handleConcernSelect} onTextSubmit={handleConcernText} />

        {userMessages.length > 0 && level !== "L0" && (
          <UserMessageCard message={userMessages[0]} />
        )}

        {/* Name card — appears after concern is selected */}
        {level !== "L0" && (
          <div id="card-name" className="feed-card-ai p-5 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
            {nameSubmitted ? (
              <div className="flex items-center gap-2 animate-fade-in-up flex-wrap">
                <p className="text-sm text-on-surface-variant">I&apos;ll call you</p>
                <span className="inline-block px-4 py-2.5 rounded-xl bg-primary-container/15 border border-primary-container/20 text-sm font-semibold text-primary-container">
                  {name || "friend"}
                </span>
                <button
                  onClick={() => setNameSubmitted(false)}
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
        )}

        {/* L1: Profiling — sex → age → diet */}
        {level !== "L0" && nameSubmitted && (
          <>
            <div id="card-sex">
              <ProfilingCard
                question="Quick one — are you male, female, or prefer not to say?"
                reason="This helps me calibrate recommendations accurately."
                options={[
                  { label: "Male", value: "male" },
                  { label: "Female", value: "female" },
                  { label: "Prefer not to say", value: "undisclosed" },
                ]}
                onSelect={handleSexSelect}
                onSkip={() => handleSexSelect("undisclosed")}
                delay={300}
              />
            </div>

            {profile.sex && (
              <div id="card-age">
                <ProfilingCard
                  question="And roughly how old are you?"
                  reason="This helps me calibrate recommendations for your life stage."
                  options={[
                    { label: "18–24", value: "18-24" },
                    { label: "25–34", value: "25-34" },
                    { label: "35–44", value: "35-44" },
                    { label: "45+", value: "45+" },
                  ]}
                  onSelect={handleAgeSelect}
                  onSkip={() => handleAgeSelect("unknown")}
                  delay={200}
                />
              </div>
            )}

            {profile.sex && profile.age && (
              <div id="card-diet">
                <ProfilingCard
                  question="What does your diet look like mostly?"
                  reason="Diet type directly affects which nutrients you might be missing."
                  options={[
                    { label: "Vegetarian", value: "veg" },
                    { label: "Non-veg", value: "non-veg" },
                    { label: "Vegan", value: "vegan" },
                    { label: "Eggetarian", value: "egg" },
                  ]}
                  onSelect={handleDietSelect}
                  onSkip={() => handleDietSelect("unknown")}
                  layout="grid"
                  delay={200}
                />
              </div>
            )}

          </>
        )}

        {/* L2: Building animation → protocol */}
        {level === "L2" && protocol && (
          <>
            {!protocolReady && (
              <div id="card-building">
                <BuildingProtocolCard onComplete={handleProtocolBuilt} delay={100} />
              </div>
            )}

            {protocolReady && (
              <>
                <div id="card-protocol">
                  <InsightCard
                    content={protocol.reasoning}
                    pillarTag="Your protocol"
                    delay={100}
                  >
                    <div className="space-y-2 mt-2">
                      {protocol.supplements.map((s) => (
                        <div key={s.name} className="flex items-center justify-between py-2 px-3 bg-surface-container-low rounded-xl">
                          <div>
                            <p className="text-sm font-medium text-on-surface">{s.name}</p>
                            <p className="text-xs text-on-surface-variant/50">{s.brand} &middot; {s.timing}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </InsightCard>
                </div>

                <div className="flex gap-2 px-1 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
                  <button
                    onClick={handleAcceptProtocol}
                    className="flex-1 py-3 rounded-xl bg-primary-container text-sm font-semibold text-white cursor-pointer hover:bg-primary transition-colors duration-200"
                  >
                    Yes, start here
                  </button>
                  <button className="px-5 py-3 rounded-xl bg-surface-container-low text-sm font-medium text-on-surface-variant cursor-pointer hover:bg-surface-container-high transition-colors duration-200">
                    Tell me more
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
