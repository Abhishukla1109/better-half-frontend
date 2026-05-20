"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ChevronRight,
  ChevronDown,
  Sun,
  Moon,
  Zap,
  Check,
  ShoppingBag,
  ArrowLeft,
  Upload,
  Lock,
  Stethoscope,
  Loader2,
} from "lucide-react";
import type { GeneratedProtocol, UserProfile } from "@/lib/ai/types";
import { calculateProfileDepth } from "@/lib/ai/profile-depth";
import { selectNextQuestion, countFollowUpAnswers } from "@/lib/ai/question-bank";
import { useCart } from "@/context/CartContext";
import { resolveVariantId } from "@/lib/shopify/variant-resolver";

/* ── Concern title map ─────────────────────────────────────── */
const CONCERN_TITLE_MAP: Record<string, string> = {
  "Hair / beard": "hair health",
  "Skin / acne": "skin & acne",
  "Energy / gut": "energy & gut",
  "Weight": "weight management",
  "Hormones": "hormonal balance",
  "Sleep / mind": "sleep & mind",
};

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
  const [depthGain, setDepthGain] = useState(0);
  // Auth gate removed — always unlocked after login step in onboarding
  // Visit tracking for smart question cadence
  const [visitCount, setVisitCount] = useState(1);
  const [bonusUnlocked, setBonusUnlocked] = useState(false);
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

  useEffect(() => {
    let stored: UserProfile | null = null;
    try {
      const raw = localStorage.getItem("bh_profile");
      if (!raw) { router.replace("/home"); return; }
      stored = JSON.parse(raw) as UserProfile;
      setProfile(stored);
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

  /* ── Derived state ─────────────────────────────────────────── */
  const concernList = useMemo(() => parseConcernList(profile), [profile]);

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
  const sessionLimitReached = (answeredCount + skippedKeys.size) >= effectiveLimit;
  const ingredientList = useMemo(() => buildIngredientList(concernList, profile?.sex), [concernList, profile?.sex]);
  const { lead: summaryLead, insights: summaryInsights } = splitSummary(protocol?.summary ?? "");

  // Live depth: updates as follow-up questions are answered
  const liveDepth = useMemo(() => {
    if (!profile) return protocol?.profileDepth.total ?? 0;
    return calculateProfileDepth({ ...profile, ...answers }).total;
  }, [profile, answers, protocol]);

  // Silent re-fetch when session ends — merges all answers in, updates products only
  useEffect(() => {
    if (!profile) return;
    if (!sessionLimitReached && !allAnswered) return;
    if (Object.keys(answers).length === 0) return;
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
        setAddedIds(new Set()); // reset cart state so buttons are fresh on new picks
        setShowSharpen(true);
        setTimeout(() => {
          setShowSharpen(false);
          picksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 2500);
      })
      .catch(() => { /* silent — original products stay */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLimitReached, allAnswered]);

  /* ── Loading ───────────────────────────────────────────────── */
  if (loading || !protocol) {
    return (
      <div className="min-h-dvh pb-24 overflow-x-clip">
        <div className="sticky top-12 z-20 px-4 py-3 bg-surface/95 backdrop-blur-sm border-b border-outline-variant/10">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-on-surface-variant">Building your protocol…</span>
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


      <div className="px-4 pt-4">

        {/* ── Back ── */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 mb-4 text-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          <span>Back</span>
        </button>

        {/* ── Warm message ── */}
        {protocol.warmMessage && (
          <div className="mb-4 animate-fade-in-up">
            <span className="text-3xl block mb-2.5 leading-none">{getConcernEmoji(concernList, profile?.sex)}</span>
            <p className="text-[15px] font-medium text-on-surface leading-relaxed">
              {protocol.warmMessage}
            </p>
          </div>
        )}

        {/* ── Protocol depth bar ── */}
        <div className="mb-4 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">
              Protocol strength
            </span>
            <span className="text-sm font-extrabold text-primary-container font-[family-name:var(--font-manrope)]">
              {liveDepth}%
            </span>
          </div>
          <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-container/70 to-primary-container rounded-full transition-all duration-700 ease-out"
              style={{ width: `${liveDepth}%` }}
            />
          </div>
          <p className="text-[11px] text-on-surface-variant/50 mt-1.5">
            Your protocol is live · gets more precise over time
          </p>
          {!allAnswered && currentQuestion && !sessionLimitReached && (
            <button
              onClick={() => document.getElementById("protocol-question")?.scrollIntoView({ behavior: "smooth" })}
              className="flex items-center gap-1.5 mt-2.5 cursor-pointer group"
            >
              <Sparkles className="w-3 h-3 text-primary-container shrink-0" strokeWidth={1.5} />
              <span className="text-[11px] font-semibold text-primary-container flex-1 text-left group-hover:underline">
                Answer more questions to sharpen it further
              </span>
              <ChevronRight className="w-3 h-3 text-primary-container" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* ── AI Summary ── */}
        <div className="feed-card-ai p-5 mb-3 animate-fade-in-up">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-container/20 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-primary-container" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-primary-container uppercase tracking-wider mb-1">
                Your Protocol
              </p>
              <h1 className="text-xl font-extrabold text-primary font-[family-name:var(--font-manrope)] leading-tight mb-2 capitalize">
                {buildProtocolTitle(profile)}
              </h1>
              {concernList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {concernList.map((c) => (
                    <span key={c} className="text-[10px] font-semibold text-primary-container bg-primary-container/10 px-2 py-0.5 rounded-full">
                      {c}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-sm font-medium text-on-surface leading-relaxed">
                {summaryLead}
              </p>
              {(summaryInsights.length > 0 || protocol.explanation) && (
                <>
                  <button
                    onClick={() => setSummaryExpanded((v) => !v)}
                    className="flex items-center gap-1 mt-2 text-[11px] font-semibold text-primary-container cursor-pointer"
                  >
                    {summaryExpanded ? "Show less" : "More insights"}
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${summaryExpanded ? "rotate-180" : ""}`} strokeWidth={2} />
                  </button>
                  {summaryExpanded && (
                    <div className="mt-2 space-y-1.5 border-t border-outline-variant/10 pt-2">
                      {summaryInsights.map((insight, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary-container/40 shrink-0 mt-1.5" />
                          <p className="text-xs text-on-surface-variant/80 leading-relaxed">{insight}</p>
                        </div>
                      ))}
                      {protocol.explanation && (
                        <p className="text-xs text-on-surface-variant/70 leading-relaxed mt-1">{protocol.explanation}</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
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

        {/* ── Habits intro ── */}
        <div className="mb-3 px-1 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
          <p className="text-base font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-snug mb-1">
            Habits before supplements.
          </p>
          <p className="text-xs text-on-surface-variant/65 leading-relaxed">
            I genuinely believe daily habits move the needle more than any pill. Build these first — supplements accelerate what&apos;s already moving.
          </p>
        </div>

        {/* ── Daily Routine ── */}
        <div className="mb-3 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/50 mb-2 px-1">
            Daily Routine
          </p>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
            {protocol.dailyRoutine.map((item, i) => {
              const Icon = item.time === "morning" ? Sun : item.time === "afternoon" ? Zap : Moon;
              const timeLabel = item.time === "morning" ? "Morning" : item.time === "afternoon" ? "Afternoon" : "Evening";
              const iconBg = item.time === "morning" ? "bg-amber-500/10" : item.time === "afternoon" ? "bg-blue-500/10" : "bg-indigo-500/10";
              const iconColor = item.time === "morning" ? "text-amber-600" : item.time === "afternoon" ? "text-blue-600" : "text-indigo-600";
              const { action, detail } = splitRoutineText(item.text);
              return (
                <div key={i} className="flex-shrink-0 w-[42vw] max-w-[180px] min-w-[152px] rounded-2xl bg-surface-container-lowest border border-outline-variant/8 p-3.5">
                  <div className={`flex items-center justify-center w-9 h-9 rounded-xl mb-2.5 ${iconBg}`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} strokeWidth={1.5} />
                  </div>
                  <p className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-wider mb-1">
                    {timeLabel}
                  </p>
                  <p className="text-sm font-semibold text-on-surface leading-snug">{action}</p>
                  {detail && (
                    <p className="text-[10px] text-on-surface-variant/55 mt-1.5 leading-relaxed">{detail}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Lifestyle Tips — first always visible ── */}
        {protocol.lifestyle.length > 0 && (
          <div className="mb-3 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/50 mb-2 px-1">
              Lifestyle Tips
            </p>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
              {(() => {
                const tip = protocol.lifestyle[0];
                const { action, detail } = splitRoutineText(tip);
                return (
                  <div className="flex-shrink-0 w-[42vw] max-w-[180px] min-w-[152px] rounded-2xl bg-surface-container-lowest border border-outline-variant/8 p-3.5">
                    <span className="text-2xl block mb-2 leading-none">{getLifestyleEmoji(tip)}</span>
                    <p className="text-sm font-semibold text-on-surface leading-snug">{action}</p>
                    {detail && <p className="text-[10px] text-on-surface-variant/55 mt-1.5 leading-relaxed">{detail}</p>}
                  </div>
                );
              })()}
              {protocol.lifestyle.slice(1).map((tip, i) => {
                const { action, detail } = splitRoutineText(tip);
                return (
                  <div key={i + 1} className="flex-shrink-0 w-[42vw] max-w-[180px] min-w-[152px] rounded-2xl bg-surface-container-lowest border border-outline-variant/8 p-3.5">
                    <span className="text-2xl block mb-2 leading-none">{getLifestyleEmoji(tip)}</span>
                    <p className="text-sm font-semibold text-on-surface leading-snug">{action}</p>
                    {detail && <p className="text-[10px] text-on-surface-variant/55 mt-1.5 leading-relaxed">{detail}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Full protocol content ── */}
        {true && (
          <>
            {/* Blood report */}
            {!profile?.bloodReport && (
              <div className="mb-3 animate-fade-in-up">
                <div className="feed-card p-4 border border-primary-container/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary-container/10 flex items-center justify-center shrink-0">
                      <Upload className="w-4 h-4 text-primary-container" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-sm font-semibold text-on-surface">Upload blood report</p>
                        <span className="text-[9px] font-bold text-primary-container bg-primary-container/10 px-1.5 py-0.5 rounded">
                          +10% accuracy
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant">Personalise further based on your actual biomarkers.</p>
                    </div>
                    <button className="shrink-0 text-[11px] font-semibold text-primary-container border border-primary-container/30 px-2.5 py-1.5 rounded-lg hover:bg-primary-container/10 transition-colors cursor-pointer whitespace-nowrap">
                      Upload
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* What your body needs — ingredient list */}
            {ingredientList.length > 0 && (
              <div className="mb-3 animate-fade-in-up">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/50 mb-2 px-1">
                  What your body needs
                </p>
                <div className="feed-card divide-y divide-outline-variant/8">
                  {ingredientList.map((item) => {
                    const isExpanded = expandedReasonings.has(item.name);
                    return (
                      <div key={item.name} className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="text-xl shrink-0 leading-none">{getSupplementEmoji(item.name)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-semibold text-on-surface">{item.name}</p>
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                item.priority === "essential"
                                  ? "text-primary-container bg-primary-container/10"
                                  : item.priority === "recommended"
                                    ? "text-on-surface-variant/70 bg-surface-container-high"
                                    : "text-on-surface-variant/50 bg-surface-container-low"
                              }`}>
                                {item.priority}
                              </span>
                            </div>
                            <p className="text-[11px] text-on-surface-variant/55 mt-0.5">{item.timing}</p>
                          </div>
                          <button
                            onClick={() => toggleReasoning(item.name)}
                            className="shrink-0 flex items-center gap-0.5 text-[10px] font-semibold text-on-surface-variant/50 hover:text-primary-container transition-colors cursor-pointer"
                          >
                            Why?
                            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} strokeWidth={2} />
                          </button>
                        </div>
                        {isExpanded && (
                          <p className="text-xs text-on-surface-variant mt-2 leading-relaxed pl-9">
                            {item.why}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bridge message — store card */}
            <div className="mb-3 animate-fade-in-up">
              <div className="rounded-2xl overflow-hidden border border-primary-container/20"
                style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary-container) 12%, transparent), color-mix(in srgb, var(--color-primary-container) 5%, transparent))" }}>
                <div className="p-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1">
                      <p className="text-sm font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-snug">
                        Good news — we stock all of this 🎉
                      </p>
                      <p className="text-xs text-on-surface-variant/65 mt-0.5 leading-relaxed">
                        Formulated for Indian bodies. No hunting across ten brands.
                      </p>
                    </div>
                  </div>

                  {/* Social proof row */}
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px]">⭐</span>
                      <span className="text-[11px] font-bold text-on-surface">4.5 rated</span>
                    </div>
                    <span className="text-on-surface-variant/25 text-xs">·</span>
                    <span className="text-[11px] font-bold text-on-surface">2M+ men trust us</span>
                    <span className="text-on-surface-variant/25 text-xs">·</span>
                    <span className="text-[11px] font-bold text-on-surface">Doctor-approved</span>
                  </div>

                  {/* Concern coverage pills */}
                  <div className="flex gap-1.5 flex-wrap">
                    {concernList.slice(0, 3).map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-container bg-primary-container/12 px-2 py-0.5 rounded-full"
                      >
                        <span className="text-[9px]">✓</span>
                        {c.split(" / ")[0]}
                      </span>
                    ))}
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-on-surface-variant/50 bg-surface-container px-2 py-0.5 rounded-full">
                      Free shipping
                    </span>
                  </div>
                </div>
              </div>
            </div>

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

            {/* Product sneak peek */}
            {protocol.supplements.length > 0 && (
              <div ref={picksRef} className="mb-4 animate-fade-in-up">
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/50">
                    Your picks
                  </p>
                  <button
                    onClick={handleAddAll}
                    disabled={addingAll || protocol.supplements.slice(0,3).every(s => addedIds.has(s.id))}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-primary-container bg-primary-container/10 px-3 py-1.5 rounded-full hover:bg-primary-container/20 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {addingAll ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : protocol.supplements.slice(0,3).every(s => addedIds.has(s.id)) ? (
                      <Check className="w-3 h-3" strokeWidth={2.5} />
                    ) : (
                      <ShoppingBag className="w-3 h-3" strokeWidth={2} />
                    )}
                    {protocol.supplements.slice(0,3).every(s => addedIds.has(s.id)) ? "All added" : "Add all"}
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                  {protocol.supplements.slice(0, 3).map((s) => {
                    const discountPct = s.mrp && s.mrp > s.price
                      ? Math.round((1 - s.price / s.mrp) * 100)
                      : 0;
                    const reviewLabel = s.reviewCount
                      ? s.reviewCount >= 1000
                        ? `${(s.reviewCount / 1000).toFixed(1)}k`
                        : `${s.reviewCount}`
                      : null;
                    return (
                      <div
                        key={s.id}
                        onClick={() => router.push(`/product/${s.id}`)}
                        className="flex-shrink-0 w-[48vw] max-w-[196px] min-w-[160px] rounded-2xl bg-surface-container-lowest border border-outline-variant/8 overflow-hidden cursor-pointer hover:border-primary-container/30 transition-all duration-200 active:scale-[0.98]"
                      >
                        {/* Image area */}
                        <div className="relative w-full h-[130px] bg-surface-container-low">
                          {s.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={s.image}
                              alt={s.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-5xl leading-none">{getSupplementEmoji(s.name)}</span>
                            </div>
                          )}
                          {/* Discount badge */}
                          {discountPct >= 5 && (
                            <span className="absolute top-2 left-2 bg-primary-container text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md leading-none">
                              {discountPct}% OFF
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-3">
                          {/* Rating row */}
                          {s.rating && (
                            <div className="flex items-center gap-1 mb-1.5">
                              <span className="text-[11px] leading-none">⭐</span>
                              <span className="text-[11px] font-bold text-on-surface">{s.rating}</span>
                              {reviewLabel && (
                                <span className="text-[10px] text-on-surface-variant/40">({reviewLabel})</span>
                              )}
                            </div>
                          )}

                          {/* Name */}
                          <p className="text-xs font-bold text-on-surface leading-snug line-clamp-2 mb-0.5">
                            {s.name}
                          </p>
                          <p className="text-[10px] text-on-surface-variant/45 mb-2.5">{s.brand}</p>

                          {/* Price row */}
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-sm font-extrabold text-primary font-[family-name:var(--font-manrope)] leading-none">
                                ₹{s.price}
                              </p>
                              {s.mrp && s.mrp > s.price && (
                                <p className="text-[9px] text-on-surface-variant/35 line-through mt-0.5">₹{s.mrp}</p>
                              )}
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); void handleAddToCart(s.id); }}
                              disabled={addingId === s.id || addedIds.has(s.id)}
                              className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200 cursor-pointer ${
                                addedIds.has(s.id)
                                  ? "bg-primary-container text-white"
                                  : "bg-primary-container/15 text-primary-container hover:bg-primary-container/30"
                              } disabled:opacity-60`}
                              aria-label={addedIds.has(s.id) ? "Added to cart" : "Add to cart"}
                            >
                              {addingId === s.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : addedIds.has(s.id) ? (
                                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                              ) : (
                                <ShoppingBag className="w-3.5 h-3.5" strokeWidth={2} />
                              )}
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
                    className="flex-shrink-0 w-[36vw] max-w-[148px] min-w-[120px] rounded-2xl border border-primary-container/20 border-dashed flex flex-col items-center justify-center gap-2.5 cursor-pointer hover:bg-primary-container/4 transition-colors"
                    style={{ minHeight: 230 }}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-primary-container/70" strokeWidth={1.5} />
                    </div>
                    <div className="text-center px-2">
                      <p className="text-[11px] font-bold text-primary-container/80 leading-snug">View all</p>
                      <p className="text-[10px] text-on-surface-variant/40 mt-0.5">50+ products</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Shop CTA */}
            <div className="mb-4 animate-fade-in-up">
              <button
                onClick={() => {
                  const picks = protocol.supplements.slice(0, 3).map((s) => s.id).join(",");
                  router.push(`/explore?picks=${encodeURIComponent(picks)}`);
                }}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-primary-container text-sm font-bold text-white hover:bg-primary transition-colors duration-200 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" strokeWidth={2} />
                Shop My Protocol
              </button>
              <p className="text-[11px] text-on-surface-variant text-center mt-2">
                Free shipping · Doctor-approved · Made for Indian bodies
              </p>
            </div>

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

            {/* Personalisation questions — at the bottom */}
            {!allAnswered && (
              <div id="protocol-question" className="mb-3">
                {showingUpdate ? (
                  <div className="feed-card-ai p-4 animate-fade-in-up">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-container/20 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-primary-container" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-on-surface">Protocol updated</p>
                        <p className="text-xs text-on-surface-variant/70">
                          {depthGain > 0 ? `+${depthGain}% more precise — keep going` : "Your answer has been factored in"}
                        </p>
                      </div>
                      {depthGain > 0 && (
                        <span className="text-xs font-extrabold text-primary-container font-[family-name:var(--font-manrope)] shrink-0">
                          +{depthGain}%
                        </span>
                      )}
                    </div>
                  </div>
                ) : sessionLimitReached ? (
                  <div className="feed-card p-5 animate-fade-in-up">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-primary-container/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4 text-primary-container" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-on-surface mb-0.5">That&apos;s good for today</p>
                        <p className="text-xs text-on-surface-variant/70 leading-relaxed">
                          Your protocol gets sharper every time you return. Come back tomorrow and it&apos;ll ask you one more thing.
                        </p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary-container/60 to-primary-container rounded-full transition-all duration-700 ease-out" style={{ width: `${liveDepth}%` }} />
                    </div>
                    <p className="text-[11px] text-on-surface-variant/50 mt-1.5">Protocol at {liveDepth}%</p>
                    {/* Bonus offer — shown only if more questions exist and bonus hasn't been taken */}
                    {!bonusUnlocked && currentQuestion && (
                      <button
                        onClick={() => setBonusUnlocked(true)}
                        className="mt-3 w-full py-2.5 rounded-xl border border-primary-container/25 text-xs font-semibold text-primary-container hover:bg-primary-container/8 transition-colors cursor-pointer"
                      >
                        Actually, one more thing →
                      </button>
                    )}
                  </div>
                ) : currentQuestion ? (
                  <div key={currentQuestion.key} className="feed-card p-5 animate-fade-in-up">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-3.5 h-3.5 text-primary-container" strokeWidth={1.5} />
                      <span className="text-[11px] font-semibold text-primary-container uppercase tracking-wider">
                        Personalising · Question {answeredCount + 1}
                      </span>
                    </div>
                    <p className="text-base font-semibold text-on-surface leading-snug mb-4 font-[family-name:var(--font-manrope)]">
                      {currentQuestion.question}
                    </p>
                    <div className="space-y-2">
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
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex gap-1.5">
                        {Array.from({ length: answeredCount }).map((_, i) => (
                          <div key={i} className="h-1.5 w-4 rounded-full bg-primary-container transition-all duration-300" />
                        ))}
                        <div className="h-1.5 w-4 rounded-full bg-primary-container/40 transition-all duration-300" />
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
            )}
            {allAnswered && (
              <div className="feed-card-ai p-4 mb-3 animate-fade-in-up">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-primary-container/20 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-primary-container" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">Protocol fully personalised</p>
                    <p className="text-xs text-on-surface-variant">{protocol.confidenceMessage}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
