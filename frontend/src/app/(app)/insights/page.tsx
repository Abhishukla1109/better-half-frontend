"use client";

import { useState, useEffect, useMemo } from "react";
import { Flame, CheckCircle2, XCircle, ChevronLeft, ChevronRight, ChevronDown, ShoppingBag, X } from "lucide-react";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { calculateProtocolMatch } from "@/lib/protocolEngine";
import { useCatalogProducts } from "@/hooks/useCatalogProducts";
import type { MatchedProduct } from "@/lib/protocolEngine";
import { calculateProfileDepth } from "@/lib/ai/profile-depth";
import { supabase } from "@/lib/supabase/client";

/* ── Energy bar options ── */
const ENERGY_OPTIONS = [
  { key: "energised" as const, emoji: "⚡", label: "Energised",   style: "bg-emerald-100 border-emerald-200 text-emerald-800", msg: "That's the energy we want to see. Keep it up!" },
  { key: "okay"      as const, emoji: "😊", label: "Doing okay", style: "bg-sky-100 border-sky-200 text-sky-800",             msg: "Consistent is good. The protocol is working quietly." },
  { key: "sluggish"  as const, emoji: "😑", label: "Bit low",    style: "bg-amber-100 border-amber-200 text-amber-800",       msg: "Check your sleep & hydration today. Supplements will help." },
  { key: "drained"   as const, emoji: "🥱", label: "Drained",    style: "bg-rose-100 border-rose-200 text-rose-800",          msg: "Take it easy today. Rest is part of the protocol too." },
];
type EnergyKey = typeof ENERGY_OPTIONS[number]["key"];

const ENERGY_DOT_COLOR: Record<string, string> = {
  energised: "#10b981",
  okay:      "#0ea5e9",
  sluggish:  "#f59e0b",
  drained:   "#f43f5e",
};

/* ── Education map ── */
const EDUCATION: Record<string, {
  openingLine: string;
  what: string;
  ingredients: { emoji: string; label: string }[];
  facts: { stat: string; label: string }[];
  timeline: { label: string; desc: string }[];
  timing: string;
  color: string;
  bannerFrom: string;
  bannerTo: string;
}> = {
  hair: {
    openingLine: "Your most important supplement right now.",
    what: "Strengthens hair from root to tip by supporting keratin production and blocking DHT.",
    ingredients: [
      { emoji: "🧬", label: "Biotin 10,000mcg" },
      { emoji: "⚡", label: "Zinc" },
      { emoji: "🍊", label: "Vitamin C" },
    ],
    facts: [
      { stat: "67%", label: "stronger hair shaft in 12 weeks" },
      { stat: "28%", label: "less cortisol — main trigger of hair fall" },
    ],
    timeline: [
      { label: "Week 1–2", desc: "Reduced fall" },
      { label: "Week 4–6", desc: "Thickness" },
      { label: "Week 10–12", desc: "Full cycle" },
    ],
    timing: "After lunch with a glass of water",
    color: "#d97706",
    bannerFrom: "#f59e0b",
    bannerTo: "#f97316",
  },
  sleep: {
    openingLine: "Better sleep changes everything else.",
    what: "Activates your brain's natural off-switch for deeper, uninterrupted sleep.",
    ingredients: [
      { emoji: "🌙", label: "Magnesium Bisglycinate" },
      { emoji: "🧠", label: "Vitamin B6" },
      { emoji: "💤", label: "L-Theanine" },
    ],
    facts: [
      { stat: "2×", label: "deeper sleep within the first week" },
      { stat: "78%", label: "of Indians are magnesium-deficient" },
    ],
    timeline: [
      { label: "Day 3–5", desc: "Calmer mind" },
      { label: "Week 2", desc: "Uninterrupted" },
      { label: "Week 4", desc: "Rhythm set" },
    ],
    timing: "30 minutes before bed",
    color: "#6366f1",
    bannerFrom: "#818cf8",
    bannerTo: "#8b5cf6",
  },
  hormones: {
    openingLine: "The root of fatigue, drive, and mood — all in one.",
    what: "Clinically proven adaptogen that reduces cortisol and supports natural testosterone.",
    ingredients: [
      { emoji: "🌿", label: "KSM-66 Ashwagandha" },
      { emoji: "💪", label: "Withanolides 5%" },
      { emoji: "🔬", label: "Shilajit Extract" },
    ],
    facts: [
      { stat: "28%", label: "cortisol reduction in 8 weeks" },
      { stat: "4×",  label: "better absorption vs standard extract" },
    ],
    timeline: [
      { label: "Week 2",   desc: "Less stress" },
      { label: "Week 4–6", desc: "Energy & drive" },
      { label: "Week 8",   desc: "Balanced" },
    ],
    timing: "Evening with warm milk or water",
    color: "#16a34a",
    bannerFrom: "#4ade80",
    bannerTo: "#10b981",
  },
  energy: {
    openingLine: "Closes the gap most people never know they have.",
    what: "Closes common micronutrient gaps that silently drain your energy all day.",
    ingredients: [
      { emoji: "🩸", label: "Iron Bisglycinate" },
      { emoji: "🍊", label: "Vitamin C" },
      { emoji: "⚡", label: "B-complex" },
    ],
    facts: [
      { stat: "67%", label: "better iron absorption with Vitamin C" },
      { stat: "3×",  label: "more efficient than diet changes alone" },
    ],
    timeline: [
      { label: "Week 1",   desc: "Less fatigue" },
      { label: "Week 2–3", desc: "Energy lift" },
      { label: "Week 4",   desc: "All-day stable" },
    ],
    timing: "Morning with breakfast",
    color: "#ea580c",
    bannerFrom: "#fb923c",
    bannerTo: "#f59e0b",
  },
  nutrition: {
    openingLine: "Fill the gaps your diet leaves behind, every day.",
    what: "Fills the daily nutrition gaps that diet alone rarely covers.",
    ingredients: [
      { emoji: "🌞", label: "Vitamin D3" },
      { emoji: "🧬", label: "B12" },
      { emoji: "⚡", label: "Zinc" },
    ],
    facts: [
      { stat: "80%", label: "of urban Indians are Vitamin D deficient" },
      { stat: "3×",  label: "more efficient than dietary changes alone" },
    ],
    timeline: [
      { label: "Week 1",   desc: "Baseline fills" },
      { label: "Week 3–4", desc: "Better immunity" },
      { label: "Week 6–8", desc: "Optimised" },
    ],
    timing: "Morning with breakfast",
    color: "#0d9488",
    bannerFrom: "#2dd4bf",
    bannerTo: "#22d3ee",
  },
  skin: {
    openingLine: "Great skin starts in your gut — not on your face.",
    what: "Balances the gut-skin axis — the real root cause of most adult acne.",
    ingredients: [
      { emoji: "🦠", label: "50B CFU Probiotics" },
      { emoji: "🌱", label: "16 Strains" },
      { emoji: "🧬", label: "Prebiotics" },
    ],
    facts: [
      { stat: "70%",   label: "of immunity lives in your gut" },
      { stat: "6 wks", label: "to noticeably clearer skin" },
    ],
    timeline: [
      { label: "Week 2",   desc: "Less breakouts" },
      { label: "Week 4–5", desc: "Calmer skin" },
      { label: "Week 6–8", desc: "Clearer texture" },
    ],
    timing: "Before breakfast on empty stomach",
    color: "#e11d48",
    bannerFrom: "#fb7185",
    bannerTo: "#f472b6",
  },
  weight: {
    openingLine: "Fuel harder workouts. Build more. Burn more.",
    what: "Fuels performance and muscle recovery while supporting lean body composition.",
    ingredients: [
      { emoji: "💪", label: "Creatine Monohydrate" },
      { emoji: "🔬", label: "Micronised 200 mesh" },
      { emoji: "⚡", label: "Pure & unflavoured" },
    ],
    facts: [
      { stat: "5g",    label: "most researched supplement dose in sports science" },
      { stat: "2–3 wks", label: "to measurable strength gains" },
    ],
    timeline: [
      { label: "Week 1",  desc: "Cell hydration" },
      { label: "Week 2–3", desc: "Strength gains" },
      { label: "Week 4+", desc: "Lean mass" },
    ],
    timing: "Post-workout or morning",
    color: "#2563eb",
    bannerFrom: "#60a5fa",
    bannerTo: "#818cf8",
  },
  beard: {
    openingLine: "Give your beard the nutrients your diet skips.",
    what: "Provides the micronutrients beard follicles need for density and growth.",
    ingredients: [
      { emoji: "🧬", label: "Biotin" },
      { emoji: "⚡", label: "Zinc" },
      { emoji: "🌱", label: "Vitamin E" },
    ],
    facts: [
      { stat: "10–12 wks", label: "to denser, fuller coverage" },
      { stat: "#1",        label: "cause of patchy beard: Zinc deficiency" },
    ],
    timeline: [
      { label: "Week 2–3",  desc: "Stronger strands" },
      { label: "Week 6–8",  desc: "Denser coverage" },
      { label: "Week 10–12", desc: "Fuller beard" },
    ],
    timing: "After lunch with water",
    color: "#b45309",
    bannerFrom: "#fbbf24",
    bannerTo: "#f97316",
  },
};

