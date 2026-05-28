"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ChevronRight,
  ChevronDown,
  Check,
  ShoppingBag,
  ArrowLeft,
  Upload,
  Lock,
  Stethoscope,
  Loader2,
  X,
} from "lucide-react";
import type { GeneratedProtocol, UserProfile, ProtocolSupplement } from "@/lib/ai/types";
import { calculateProfileDepth } from "@/lib/ai/profile-depth";
import { selectNextQuestion, countFollowUpAnswers } from "@/lib/ai/question-bank";
import { useCart } from "@/context/CartContext";
import { resolveVariantId } from "@/lib/shopify/variant-resolver";
import { ALL_PRODUCTS } from "@/lib/protocolEngine";

/* ── Concern title map ─────────────────────────────────────── */
const CONCERN_TITLE_MAP: Record<string, string> = {
  "Hair / beard": "hair health",
  "Skin / acne": "skin & acne",
  "Energy / gut": "energy & gut",
  "Weight": "weight management",
  "Hormones": "hormonal balance",
  "Sleep / mind": "sleep & mind",
};

/* Onboarding concern label → product concern values (same as explore page) */
const ONBOARDING_CONCERN_MAP: Record<string, string[]> = {
  "Hair / beard": ["hair", "beard"],
  "Skin / acne": ["skin"],
  "Energy / gut": ["energy"],
  "Weight": ["weight"],
  "Hormones": ["hormones"],
  "Sleep / mind": ["sleep"],
};

/* Friendly display label per onboarding concern */
const CONCERN_DISPLAY: Record<string, string> = {
  "Hair / beard": "Hair & Beard",
  "Skin / acne": "Skin & Acne",
  "Energy / gut": "Energy & Gut",
  "Weight": "Weight",
  "Hormones": "Hormones",
  "Sleep / mind": "Sleep & Mind",
};

/* Emoji per concern */
const CONCERN_EMOJI: Record<string, string> = {
  "Hair / beard": "💆",
  "Skin / acne": "✨",
  "Energy / gut": "⚡",
  "Weight": "🏋️",
  "Hormones": "🔬",
  "Sleep / mind": "🌙",
};

/* Trust badge derived from supplement data */
function getTrustBadge(s: ProtocolSupplement): { label: string; style: string } | null {
  if (s.priority === "essential") return { label: "Doctor's pick", style: "bg-primary-container/10 text-primary-container" };
  if (s.reviewCount && s.reviewCount >= 1000) return { label: "Bestseller", style: "bg-amber-500/10 text-amber-600" };
  if (s.rating && s.rating >= 4.5) return { label: "Top rated", style: "bg-emerald-500/10 text-emerald-600" };
  if (s.priority === "recommended") return { label: "Recommended", style: "bg-surface-container text-on-surface-variant/60" };
  return null;
}

function buildProfileSubtitle(profile: UserProfile | null): string | null {
  if (!profile) return null;
  const parts: string[] = [];
  if (profile.age) {
    const ageStr = String(profile.age).replace(/-/g, "–");
    parts.push(`${ageStr} yr old`);
  }
  const DIET_LABELS: Record<string, string> = {
    veg: "vegetarian", vegetarian: "vegetarian",
    egg: "eggetarian", eggetarian: "eggetarian",
    vegan: "vegan",
  };
  const diet = profile.diet?.toLowerCase();
  const dietLabel = diet ? DIET_LABELS[diet] : undefined;
  if (dietLabel) parts.push(dietLabel);
  if (profile.sex === "female") parts.push("woman");
  else if (profile.sex === "male") parts.push("man");
  const concerns = parseConcernList(profile);
  const focusLabels = concerns.slice(0, 2).map((c) => CONCERN_TITLE_MAP[c] ?? c.toLowerCase());
  const focus = focusLabels.length === 1 ? focusLabels[0]
    : focusLabels.length >= 2 ? `${focusLabels[0]} & ${focusLabels[1]}`
    : null;
  const base = parts.filter(Boolean).join(" ");
  if (!base && !focus) return null;
  if (!focus) return `Built for a ${base}`;
  return base ? `Built for a ${base} focused on ${focus}` : `Focused on ${focus}`;
}

function getSocialCount(s: ProtocolSupplement): string {
  const base = s.reviewCount ?? 1800;
  const n = Math.round((base * 0.43) / 100) * 100;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k+`;
  return `${n}+`;
}

function buildProtocolTitle(profile: UserProfile | null): string {
  if (!profile) return "Your Protocol";
  const raw = profile.concerns ?? profile.concern;
  if (!raw) return "Your Protocol";
  const concerns = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (concerns.length === 0) return "Your Protocol";
  const labels = concerns.map((c) => CONCERN_TITLE_MAP[c] ?? c.toLowerCase());
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} & ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} & ${labels[labels.length - 1]}`;
}

function parseConcernList(profile: UserProfile | null): string[] {
  if (!profile) return [];
  const raw = profile.concerns ?? profile.concern;
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function splitSummary(text: string): { lead: string; insights: string[] } {
  const dotIdx = text.indexOf(". ");
  if (dotIdx === -1) return { lead: text, insights: [] };
  const lead = text.slice(0, dotIdx + 1);
  const rest = text.slice(dotIdx + 2);
  const insights = rest.split(". ").filter(Boolean).map((s) => (s.endsWith(".") ? s : `${s}.`));
  return { lead, insights };
}

/* Splits "action — reason" into two parts for compact display */
function splitRoutineText(text: string): { action: string; detail: string | null } {
  for (const sep of [" — ", " – ", " - "]) {
    const idx = text.indexOf(sep);
    if (idx !== -1) return { action: text.slice(0, idx), detail: text.slice(idx + sep.length) };
  }
  return { action: text, detail: null };
}

/* Keyword-based emoji for supplement / ingredient types */
function getSupplementEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("biotin") || n.includes("dht") || n.includes("keratin")) return "💊";
  if (n.includes("ashwagandha") || n.includes("shilajit") || n.includes("adaptogen")) return "🌿";
  if (n.includes("whey") || n.includes("protein") || n.includes("bcaa")) return "🥛";
  if (n.includes("creatine")) return "💪";
  if (n.includes("probiotic") || n.includes("gut") || n.includes("digestive")) return "🦠";
  if (n.includes("iron") || n.includes("ferrous")) return "🩸";
  if (n.includes("magnesium")) return "💤";
  if (n.includes("melatonin") || n.includes("theanine")) return "🌙";
  if (n.includes("coenzyme") || n.includes("coq10") || n.includes("q10")) return "⚡";
  if (n.includes("l-carnitine") || n.includes("carnitine")) return "🔥";
  if (n.includes("vitamin") || n.includes("multivitamin") || n.includes("niacin") || n.includes("b12")) return "✨";
  if (n.includes("collagen") || n.includes("glow") || n.includes("skin")) return "✨";
  if (n.includes("omega") || n.includes("fish oil")) return "🐟";
  if (n.includes("zinc") || n.includes("selenium") || n.includes("chromium")) return "🔬";
  if (n.includes("hair") || n.includes("serum") || n.includes("scalp")) return "💆";
  return "💊";
}

/* ── Ingredient recommendations by concern ─────────────────── */
interface IngredientRec {
  name: string;
  priority: "essential" | "recommended" | "optional";
  timing: string;
  why: string;
}