const CONCERN_MAP: Record<string, string> = {
  "Hair / beard": "hair",
  "Skin / acne": "skin",
  "Energy / gut": "energy",
  "Weight": "weight",
  "Hormones": "hormones",
  "Sleep / mind": "sleep",
};

const CONCERN_BAR_COLOR: Record<string, string> = {
  hair: "bg-amber-500",
  sleep: "bg-indigo-500",
  hormones: "bg-green-600",
  energy: "bg-orange-500",
  nutrition: "bg-teal-500",
  skin: "bg-rose-500",
  weight: "bg-blue-500",
  beard: "bg-amber-600",
};

const CONCERN_LABELS: Record<string, string> = {
  "Hair / beard": "Hair",
  "Skin / acne": "Skin",
  "Energy / gut": "Energy",
  "Weight": "Weight",
  "Hormones": "Hormones",
  "Sleep / mind": "Sleep",
};

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_HEADERS = ["S","M","T","W","T","F","S"];

/* ── Secondary check-in dimensions (rotate daily) ── */
const SECONDARY_DIMS = [
  {
    key: "sleep" as const,
    storageKey: "bh_sleep",
    question: "How did you sleep last night?",
    options: [
      { key: "deep",     emoji: "😴", label: "Deep sleep", score: 100 },
      { key: "okay",     emoji: "🙂", label: "Okay",       score: 65  },
      { key: "restless", emoji: "😶", label: "Restless",   score: 35  },
      { key: "terrible", emoji: "😩", label: "Terrible",   score: 10  },
    ],
    accentColor: "#6366f1",
    bgGradient: "linear-gradient(145deg, #eef2ff, #fff)",
    border: "border-indigo-100",
  },
  {
    key: "focus" as const,
    storageKey: "bh_focus",
    question: "How's your focus today?",
    options: [
      { key: "sharp",     emoji: "🧠", label: "Sharp",       score: 100 },
      { key: "good",      emoji: "😊", label: "Good",        score: 70  },
      { key: "foggy",     emoji: "😑", label: "Bit foggy",   score: 35  },
      { key: "unfocused", emoji: "😵", label: "Can't focus", score: 10  },
    ],
    accentColor: "#0d9488",
    bgGradient: "linear-gradient(145deg, #f0fdfa, #fff)",
    border: "border-teal-100",
  },
  {
    key: "physical" as const,
    storageKey: "bh_physical",
    question: "How's your body feeling?",
    options: [
      { key: "strong", emoji: "💪",   label: "Strong", score: 100 },
      { key: "normal", emoji: "🙂",   label: "Normal", score: 70  },
      { key: "tired",  emoji: "😮‍💨", label: "Tired",  score: 35  },
      { key: "heavy",  emoji: "😩",   label: "Heavy",  score: 10  },
    ],
    accentColor: "#ea580c",
    bgGradient: "linear-gradient(145deg, #fff7ed, #fff)",
    border: "border-orange-100",
  },
];

// Stable per-day rotation — same dimension shown all day
const ACTIVE_SECONDARY = SECONDARY_DIMS[new Date().getDay() % SECONDARY_DIMS.length];

/* ── Signal computation & storage ── */
function computeAvg7(storageKey: string, scoreMap: Record<string, number>): number | null {
  const scores = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    const v = localStorage.getItem(`${storageKey}_${d.toDateString()}`);
    return v ? (scoreMap[v] ?? null) : null;
  }).filter((s): s is number => s !== null);
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

function saveHealthSignals() {
  try {
    const signals = {
      energy:   computeAvg7("bh_energy",   { energised: 100, okay: 65, sluggish: 35, drained: 10 }),
      sleep:    computeAvg7("bh_sleep",    { deep: 100, okay: 65, restless: 35, terrible: 10 }),
      focus:    computeAvg7("bh_focus",    { sharp: 100, good: 70, foggy: 35, unfocused: 10 }),
      physical: computeAvg7("bh_physical", { strong: 100, normal: 70, tired: 35, heavy: 10 }),
      updatedAt: new Date().toDateString(),
    };
    localStorage.setItem("bh_health_signals", JSON.stringify(signals));
  } catch {}
}

/* ── Helpers ── */
type Checkins = Record<string, boolean>;