const CONCERN_INGREDIENTS: Record<string, IngredientRec[]> = {
  "Hair / beard": [
    { name: "Biotin", priority: "essential", timing: "Morning with breakfast", why: "Core building block of keratin — deficiency directly causes thinning, breakage, and slower regrowth." },
    { name: "Zinc & Selenium", priority: "essential", timing: "Morning with food", why: "Regulates DHT — the hormone responsible for follicle miniaturisation in androgenic hair loss." },
    { name: "Vitamin D3", priority: "recommended", timing: "Morning with a fatty meal", why: "Hair follicles have Vitamin D receptors — low D3 is one of the most common reversible causes of hair loss in India." },
    { name: "Ashwagandha", priority: "optional", timing: "Evening with warm water", why: "Reduces cortisol — chronic stress directly pushes follicles into the resting (telogen) phase, causing shedding." },
  ],
  "Skin / acne": [
    { name: "Zinc", priority: "essential", timing: "Morning with food", why: "Clinically reduces inflammatory acne by up to 50% — also regulates sebum production and speeds healing." },
    { name: "Omega-3 (Fish Oil)", priority: "essential", timing: "With any meal", why: "Reduces systemic inflammation that drives breakouts, dullness, and uneven texture from within." },
    { name: "Vitamin C", priority: "recommended", timing: "Morning with breakfast", why: "Boosts collagen synthesis and fades post-acne marks — significantly more effective when taken consistently." },
    { name: "Niacinamide (B3)", priority: "recommended", timing: "Any time with food", why: "Minimises pores, regulates oil production, and evens skin tone from the inside out." },
  ],
  "Weight": [
    { name: "Protein (Whey / Plant)", priority: "essential", timing: "Post-workout or between meals", why: "Preserves lean muscle during fat loss — most Indians chronically under-consume protein without realising it." },
    { name: "Creatine Monohydrate", priority: "recommended", timing: "Post-workout with water", why: "The best-studied performance supplement — improves strength, muscle gain, and recovery in consistent users." },
    { name: "L-Carnitine", priority: "recommended", timing: "Before exercise or with meals", why: "Transports fatty acids into cells for energy — works best when paired with regular movement." },
    { name: "Chromium", priority: "optional", timing: "With meals", why: "Stabilises blood glucose and reduces sugar cravings — particularly useful for high-carb Indian diets." },
  ],
  "Energy / gut": [
    { name: "Vitamin B12", priority: "essential", timing: "Morning with breakfast", why: "B12 deficiency is extremely common in India — causes persistent fatigue, brain fog, and nerve dysfunction." },
    { name: "Probiotics", priority: "essential", timing: "Morning on empty stomach", why: "Restores gut microbiome balance — directly linked to energy levels, immunity, and mood regulation." },
    { name: "Magnesium", priority: "recommended", timing: "Evening or before bed", why: "Activates 300+ enzymes involved in energy production — most urban Indians are unknowingly deficient." },
    { name: "Coenzyme Q10", priority: "optional", timing: "With a fatty meal", why: "Supports mitochondrial energy production — especially effective if you feel consistently drained despite decent sleep." },
  ],
  "Sleep / mind": [
    { name: "Magnesium Glycinate", priority: "essential", timing: "30–45 min before bed", why: "Activates GABA receptors — the brain's natural brake pedal. Proven to improve sleep onset and quality." },
    { name: "Ashwagandha", priority: "essential", timing: "Evening with warm milk", why: "Reduces cortisol by up to 28% in clinical studies — directly targets the stress that blocks deep sleep." },
    { name: "L-Theanine", priority: "recommended", timing: "30 min before bed", why: "Promotes calm focus without drowsiness — pairs well with magnesium for faster sleep onset." },
    { name: "Melatonin (low dose)", priority: "optional", timing: "30 min before target sleep time", why: "Resets the circadian clock — most effective for those regularly falling asleep after 1 AM." },
  ],
  "Hormones": [
    { name: "Ashwagandha (KSM-66)", priority: "essential", timing: "Evening with warm milk", why: "Clinically shown to raise testosterone by 15–20% and reduce cortisol — the most validated adaptogen for men." },
    { name: "Zinc", priority: "essential", timing: "Morning with food", why: "Critical for testosterone synthesis — even mild deficiency measurably lowers T levels and impacts libido." },
    { name: "Shilajit", priority: "recommended", timing: "Morning on empty stomach", why: "Traditional Ayurvedic mineral complex — modern studies confirm improved testosterone, sperm quality, and energy." },
    { name: "Vitamin D3", priority: "recommended", timing: "Morning with a fatty meal", why: "Functions as a hormone precursor — 70%+ of urban Indians are deficient, directly impacting T levels." },
  ],
  "Hormones_female": [
    { name: "Magnesium Glycinate", priority: "essential", timing: "Evening or 30 min before bed", why: "The most clinically supported supplement for PMS — reduces cramps, mood swings, and bloating in the luteal phase." },
    { name: "Vitamin B6", priority: "essential", timing: "Morning with breakfast", why: "Supports progesterone synthesis and serotonin production — deficiency directly worsens PMS symptoms and mood shifts." },
    { name: "Iron", priority: "recommended", timing: "Morning, separate from chai/coffee by 1 hr", why: "Monthly blood loss makes iron deficiency extremely common in women — low iron amplifies fatigue, brain fog, and hair loss." },
    { name: "Vitamin D3", priority: "optional", timing: "Morning with a fatty meal", why: "Functions as a hormone precursor — low D3 is associated with irregular cycles, severe PMS, and PCOS in Indian women." },
  ],
  "Hair / beard_female": [
    { name: "Biotin", priority: "essential", timing: "Morning with breakfast", why: "Core building block of keratin — deficiency directly causes thinning, breakage, and slower regrowth, especially post-pregnancy." },
    { name: "Iron (Ferrous)", priority: "essential", timing: "Morning, separate from chai/coffee by 1 hr", why: "Iron deficiency is the single most overlooked driver of hair loss in women — monthly blood loss creates a consistent deficit." },
    { name: "Vitamin D3", priority: "recommended", timing: "Morning with a fatty meal", why: "Hair follicles have Vitamin D receptors — low D3 is one of the most common reversible causes of hair loss in Indian women." },
    { name: "Zinc & Selenium", priority: "optional", timing: "Morning with food", why: "Supports follicle health and scalp microbiome — particularly effective for hair fall linked to hormonal changes." },
  ],
};

function buildIngredientList(concernList: string[], sex?: string): IngredientRec[] {
  if (concernList.length === 0) return [];
  const isFemale = sex === "female";
  const primaryKey = isFemale && CONCERN_INGREDIENTS[`${concernList[0]}_female`]
    ? `${concernList[0]}_female`
    : concernList[0];
  const primary = CONCERN_INGREDIENTS[primaryKey] ?? [];
  if (concernList.length === 1) return primary;
  // For multi-concern: add one unique ingredient from secondary concern
  const secKey = isFemale && CONCERN_INGREDIENTS[`${concernList[1]}_female`]
    ? `${concernList[1]}_female`
    : concernList[1];
  const secondary = CONCERN_INGREDIENTS[secKey] ?? [];
  const primaryNames = new Set(primary.map((i) => i.name));
  const extra = secondary.find((i) => !primaryNames.has(i.name));
  return extra ? [...primary.slice(0, 3), { ...extra, priority: "optional" as const }] : primary;
}

/* Greeting emoji based on primary concern and sex */
function getConcernEmoji(concernList: string[], sex?: string): string {
  const primary = (concernList[0] ?? "").toLowerCase();
  const isFemale = sex === "female";
  if (primary.includes("hair") || primary.includes("beard")) return isFemale ? "💆‍♀️" : "💆‍♂️";
  if (primary.includes("skin") || primary.includes("acne")) return "✨";
  if (primary.includes("energy") || primary.includes("gut")) return "⚡";
  if (primary.includes("sleep") || primary.includes("mind")) return "🌙";
  if (primary.includes("weight")) return "🔥";
  if (primary.includes("hormone")) return isFemale ? "🌸" : "🌿";
  return "👋";
}