function loadCheckins(): Checkins {
  try { return JSON.parse(localStorage.getItem("bh_checkins") ?? "{}"); }
  catch { return {}; }
}
function saveCheckins(c: Checkins) {
  try { localStorage.setItem("bh_checkins", JSON.stringify(c)); } catch {}
}
function calcStreak(checkins: Checkins): number {
  let streak = 0;
  const d = new Date();
  d.setDate(d.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    if (checkins[d.toDateString()] === true) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  if (checkins[new Date().toDateString()] === true) streak++;
  return streak;
}
function getMonthCells(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}
function calcVitality(checkins: Checkins, depthTotal: number, visitCount: number): number {
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i); return d.toDateString();
  });
  const checked = last30.filter(k => checkins[k] === true).length;
  return Math.round(Math.min((checked / 30) * 40 + (depthTotal / 100) * 30 + (Math.min(visitCount, 90) / 90) * 30, 100));
}

const VITALITY_MESSAGES = [
  { min: 80, msg: "You're building real momentum. The compounding effects are kicking in." },
  { min: 60, msg: "Good progress. A few more consistent days and you'll really feel the difference." },
  { min: 40, msg: "You've started the journey. Small daily habits are what make protocols work." },
  { min: 0,  msg: "Every great health journey starts here. Check in daily and your score climbs." },
];

/* ── Supabase sync helpers ── */
async function upsertHealthLog(userId: string, date: string, type: string, value: string) {
  try {
    await supabase.from("health_logs").upsert(
      { user_id: userId, date, type, value },
      { onConflict: "user_id,date,type" },
    );
  } catch { /* non-critical */ }
}

async function syncHealthLogsFromSupabase(
  onCheckins: (c: Checkins) => void,
  onEnergyHistory: (h: { date: string; key: EnergyKey | null; dayLabel: string }[]) => void,
  onEnergyToday: (k: EnergyKey, msg: string) => void,
  onSecondaryToday: (k: string) => void,
  onSecondaryHistory: (h: { date: string; key: string | null; dayLabel: string }[]) => void,
) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Fetch last 60 days of logs in one query
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const { data: logs } = await supabase
      .from("health_logs")
      .select("date, type, value")
      .eq("user_id", session.user.id);

    if (!logs || logs.length === 0) return;

    // Write everything back to localStorage so existing helpers work unchanged
    const checkins: Checkins = loadCheckins();
    logs.forEach(log => {
      if (log.type === "checkin") {
        localStorage.setItem(`bh_checkin_${log.date}`, log.value);
        checkins[log.date] = log.value === "true";
      } else {
        localStorage.setItem(`bh_${log.type}_${log.date}`, log.value);
      }
    });
    saveCheckins(checkins);
    onCheckins({ ...checkins });

    // Rebuild 7-day energy history from localStorage (now hydrated)
    const today = new Date().toDateString();
    const dayLabels = ["S","M","T","W","T","F","S"];
    const energyHistory = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i);
      return { date: d.toDateString(), key: localStorage.getItem(`bh_energy_${d.toDateString()}`) as EnergyKey | null, dayLabel: dayLabels[d.getDay()] };
    }).reverse();
    onEnergyHistory(energyHistory);

    // Today's energy
    const todayEnergy = localStorage.getItem(`bh_energy_${today}`) as EnergyKey | null;
    if (todayEnergy) {
      const opt = ENERGY_OPTIONS.find(o => o.key === todayEnergy);
      if (opt) onEnergyToday(opt.key, opt.msg);
    }

    // Today's secondary + 7-day history
    const todaySecondary = localStorage.getItem(`${ACTIVE_SECONDARY.storageKey}_${today}`);
    if (todaySecondary) onSecondaryToday(todaySecondary);
    const secHistory = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i);
      return { date: d.toDateString(), key: localStorage.getItem(`${ACTIVE_SECONDARY.storageKey}_${d.toDateString()}`), dayLabel: dayLabels[d.getDay()] };
    }).reverse();
    onSecondaryHistory(secHistory);
  } catch { /* non-critical — app works from localStorage even if this fails */ }
}

/* ── Page ── */
export default function InsightsPage() {
  const { activeMember } = useActiveProfile();
  const { products: catalogProducts } = useCatalogProducts();

  const [checkins, setCheckins]         = useState<Checkins>({});
  const [visitCount, setVisitCount]     = useState(0);
  const [supplements, setSupplements]   = useState<MatchedProduct[]>([]);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [depthTotal, setDepthTotal]     = useState(10);
  const [calMonth, setCalMonth]         = useState(new Date().getMonth());
  const [calYear, setCalYear]           = useState(new Date().getFullYear());
  const [userConcerns, setUserConcerns] = useState<string[]>([]);
  const [userGender, setUserGender]     = useState("male");
  const [energyLevel, setEnergyLevel]   = useState<EnergyKey | null>(null);
  const [energyMsg, setEnergyMsg]       = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [energyHistory, setEnergyHistory] = useState<{ date: string; key: EnergyKey | null; dayLabel: string }[]>([]);
  const [showVitalityPopover, setShowVitalityPopover] = useState(false);
  const [secondaryAnswer, setSecondaryAnswer] = useState<string | null>(null);
  const [secondaryHistory, setSecondaryHistory] = useState<{ date: string; key: string | null; dayLabel: string }[]>([]);
  const [hasProfile, setHasProfile] = useState(false);

  const today   = new Date().toDateString();
  const todayChecked = checkins[today];
  const streak   = useMemo(() => calcStreak(checkins), [checkins]);
  const vitality = useMemo(() => calcVitality(checkins, depthTotal, visitCount), [checkins, depthTotal, visitCount]);
  const calCells = useMemo(() => getMonthCells(calYear, calMonth), [calYear, calMonth]);

  const vitalMsg = VITALITY_MESSAGES.find(m => vitality >= m.min)?.msg ?? VITALITY_MESSAGES[3].msg;

  const adherence = useMemo(() => {
    const days = Math.min(visitCount || 0, 30);
    if (days === 0) return null;
    const keys = Array.from({ length: days }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toDateString(); });
    const taken = keys.filter(k => checkins[k] === true).length;
    return { taken, total: days, pct: Math.round((taken / days) * 100) };
  }, [checkins, visitCount]);

  useEffect(() => {
    setCheckins(loadCheckins());
    try {
      const vRaw = localStorage.getItem("bh_protocol_visits");
      if (vRaw) setVisitCount((JSON.parse(vRaw) as { count: number }).count);
    } catch {}
    try {
      const saved = localStorage.getItem(`bh_energy_${new Date().toDateString()}`);
      if (saved) {
        const opt = ENERGY_OPTIONS.find(o => o.key === saved);
        if (opt) { setEnergyLevel(opt.key); setEnergyMsg(opt.msg); }
      }
    } catch {}
    try {
      const history = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i);
        return { date: d.toDateString(), key: localStorage.getItem(`bh_energy_${d.toDateString()}`) as EnergyKey | null, dayLabel: ["S","M","T","W","T","F","S"][d.getDay()] };
      }).reverse();
      setEnergyHistory(history);
    } catch {}
    try {
      const saved = localStorage.getItem(`${ACTIVE_SECONDARY.storageKey}_${new Date().toDateString()}`);
      if (saved) setSecondaryAnswer(saved);
    } catch {}
    try {
      const hist = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i);
        return { date: d.toDateString(), key: localStorage.getItem(`${ACTIVE_SECONDARY.storageKey}_${d.toDateString()}`), dayLabel: ["S","M","T","W","T","F","S"][d.getDay()] };
      }).reverse();
      setSecondaryHistory(hist);
    } catch {}
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profile: any = JSON.parse(localStorage.getItem("bh_profile") ?? "null");
      if (!profile) { setProfileLoaded(true); setHasProfile(false); return; }
      setHasProfile(true);
      const depth = calculateProfileDepth(profile);
      setDepthTotal(depth.total);
      const gender: string = profile.sex ?? "male";
      setUserGender(gender);
      const rawConcern: string  = profile.concern ?? "";
      const rawConcerns: string[] = Array.isArray(profile.concerns) ? profile.concerns : [];
      setUserConcerns(rawConcerns.length > 0 ? rawConcerns : rawConcern ? [rawConcern] : []);
      // supplements re-calculated in catalogProducts effect below
    } catch {}
    setProfileLoaded(true);

    // Background sync from Supabase — silently hydrates localStorage + state
    // for signed-in users coming from another device. No-op for demo users.
    syncHealthLogsFromSupabase(
      setCheckins,
      setEnergyHistory,
      (k, msg) => { setEnergyLevel(k); setEnergyMsg(msg); },
      setSecondaryAnswer,
      setSecondaryHistory,
    );
  }, []);

  useEffect(() => {
    if (!catalogProducts.length) return;
    try {
      const profile = JSON.parse(localStorage.getItem("bh_profile") ?? "null");
      if (!profile) return;
      const gender: string = profile.sex ?? "male";
      const rawConcern: string = profile.concern ?? "";
      const concern = CONCERN_MAP[rawConcern] || "energy";
      const followUpStr = Object.entries(profile as Record<string, unknown>)
        .filter(([, v]) => v && typeof v === "string")
        .map(([, v]) => (v as string).replace(/_/g, " "))
        .join(" ")
        .toLowerCase();
      const matched = calculateProtocolMatch({ gender, age: profile.age ?? "25-34", diet: profile.diet ?? "non-veg", concern, followUp: followUpStr || undefined }, catalogProducts);
      setSupplements(matched);
    } catch {}
  }, [catalogProducts]);

  const handleCheckin = (val: boolean) => {
    const updated = { ...checkins, [today]: val };
    setCheckins(updated);
    saveCheckins(updated);
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) upsertHealthLog(session.user.id, today, "checkin", String(val));
    });
  };

  const handleEnergy = (opt: typeof ENERGY_OPTIONS[number]) => {
    setEnergyLevel(opt.key);
    setEnergyMsg(opt.msg);
    try { localStorage.setItem(`bh_energy_${today}`, opt.key); } catch {}
    setEnergyHistory(prev => prev.map(h => h.date === today ? { ...h, key: opt.key } : h));
    saveHealthSignals();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) upsertHealthLog(session.user.id, today, "energy", opt.key);
    });
  };

  const handleSecondary = (key: string) => {
    setSecondaryAnswer(key);
    try { localStorage.setItem(`${ACTIVE_SECONDARY.storageKey}_${today}`, key); } catch {}
    setSecondaryHistory(prev => prev.map(h => h.date === today ? { ...h, key } : h));
    saveHealthSignals();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) upsertHealthLog(session.user.id, today, ACTIVE_SECONDARY.key, key);
    });
  };

  // Complementary products — same concern first, pad with top-rated cross-concern if catalog is thin
  const complementary = useMemo(() => {
    if (!supplements.length) return [];
    const stackIds = new Set(supplements.map(s => s.id));
    const concerns = supplements.flatMap(s => s.concern);
    const genderOk = (p: typeof catalogProducts[number]) =>
      p.gender.includes(userGender) || p.gender.includes("all");

    const sameConcern = catalogProducts
      .filter(p => !stackIds.has(p.id) && p.concern.some(c => concerns.includes(c)) && genderOk(p) && p.brand !== "Little Joys")
      .sort((a, b) => b.baseScore - a.baseScore)
      .slice(0, 4);

    if (sameConcern.length >= 4) return sameConcern;

    // Pad with top-rated from any concern for the same gender
    const sameConcernIds = new Set(sameConcern.map(p => p.id));
    const cross = catalogProducts
      .filter(p => !stackIds.has(p.id) && !sameConcernIds.has(p.id) && genderOk(p) && p.brand !== "Little Joys")
      .sort((a, b) => b.baseScore - a.baseScore)
      .slice(0, 4 - sameConcern.length);

    return [...sameConcern, ...cross];
  }, [supplements, userGender, catalogProducts]);

  // Per-concern scores
  const concernScores = useMemo(() =>
    userConcerns.map(c => {
      const key = CONCERN_MAP[c] ?? c.toLowerCase();
      const hash = key.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);
      return { label: CONCERN_LABELS[c] ?? c, key, score: Math.max(10, Math.min(100, vitality + (hash % 11) - 5)) };
    }),
    [userConcerns, vitality],
  );

  const energyScore = useMemo(() => {
    const vals: Record<string, number> = { energised: 100, okay: 65, sluggish: 35, drained: 10 };
    const scores = energyHistory.filter(h => h.key).map(h => vals[h.key!] ?? 50);
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  }, [energyHistory]);

  const wellbeingScore = useMemo(() => {
    try {
      const sleepAvg = computeAvg7("bh_sleep",    { deep: 100, okay: 65, restless: 35, terrible: 10 });
      const focusAvg = computeAvg7("bh_focus",    { sharp: 100, good: 70, foggy: 35, unfocused: 10 });
      const physAvg  = computeAvg7("bh_physical", { strong: 100, normal: 70, tired: 35, heavy: 10 });
      const vals = [sleepAvg, focusAvg, physAvg].filter((v): v is number => v !== null);
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    } catch { return null; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondaryAnswer]);

  const pillars = useMemo(() => {
    const consistency = adherence?.pct ?? 0;
    const foundation  = Math.round(Math.min((visitCount / 90) * 100, 100));
    const profile     = Math.round(Math.min(depthTotal, 100));
    const combinedEnergy = (energyScore != null && wellbeingScore != null)
      ? Math.round((energyScore + wellbeingScore) / 2)
      : energyScore ?? wellbeingScore ?? 50;
    const hasSignals = energyScore != null || wellbeingScore != null;
    return [
      {
        emoji: "🔥", label: "Consistency", score: consistency, color: consistency >= 70 ? "#10b981" : consistency >= 40 ? "#f59e0b" : "#f43f5e",
        sublabel: adherence ? `${adherence.taken} of ${adherence.total} days checked in` : "Start checking in daily",
      },
      {
        emoji: "⚡", label: "Energy", score: combinedEnergy, color: combinedEnergy >= 70 ? "#10b981" : combinedEnergy >= 40 ? "#0ea5e9" : "#f59e0b",
        sublabel: hasSignals ? "Energy, sleep & focus signals" : "Log your daily check-ins to track this",
      },
      {
        emoji: "🌱", label: "Foundation", score: foundation, color: "#7c3aed",
        sublabel: visitCount > 0 ? `${visitCount} days on protocol` : "Protocol just started",
      },
      {
        emoji: "👤", label: "Personalisation", score: profile, color: profile >= 70 ? "#10b981" : "#f59e0b",
        sublabel: profile >= 70 ? "Profile well set up" : "Add more detail on your protocol page",
      },
    ];
  }, [adherence, visitCount, depthTotal, energyScore, wellbeingScore]);

  const vitalityLabel =
    vitality >= 81 ? "Thriving" :
    vitality >= 66 ? "Strong foundation" :
    vitality >= 46 ? "Making progress" :
    vitality >= 26 ? "Building momentum" : "Just getting started";

  const keyInsight = useMemo(() => {
    const lowest = [...pillars].sort((a, b) => a.score - b.score)[0];
    if (lowest.label === "Consistency"     && lowest.score < 40) return "Your biggest lever right now is daily check-ins. Even 5 consistent days will visibly move your score.";
    if (lowest.label === "Energy"          && lowest.score < 40) return "Your energy logs suggest you're running low. Check sleep and hydration — supplements work best on a rested body.";
    if (lowest.label === "Foundation"      && lowest.score < 30) return "You're in the early days. The first 30 days build the base — keep your protocol going and the score will compound.";
    if (lowest.label === "Personalisation" && lowest.score < 50) return "A more complete profile means better-matched recommendations. Answer a few questions on your protocol page.";
    return "You're building solid habits. Stay consistent and your vitality score will continue to rise.";
  }, [pillars]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    const now = new Date();
    if (calYear > now.getFullYear() || (calYear === now.getFullYear() && calMonth >= now.getMonth())) return;
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1);
  };

  const isKid = activeMember?.type === "child";
  const isPartner = activeMember?.id?.startsWith("partner-") ?? false;
  const isOwnProfile = !isKid && !isPartner;
  const possessive = activeMember?.name ? `${activeMember.name}'s` : isOwnProfile ? "Your" : "Their";
  const possessiveLower = activeMember?.name ? `${activeMember.name}'s` : isOwnProfile ? "your" : "their";

  // SVG ring
  const RING_R = 38, RING_CIRC = 2 * Math.PI * RING_R;
  const ringDash = (vitality / 100) * RING_CIRC;

  if (!profileLoaded) return null;

  if (!hasProfile) {
    return (
      <main className="min-h-dvh bg-[#faf9fb] flex flex-col items-center justify-center px-6 pb-28">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f0f4ff, #e9e4ff)" }}>
            <span className="text-[36px]">📊</span>
          </div>
          <h2 className="text-[24px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-tight mb-2">
            No insights yet
          </h2>
          <p className="text-[14px] text-on-surface-variant/60 leading-relaxed mb-8">
            Complete your health protocol to unlock your personal dashboard — streak tracking, vitality score, supplement insights and more.
          </p>
          <a
            href="/protocol"
            className="inline-flex items-center justify-between w-full py-4 px-5 rounded-2xl bg-primary-container text-white font-bold text-sm hover:bg-primary transition-colors duration-200"
          >
            <span>Set up my protocol</span>
            <span className="text-lg leading-none">→</span>
          </a>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-[#faf9fb] pb-28 lg:pb-10">
      <div className="max-w-4xl mx-auto px-5 pt-8 lg:pt-12">

        {/* ── Header ── */}
        <div className="mb-5">
          <p className="text-[11px] font-bold text-primary-container uppercase tracking-widest mb-1">Health Tracking</p>
          <h1 className="text-[28px] lg:text-[34px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-tight tracking-tight">
            {possessive} Insights
          </h1>
        </div>

        {/* ── Desktop two-column layout ── */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">

        {/* ── Left column ── */}
        <div className="space-y-5">

        {/* ── Streak + Vitality ── */}
        <div className="grid grid-cols-2 gap-3">

          {/* Streak */}
          <div className="rounded-3xl bg-white border border-orange-100 p-4 flex flex-col gap-3 min-h-[190px]" style={{ background: "linear-gradient(145deg, #fff8f0, #fff)" }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4 text-orange-500" strokeWidth={1.5} />
              </div>
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Streak</span>
            </div>
            <div>
              <p className="text-[42px] lg:text-[56px] font-extrabold text-on-surface leading-none font-[family-name:var(--font-manrope)]">{streak}</p>
              <p className="text-[11px] lg:text-[13px] text-on-surface-variant/50 mt-1">days in a row</p>
            </div>
            <div className="mt-auto space-y-1.5">
              {visitCount > 0 && (
                <p className="text-[10px] font-semibold text-primary-container bg-primary-container/8 px-2.5 py-1 rounded-lg">
                  Day {visitCount} on protocol
                </p>
              )}
              {streak >= 7 && (
                <p className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2.5 py-1 rounded-lg">🔥 On a roll</p>
              )}
            </div>
          </div>

          {/* Vitality */}
          <button
            onClick={() => setShowVitalityPopover(true)}
            className="rounded-3xl border border-purple-100 p-4 flex flex-col gap-2 min-h-[190px] text-left w-full cursor-pointer hover:border-purple-200 transition-all group"
            style={{ background: "linear-gradient(145deg, #f8f5ff, #fff)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Vitality</span>
              <span className="text-[9px] font-semibold text-purple-200 group-hover:text-purple-400 transition-colors">Details →</span>
            </div>
            <div className="flex items-center justify-center flex-1">
              <svg className="lg:scale-125 origin-center" width="88" height="88" viewBox="0 0 90 90">
                <circle cx="45" cy="45" r={RING_R} fill="none" stroke="#ede9fe" strokeWidth="7" />
                <circle cx="45" cy="45" r={RING_R} fill="none" stroke="url(#vg)" strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${ringDash} ${RING_CIRC}`}
                  transform="rotate(-90 45 45)"
                />
                <defs>
                  <linearGradient id="vg" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
                <text x="45" y="42" textAnchor="middle" fill="#1c1b1f" fontSize="17" fontWeight="800" fontFamily="Manrope,sans-serif">{vitality}</text>
                <text x="45" y="54" textAnchor="middle" fill="#9ca3af" fontSize="8" fontWeight="600">/ 100</text>
              </svg>
            </div>
            {concernScores.length > 0 && (
              <div className="space-y-1.5">
                {concernScores.slice(0, 2).map(c => (
                  <div key={c.key}>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[9px] font-semibold text-on-surface-variant/55">{c.label}</span>
                      <span className="text-[9px] font-bold text-on-surface-variant/55">{c.score}</span>
                    </div>
                    <div className="h-1 bg-purple-50 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${CONCERN_BAR_COLOR[c.key] ?? "bg-primary-container"} transition-all duration-700`} style={{ width: `${c.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </button>
        </div>

        {/* ── Energy Bar ── */}
        <div className="rounded-3xl bg-white border border-outline-variant/10 p-4" style={{ background: "linear-gradient(145deg, #f0f4ff, #fff)" }}>
          <p className="text-[13px] lg:text-[15px] font-bold text-on-surface mb-3">How&apos;s {possessiveLower} energy today?</p>
          <div className="grid grid-cols-2 gap-2">
            {ENERGY_OPTIONS.map(opt => {
              const sel = energyLevel === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => handleEnergy(opt)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    sel ? opt.style : "bg-white border-outline-variant/15 text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  <span className="text-[18px] leading-none">{opt.emoji}</span>
                  <span className="text-[12px] font-semibold">{opt.label}</span>
                </button>
              );
            })}
          </div>
          {energyMsg && (
            <p className="text-[12px] text-on-surface-variant/65 mt-3 leading-snug px-0.5 animate-in fade-in slide-in-from-bottom-1 duration-300">
              {energyMsg}
            </p>
          )}
          {energyHistory.some(h => h.key) && (
            <div className="mt-3 pt-3 border-t border-outline-variant/8">
              <p className="text-[10px] font-semibold text-on-surface-variant/40 uppercase tracking-wider mb-2.5">This week</p>
              <div className="grid grid-cols-7">
                {energyHistory.map((h, i) => {
                  const isToday = h.date === today;
                  const opt = ENERGY_OPTIONS.find(o => o.key === h.key);
                  const color = h.key ? ENERGY_DOT_COLOR[h.key] : null;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={color
                          ? { background: `${color}18`, boxShadow: isToday ? `0 0 0 2px ${color}55` : "none" }
                          : { background: isToday ? "rgba(0,0,0,0.04)" : "transparent", boxShadow: isToday ? "0 0 0 1.5px rgba(0,0,0,0.1)" : "none" }}
                      >
                        {opt
                          ? <span className="text-[13px] leading-none">{opt.emoji}</span>
                          : <span className="w-1.5 h-1.5 rounded-full bg-gray-200 block" />}
                      </div>
                      <span className={`text-[9px] font-bold ${isToday ? "text-primary-container" : "text-on-surface-variant/30"}`}>{h.dayLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Secondary daily check-in (rotating: sleep / focus / physical) ── */}
        <div
          className={`rounded-3xl p-4 border ${ACTIVE_SECONDARY.border}`}
          style={{ background: ACTIVE_SECONDARY.bgGradient }}
        >
          <p className="text-[13px] lg:text-[15px] font-bold text-on-surface mb-3">{ACTIVE_SECONDARY.question}</p>
          <div className="grid grid-cols-2 gap-2">
            {ACTIVE_SECONDARY.options.map(opt => {
              const sel = secondaryAnswer === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => handleSecondary(opt.key)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border transition-all duration-200 cursor-pointer text-left ${
                    sel
                      ? "text-white border-transparent"
                      : "bg-white border-outline-variant/15 text-on-surface-variant hover:bg-white/80"
                  }`}
                  style={sel ? { background: ACTIVE_SECONDARY.accentColor, borderColor: ACTIVE_SECONDARY.accentColor } : {}}
                >
                  <span className="text-[18px] leading-none">{opt.emoji}</span>
                  <span className="text-[12px] font-semibold">{opt.label}</span>
                </button>
              );
            })}
          </div>
          {secondaryHistory.some(h => h.key) && (
            <div className="mt-3 pt-3 border-t border-outline-variant/8">
              <p className="text-[10px] font-semibold text-on-surface-variant/40 uppercase tracking-wider mb-2.5">This week</p>
              <div className="grid grid-cols-7">
                {secondaryHistory.map((h, i) => {
                  const isToday = h.date === today;
                  const opt = ACTIVE_SECONDARY.options.find(o => o.key === h.key);
                  return (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={h.key
                          ? { background: `${ACTIVE_SECONDARY.accentColor}18`, boxShadow: isToday ? `0 0 0 2px ${ACTIVE_SECONDARY.accentColor}55` : "none" }
                          : { background: isToday ? "rgba(0,0,0,0.04)" : "transparent", boxShadow: isToday ? "0 0 0 1.5px rgba(0,0,0,0.1)" : "none" }}
                      >
                        {opt
                          ? <span className="text-[13px] leading-none">{opt.emoji}</span>
                          : <span className="w-1.5 h-1.5 rounded-full bg-gray-200 block" />}
                      </div>
                      <span className={`text-[9px] font-bold ${isToday ? "text-on-surface-variant/60" : "text-on-surface-variant/30"}`}>{h.dayLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Warm message */}
        <p className="text-[13px] lg:text-[14px] text-on-surface-variant/60 leading-relaxed px-0.5">{vitalMsg}</p>

        </div>{/* end left column */}

        {/* ── Right column ── */}
        <div className="space-y-5 mt-5 lg:mt-0">

        {/* ── Calendar ── */}
        <div className="rounded-3xl bg-white border border-outline-variant/10 overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-outline-variant/8">
            <button onClick={prevMonth} className="w-7 h-7 rounded-xl hover:bg-surface-container flex items-center justify-center transition-colors cursor-pointer">
              <ChevronLeft className="w-4 h-4 text-on-surface-variant/50" />
            </button>
            <p className="text-[13px] lg:text-[15px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">{MONTH_NAMES[calMonth]} {calYear}</p>
            <button onClick={nextMonth} className="w-7 h-7 rounded-xl hover:bg-surface-container flex items-center justify-center transition-colors cursor-pointer">
              <ChevronRight className="w-4 h-4 text-on-surface-variant/50" />
            </button>
          </div>
          <div className="px-4 py-4">
            <div className="grid grid-cols-7 mb-2">
              {DAY_HEADERS.map((d, i) => (
                <div key={i} className="text-center text-[10px] font-bold text-on-surface-variant/30 uppercase">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {calCells.map((d, i) => {
                if (!d) return <div key={`e-${i}`} />;
                const key = d.toDateString();
                const val = checkins[key];
                const isToday = key === today;
                const isFuture = d > new Date();
                return (
                  <div key={key} className="flex flex-col items-center gap-0.5 py-0.5">
                    <span className={`text-[10px] font-semibold leading-none ${isToday ? "text-violet-600 font-extrabold" : "text-on-surface-variant/40"}`}>{d.getDate()}</span>
                    <div className={`w-5 h-5 rounded-md transition-all ${
                      isFuture ? "opacity-0" :
                      val === true ? "bg-violet-400" :
                      val === false ? "bg-rose-200" :
                      isToday ? "bg-violet-100 ring-1 ring-violet-300" :
                      "bg-gray-100"
                    }`} />
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-violet-400" /><span className="text-[10px] text-on-surface-variant/40">Taken</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-rose-200" /><span className="text-[10px] text-on-surface-variant/40">Missed</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-gray-100" /><span className="text-[10px] text-on-surface-variant/40">No data</span></div>
            </div>
            {adherence && adherence.total >= 3 && (
              <div className="mt-3.5 pt-3 border-t border-outline-variant/8">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-on-surface-variant/50">Consistency</span>
                  <span className="text-[13px] font-extrabold font-[family-name:var(--font-manrope)]" style={{ color: adherence.pct >= 70 ? "#10b981" : adherence.pct >= 40 ? "#f59e0b" : "#f43f5e" }}>{adherence.pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${adherence.pct}%`, background: adherence.pct >= 70 ? "#10b981" : adherence.pct >= 40 ? "#f59e0b" : "#f43f5e" }} />
                </div>
                <p className="text-[10px] text-on-surface-variant/35 mt-1">{adherence.taken} of {adherence.total} days on protocol</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Daily check-in ── */}
        <div className="rounded-3xl bg-white border border-outline-variant/10 px-5 py-4">
          {todayChecked === undefined ? (
            <>
              <p className="text-[13px] font-semibold text-on-surface mb-3">
                {!isOwnProfile
                  ? `Did ${activeMember?.name || "they"} take their supplements today?`
                  : "Did you take your supplements today?"}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleCheckin(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[13px] font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" strokeWidth={2} /> {!isOwnProfile ? "Yes, they did" : "Yes, I did"}
                </button>
                <button
                  onClick={() => handleCheckin(false)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-gray-500 text-[13px] font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <XCircle className="w-4 h-4" strokeWidth={2} /> Missed today
                </button>
              </div>
            </>
          ) : (
            <div className={`flex items-center gap-3 py-2 px-3 rounded-2xl ${todayChecked ? "bg-emerald-50" : "bg-gray-50"}`}>
              {todayChecked
                ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" strokeWidth={2} />
                : <XCircle className="w-5 h-5 text-gray-400 shrink-0" strokeWidth={2} />
              }
              <div>
                <p className={`text-[13px] font-semibold ${todayChecked ? "text-emerald-700" : "text-gray-500"}`}>
                  {todayChecked ? "Taken today — great work." : "Missed today. Back on track tomorrow."}
                </p>
                <button onClick={() => handleCheckin(!todayChecked)} className="text-[11px] text-on-surface-variant/40 hover:text-on-surface-variant transition-colors cursor-pointer mt-0.5">Undo</button>
              </div>
            </div>
          )}
        </div>

        </div>{/* end right column */}
        </div>{/* end two-column grid */}

        {/* ── Full-width section ── */}
        <div className="space-y-5 mt-5">

        {/* ── Current Stack ── */}
        {supplements.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between mb-3 px-0.5">
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant/35 uppercase tracking-widest">Daily Protocol</p>
                <p className="text-[18px] lg:text-[22px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] mt-0.5">{possessive} Current Stack</p>
              </div>
              <span className="text-[11px] font-semibold text-primary-container">{supplements.length} products</span>
            </div>

            {/* Horizontal scroll */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 snap-x snap-mandatory" style={{ scrollbarWidth: "none" }}>
              {supplements.map(s => {
                const edu = s.concern.map(c => EDUCATION[c as keyof typeof EDUCATION]).find(Boolean) ?? EDUCATION.nutrition;
                const isActive = expandedCard === s.id;
                const daysLeft = Math.max(1, 30 - (visitCount % 30 || 0));
                const pct = (daysLeft / 30) * 100;
                const barColor   = daysLeft > 15 ? "#10b981" : daysLeft > 8 ? "#f59e0b" : "#f43f5e";
                const statusText = daysLeft > 15 ? "Stocked up" : daysLeft > 8 ? "Getting low" : "Reorder soon";
                return (
                  <button
                    key={s.id}
                    onClick={() => setExpandedCard(isActive ? null : s.id)}
                    className="snap-start shrink-0 w-[172px] rounded-3xl overflow-hidden border text-left transition-all duration-200 cursor-pointer"
                    style={{
                      background: `linear-gradient(170deg, ${edu.bannerFrom}18, ${edu.bannerTo}08, #fff)`,
                      borderColor: isActive ? `${edu.bannerFrom}60` : "rgba(0,0,0,0.06)",
                      boxShadow: isActive ? `0 0 0 2px ${edu.bannerFrom}25` : "none",
                    }}
                  >
                    <div className="h-40 flex items-center justify-center">
                      {s.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.image} alt={s.name} className="h-36 w-36 object-contain" />
                      )}
                    </div>
                    <div className="px-3.5 pb-4">
                      <p className="text-[8px] font-bold uppercase tracking-widest mb-0.5" style={{ color: edu.color }}>{s.brand}</p>
                      <p className="text-[12px] font-extrabold text-on-surface leading-snug font-[family-name:var(--font-manrope)]">{s.name}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <p className="text-[10px] text-on-surface-variant/45 flex-1 leading-snug">
                          {edu.openingLine.length > 32 ? edu.openingLine.slice(0, 32) + "…" : edu.openingLine}
                        </p>
                        <ChevronDown
                          className="w-3.5 h-3.5 shrink-0 transition-transform duration-200"
                          style={{ color: edu.color, transform: isActive ? "rotate(180deg)" : "rotate(0deg)" }}
                          strokeWidth={2.5}
                        />
                      </div>
                      {/* Stock bar */}
                      <div className="mt-2.5 pt-2.5 border-t" style={{ borderColor: `${edu.bannerFrom}20` }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-bold" style={{ color: barColor }}>{statusText}</span>
                          <span className="text-[9px] font-semibold text-on-surface-variant/45">{daysLeft}d left</span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: `${edu.bannerFrom}15` }}>
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barColor }} />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Expanded detail panel */}
            {expandedCard && (() => {
              const s = supplements.find(x => x.id === expandedCard);
              if (!s) return null;
              const edu = s.concern.map(c => EDUCATION[c as keyof typeof EDUCATION]).find(Boolean) ?? EDUCATION.nutrition;
              const weekNum = Math.floor(visitCount / 7);
              const tlProgress = Math.min(weekNum, 2);
              return (
                <div
                  className="rounded-3xl border overflow-hidden mt-2"
                  style={{ background: `linear-gradient(160deg, ${edu.bannerFrom}12, ${edu.bannerTo}06, #fff)`, borderColor: `${edu.bannerFrom}35` }}
                >
                  <div className="px-4 pt-4 pb-5 space-y-4">

                    {/* Opening */}
                    <div>
                      <p className="text-[14px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">{edu.openingLine}</p>
                      <p className="text-[12px] text-on-surface-variant/60 mt-1 leading-relaxed">{edu.what}</p>
                    </div>

                    {/* Ingredient pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {edu.ingredients.map(ing => (
                        <span key={ing.label} className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border text-on-surface"
                          style={{ background: `${edu.bannerFrom}10`, borderColor: `${edu.bannerFrom}30` }}>
                          <span className="text-[13px]">{ing.emoji}</span>{ing.label}
                        </span>
                      ))}
                    </div>

                    {/* Fact cards */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {edu.facts.map((fact, i) => (
                        <div key={i} className="rounded-2xl px-3.5 py-3.5" style={{ background: `${edu.bannerFrom}10` }}>
                          <p className="text-[24px] font-extrabold leading-none font-[family-name:var(--font-manrope)]" style={{ color: edu.color }}>{fact.stat}</p>
                          <p className="text-[10px] text-on-surface-variant/55 mt-1.5 leading-snug">{fact.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Timeline */}
                    <div>
                      <p className="text-[10px] font-bold text-on-surface-variant/35 uppercase tracking-wider mb-3">Progress Timeline</p>
                      <div className="relative">
                        <div className="flex items-start">
                          {edu.timeline.map((t, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center">
                              <div className="w-3 h-3 rounded-full border-2 relative z-10 transition-all"
                                style={{
                                  borderColor: i <= tlProgress ? edu.bannerFrom : "#d1d5db",
                                  background: i <= tlProgress ? edu.bannerFrom : "#fff",
                                }} />
                              <p className="text-[9px] font-bold text-center mt-1.5" style={{ color: i <= tlProgress ? edu.color : "#9ca3af" }}>{t.label}</p>
                              <p className="text-[8px] text-on-surface-variant/40 text-center mt-0.5">{t.desc}</p>
                            </div>
                          ))}
                        </div>
                        <div className="absolute top-[5px] left-[16.67%] right-[16.67%] h-0.5 bg-gray-100" />
                        <div className="absolute top-[5px] left-[16.67%] h-0.5 transition-all duration-700"
                          style={{ background: edu.bannerFrom, width: tlProgress === 0 ? 0 : tlProgress === 1 ? "33.33%" : "66.67%" }} />
                      </div>
                      {visitCount > 0 && (
                        <p className="text-[10px] font-semibold text-center mt-3 rounded-full py-1"
                          style={{ color: edu.color, background: `${edu.bannerFrom}15` }}>
                          You are here · Week {weekNum + 1}
                        </p>
                      )}
                    </div>

                    {/* Timing */}
                    <div className="flex items-center gap-2.5 rounded-2xl px-3.5 py-3" style={{ background: `${edu.bannerFrom}08` }}>
                      <span className="text-[15px]">⏰</span>
                      <div>
                        <p className="text-[9px] font-bold text-on-surface-variant/35 uppercase tracking-wider">Best time to take</p>
                        <p className="text-[12px] font-semibold text-on-surface mt-0.5">{edu.timing}</p>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Recc for More Improvement ── */}
        {complementary.length > 0 && (
          <div>
            <div className="mb-3 px-0.5">
              <p className="text-[10px] font-bold text-on-surface-variant/35 uppercase tracking-widest">Level Up</p>
              <p className="text-[18px] lg:text-[22px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] mt-0.5">Boost {possessive} Results</p>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 snap-x snap-mandatory" style={{ scrollbarWidth: "none" }}>
              {complementary.map(p => {
                const catKey = EDUCATION[p.category] ? p.category : p.concern[0] ?? "energy";
                const edu = EDUCATION[catKey] ?? EDUCATION.nutrition;
                return (
                  <div key={p.id} className="snap-start shrink-0 w-[158px] rounded-3xl border overflow-hidden"
                    style={{ background: `linear-gradient(160deg, ${edu.bannerFrom}12, #fff 65%)`, borderColor: `${edu.bannerFrom}25` }}>
                    <div className="h-36 flex items-center justify-center">
                      {p.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt={p.name} className="h-32 w-32 object-contain" />
                      )}
                    </div>
                    <div className="px-3 pb-4">
                      <p className="text-[8px] font-bold uppercase tracking-widest mb-0.5" style={{ color: edu.color }}>{p.brand}</p>
                      <p className="text-[11px] font-extrabold text-on-surface leading-snug font-[family-name:var(--font-manrope)]">{p.name}</p>
                      <p className="text-[10px] text-on-surface-variant/45 mt-0.5">₹{p.price}</p>
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noopener noreferrer"
                          className="mt-2.5 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-bold transition-colors"
                          style={{ color: edu.color, background: `${edu.bannerFrom}15`, border: `1px solid ${edu.bannerFrom}35` }}>
                          <ShoppingBag className="w-3 h-3" strokeWidth={2.5} /> Shop
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        </div>{/* end full-width section */}

      </div>{/* end max-w-4xl container */}

      {/* ── Vitality breakdown popover ── */}
      {showVitalityPopover && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-[2px]" onClick={() => setShowVitalityPopover(false)} />
          <div className="fixed inset-0 z-[71] flex items-center justify-center px-5 pointer-events-none">
            <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl pointer-events-auto animate-fade-in-up">

              {/* Dark header */}
              <div className="px-5 pt-5 pb-6" style={{ background: "linear-gradient(135deg, #2e1065, #4c1d95, #5b21b6)" }}>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-[10px] font-bold text-purple-300 uppercase tracking-widest">Vitality Score</p>
                  <button
                    onClick={() => setShowVitalityPopover(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.12)" }}
                  >
                    <X className="w-3.5 h-3.5 text-white/70" />
                  </button>
                </div>
                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-[68px] font-extrabold text-white leading-none font-[family-name:var(--font-manrope)]">{vitality}</p>
                    <p className="text-[13px] font-semibold mt-1" style={{ color: "#c4b5fd" }}>{vitalityLabel}</p>
                  </div>
                  {/* Mini ring */}
                  <div className="pb-1">
                    <svg width="56" height="56" viewBox="0 0 90 90">
                      <circle cx="45" cy="45" r={RING_R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
                      <circle cx="45" cy="45" r={RING_R} fill="none" stroke="rgba(196,181,253,0.9)" strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${ringDash} ${RING_CIRC}`}
                        transform="rotate(-90 45 45)"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Pillars */}
              <div className="bg-white px-5 pt-5 pb-4 space-y-4">
                <p className="text-[10px] font-bold text-on-surface-variant/35 uppercase tracking-widest">What makes up your score</p>
                {pillars.map(p => (
                  <div key={p.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] leading-none">{p.emoji}</span>
                        <span className="text-[13px] font-semibold text-on-surface">{p.label}</span>
                      </div>
                      <span className="text-[13px] font-extrabold font-[family-name:var(--font-manrope)]" style={{ color: p.color }}>{p.score}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.score}%`, background: p.color }} />
                    </div>
                    <p className="text-[10px] text-on-surface-variant/40 mt-1">{p.sublabel}</p>
                  </div>
                ))}
              </div>

              {/* Key insight */}
              <div className="bg-white px-5 pb-6">
                <div className="rounded-2xl px-4 py-3.5" style={{ background: "#f5f3ff" }}>
                  <p className="text-[9px] font-bold text-purple-400 uppercase tracking-widest mb-1.5">Key insight</p>
                  <p className="text-[12px] text-on-surface/70 leading-relaxed">{keyInsight}</p>
                </div>
              </div>

            </div>
          </div>
        </>
      )}

    </div>
  );
}