/* Strips filler phrases from habit tips to produce a compact but meaningful headline */
function compressHabit(text: string): string {
  let s = text
    .replace(/\s+for the first \d+[\w ]*of your protocol\.?/gi, "")
    .replace(/\s+for the first \d+[\w ]*\.?$/gi, "")
    .replace(/\s+for \d+[\w ]*\.?$/gi, "")
    .replace(/\s*at the end of your shower/gi, " after shower")
    .replace(/\s*reduces? \w+ significantly\.?$/gi, "")
    .replace(/\s*(significantly|considerably|dramatically)\.?$/gi, "")
    .replace(/\s*of your protocol\.?$/gi, "")
    .replace(/\bin at least (\d+) meals? daily\b/gi, "daily")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/[,.]$/, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function firstSentence(text: string): string {
  const m = text.match(/^.*?[.!?](?:\s|$)/);
  return m ? m[0].trim() : text;
}

function getConcernTagStyle(c: string): string {
  const k = c.toLowerCase();
  if (k.includes("hair") || k.includes("beard")) return "bg-rose-500/10 text-rose-700 border-rose-500/20";
  if (k.includes("skin") || k.includes("acne")) return "bg-amber-500/10 text-amber-700 border-amber-500/20";
  if (k.includes("energy") || k.includes("gut")) return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
  if (k.includes("weight")) return "bg-orange-500/10 text-orange-700 border-orange-500/20";
  if (k.includes("sleep") || k.includes("mind")) return "bg-indigo-500/10 text-indigo-700 border-indigo-500/20";
  if (k.includes("hormone")) return "bg-teal-500/10 text-teal-700 border-teal-500/20";
  return "bg-primary-container/10 text-primary-container border-primary-container/20";
}

/* Keyword-based emoji for lifestyle tips */
function getLifestyleEmoji(tip: string): string {
  const t = tip.toLowerCase();
  if (t.includes("hair") || t.includes("scalp") || t.includes("hairstyle")) return "💆";
  if (t.includes("protein") || t.includes("food") || t.includes("eat") || t.includes("meal") || t.includes("diet")) return "🥗";
  if (t.includes("water") || t.includes("rinse") || t.includes("cold shower")) return "💧";
  if (t.includes("sleep") || t.includes("bed")) return "😴";
  if (t.includes("sugar") || t.includes("dairy") || t.includes("cut ") || t.includes("avoid")) return "🚫";
  if (t.includes("exercise") || t.includes("workout") || t.includes("walk") || t.includes("gym")) return "🏃";
  if (t.includes("stress") || t.includes("meditat") || t.includes("breath")) return "🧘";
  if (t.includes("skin") || t.includes("acne") || t.includes("face") || t.includes("wash")) return "✨";
  if (t.includes("sun") || t.includes("morning")) return "☀️";
  return "✅";
}

/* ── Loading skeleton ──────────────────────────────────────── */
function ProtocolSkeleton() {
  return (
    <div className="px-4 pt-4 animate-pulse">
      <div className="h-4 w-20 rounded-full bg-surface-container-high mb-4" />
      <div className="feed-card-ai p-5 mb-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-container/10 shrink-0" />
          <div className="flex-1 space-y-2.5">
            <div className="h-3 w-24 rounded bg-primary-container/20" />
            <div className="h-6 w-40 rounded bg-surface-container-high" />
            <div className="h-3 w-full rounded bg-surface-container-high" />
          </div>
        </div>
      </div>
      <div className="feed-card p-5 mb-3">
        <div className="h-3 w-32 rounded bg-surface-container-high mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-xl bg-surface-container-low" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Protocol gate ─────────────────────────────────────────── */
function ProtocolGate({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="relative mb-4">
      {/* Fade out the content above */}
      <div className="h-20 bg-gradient-to-b from-transparent to-surface pointer-events-none -mt-8 mb-0" />

      {/* Lock card */}
      <div className="bg-surface-container-lowest border border-outline-variant/12 rounded-2xl p-5 text-center">
        <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center mx-auto mb-3">
          <Lock className="w-4.5 h-4.5 text-primary-container" strokeWidth={1.5} />
        </div>
        <p className="text-[15px] font-extrabold text-on-surface mb-1 font-[family-name:var(--font-manrope)]">
          Your full protocol is ready
        </p>
        <p className="text-xs text-on-surface-variant/70 leading-relaxed mb-4">
          Create a free account to unlock your complete supplement plan, lifestyle tips, and personalisation questions.
        </p>
        <button
          onClick={onUnlock}
          className="w-full py-3.5 rounded-xl bg-primary-container text-white text-sm font-bold cursor-pointer hover:bg-primary transition-colors duration-200"
        >
          Create Free Account
        </button>
        <p className="text-[10px] text-on-surface-variant/40 mt-2.5">
          Free forever · Phone OTP · 30 seconds
        </p>
      </div>
    </div>
  );
}

/* ── Session question limit — day 1: 2, return visits: 1 ──── */
// Dynamic value computed from visitCount inside component

/* ── Main page ─────────────────────────────────────────────── */
export default function ProtocolPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [protocol, setProtocol] = useState<GeneratedProtocol | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [skippedKeys, setSkippedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [expandedReasonings, setExpandedReasonings] = useState<Set<string>>(new Set());
  const [showingUpdate, setShowingUpdate] = useState(false);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [depthGain, setDepthGain] = useState(0);
  // Auth gate removed — always unlocked after login step in onboarding
  // Visit tracking for smart question cadence
  const [visitCount, setVisitCount] = useState(1);
  const [bonusUnlocked, setBonusUnlocked] = useState(false);
  // Today's answered count — persists across navigation within the same day
  const [savedAnswerCount, setSavedAnswerCount] = useState(0);
  // Prevent double re-fetch within a session
  const hasRefetched = useRef(false);
  // Cart
  const { addItem } = useCart();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addingAll, setAddingAll] = useState(false);
  // "Protocol sharpened!" dramatic moment
  const [showSharpen, setShowSharpen] = useState(false);
  const picksRef = useRef<HTMLDivElement>(null);
  // Protocol cart sheet
  const [showProtocolCart, setShowProtocolCart] = useState(false);
  // Question bottom sheet
  const [showQuestionSheet, setShowQuestionSheet] = useState(false);
  const [cartChecked, setCartChecked] = useState<boolean[]>([]);
  const [cartSwapped, setCartSwapped] = useState<boolean[]>([]);
  const [checkingOutCart, setCheckingOutCart] = useState(false);
  // Stepped intro animation for the depth bar
  const [displayDepth, setDisplayDepth] = useState(0);
  const introPlayed = useRef(false);

  useEffect(() => {
    let stored: UserProfile | null = null;
    try {
      const raw = localStorage.getItem("bh_profile");
      if (!raw) { router.replace("/home"); return; }
      stored = JSON.parse(raw) as UserProfile;
      // Child profiles belong on /kids, not here
      if ((stored as Record<string, unknown>).memberType === "child" || (stored as Record<string, unknown>).sex === "child") {
        router.replace("/kids");
        return;
      }
      setProfile(stored);
      setActiveProfileId(localStorage.getItem("bh_active_profile"));
    } catch {
      router.replace("/home");
      return;
    }

    // Visit tracking — day 1 gets 2 questions, return visits get 1
    try {
      const visitRaw = localStorage.getItem("bh_protocol_visits");
      const today = new Date().toDateString();
      if (visitRaw) {
        const vd = JSON.parse(visitRaw) as { lastVisit: string; count: number };
        if (vd.lastVisit === today) {
          setVisitCount(vd.count);
        } else {
          const next = vd.count + 1;
          setVisitCount(next);
          localStorage.setItem("bh_protocol_visits", JSON.stringify({ lastVisit: today, count: next }));
        }
      } else {
        localStorage.setItem("bh_protocol_visits", JSON.stringify({ lastVisit: today, count: 1 }));
        setVisitCount(1);
      }
    } catch { /* non-critical */ }

    // Restore today's answered question count so the daily limit survives navigation
    try {
      const todayRaw = localStorage.getItem("bh_today_answers");
      if (todayRaw) {
        const td = JSON.parse(todayRaw) as { date: string; count: number };
        if (td.date === new Date().toDateString()) setSavedAnswerCount(td.count);
      }
    } catch { /* non-critical */ }

    fetch("/api/protocol", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stored),
    })
      .then((r) => r.json())
      .then((data: GeneratedProtocol) => {
        setProtocol(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const handleAnswer = useCallback((key: string, value: string) => {
    setAnswers((prev) => {
      const updated = { ...prev, [key]: value };
      try {
        const raw = localStorage.getItem("bh_profile");
        if (raw) {
          const parsed = JSON.parse(raw);
          const before = calculateProfileDepth({ ...parsed, ...prev }).total;
          const after = calculateProfileDepth({ ...parsed, ...updated }).total;
          const gain = after - before;
          if (gain > 0) setDepthGain(gain);
          localStorage.setItem("bh_profile", JSON.stringify({ ...parsed, [key]: value }));
        }
      } catch { /* non-critical */ }
      return updated;
    });
    setSavedAnswerCount((prev) => {
      const next = prev + 1;
      try {
        localStorage.setItem("bh_today_answers", JSON.stringify({ date: new Date().toDateString(), count: next }));
      } catch { /* non-critical */ }
      return next;
    });
    setShowingUpdate(true);
    setTimeout(() => {
      setShowingUpdate(false);
      setDepthGain(0);
    }, 900);
  }, []);

  const handleSkip = useCallback((key: string) => {
    setSkippedKeys((prev) => new Set([...prev, key]));
    setShowingUpdate(true);
    setTimeout(() => setShowingUpdate(false), 700);
  }, []);

  const toggleReasoning = useCallback((id: string) => {
    setExpandedReasonings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleAddToCart = useCallback(async (productId: string) => {
    if (addingId || addedIds.has(productId)) return;
    setAddingId(productId);
    try {
      const variantId = await resolveVariantId(productId);
      if (variantId) {
        await addItem(variantId);
        setAddedIds((prev) => new Set([...prev, productId]));
      }
    } finally {
      setAddingId(null);
    }
  }, [addItem, addingId, addedIds]);

  const handleAddAll = useCallback(async () => {
    if (!protocol || addingAll) return;
    setAddingAll(true);
    try {
      const picks = protocol.supplements.slice(0, 3);
      for (const s of picks) {
        if (!addedIds.has(s.id)) {
          const variantId = await resolveVariantId(s.id);
          if (variantId) {
            await addItem(variantId);
            setAddedIds((prev) => new Set([...prev, s.id]));
          }
        }
      }
    } finally {
      setAddingAll(false);
    }
  }, [protocol, addingAll, addedIds, addItem]);

  const handleCheckoutProtocolCart = useCallback(async () => {
    if (!protocol) return;
    setCheckingOutCart(true);
    try {
      for (let i = 0; i < protocol.supplements.length; i++) {
        if (!cartChecked[i]) continue;
        const s = protocol.supplements[i];
        const active = (cartSwapped[i] && s.alternative) ? s.alternative : s;
        if (!addedIds.has(active.id)) {
          const variantId = await resolveVariantId(active.id);
          if (variantId) {
            await addItem(variantId);
            setAddedIds((prev) => new Set([...prev, active.id]));
          }
        }
      }
      setShowProtocolCart(false);
    } finally {
      setCheckingOutCart(false);
    }
  }, [protocol, cartChecked, cartSwapped, addedIds, addItem]);

  /* ── Derived state ─────────────────────────────────────────── */
  const concernList = useMemo(() => parseConcernList(profile), [profile]);

  // Groups for the Protocol Cart sheet — all supplements bucketed by concern
  const protocolCartGroups = useMemo(() => {
    if (!protocol) return [];
    const supplements = protocol.supplements;
    if (concernList.length <= 1) {
      return [{
        label: concernList[0] ? (CONCERN_DISPLAY[concernList[0]] ?? concernList[0]) : "Your Picks",
        emoji: concernList[0] ? (CONCERN_EMOJI[concernList[0]] ?? "✦") : "✦",
        indices: supplements.map((_, i) => i),
      }];
    }
    const groups: { label: string; emoji: string; indices: number[] }[] = [];
    const assigned = new Set<number>();
    for (const label of concernList) {
      const concernValues = ONBOARDING_CONCERN_MAP[label] ?? [];
      const indices: number[] = [];
      for (let i = 0; i < supplements.length; i++) {
        if (assigned.has(i)) continue;
        const productConcerns = ALL_PRODUCTS.find((p) => p.id === supplements[i].id)?.concern ?? [];
        if (productConcerns.some((c) => concernValues.includes(c))) {
          indices.push(i);
          assigned.add(i);
        }
      }
      if (indices.length > 0) {
        groups.push({ label: CONCERN_DISPLAY[label] ?? label, emoji: CONCERN_EMOJI[label] ?? "✦", indices });
      }
    }
    const unassigned = supplements.map((_, i) => i).filter((i) => !assigned.has(i));
    if (unassigned.length > 0) {
      if (groups.length > 0) groups[0].indices.push(...unassigned);
      else groups.push({ label: "Your Picks", emoji: "✦", indices: unassigned });
    }
    return groups;
  }, [protocol, concernList]);

  // Group supplements by user concern — only when 2+ concerns
  const groupedSupplements = useMemo(() => {
    if (!protocol || concernList.length <= 1) return null;
    const pool = protocol.supplements.slice(0, 5);
    const groups = concernList.map((label) => ({
      label,
      displayLabel: CONCERN_DISPLAY[label] ?? label,
      concernValues: ONBOARDING_CONCERN_MAP[label] ?? [],
      supplements: [] as ProtocolSupplement[],
    }));
    const assigned = new Set<string>();
    for (const group of groups) {
      for (const s of pool) {
        if (assigned.has(s.id)) continue;
        const productConcerns = ALL_PRODUCTS.find((p) => p.id === s.id)?.concern ?? [];
        if (productConcerns.some((c) => group.concernValues.includes(c))) {
          group.supplements.push(s);
          assigned.add(s.id);
        }
      }
    }
    // Unassigned supplements go to first group
    for (const s of pool) {
      if (!assigned.has(s.id)) groups[0].supplements.push(s);
    }
    return groups.filter((g) => g.supplements.length > 0);
  }, [protocol, concernList]);

  const profileSubtitle = useMemo(() => buildProfileSubtitle(profile), [profile]);

  // Possessive owner label: "Priya's" when viewing someone else's profile, "Your" for self
  const isPartnerProfile = activeProfileId?.startsWith("partner-") ?? false;
  const possUpper = profile?.name ? `${profile.name}'s` : isPartnerProfile ? "Their" : "Your";
  const possLower = profile?.name ? `${profile.name}'s` : isPartnerProfile ? "their" : "your";

  // Rank-based display score: position 0 keeps real score, each subsequent pick decrements
  const displayScoreMap = useMemo(() => {
    if (!protocol) return new Map<string, number>();
    const pool = protocol.supplements.slice(0, 5);
    return new Map(pool.map((s, i) => [s.id, Math.max(s.matchScore - i * 11, 62)]));
  }, [protocol]);

  // Allergy warning — check current session answers first, then persisted profile
  const allergyCheckAnswer = answers.allergies_check ?? profile?.allergies_check;
  const profileAllergies = useMemo(() => {
    if (!allergyCheckAnswer || allergyCheckAnswer === "none") return [];
    const labels: Record<string, string> = { shellfish: "shellfish/fish", lactose: "lactose", gluten: "gluten", nuts: "tree nuts" };
    return [labels[allergyCheckAnswer] ?? allergyCheckAnswer];
  }, [allergyCheckAnswer]);

  // Medication advisory — check current session answers first, then persisted profile
  const hasMedication =
    answers.medication_check === "yes" || profile?.medication_check === "yes";

  // Severity signal — any follow-up answer of "severe" triggers expert escalation
  const isSevereCase = useMemo(
    () => Object.values(answers).some((v) => v === "severe") || profile?.pms_severity === "severe",
    [answers, profile],
  );

  // Smart question cadence: day 1 → 2 questions, return visits → 1
  const sessionQuestionLimit = visitCount === 1 ? 2 : 1;
  const effectiveLimit = sessionQuestionLimit + (bonusUnlocked ? 1 : 0);

  // Merge real answers + skipped sentinels so selectNextQuestion skips both
  const answersWithSkipped = useMemo(() => {
    const skippedMap = Object.fromEntries([...skippedKeys].map((k) => [k, "__skipped__"]));
    return { ...answers, ...skippedMap };
  }, [answers, skippedKeys]);

  const currentQuestion = useMemo(
    () => profile ? selectNextQuestion(profile, answersWithSkipped, concernList, profile.age ?? "25-34") : null,
    [profile, answersWithSkipped, concernList],
  );
  const answeredCount = useMemo(() => countFollowUpAnswers(answers), [answers]);
  const allAnswered = answeredCount > 0 && currentQuestion === null;
  // Skips count toward the per-session interaction cap so users can't skip forever
  const sessionLimitReached = (Math.max(answeredCount, savedAnswerCount) + skippedKeys.size) >= effectiveLimit;
  const ingredientList = useMemo(() => buildIngredientList(concernList, profile?.sex), [concernList, profile?.sex]);
  const { lead: summaryLead, insights: summaryInsights } = splitSummary(protocol?.summary ?? "");

  // Live depth: updates as follow-up questions are answered
  const liveDepth = useMemo(() => {
    if (!profile) return protocol?.profileDepth.total ?? 0;
    return calculateProfileDepth({ ...profile, ...answers }).total;
  }, [profile, answers, protocol]);

  // Reset the re-fetch gate when the bonus question is unlocked so the bonus answer
  // can trigger its own re-fetch + popup independently of the first session limit.
  useEffect(() => {
    if (bonusUnlocked) hasRefetched.current = false;
  }, [bonusUnlocked]);

  // Silent re-fetch when session quota is reached — merges all answers in, updates products only
  useEffect(() => {
    if (!profile) return;
    if (!sessionLimitReached) return;
    if (answeredCount === 0) return;
    if (hasRefetched.current) return;
    hasRefetched.current = true;

    const updatedProfile = { ...profile, ...answers };
    fetch("/api/protocol", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedProfile),
    })
      .then((r) => r.json())
      .then((data: GeneratedProtocol) => {
        setProtocol((prev) => prev ? { ...prev, supplements: data.supplements } : data);
        setAddedIds(new Set());
        // Show popup only when 2+ questions answered — single-answer sessions update silently
        if (answeredCount >= 2) {
          setShowSharpen(true);
          setTimeout(() => {
            setShowSharpen(false);
            picksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 2500);
        }
      })
      .catch(() => { /* silent — original products stay */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLimitReached]);

  // Stepped intro: once protocol loads, animate bar from 0 → final value one field at a time
  useEffect(() => {
    if (loading || !protocol || !profile || introPlayed.current) return;
    introPlayed.current = true;
    const qualifierKeys = ["hair_concern_type","skin_concern_type","energy_concern_type","weight_goal","hormone_concern_type","sleep_concern_type"];
    const hasQualifier = qualifierKeys.some((k) => !!(profile as Record<string, unknown>)[k]);
    const filledCount = [!!profile.sex, !!profile.age, !!profile.concern, hasQualifier, !!profile.name, !!profile.diet].filter(Boolean).length || 1;
    const target = liveDepth;
    const stepValues = Array.from({ length: filledCount }, (_, i) => Math.round(target * (i + 1) / filledCount));
    let idx = 0;
    const advance = () => {
      setDisplayDepth(stepValues[idx]);
      idx++;
      if (idx < stepValues.length) setTimeout(advance, 160);
    };
    const t = setTimeout(advance, 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // After intro, keep bar in sync with live depth updates from follow-up answers
  useEffect(() => {
    if (introPlayed.current) setDisplayDepth(liveDepth);
  }, [liveDepth]);

  useEffect(() => {
    if (protocol?.supplements?.length) {
      setCartChecked(protocol.supplements.map(() => true));
      setCartSwapped(protocol.supplements.map(() => false));
    }
  }, [protocol?.supplements?.length]);

  /* ── Loading ───────────────────────────────────────────────── */
  if (loading || !protocol) {
    return (
      <div className="min-h-dvh pb-24 overflow-x-clip">
        <div className="sticky top-12 z-20 px-4 py-3 bg-surface/95 backdrop-blur-sm border-b border-outline-variant/10">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-on-surface-variant">Building {possLower} protocol…</span>
          </div>
          <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-primary-container to-primary rounded-full animate-pulse" />
          </div>
        </div>
        <ProtocolSkeleton />
      </div>
    );
  }

  /* ── Rendered protocol ─────────────────────────────────────── */
  return (
    <div className="min-h-dvh pb-24 overflow-x-clip">

      {/* Protocol sharpened dramatic overlay */}
      {showSharpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-3xl p-8 mx-6 text-center animate-fade-in-up shadow-2xl max-w-xs w-full">
            <div className="text-5xl mb-4 animate-bounce">✨</div>
            <h2 className="text-xl font-extrabold text-on-surface font-[family-name:var(--font-manrope)] mb-2">
              Protocol sharpened!
            </h2>
            <p className="text-sm text-on-surface-variant/70 leading-relaxed">
              Your picks have been refreshed based on your answers. Scroll down to see them.
            </p>
            <div className="mt-5 flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary-container/40 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
              ))}
            </div>
          </div>
        </div>
      )}


      {/* ── Protocol Cart Sheet ── */}
      {showProtocolCart && protocol && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end" onClick={() => setShowProtocolCart(false)}>
          <div className="bg-surface rounded-t-3xl shadow-2xl max-h-[92dvh] flex flex-col animate-fade-in-up" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="shrink-0 rounded-t-3xl" style={{ background: "linear-gradient(135deg, rgba(21,89,74,0.08) 0%, rgba(21,89,74,0.03) 100%)" }}>
              <div className="w-10 h-1 rounded-full bg-outline-variant/25 mx-auto mt-3.5" />
              <div className="flex items-center justify-between px-5 pt-3 pb-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3 h-3 text-primary-container" strokeWidth={1.5} />
                    <span className="text-[10px] font-bold text-primary-container uppercase tracking-wider">Your Protocol</span>
                  </div>
                  <h2 className="text-[18px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">
                    Protocol Pack
                  </h2>
                  <p className="text-[11px] text-on-surface-variant/50 mt-0.5">
                    {cartChecked.filter(Boolean).length} of {protocol.supplements.length} selected
                  </p>
                </div>
                <button
                  onClick={() => setShowProtocolCart(false)}
                  className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center cursor-pointer hover:bg-surface-container transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-on-surface-variant" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Product checklist — grouped by concern */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
              {protocolCartGroups.map((group) => (
                <div key={group.label}>
                  {/* Section header */}
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[14px] leading-none">{group.emoji}</span>
                    <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider">{group.label}</span>
                    <div className="flex-1 h-px bg-outline-variant/15" />
                  </div>
                  {/* Cards */}
                  <div className="space-y-2">
                    {group.indices.map((i) => {
                      const s = protocol.supplements[i];
                      const isChecked = cartChecked[i] ?? true;
                      const isSwapped = cartSwapped[i] ?? false;
                      const active = (isSwapped && s.alternative) ? s.alternative : s;
                      const alt = s.alternative;
                      return (
                        <div
                          key={s.id}
                          className={`rounded-2xl border transition-all duration-200 ${
                            isChecked ? "border-primary-container/20 bg-surface-container-lowest" : "border-outline-variant/10 bg-surface opacity-50"
                          }`}
                        >
                          <button
                            className="w-full flex items-center gap-3 px-3.5 py-3 text-left cursor-pointer"
                            onClick={() => setCartChecked(prev => { const n = [...prev]; n[i] = !n[i]; return n; })}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                              isChecked ? "bg-primary-container border-primary-container" : "border-outline-variant/40"
                            }`}>
                              {isChecked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                            </div>
                            <div className="w-11 h-11 rounded-xl overflow-hidden bg-surface-container shrink-0">
                              {active.image
                                // eslint-disable-next-line @next/next/no-img-element
                                ? <img src={active.image} alt={active.name} className="w-full h-full object-cover" loading="lazy" />
                                : <div className="w-full h-full flex items-center justify-center text-lg leading-none">{getSupplementEmoji(active.name)}</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] font-bold text-on-surface-variant/45 uppercase tracking-wider leading-none mb-0.5">{active.brand}</p>
                              <p className="text-[12px] font-bold text-on-surface leading-snug">{active.name}</p>
                              <p className="text-[13px] font-extrabold text-on-surface mt-0.5 font-[family-name:var(--font-manrope)]">₹{active.price}</p>
                            </div>
                          </button>
                          {alt && isChecked && (
                            <div className="px-3.5 pb-3 -mt-0.5">
                              <button
                                onClick={() => setCartSwapped(prev => { const n = [...prev]; n[i] = !n[i]; return n; })}
                                className="text-[10px] font-semibold text-primary-container bg-primary-container/8 px-2.5 py-1 rounded-full border border-primary-container/15 cursor-pointer hover:bg-primary-container/15 transition-colors"
                              >
                                {isSwapped
                                  ? `↩ Back to ${s.name.split(" ").slice(0, 3).join(" ")}`
                                  : `Swap → ${alt.name.split(" ").slice(0, 3).join(" ")} · ₹${alt.price}`}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 pt-3 pb-7 border-t border-outline-variant/10 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-on-surface-variant">Subtotal</span>
                <span className="text-xl font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">
                  ₹{protocol.supplements.reduce((sum, s, i) => {
                    if (!cartChecked[i]) return sum;
                    const active = (cartSwapped[i] && s.alternative) ? s.alternative : s;
                    return sum + active.price;
                  }, 0).toLocaleString("en-IN")}
                </span>
              </div>
              <button
                onClick={handleCheckoutProtocolCart}
                disabled={checkingOutCart || !cartChecked.some(Boolean)}
                className="w-full py-4 rounded-2xl bg-primary-container text-white font-bold text-sm hover:bg-primary transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {checkingOutCart
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding to cart…</>
                  : <><ShoppingBag className="w-4 h-4" strokeWidth={2} /> Add Selected &amp; Checkout</>}
              </button>
              <p className="text-[10px] text-on-surface-variant/40 text-center mt-2">
                Free delivery · Doctor-approved · Made for Indian bodies
              </p>
            </div>

          </div>
        </div>
      )}

      {/* ── Question bottom sheet ── */}
      {showQuestionSheet && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end" onClick={() => setShowQuestionSheet(false)}>
          <div className="bg-surface rounded-t-3xl shadow-2xl max-h-[85dvh] flex flex-col animate-fade-in-up" onClick={(e) => e.stopPropagation()}>

            {/* Handle + header */}
            <div className="px-5 pt-4 pb-3 shrink-0">
              <div className="w-10 h-1 rounded-full bg-outline-variant/30 mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary-container" strokeWidth={1.5} />
                  <span className="text-[11px] font-semibold text-primary-container uppercase tracking-wider">
                    {showingUpdate ? "Updated" : sessionLimitReached ? "That's good for today" : `Personalising · Question ${answeredCount + 1}`}
                  </span>
                </div>
                <button
                  onClick={() => setShowQuestionSheet(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant/60 text-sm font-bold cursor-pointer hover:bg-surface-container transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-8 pt-2">
              {showingUpdate ? (
                <div className="flex items-center gap-3 py-4 animate-fade-in-up">
                  <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center shrink-0">
                    <Check className="w-5 h-5 text-primary-container" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-semibold text-on-surface">Protocol updated</p>
                    <p className="text-sm text-on-surface-variant/70">
                      {depthGain > 0 ? `+${depthGain}% more precise` : "Your answer has been factored in"}
                    </p>
                  </div>
                  {depthGain > 0 && (
                    <span className="text-xl font-extrabold text-primary-container font-[family-name:var(--font-manrope)] shrink-0">
                      +{depthGain}%
                    </span>
                  )}
                </div>
              ) : sessionLimitReached ? (
                <div className="py-2 animate-fade-in-up">
                  <p className="text-[17px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] mb-1.5">
                    That&apos;s good for today
                  </p>
                  <p className="text-sm text-on-surface-variant/70 leading-relaxed mb-5">
                    {possUpper} protocol gets sharper every time you return. Come back tomorrow for one more question.
                  </p>
                  <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden mb-1.5">
                    <div className="h-full bg-gradient-to-r from-primary-container/60 to-primary-container rounded-full transition-all duration-700 ease-out" style={{ width: `${liveDepth}%` }} />
                  </div>
                  <p className="text-[11px] text-on-surface-variant/50 mb-5">Protocol at {liveDepth}%</p>
                  {!bonusUnlocked && currentQuestion && (
                    <button
                      onClick={() => setBonusUnlocked(true)}
                      className="w-full py-3 rounded-xl border border-primary-container/25 text-sm font-semibold text-primary-container hover:bg-primary-container/8 transition-colors cursor-pointer"
                    >
                      Actually, one more thing →
                    </button>
                  )}
                </div>
              ) : currentQuestion ? (
                <div key={currentQuestion.key} className="py-2 animate-fade-in-up">
                  <p className="text-[17px] font-semibold text-on-surface leading-snug mb-5 font-[family-name:var(--font-manrope)]">
                    {currentQuestion.question}
                  </p>
                  <div className="space-y-2.5">
                    {currentQuestion.options.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleAnswer(currentQuestion.key, opt.value)}
                        className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-surface-container-low border border-outline-variant/10 text-sm font-medium text-on-surface hover:border-primary-container/40 cursor-pointer transition-all duration-200 active:scale-[0.99]"
                      >
                        <span>{opt.label}</span>
                        <ChevronRight className="w-4 h-4 text-on-surface-variant/30" strokeWidth={1.5} />
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-5">
                    <div className="flex gap-1.5">
                      {Array.from({ length: answeredCount }).map((_, i) => (
                        <div key={i} className="h-1.5 w-4 rounded-full bg-primary-container" />
                      ))}
                      <div className="h-1.5 w-4 rounded-full bg-primary-container/40" />
                    </div>
                    <button
                      onClick={() => handleSkip(currentQuestion.key)}
                      className="text-[11px] font-medium text-on-surface-variant/40 hover:text-on-surface-variant/70 transition-colors cursor-pointer"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 pt-4">

        {/* ── Back to edit onboarding ── */}
        <button
          onClick={() => { window.location.href = "/home?edit=true"; }}
          className="flex items-center gap-1.5 mb-4 text-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          <span>Edit profile</span>
        </button>

        {/* ── Unified protocol header card ── */}
        <div
          className="mb-4 rounded-2xl border border-outline-variant/10 overflow-hidden animate-fade-in-up"
          style={{ background: "linear-gradient(145deg, color-mix(in srgb, var(--color-primary-container) 10%, transparent), color-mix(in srgb, var(--color-primary-container) 4%, transparent))" }}
        >
          <div className="p-4">

            {/* Top row: label + strength % */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-primary-container" strokeWidth={1.5} />
                <span className="text-[10px] font-bold text-primary-container uppercase tracking-widest">
                  {possUpper} Protocol
                </span>
              </div>
              <span className="text-sm font-extrabold text-primary-container font-[family-name:var(--font-manrope)]">
                {displayDepth}%
              </span>
            </div>

            {/* Title */}
            <h1 className="text-[22px] font-extrabold text-primary font-[family-name:var(--font-manrope)] leading-tight capitalize mb-2.5">
              {buildProtocolTitle(profile)}
            </h1>

            {/* Concern tags */}
            {concernList.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {concernList.map((c) => (
                  <span key={c} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${getConcernTagStyle(c)}`}>
                    <span className="text-sm leading-none">{getConcernEmoji([c], profile?.sex)}</span>
                    {CONCERN_TITLE_MAP[c] ?? c.toLowerCase()}
                  </span>
                ))}
              </div>
            )}

            {/* Strength bar */}
            <div className="h-1.5 bg-black/8 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-primary-container/80 to-primary-container rounded-full transition-all duration-200 ease-out"
                style={{ width: `${displayDepth}%` }}
              />
            </div>

            {/* Insight line */}
            {protocol.warmMessage && (
              <p className="text-[13px] text-on-surface/80 leading-relaxed font-medium">
                {firstSentence(protocol.warmMessage)}
              </p>
            )}

            {/* Sharpen bar */}
            {allAnswered ? (
              <div className="mt-3 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-primary-container/10">
                <Check className="w-3.5 h-3.5 text-primary-container shrink-0" strokeWidth={2.5} />
                <p className="text-[12px] font-bold text-primary-container">Protocol fully personalised</p>
              </div>
            ) : (
              <button
                onClick={() => setShowQuestionSheet(true)}
                className="mt-3 w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-black/6 hover:bg-black/10 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary-container shrink-0" strokeWidth={1.5} />
                  <div className="text-left">
                    <p className="text-[12px] font-bold text-on-surface leading-none">
                      {sessionLimitReached ? "That's good for today" : "Sharpen your protocol"}
                    </p>
                    <p className="text-[10px] text-on-surface-variant/55 mt-0.5">
                      {sessionLimitReached ? `${liveDepth}% · Come back tomorrow` : `Question ${answeredCount + 1} · Takes 10 seconds`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-on-surface-variant/40 shrink-0" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {/* ── Medication advisory banner ── */}
        {hasMedication && (
          <div className="mb-4 animate-fade-in-up rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3.5 flex items-start gap-3">
            <span className="text-lg shrink-0 leading-none mt-0.5">💊</span>
            <div>
              <p className="text-xs font-semibold text-on-surface mb-0.5">You mentioned you&apos;re on prescription medication</p>
              <p className="text-xs text-on-surface-variant/75 leading-relaxed">
                Please review this protocol with your doctor before starting anything new — especially supplements that affect hormone levels or nutrient absorption.
              </p>
            </div>
          </div>
        )}

        {/* ── Lifestyle habits — shown first, before supplements ── */}
        {protocol.lifestyle.length > 0 && (
          <div className="mb-4 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
            <div className="mb-3 px-1">
              <p className="text-base font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-snug mb-1">
                Habits before supplements.
              </p>
              <p className="text-xs text-on-surface-variant/65 leading-relaxed">
                Daily habits move the needle more than any pill. Start here — supplements accelerate what&apos;s already moving.
              </p>
            </div>
            <div className="flex gap-3 overflow-x-auto overscroll-x-contain hide-scrollbar pb-1">
              {protocol.lifestyle.map((tip, i) => {
                const { action } = splitRoutineText(tip);
                const emoji = getLifestyleEmoji(tip);
                const tint =
                  emoji === "😴" || emoji === "🌙" ? "bg-indigo-500/8 border-indigo-500/15" :
                  emoji === "🏃" || emoji === "💪" ? "bg-orange-500/8 border-orange-500/15" :
                  emoji === "🥗" || emoji === "🌿" ? "bg-emerald-500/8 border-emerald-500/15" :
                  emoji === "💧" ? "bg-sky-500/8 border-sky-500/15" :
                  emoji === "🧘" ? "bg-violet-500/8 border-violet-500/15" :
                  emoji === "✨" || emoji === "☀️" ? "bg-amber-500/8 border-amber-500/15" :
                  "bg-surface-container-low border-outline-variant/10";
                return (
                  <div key={i} className={`flex-shrink-0 w-[36vw] max-w-[148px] min-w-[124px] rounded-2xl border p-3.5 flex flex-col ${tint}`}>
                    <span className="text-4xl leading-none mb-3">{emoji}</span>
                    <p className="text-xs font-semibold text-on-surface leading-snug">{compressHabit(action)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Product picks — right after habits ── */}
        {protocol.supplements.length > 0 && (
          <div
            ref={picksRef}
            className="mb-4 rounded-2xl overflow-hidden border border-primary-container/10 animate-fade-in-up"
            style={{ animationDelay: "120ms", background: "linear-gradient(175deg, rgba(21,89,74,0.09) 0%, rgba(21,89,74,0.04) 45%, rgba(21,89,74,0.01) 100%)" }}
          >

            {/* Section header — shares the outer gradient */}
            <div className="px-4 pt-4 pb-3.5">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-primary-container" strokeWidth={1.5} />
                <span className="text-[10px] font-bold text-primary-container uppercase tracking-wider">AI-matched picks</span>
              </div>
              <p className="text-[18px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-tight mb-1">
                {possUpper} protocol picks.
              </p>
              {profileSubtitle ? (
                <>
                  <p className="text-[12px] text-primary-container/80 font-semibold leading-relaxed">{profileSubtitle}</p>
                  <p className="text-[10px] text-on-surface-variant/40 leading-none mt-0.5">Scored from 6.5M Indian health journeys</p>
                </>
              ) : (
                <p className="text-[12px] text-on-surface-variant/60 leading-relaxed">
                  Ranked across {concernList.length} concern{concernList.length !== 1 ? "s" : ""} · Scored from 6.5M Indian health journeys
                </p>
              )}
            </div>

            {/* Hairline divider between header and cards */}
            <div className="mx-4 h-px bg-primary-container/10 mb-3" />

            {/* Concern-grouped or flat product cards */}
            {groupedSupplements ? (
              <div className="space-y-5 pb-4">
                {groupedSupplements.map((group) => (
                  <div key={group.label}>
                    <div className="flex items-center gap-2 px-4 mb-2.5">
                      <span className="text-[16px] leading-none">{CONCERN_EMOJI[group.label] ?? "✦"}</span>
                      <span className="text-[12px] font-bold text-on-surface">{group.displayLabel}</span>
                      <span className="text-[10px] text-on-surface-variant/40">· {group.supplements.length} matched</span>
                      <div className="flex-1 h-px bg-outline-variant/15" />
                    </div>
                    <div className="flex gap-3 overflow-x-auto overscroll-x-contain hide-scrollbar pb-1 pl-4">
                      {group.supplements.map((s) => {
                        const discountPct = s.mrp && s.mrp > s.price ? Math.round((1 - s.price / s.mrp) * 100) : 0;
                        const reviewLabel = s.reviewCount ? (s.reviewCount >= 1000 ? `${(s.reviewCount / 1000).toFixed(1)}k` : `${s.reviewCount}`) : null;
                        const trustBadge = getTrustBadge(s);
                        const displayScore = displayScoreMap.get(s.id) ?? s.matchScore;
                        return (
                          <div
                            key={s.id}
                            onClick={() => router.push(`/product/${s.id}`)}
                            className="flex-shrink-0 w-[52vw] max-w-[200px] min-w-[160px] rounded-2xl bg-surface-container-lowest border border-outline-variant/8 overflow-hidden cursor-pointer hover:border-primary-container/30 transition-all duration-200 active:scale-[0.98]"
                          >
                            <div className="relative w-full h-[148px] bg-surface-container-low">
                              {s.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={s.image} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-5xl leading-none">{getSupplementEmoji(s.name)}</span>
                                </div>
                              )}
                              {discountPct >= 5 && (
                                <span className="absolute top-2 left-2 bg-primary-container text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md leading-none">{discountPct}% OFF</span>
                              )}
                              {displayScore >= 70 && (
                                <div className="absolute top-2 right-2 bg-primary-container/90 text-white text-[11px] font-extrabold px-2 py-1 rounded-full leading-none tabular-nums">
                                  {displayScore}%
                                </div>
                              )}
                            </div>
                            <div className="p-3">
                              <p className="text-[9px] font-bold text-primary-container/60 uppercase tracking-wider mb-0.5">{s.brand}</p>
                              <p className="text-[12px] font-bold text-on-surface leading-snug line-clamp-2 mb-0.5">{s.name}</p>
                              {s.reasoning && (
                                <p className="text-[9px] italic text-on-surface-variant/55 leading-snug line-clamp-2 mb-1">{s.reasoning}</p>
                              )}
                              {trustBadge && (
                                <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md mb-1 leading-none ${trustBadge.style}`}>{trustBadge.label}</span>
                              )}
                              {s.rating && (
                                <div className="flex items-center gap-1 mb-1">
                                  <span className="text-amber-400 text-[10px] leading-none">★</span>
                                  <span className="text-[10px] font-bold text-on-surface">{s.rating}</span>
                                  {reviewLabel && <span className="text-[9px] text-on-surface-variant/40">({reviewLabel})</span>}
                                </div>
                              )}
                              <p className="text-[9px] text-on-surface-variant/45 leading-none mb-1.5">👥 {getSocialCount(s)} similar</p>
                              <div className="flex items-end justify-between gap-1">
                                <div>
                                  <p className="text-[15px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-none">₹{s.price}</p>
                                  {s.mrp && s.mrp > s.price && <p className="text-[9px] text-on-surface-variant/35 line-through mt-0.5">₹{s.mrp}</p>}
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); void handleAddToCart(s.id); }}
                                  disabled={addingId === s.id || addedIds.has(s.id)}
                                  className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 cursor-pointer shrink-0 ${addedIds.has(s.id) ? "bg-primary-container text-white" : "bg-primary-container/15 text-primary-container hover:bg-primary-container/30"} disabled:opacity-60`}
                                  aria-label={addedIds.has(s.id) ? "Added" : "Add to cart"}
                                >
                                  {addingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : addedIds.has(s.id) ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <ShoppingBag className="w-4 h-4" strokeWidth={2} />}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Single concern — flat horizontal scroll */
              <div className="pb-4">
              {concernList.length === 1 && (
                <div className="flex items-center gap-2 px-4 mb-2.5">
                  <span className="text-[16px] leading-none">{CONCERN_EMOJI[concernList[0]] ?? "✦"}</span>
                  <span className="text-[12px] font-bold text-on-surface">{CONCERN_DISPLAY[concernList[0]] ?? concernList[0]}</span>
                  <span className="text-[10px] text-on-surface-variant/40">· {protocol.supplements.length} matched</span>
                  <div className="flex-1 h-px bg-outline-variant/15" />
                </div>
              )}
              <div className="flex gap-3 overflow-x-auto overscroll-x-contain hide-scrollbar pb-2 pl-4">
                {protocol.supplements.slice(0, 5).map((s) => {
                  const discountPct = s.mrp && s.mrp > s.price ? Math.round((1 - s.price / s.mrp) * 100) : 0;
                  const reviewLabel = s.reviewCount ? (s.reviewCount >= 1000 ? `${(s.reviewCount / 1000).toFixed(1)}k` : `${s.reviewCount}`) : null;
                  const trustBadge = getTrustBadge(s);
                  const displayScore = displayScoreMap.get(s.id) ?? s.matchScore;
                  return (
                    <div
                      key={s.id}
                      onClick={() => router.push(`/product/${s.id}`)}
                      className="flex-shrink-0 w-[52vw] max-w-[200px] min-w-[160px] rounded-2xl bg-surface-container-lowest border border-outline-variant/8 overflow-hidden cursor-pointer hover:border-primary-container/30 transition-all duration-200 active:scale-[0.98]"
                    >
                      <div className="relative w-full h-[148px] bg-surface-container-low">
                        {s.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.image} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-5xl leading-none">{getSupplementEmoji(s.name)}</span>
                          </div>
                        )}
                        {discountPct >= 5 && (
                          <span className="absolute top-2 left-2 bg-primary-container text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md leading-none">{discountPct}% OFF</span>
                        )}
                        {displayScore >= 70 && (
                          <div className="absolute top-2 right-2 bg-primary-container/90 text-white text-[11px] font-extrabold px-2 py-1 rounded-full leading-none tabular-nums">
                            {displayScore}%
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-[9px] font-bold text-primary-container/60 uppercase tracking-wider mb-0.5">{s.brand}</p>
                        <p className="text-[12px] font-bold text-on-surface leading-snug line-clamp-2 mb-0.5">{s.name}</p>
                        {s.reasoning && (
                          <p className="text-[9px] italic text-on-surface-variant/55 leading-snug line-clamp-2 mb-1">{s.reasoning}</p>
                        )}
                        {trustBadge && (
                          <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md mb-1 leading-none ${trustBadge.style}`}>{trustBadge.label}</span>
                        )}
                        {s.rating && (
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-amber-400 text-[10px] leading-none">★</span>
                            <span className="text-[10px] font-bold text-on-surface">{s.rating}</span>
                            {reviewLabel && <span className="text-[9px] text-on-surface-variant/40">({reviewLabel})</span>}
                          </div>
                        )}
                        <p className="text-[9px] text-on-surface-variant/45 leading-none mb-1.5">👥 {getSocialCount(s)} similar</p>
                        <div className="flex items-end justify-between gap-1">
                          <div>
                            <p className="text-[15px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-none">₹{s.price}</p>
                            {s.mrp && s.mrp > s.price && <p className="text-[9px] text-on-surface-variant/35 line-through mt-0.5">₹{s.mrp}</p>}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); void handleAddToCart(s.id); }}
                            disabled={addingId === s.id || addedIds.has(s.id)}
                            className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 cursor-pointer shrink-0 ${addedIds.has(s.id) ? "bg-primary-container text-white" : "bg-primary-container/15 text-primary-container hover:bg-primary-container/30"} disabled:opacity-60`}
                            aria-label={addedIds.has(s.id) ? "Added" : "Add to cart"}
                          >
                            {addingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : addedIds.has(s.id) ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <ShoppingBag className="w-4 h-4" strokeWidth={2} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* View all card */}
                <div
                  onClick={() => {
                    const picks = protocol.supplements.slice(0, 3).map((s) => s.id).join(",");
                    router.push(`/explore?picks=${encodeURIComponent(picks)}`);
                  }}
                  className="flex-shrink-0 w-[32vw] max-w-[136px] min-w-[112px] rounded-2xl border border-primary-container/20 border-dashed flex flex-col items-center justify-center gap-2.5 cursor-pointer hover:bg-primary-container/4 transition-colors"
                  style={{ minHeight: 240 }}
                >
                  <div className="w-9 h-9 rounded-full bg-primary-container/10 flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4 text-primary-container/70" strokeWidth={1.5} />
                  </div>
                  <div className="text-center px-2">
                    <p className="text-[10px] font-bold text-primary-container/80 leading-snug">View all</p>
                    <p className="text-[9px] text-on-surface-variant/40 mt-0.5">50+ products</p>
                  </div>
                </div>
              </div>
              </div>
            )}

            {/* Shop CTA */}
            <div className="mt-2">
              <button
                onClick={() => setShowProtocolCart(true)}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-primary-container text-sm font-bold text-white hover:bg-primary transition-colors duration-200 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" strokeWidth={2} />
                Shop {possUpper} Protocol
              </button>
              <p className="text-[11px] text-on-surface-variant text-center mt-2">
                Free shipping · Doctor-approved · Made for Indian bodies
              </p>
              <button
                onClick={() => router.push("/explore")}
                className="flex items-center justify-center gap-1 w-full mt-2.5 text-[12px] font-semibold text-on-surface-variant/50 hover:text-primary-container transition-colors cursor-pointer"
              >
                Browse all products
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>
        )}

        {/* ── Full protocol content ── */}
        {true && (
          <>

            {/* Why these work — horizontal scroll */}
            {ingredientList.length > 0 && (
              <div className="mb-3 animate-fade-in-up">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/50 mb-2 px-1">
                  Why these work
                </p>
                <div className="flex gap-2.5 overflow-x-auto overscroll-x-contain hide-scrollbar pb-1">
                  {ingredientList.map((item) => {
                    const isExpanded = expandedReasonings.has(item.name);
                    const cardStyle =
                      item.priority === "essential"
                        ? "bg-primary-container/10 border-primary-container/20"
                        : item.priority === "recommended"
                        ? "bg-amber-500/8 border-amber-500/20"
                        : "bg-surface-container-low border-outline-variant/10";
                    const badgeStyle =
                      item.priority === "essential"
                        ? "bg-primary-container text-white"
                        : item.priority === "recommended"
                        ? "bg-amber-500 text-white"
                        : "bg-surface-container-high text-on-surface-variant/60";
                    return (
                      <button
                        key={item.name}
                        onClick={() => toggleReasoning(item.name)}
                        className={`flex-shrink-0 w-[36vw] max-w-[148px] min-w-[120px] text-left rounded-2xl border p-3 transition-all duration-200 cursor-pointer active:scale-[0.98] ${cardStyle} ${isExpanded ? "min-w-[200px] max-w-[220px]" : ""}`}
                      >
                        <span className="text-xl block mb-2 leading-none">{getSupplementEmoji(item.name)}</span>
                        <p className="text-[12px] font-bold text-on-surface leading-snug mb-1.5">{item.name}</p>
                        <span className={`text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${badgeStyle}`}>
                          {item.priority}
                        </span>
                        <p className="text-[10px] text-on-surface-variant/55 mt-1.5 leading-relaxed">{item.timing}</p>
                        {isExpanded && (
                          <p className="text-[10px] text-on-surface-variant/80 mt-2 leading-relaxed border-t border-outline-variant/10 pt-2">
                            {item.why}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Allergy soft warning */}
            {profileAllergies.length > 0 && (
              <div className="mb-3 animate-fade-in-up rounded-xl border border-orange-500/20 bg-orange-500/6 px-4 py-3.5 flex items-start gap-3">
                <span className="text-lg shrink-0 leading-none mt-0.5">⚠️</span>
                <div>
                  <p className="text-xs font-semibold text-on-surface mb-0.5">
                    You mentioned {profileAllergies.join(", ")} sensitivity
                  </p>
                  <p className="text-xs text-on-surface-variant/75 leading-relaxed">
                    Check ingredient labels before purchasing — some supplement formulations may contain traces. When in doubt, contact the brand directly.
                  </p>
                </div>
              </div>
            )}


            {/* Blood report — level up card */}
            {!profile?.bloodReport && (
              <div className="mb-4 animate-fade-in-up">
                <div className="rounded-2xl border border-outline-variant/12 bg-surface-container-lowest overflow-hidden">
                  <div className="p-4">
                    <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mb-2">
                      Level up {possLower} protocol
                    </p>
                    <p className="text-[15px] font-extrabold text-on-surface leading-snug mb-1.5 font-[family-name:var(--font-manrope)]">
                      {possUpper} protocol is based on {profile?.name ? "their" : "your"} profile. A blood report makes it exact.
                    </p>
                    <p className="text-xs text-on-surface-variant/65 leading-relaxed mb-3">
                      We check your actual Vitamin D, Iron, B12, and thyroid levels — and rebuild your recommendations around real gaps, not estimated ones.
                    </p>
                    <div className="flex gap-1.5 flex-wrap mb-4">
                      {["Vitamin D", "Iron", "B12", "Thyroid"].map((b) => (
                        <span key={b} className="text-[10px] font-semibold text-primary-container bg-primary-container/10 px-2.5 py-1 rounded-full border border-primary-container/15">
                          {b}
                        </span>
                      ))}
                    </div>
                    <button className="flex items-center gap-1 text-[12px] font-bold text-primary-container cursor-pointer hover:gap-2 transition-all duration-200">
                      How it works <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Severity escalation — expert consult card */}
            {isSevereCase && (
              <div className="mb-4 animate-fade-in-up rounded-2xl overflow-hidden border border-primary-container/25 bg-primary-container/5">
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-primary-container/15 flex items-center justify-center shrink-0">
                      <Stethoscope className="w-3.5 h-3.5 text-primary-container" strokeWidth={1.5} />
                    </div>
                    <p className="text-[11px] font-semibold text-primary-container uppercase tracking-wider">
                      Based on your answers
                    </p>
                  </div>
                  <p className="text-[15px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-snug mb-1.5">
                    A specialist can help more than supplements alone
                  </p>
                  <p className="text-xs text-on-surface-variant/70 leading-relaxed mb-3">
                    Your symptoms suggest an underlying clinical cause worth investigating. A doctor can rule that out and give you a precise path — not just a protocol.
                  </p>
                  <button
                    onClick={() => {/* consult booking TBD */}}
                    className="w-full py-3 rounded-xl bg-primary-container text-sm font-semibold text-white cursor-pointer hover:bg-primary transition-colors duration-200"
                  >
                    Book a free consult
                  </button>
                  <p className="text-[10px] text-on-surface-variant/40 text-center mt-2">
                    Our in-house health coaches respond within the hour
                  </p>
                </div>
              </div>
            )}

            {/* Add family member */}
            <div className="mb-4 animate-fade-in-up">
              <button
                onClick={() => { localStorage.setItem("bh_add_mode", "1"); window.location.href = "/home"; }}
                className="w-full flex items-center gap-3.5 px-4 py-4 rounded-2xl border border-outline-variant/12 bg-surface-container-lowest hover:bg-primary-container/5 hover:border-primary-container/20 transition-all cursor-pointer text-left"
              >
                <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-lg shrink-0">
                  👨‍👩‍👧
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-on-surface">Build a protocol for family</p>
                  <p className="text-[11px] text-on-surface-variant/50 mt-0.5">Add your partner or kids — each gets their own personalised plan</p>
                </div>
                <ChevronRight className="w-4 h-4 text-on-surface-variant/30 shrink-0" strokeWidth={1.5} />
              </button>
            </div>

          </>
        )}

      </div>
    </div>
  );
}
