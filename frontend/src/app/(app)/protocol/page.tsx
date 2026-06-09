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
import { useCatalogProducts } from "@/hooks/useCatalogProducts";
import { supabase } from "@/lib/supabase/client";

/* ── Emoji per question key (for the AI question popup) ──── */
const QUESTION_EMOJI: Record<string, string> = {
  // Shared lifestyle
  stress_level:          "😮‍💨",
  sleep_quality:         "🌙",
  water_intake:          "💧",
  caffeine_intake:       "☕",
  food_source:           "🍽️",
  protein_meals:         "🥩",
  // Hair / beard
  hair_primary:          "💇",
  hair_duration:         "⏳",
  hair_family:           "🧬",
  hair_illness:          "🤒",
  beard_type:            "🧔",
  beard_family:          "👨‍👦",
  scalp_type:            "🪮",
  scalp_hot_water:       "🚿",
  greying_early:         "🩶",
  greying_family:        "🧬",
  // Skin
  skin_primary:          "✨",
  skin_duration:         "⏳",
  acne_location:         "📍",
  acne_stress_link:      "😰",
  acne_diet_link:        "🍕",
  oily_pattern:          "💦",
  skincare_routine:      "🧴",
  sun_exposure:          "☀️",
  // Weight
  weight_goal:           "🎯",
  activity_level:        "🏃",
  fat_distribution:      "📊",
  cravings:              "🍫",
  meal_skipping:         "🍽️",
  supplement_history:    "💊",
  workout_consistency:   "💪",
  daily_steps:           "👟",
  weight_change:         "⚖️",
  fasting_habit:         "⏱️",
  // Energy / gut
  energy_pattern:        "⚡",
  gut_symptom:           "🫃",
  late_dinner:           "🌙",
  fatigue_on_waking:     "😴",
  eating_speed:          "🍜",
  post_meal_discomfort:  "😣",
  bowel_regularity:      "🔄",
  meal_consistency:      "🕐",
  // Sleep / mind
  sleep_hours:           "😴",
  wake_feeling:          "🌅",
  sleep_timing:          "🌛",
  screen_bedtime:        "📱",
  sleep_interruption:    "💤",
  brain_fog_morning:     "🧠",
  napping:               "😪",
  overthinking:          "💭",
  work_type:             "💼",
  // Hormones (male)
  hormone_energy_change: "⚡",
  hormone_symptom:       "🧪",
  mood_shift:            "😔",
  anhedonia:             "😶",
  libido_change:         "❤️",
  recovery_time:         "🏋️",
  belly_fat_change:      "🔄",
  alcohol_intake:        "🍺",
  // Female
  postpartum_status:     "👶",
  period_regularity:     "🩸",
  hormonal_concern_f:    "🌸",
  pms_severity:          "😖",
  cycle_energy_impact:   "🔄",
  thyroid_symptoms_f:    "🦋",
  pcos_indicators:       "🌿",
  perimenopause_status:  "🌡️",
  // Safety / blood
  allergies_check:       "⚠️",
  medication_check:      "💊",
  blood_test_recency:    "🩸",
  known_deficiency:      "🔬",
  // Universal
  exercise_frequency:    "🏃",
  family_thyroid:        "🧬",
  family_diabetes:       "🧬",
  supplement_timing:     "⏰",
  // Progress / feedback
  protocol_effect:       "📈",
  energy_shift:          "⚡",
  biggest_barrier:       "🚧",
};

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
  // splitRoutineText already strips the " — explanation" part before this runs,
  // so `text` here is just the action clause. Strip remaining verbose suffixes.
  let s = text
    // Protocol-duration phrases
    .replace(/\s+for the first \d+[\w ]*of your protocol\.?/gi, "")
    .replace(/\s+for the first \d+[\w ]*\.?$/gi, "")
    .replace(/\s+for \d+ weeks?\.?$/gi, "")
    // "within X hour/minute of Y" — e.g. "within 1 hour of iron"
    .replace(/\s+within \d+[\w\s]*(?:of|before|after)\s+\w+/gi, "")
    // "for X seconds at the end of your shower"
    .replace(/\s+for \d+[\w\s]*at the end of[^,]*/gi, "")
    // "every X–Y days" → "regularly"
    .replace(/\s+every \d+[–\-]\d+ days/gi, " regularly")
    // "X hour(s) before your target bedtime" → "before bed"
    .replace(/\s+\d+ hours? before your target bedtime/gi, " before bed")
    // Parenthetical elaborations: "(ghee, nuts, avocado)", "(even on weekends)"
    .replace(/\s*\([^)]+\)/g, "")
    // "like curd, idli, or dosa" style lists (before action verbs or end of string)
    .replace(/\s+like\s+[^.]+?(?=\s+(?:actively|directly|significantly|support|improve|boost|are|can|will|help)|$)/gi, "")
    // Trailing result/benefit clauses
    .replace(/\s+even on rest days.*$/gi, "")
    .replace(/\s+independently of.*$/gi, "")
    .replace(/\s+improves.*$/gi, "")
    .replace(/\s+which helps.*$/gi, "")
    .replace(/\s+to prevent.*$/gi, "")
    .replace(/\s+is non-negotiable/gi, "")
    .replace(/\s+is more powerful than.*$/gi, "")
    .replace(/\s+resets circadian.*$/gi, "")
    .replace(/\s+(actively|directly)\s+support.*$/gi, "")
    .replace(/\s+(support|improve|boost|help)\s+your.*$/gi, "")
    .replace(/\s+if possible/gi, "")
    .replace(/\s*reduces? \w+ significantly\.?$/gi, "")
    .replace(/\s*(significantly|considerably|dramatically)\.?$/gi, "")
    .replace(/\s*of your protocol\.?$/gi, "")
    .replace(/\bin at least (\d+) meals? daily\b/gi, "daily")
    // Number formatting: 7,000 → 7k
    .replace(/(\d{1,3}),(\d{3})/g, (_, a, b) => `${a}${b}`)
    .replace(/\b(\d{4,})\b/g, (m) => { const n = parseInt(m); return n >= 1000 ? `${Math.round(n / 1000)}k` : m; })
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/[,.]$/, "");
  // Strip trailing incomplete words left by regex cuts
  s = s.replace(/\s+(within|of|for|from|in|at|by|or|with|to|the|a|an|like|actively|directly)$/i, "");
  // Soft cap at 7 words — gives room for natural completeness
  const words = s.split(" ");
  if (words.length > 7) s = words.slice(0, 6).join(" ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function firstSentence(text: string): string {
  const m = text.match(/^.*?[.!?](?:\s|$)/);
  return m ? m[0].trim() : text;
}

function getConcernCategoryStyle(label: string): { text: string; line: string } {
  const k = label.toLowerCase();
  if (k.includes("hair") || k.includes("beard")) return { text: "text-rose-600", line: "bg-rose-500/20" };
  if (k.includes("skin") || k.includes("acne")) return { text: "text-amber-600", line: "bg-amber-500/20" };
  if (k.includes("weight")) return { text: "text-orange-600", line: "bg-orange-500/20" };
  if (k.includes("energy") || k.includes("gut")) return { text: "text-yellow-700", line: "bg-yellow-500/20" };
  if (k.includes("sleep") || k.includes("mind")) return { text: "text-indigo-600", line: "bg-indigo-500/20" };
  if (k.includes("hormone")) return { text: "text-teal-600", line: "bg-teal-500/20" };
  return { text: "text-on-surface", line: "bg-outline-variant/15" };
}

function getConcernCardBg(concern: string): string {
  const k = concern.toLowerCase();
  if (k.includes("hair") || k.includes("beard")) return "bg-rose-500/8 border-rose-500/15";
  if (k.includes("skin") || k.includes("acne")) return "bg-amber-500/8 border-amber-500/15";
  if (k.includes("weight")) return "bg-orange-500/8 border-orange-500/15";
  if (k.includes("energy") || k.includes("gut")) return "bg-emerald-500/8 border-emerald-500/15";
  if (k.includes("sleep") || k.includes("mind")) return "bg-indigo-500/8 border-indigo-500/15";
  if (k.includes("hormone")) return "bg-teal-500/8 border-teal-500/15";
  return "bg-surface-container-low border-outline-variant/10";
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

/* Keyword-based emoji + background for habit tiles.
   Domain-specific checks come first so "Avoid tight hairstyles" → hair, not "avoid".
   isVeg: true for vegetarian/vegan users — protein tips get 🌱 instead of 🥩. */
function getHabitStyle(tip: string, isVeg = false): { emoji: string; bg: string } {
  const t = tip.toLowerCase();
  if (t.includes("hair") || t.includes("scalp") || t.includes("hairstyle") || t.includes("dandruff"))
    return { emoji: "🪮", bg: "bg-rose-500/12" };
  if (t.includes("skin") || t.includes("acne") || t.includes("moistur") || t.includes("sunscreen") || t.includes("face wash"))
    return { emoji: "✨", bg: "bg-amber-500/12" };
  if (t.includes("sleep") || t.includes("bed") || t.includes("screen time"))
    return { emoji: "🌙", bg: "bg-indigo-500/12" };
  if (t.includes("protein"))
    return { emoji: isVeg ? "🌱" : "🥩", bg: "bg-emerald-500/12" };
  if (t.includes("water") || t.includes("rinse") || t.includes("cold shower") || t.includes("hydrat"))
    return { emoji: "💧", bg: "bg-sky-500/12" };
  if (t.includes("exercise") || t.includes("workout") || t.includes("walk") || t.includes("step") || t.includes("gym"))
    return { emoji: "🏃", bg: "bg-orange-500/12" };
  if (t.includes("stress") || t.includes("meditat") || t.includes("breath") || t.includes("mind"))
    return { emoji: "🧘", bg: "bg-violet-500/12" };
  if (t.includes("sun") || t.includes("vitamin d") || t.includes("morning light"))
    return { emoji: "☀️", bg: "bg-amber-500/12" };
  if (t.includes("sugar") || t.includes("dairy") || t.includes("junk") || t.includes("avoid") || t.includes("cut "))
    return { emoji: "🚫", bg: "bg-red-500/10" };
  if (t.includes("eat") || t.includes("meal") || t.includes("diet") || t.includes("food") || t.includes("nutrient"))
    return { emoji: "🥗", bg: "bg-emerald-500/10" };
  return { emoji: "✅", bg: "bg-surface-container-low" };
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
  const { products: catalogProducts } = useCatalogProducts();
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
  // Prevent auto-opening question sheet more than once per page load
  const hasAutoOpened = useRef(false);
  // Daily nudge tracking: answered today or too many skips → don't auto-open again
  const [nudgeState, setNudgeState] = useState<{ date: string; answered: boolean; skipCount: number; shown?: boolean } | null>(null);
  // Cart
  const { addItem, openCart } = useCart();
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
    const activeId = localStorage.getItem("bh_active_profile") ?? "main";
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
      setActiveProfileId(activeId);
    } catch {
      router.replace("/home");
      return;
    }

    const visitKey  = `bh_protocol_visits_${activeId}`;
    const nudgeKey  = `bh_question_nudge_v2_${activeId}`;
    const todayKey  = `bh_today_answers_${activeId}`;

    // Visit tracking — day 1 gets 2 questions, return visits get 1
    // Syncs with Supabase protocol_state so count persists across devices
    try {
      const visitRaw = localStorage.getItem(visitKey);
      const today = new Date().toDateString();
      let localCount = 0;
      let localLastVisit = "";

      if (visitRaw) {
        const vd = JSON.parse(visitRaw) as { lastVisit: string; count: number };
        localLastVisit = vd.lastVisit;
        localCount = vd.count;
        if (vd.lastVisit === today) {
          setVisitCount(vd.count);
        } else {
          localCount = vd.count + 1;
          localLastVisit = today;
          setVisitCount(localCount);
          localStorage.setItem(visitKey, JSON.stringify({ lastVisit: today, count: localCount }));
        }
      } else {
        localCount = 1;
        localLastVisit = today;
        localStorage.setItem(visitKey, JSON.stringify({ lastVisit: today, count: 1 }));
        setVisitCount(1);
      }

      // Background sync: read protocol_state from Supabase, take higher visit count
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session) return;
        const { data: state } = await supabase
          .from("protocol_state")
          .select("visit_count, last_visit_date, follow_up_answers")
          .eq("user_id", session.user.id)
          .single();

        let finalCount = localCount;
        let finalLastVisit = localLastVisit;

        if (state) {
          // If Supabase has a higher count (from another device), use it
          // but still bump for today if not already bumped
          const remoteCount = state.visit_count ?? 0;
          if (remoteCount > localCount) {
            finalCount = state.last_visit_date === today ? remoteCount : remoteCount + 1;
            finalLastVisit = today;
            localStorage.setItem(visitKey, JSON.stringify({ lastVisit: today, count: finalCount }));
            setVisitCount(finalCount);
          }
          // Merge follow-up answers from Supabase into localStorage profile
          if (state.follow_up_answers && Object.keys(state.follow_up_answers).length > 0) {
            try {
              const raw = localStorage.getItem("bh_profile");
              if (raw) {
                const profile = JSON.parse(raw);
                const merged = { ...state.follow_up_answers, ...profile };
                localStorage.setItem("bh_profile", JSON.stringify(merged));
              }
            } catch { /* non-critical */ }
          }
        }

        // Write current state back to Supabase
        const currentAnswers: Record<string, string> = {};
        try {
          const raw = localStorage.getItem("bh_profile");
          if (raw) Object.assign(currentAnswers, JSON.parse(raw));
        } catch { /* non-critical */ }

        supabase.from("protocol_state").upsert({
          user_id: session.user.id,
          visit_count: finalCount,
          last_visit_date: finalLastVisit,
          follow_up_answers: currentAnswers,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" }).then(() => {});
      });
    } catch { /* non-critical */ }

    // Restore today's answered question count so the daily limit survives navigation
    try {
      const todayRaw = localStorage.getItem(todayKey);
      if (todayRaw) {
        const td = JSON.parse(todayRaw) as { date: string; count: number };
        if (td.date === new Date().toDateString()) setSavedAnswerCount(td.count);
      }
    } catch { /* non-critical */ }

    // Daily nudge state — tracks if user answered or exhausted skips today
    try {
      const today = new Date().toDateString();
      const nudgeRaw = localStorage.getItem(nudgeKey);
      if (nudgeRaw) {
        const nd = JSON.parse(nudgeRaw) as { date: string; answered: boolean; skipCount: number; shown?: boolean };
        if (nd.date === today) {
          setNudgeState(nd);
        } else {
          const fresh = { date: today, answered: false, skipCount: 0 };
          setNudgeState(fresh);
          localStorage.setItem(nudgeKey, JSON.stringify(fresh));
        }
      } else {
        const fresh = { date: today, answered: false, skipCount: 0 };
        setNudgeState(fresh);
        localStorage.setItem(nudgeKey, JSON.stringify(fresh));
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
        try {
          const picks = data.supplements.slice(0, 5).map((s) => s.id).join(",");
          localStorage.setItem("bh_protocol_picks", picks);
        } catch { /* non-critical */ }
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
        const ak = activeProfileId ?? "main";
        localStorage.setItem(`bh_today_answers_${ak}`, JSON.stringify({ date: new Date().toDateString(), count: next }));
      } catch { /* non-critical */ }
      return next;
    });
    // Sync updated profile + protocol_state back to Supabase (fire-and-forget)
    try {
      const raw = localStorage.getItem("bh_profile");
      if (raw) {
        const updatedProfile = JSON.parse(raw);
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            supabase.from("profiles").upsert({ id: session.user.id, data: updatedProfile }).then(() => {});
            const ak = activeProfileId ?? "main";
            const visitRaw = localStorage.getItem(`bh_protocol_visits_${ak}`);
            const vc = visitRaw ? (JSON.parse(visitRaw) as { count: number }).count : 0;
            supabase.from("protocol_state").upsert({
              user_id: session.user.id,
              visit_count: vc,
              last_visit_date: new Date().toDateString(),
              follow_up_answers: updatedProfile,
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" }).then(() => {});
          }
        });
      }
    } catch { /* non-critical */ }
    // Mark answered in daily nudge state
    setNudgeState((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, answered: true };
      try {
        const ak = activeProfileId ?? "main";
        localStorage.setItem(`bh_question_nudge_v2_${ak}`, JSON.stringify(updated));
      } catch { /* non-critical */ }
      return updated;
    });
    setShowingUpdate(true);
    setTimeout(() => {
      setShowingUpdate(false);
      setDepthGain(0);
      setShowQuestionSheet(false);
    }, 1800);
  }, []);

  const handleSkip = useCallback((_key: string) => {
    // Don't add to skippedKeys — same question must re-appear on next visit
    setNudgeState((prev) => {
      if (!prev) return prev;
      // Strip 'shown' so the auto-open can fire again on next mount (2nd chance)
      const { shown: _shown, ...rest } = prev;
      const updated = { ...rest, skipCount: prev.skipCount + 1 };
      try {
        const ak = activeProfileId ?? "main";
        localStorage.setItem(`bh_question_nudge_v2_${ak}`, JSON.stringify(updated));
      } catch { /* non-critical */ }
      return updated;
    });
    setShowQuestionSheet(false);
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
      const addedVariantIds = new Set<string>();
      for (let i = 0; i < protocol.supplements.length; i++) {
        if (!cartChecked[i]) continue;
        const s = protocol.supplements[i];
        const active = (cartSwapped[i] && s.alternative) ? s.alternative : s;
        if (addedIds.has(active.id)) continue;
        const variantId = await resolveVariantId(active.id);
        if (variantId && !addedVariantIds.has(variantId)) {
          await addItem(variantId);
          addedVariantIds.add(variantId);
          setAddedIds((prev) => new Set([...prev, active.id]));
        }
      }
      setShowProtocolCart(false);
    } finally {
      setCheckingOutCart(false);
    }
  }, [protocol, cartChecked, cartSwapped, addedIds, addItem]);

  // Adds every primary supplement that hasn't been added yet
  const handleAddAllPrimaries = useCallback(async () => {
    if (!protocol || addingAll) return;
    setAddingAll(true);
    try {
      const addedVariantIds = new Set<string>();
      for (const s of protocol.supplements) {
        if (addedIds.has(s.id)) continue;
        const variantId = await resolveVariantId(s.id);
        if (variantId && !addedVariantIds.has(variantId)) {
          await addItem(variantId);
          addedVariantIds.add(variantId);
          setAddedIds((prev) => new Set([...prev, s.id]));
        }
      }
    } finally {
      setAddingAll(false);
    }
  }, [protocol, addingAll, addedIds, addItem]);

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
        const productConcerns = catalogProducts.find((p) => p.id === supplements[i].id)?.concern ?? [];
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
  }, [protocol, concernList, catalogProducts]);

  // Group supplements by user concern — only when 2+ concerns
  const groupedSupplements = useMemo(() => {
    if (!protocol || concernList.length <= 1) return null;
    const pool = protocol.supplements;
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
        const productConcerns = catalogProducts.find((p) => p.id === s.id)?.concern ?? [];
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
  }, [protocol, concernList, catalogProducts]);

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

  // One question per session, every visit
  const sessionQuestionLimit = 1;
  const effectiveLimit = sessionQuestionLimit + (bonusUnlocked ? 1 : 0);

  // Merge real answers + skipped sentinels so selectNextQuestion skips both
  const answersWithSkipped = useMemo(() => {
    const skippedMap = Object.fromEntries([...skippedKeys].map((k) => [k, "__skipped__"]));
    return { ...answers, ...skippedMap };
  }, [answers, skippedKeys]);

  const currentQuestion = useMemo(
    () => profile ? selectNextQuestion(profile, answersWithSkipped, concernList, profile.age ?? "25-34", visitCount) : null,
    [profile, answersWithSkipped, concernList, visitCount],
  );
  const answeredCount = useMemo(() => countFollowUpAnswers(answers), [answers]);
  const allAnswered = answeredCount > 0 && currentQuestion === null;
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
        try {
          const picks = data.supplements.slice(0, 5).map((s) => s.id).join(",");
          localStorage.setItem("bh_protocol_picks", picks);
        } catch { /* non-critical */ }
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

  // Auto-open question sheet once per day — survives navigation within the same day
  useEffect(() => {
    if (loading || !protocol || !profile) return;
    if (hasAutoOpened.current) return;
    if (!currentQuestion) return;
    if (!nudgeState) return;
    if (nudgeState.answered) return;
    if (nudgeState.skipCount >= 2) return;
    if (nudgeState.shown) return; // already shown today
    hasAutoOpened.current = true;
    // Write shown:true to localStorage only — calling setNudgeState here would trigger a
    // re-render which causes React to run the effect cleanup (clearTimeout) before the
    // question sheet ever opens. hasAutoOpened.current guards same-session re-entry.
    try {
      const ak = activeProfileId ?? "main";
      localStorage.setItem(`bh_question_nudge_v2_${ak}`, JSON.stringify({ ...nudgeState, shown: true }));
    } catch { /* non-critical */ }
    // First visit: wait 5s so user can read their recommendations first
    const delay = visitCount === 1 ? 5000 : 1500;
    // No cleanup return — the timeout must survive dep changes; hasAutoOpened.current
    // prevents this effect from firing a second time.
    setTimeout(() => setShowQuestionSheet(true), delay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, protocol, profile, currentQuestion, nudgeState, visitCount, activeProfileId]);

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
    <div className="min-h-dvh pb-24 overflow-x-clip" style={{ backgroundColor: "rgba(0,64,52,0.025)" }}>

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
      {showProtocolCart && protocol && (() => {
        const allPickedIds = new Set(protocol.supplements.map((s) => s.id));
        const cartCount = addedIds.size;
        const allPrimaryAdded = [...allPickedIds].every((id) => addedIds.has(id));

        const BRAND_PILL: Record<string, { bg: string; text: string }> = {
          "Man Matters": { bg: "bg-primary-container/10", text: "text-primary-container" },
          "Be Bodywise":  { bg: "bg-rose-500/10",          text: "text-rose-600"           },
          "Little Joys":  { bg: "bg-amber-500/10",         text: "text-amber-600"           },
        };

        const ProductCard = ({ id, brand, name, price, mrp, image, rating, isPrimary }: {
          id: string; brand: string; name: string; price: number; mrp: number;
          image?: string; rating?: number; isPrimary?: boolean;
        }) => {
          const isAdded = addedIds.has(id);
          const isLoading = addingId === id;
          const pill = BRAND_PILL[brand] ?? { bg: "bg-surface-container", text: "text-on-surface-variant" };
          const discountPct = mrp > price ? Math.round((1 - price / mrp) * 100) : 0;

          return (
            <div className="flex-none w-40 snap-start rounded-2xl border border-outline-variant/12 bg-surface-container-lowest overflow-hidden shadow-sm">
              {/* Image with badge overlays */}
              <div className="relative w-full h-[110px] bg-surface-container overflow-hidden">
                {image
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={image} alt={name} className="w-full h-full object-cover" loading="lazy" />
                  : <div className="w-full h-full flex items-center justify-center text-3xl leading-none">{getSupplementEmoji(name)}</div>
                }
                {discountPct > 0 && (
                  <span className="absolute top-2 left-2 bg-primary-container text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md leading-none">
                    {discountPct}% OFF
                  </span>
                )}
                {isPrimary && (
                  <span className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md leading-none flex items-center gap-0.5">
                    <Sparkles className="w-2 h-2" strokeWidth={2} />Top pick
                  </span>
                )}
              </div>

              {/* Card body */}
              <div className="p-2.5 pt-2">
                {/* Brand pill */}
                <span className={`inline-block px-1.5 py-0.5 rounded-md text-[8px] font-bold mb-1.5 ${pill.bg} ${pill.text}`}>
                  {brand}
                </span>

                {/* Name */}
                <p className="text-[11px] font-bold text-on-surface leading-snug line-clamp-2 min-h-[28px] mb-1.5">{name}</p>

                {/* Price + rating on same row */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[13px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">₹{price}</span>
                    {mrp > price && <span className="text-[9px] text-on-surface-variant/35 line-through">₹{mrp}</span>}
                  </div>
                  {rating && rating > 0 ? (
                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-on-surface-variant/60">
                      <span className="text-amber-400">★</span>{rating.toFixed(1)}
                    </span>
                  ) : null}
                </div>

                {/* Add to Cart button */}
                <button
                  onClick={() => handleAddToCart(id)}
                  disabled={isAdded || !!isLoading}
                  className={`w-full py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer disabled:cursor-default active:scale-[0.98] ${
                    isAdded
                      ? "bg-green-500/12 text-green-700"
                      : isPrimary
                        ? "bg-primary-container text-white hover:bg-primary"
                        : "bg-surface-container border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {isLoading
                    ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2.5} />
                    : isAdded
                      ? <><Check className="w-3 h-3" strokeWidth={2.5} /><span>Added</span></>
                      : <><ShoppingBag className="w-3 h-3" strokeWidth={2} /><span>Add to Cart</span></>
                  }
                </button>
              </div>
            </div>
          );
        };

        // Row section label component
        const RowLabel = ({ children }: { children: React.ReactNode }) => (
          <div className="flex items-center gap-2.5 px-5 mb-3">
            <span className="text-[13px] font-extrabold text-on-surface">{children}</span>
            <div className="flex-1 h-px bg-outline-variant/12" />
          </div>
        );

        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={() => setShowProtocolCart(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" />

            {/* Floating card */}
            <div
              className="relative bg-surface rounded-3xl shadow-2xl w-full max-w-md max-h-[90dvh] flex flex-col animate-fade-in-up"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="shrink-0 px-5 pt-5 pb-4 border-b border-outline-variant/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3 h-3 text-primary-container" strokeWidth={1.5} />
                      <span className="text-[10px] font-bold text-primary-container uppercase tracking-wider">Your Protocol</span>
                    </div>
                    <h2 className="text-[18px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">
                      Shop Your Protocol
                    </h2>
                    <p className="text-[11px] text-on-surface-variant/50 mt-0.5">
                      {protocol.supplements.length} pick{protocol.supplements.length !== 1 ? "s" : ""} · scroll each row to explore
                    </p>
                  </div>
                  <button
                    onClick={() => setShowProtocolCart(false)}
                    className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center cursor-pointer hover:bg-surface-container transition-colors shrink-0 mt-0.5"
                  >
                    <X className="w-4 h-4 text-on-surface-variant" strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Marketplace rows — vertically scrollable */}
              <div className="flex-1 overflow-y-auto">
                {protocolCartGroups.map((group) => {
                  const picks = group.indices.map((i) => protocol.supplements[i]);
                  const brand = picks[0]?.brand ?? "Man Matters";

                  const groupConcernValues = new Set<string>();
                  for (const s of picks) {
                    const cp = catalogProducts.find((p) => p.id === s.id);
                    if (cp) cp.concern.forEach((c) => groupConcernValues.add(c));
                  }

                  const alternatives = catalogProducts
                    .filter((p) =>
                      p.brand === brand &&
                      !allPickedIds.has(p.id) &&
                      p.concern.some((c) => groupConcernValues.has(c))
                    )
                    .sort((a, b) => b.baseScore - a.baseScore)
                    .slice(0, 8);

                  const altIds = new Set(alternatives.map((p) => p.id));

                  const bestsellers = catalogProducts
                    .filter((p) =>
                      p.brand === brand &&
                      !allPickedIds.has(p.id) &&
                      !altIds.has(p.id)
                    )
                    .sort((a, b) => b.baseScore - a.baseScore)
                    .slice(0, 8);

                  return (
                    <div key={group.label} className="pt-5 pb-2">
                      {/* Concern group header — bigger + bolder when multi-concern */}
                      {protocolCartGroups.length > 1 && (
                        <div className="flex items-center gap-2.5 px-5 mb-4">
                          <span className="text-xl leading-none">{group.emoji}</span>
                          <span className="text-[15px] font-extrabold text-on-surface">{group.label}</span>
                          <div className="flex-1 h-px bg-outline-variant/15" />
                        </div>
                      )}

                      {/* Row 1 — Your Top Picks */}
                      <RowLabel>Your Top Picks</RowLabel>
                      <div className="flex gap-3 overflow-x-auto px-5 pb-2 hide-scrollbar snap-x snap-mandatory">
                        {picks.map((s) => (
                          <ProductCard key={s.id} id={s.id} brand={s.brand} name={s.name} price={s.price} mrp={s.mrp} image={s.image} rating={s.rating} isPrimary />
                        ))}
                      </div>

                      {/* Row 2 — Alternatives */}
                      {alternatives.length > 0 && (
                        <div className="mt-4">
                          <RowLabel>Also works for {group.label}</RowLabel>
                          <div className="flex gap-3 overflow-x-auto px-5 pb-2 hide-scrollbar snap-x snap-mandatory">
                            {alternatives.map((p) => (
                              <ProductCard key={p.id} id={p.id} brand={p.brand} name={p.name} price={p.price} mrp={p.mrp} image={p.image} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Row 3 — Bestsellers */}
                      {bestsellers.length > 0 && (
                        <div className="mt-4">
                          <RowLabel>Popular on {brand}</RowLabel>
                          <div className="flex gap-3 overflow-x-auto px-5 pb-2 hide-scrollbar snap-x snap-mandatory">
                            {bestsellers.map((p) => (
                              <ProductCard key={p.id} id={p.id} brand={p.brand} name={p.name} price={p.price} mrp={p.mrp} image={p.image} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="h-3" />
              </div>

              {/* Sticky footer */}
              <div className="shrink-0 px-5 pt-3 pb-5 border-t border-outline-variant/10 space-y-2">
                {!allPrimaryAdded && (
                  <button
                    onClick={handleAddAllPrimaries}
                    disabled={addingAll}
                    className="w-full py-2.5 rounded-xl border border-outline-variant/20 text-on-surface-variant text-[12px] font-bold hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {addingAll
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />Adding all picks…</>
                      : <><ShoppingBag className="w-3.5 h-3.5" strokeWidth={2} />Add all {protocol.supplements.length} picks</>
                    }
                  </button>
                )}
                <button
                  onClick={() => { setShowProtocolCart(false); openCart(); }}
                  className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                    cartCount > 0
                      ? "bg-primary-container text-white hover:bg-primary"
                      : "bg-surface-container-high text-on-surface-variant/60"
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" strokeWidth={2} />
                  {cartCount > 0 ? `Go to Cart · ${cartCount} item${cartCount !== 1 ? "s" : ""}` : "Go to Cart →"}
                </button>
                <p className="text-[10px] text-on-surface-variant/40 text-center">
                  Free delivery · Doctor-approved · Made for Indian bodies
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Question floating popup ── */}
      {showQuestionSheet && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={() => setShowQuestionSheet(false)}
          />

          {/* Centered card */}
          <div className="fixed inset-0 z-[61] flex items-center justify-center px-5 pointer-events-none">
            <div
              className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl pointer-events-auto animate-fade-in-up"
              style={{ background: "#fff" }}
              onClick={(e) => e.stopPropagation()}
            >

              {/* ── Gradient header strip ── */}
              <div
                className="px-5 pt-5 pb-6 relative"
                style={{ background: "linear-gradient(135deg, #004034 0%, #15594a 60%, #1a6b58 100%)" }}
              >
                {/* AI pill badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
                    <Sparkles className="w-3 h-3 text-primary-fixed" strokeWidth={2} />
                    <span className="text-[10px] font-bold text-primary-fixed uppercase tracking-widest">BetterHalf AI</span>
                  </div>
                  <button
                    onClick={() => setShowQuestionSheet(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-full cursor-pointer transition-colors"
                    style={{ background: "rgba(255,255,255,0.12)" }}
                  >
                    <X className="w-3.5 h-3.5 text-white/70" />
                  </button>
                </div>

                {/* Big emoji + question state label */}
                {showingUpdate ? (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.15)" }}>
                      <Check className="w-6 h-6 text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-white font-extrabold text-[18px] font-[family-name:var(--font-manrope)] leading-tight">Protocol deepened</p>
                      <p className="text-primary-fixed/70 text-[12px] mt-0.5">
                        {depthGain > 0 ? `+${depthGain}% more precise` : "Your answer has been factored in"}
                      </p>
                    </div>
                    {depthGain > 0 && (
                      <span className="ml-auto text-[22px] font-extrabold text-primary-fixed font-[family-name:var(--font-manrope)] shrink-0">
                        +{depthGain}%
                      </span>
                    )}
                  </div>
                ) : sessionLimitReached ? (
                  <div>
                    <span className="text-[38px] leading-none block mb-2">✅</span>
                    <p className="text-white font-extrabold text-[20px] font-[family-name:var(--font-manrope)] leading-tight">That&apos;s good for today</p>
                    <p className="text-primary-fixed/60 text-[12px] mt-1">Come back tomorrow for more</p>
                  </div>
                ) : currentQuestion ? (
                  <div>
                    <span className="text-[40px] leading-none block mb-3">
                      {QUESTION_EMOJI[currentQuestion.key] ?? "💬"}
                    </span>
                    <p className="text-white font-extrabold text-[20px] font-[family-name:var(--font-manrope)] leading-snug">
                      {currentQuestion.question}
                    </p>
                  </div>
                ) : null}
              </div>

              {/* ── Body ── */}
              <div className="px-5 pt-4 pb-5">
                {showingUpdate ? (
                  <div className="py-2 text-center">
                    <p className="text-[13px] text-on-surface-variant/60 leading-relaxed">
                      Every answer makes your recommendations more precise. Keep going.
                    </p>
                  </div>
                ) : sessionLimitReached ? (
                  <div className="space-y-4">
                    <p className="text-[13px] text-on-surface-variant/65 leading-relaxed">
                      {possUpper} protocol gets sharper every time you return. Come back tomorrow for one more question.
                    </p>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-on-surface-variant/50">Protocol depth</span>
                        <span className="text-[11px] font-bold text-primary-container">{liveDepth}%</span>
                      </div>
                      <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary-container/60 to-primary-container rounded-full transition-all duration-700 ease-out" style={{ width: `${liveDepth}%` }} />
                      </div>
                    </div>
                    {!bonusUnlocked && currentQuestion && (
                      <button
                        onClick={() => setBonusUnlocked(true)}
                        className="w-full py-3 rounded-2xl border border-primary-container/25 text-[13px] font-semibold text-primary-container hover:bg-primary-container/8 transition-colors cursor-pointer"
                      >
                        Actually, one more thing →
                      </button>
                    )}
                  </div>
                ) : currentQuestion ? (
                  <div key={currentQuestion.key} className="animate-fade-in-up">
                    <div className="space-y-2">
                      {currentQuestion.options.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleAnswer(currentQuestion.key, opt.value)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-[13px] font-semibold text-on-surface text-left cursor-pointer transition-all duration-200 active:scale-[0.98] group"
                          style={{ background: "#f8f8f6", borderColor: "rgba(0,0,0,0.07)" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,64,52,0.35)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,64,52,0.04)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,0,0,0.07)"; (e.currentTarget as HTMLButtonElement).style.background = "#f8f8f6"; }}
                        >
                          <span className="flex-1 leading-snug">{opt.label}</span>
                          <ChevronRight className="w-4 h-4 text-on-surface-variant/25 shrink-0" strokeWidth={1.5} />
                        </button>
                      ))}
                    </div>

                    {/* Progress dots + skip */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex gap-1.5">
                        {Array.from({ length: answeredCount }).map((_, i) => (
                          <div key={i} className="h-1.5 w-4 rounded-full bg-primary-container" />
                        ))}
                        <div className="h-1.5 w-4 rounded-full bg-primary-container/25" />
                      </div>
                      <button
                        onClick={() => handleSkip(currentQuestion.key)}
                        className="text-[11px] font-medium text-on-surface-variant/35 hover:text-on-surface-variant/65 transition-colors cursor-pointer"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

            </div>
          </div>
        </>
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
          className="mb-4 rounded-2xl overflow-hidden animate-fade-in-up"
          style={{ background: "linear-gradient(150deg, #004034 0%, #15594a 50%, #1a6b58 100%)" }}
        >
          <div className="p-4">

            {/* Top row: label + strength % */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-primary-fixed/60" strokeWidth={1.5} />
                <span className="text-[10px] font-bold text-primary-fixed/60 uppercase tracking-widest">
                  {possUpper} Protocol
                </span>
              </div>
              <span className="text-sm font-extrabold text-white font-[family-name:var(--font-manrope)]">
                {displayDepth}%
              </span>
            </div>

            {/* Title */}
            <h1 className="text-[22px] font-extrabold text-white font-[family-name:var(--font-manrope)] leading-tight capitalize mb-2.5">
              {buildProtocolTitle(profile)}
            </h1>

            {/* Concern tags */}
            {concernList.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {concernList.map((c) => (
                  <span key={c} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 text-white/85 border border-white/15">
                    <span className="text-sm leading-none">{getConcernEmoji([c], profile?.sex)}</span>
                    {CONCERN_TITLE_MAP[c] ?? c.toLowerCase()}
                  </span>
                ))}
              </div>
            )}

            {/* Strength bar */}
            <div className="h-1 bg-white/15 rounded-full overflow-hidden mb-1.5">
              <div
                className="h-full bg-primary-fixed rounded-full transition-all duration-200 ease-out"
                style={{ width: `${displayDepth}%` }}
              />
            </div>
            <p className="text-[10px] text-white/40 mb-3">
              Built from your profile · answer more to refine
            </p>

            {/* Insight chips */}
            {(() => {
              const p = profile as Record<string, unknown> | null;
              const chips: { icon: string; label: string }[] = [];
              const diet = String(profile?.diet || "").toLowerCase();
              if (diet && !diet.includes("non") && (diet.includes("veg") || diet.includes("vegan")))
                chips.push({ icon: "🌱", label: "Veg diet ✓" });
              else if (diet.includes("non"))
                chips.push({ icon: "🍗", label: "Non-veg" });
              else if (diet.includes("egg"))
                chips.push({ icon: "🥚", label: "Eggetarian" });
              if (p?.stress_level === "high")
                chips.push({ icon: "⚡", label: "Stress flagged" });
              else if (p?.sleep_quality === "rarely_good")
                chips.push({ icon: "😴", label: "Sleep gap" });
              else if (liveDepth < 55)
                chips.push({ icon: "✦", label: "Still personalising" });
              if (chips.length === 0) return null;
              return (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {chips.slice(0, 2).map((chip, i) => (
                    <span key={i} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/10 text-white/75 border border-white/12">
                      <span className="text-[10px] leading-none">{chip.icon}</span>
                      {chip.label}
                    </span>
                  ))}
                </div>
              );
            })()}

            {/* Sharpen bar */}
            {allAnswered ? (
              <div className="mt-3 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10">
                <Check className="w-3.5 h-3.5 text-primary-fixed shrink-0" strokeWidth={2.5} />
                <p className="text-[12px] font-bold text-white">Protocol fully personalised</p>
              </div>
            ) : (
              <button
                onClick={() => setShowQuestionSheet(true)}
                className="mt-3 w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary-fixed/80 shrink-0" strokeWidth={1.5} />
                  <div className="text-left">
                    <p className="text-[12px] font-bold text-white leading-none">
                      {sessionLimitReached ? "That's good for today" : "Sharpen your protocol"}
                    </p>
                    <p className="text-[10px] text-white/45 mt-0.5">
                      {sessionLimitReached ? `${liveDepth}% · Come back tomorrow` : "Answer more to sharpen more"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30 shrink-0" strokeWidth={2} />
              </button>
            )}
          </div>

          {/* Habits — divider then clean list */}
          {protocol.lifestyle.length > 0 && (
            <>
              <div className="mx-4 h-px bg-white/10" />
              <div className="pt-3 pb-4 px-4">
                <p className="text-[12px] font-bold text-white/55 uppercase tracking-widest mb-3">
                  Habits before supplements
                </p>
                <div className="space-y-0">
                  {protocol.lifestyle.slice(0, 4).map((tip, i) => {
                    const { action } = splitRoutineText(tip);
                    const profileDiet = String(profile?.diet || "").toLowerCase();
                    const isVeg = !profileDiet.includes("non") && (profileDiet.includes("veg") || profileDiet.includes("vegan") || profileDiet.includes("egg"));
                    const { emoji } = getHabitStyle(tip, isVeg);
                    return (
                      <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/8 last:border-0">
                        <span className="text-[22px] leading-none w-7 shrink-0">{emoji}</span>
                        <p className="text-[12px] font-semibold text-white/75 leading-snug">{compressHabit(action)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Product picks — right after habits ── */}
        {protocol.supplements.length > 0 && (
          <div
            ref={picksRef}
            className="mb-4 rounded-2xl overflow-hidden border border-primary-container/10 animate-fade-in-up"
            style={{ animationDelay: "120ms", background: "linear-gradient(175deg, rgba(21,89,74,0.09) 0%, rgba(21,89,74,0.04) 45%, rgba(21,89,74,0.01) 100%)" }}
          >

            {/* Concern-grouped or flat product cards */}
            {groupedSupplements ? (
              <div className="space-y-5 pt-4 pb-4">
                {groupedSupplements.map((group) => (
                  <div key={group.label}>
                    <div className="flex items-center gap-2 px-4 mb-2.5">
                      <span className="text-[16px] leading-none">{CONCERN_EMOJI[group.label] ?? "✦"}</span>
                      <span className={`text-[12px] font-bold ${getConcernCategoryStyle(group.label).text}`}>{group.displayLabel}</span>
                      <span className="text-[10px] text-on-surface-variant/40">· {group.supplements.length} matched</span>
                      <div className={`flex-1 h-px ${getConcernCategoryStyle(group.label).line}`} />
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
                                <div className="absolute top-2 right-2 bg-amber-500 text-white rounded-full px-2 py-1 flex flex-col items-center leading-none">
                                  <span className="text-[11px] font-extrabold tabular-nums">{displayScore}%</span>
                                  <span className="text-[7px] font-bold opacity-80">match</span>
                                </div>
                              )}
                            </div>
                            <div className="p-3">
                              <p className="text-[10px] font-bold text-primary-container/60 uppercase tracking-wider mb-0.5">{s.brand}</p>
                              <p className="text-[13px] font-bold text-on-surface leading-snug line-clamp-2 mb-1">{s.name}</p>
                              {s.reasonTags && s.reasonTags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {s.reasonTags.slice(0, 2).map((tag, i) => (
                                    <span key={i} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary-container/10 text-primary-container leading-none whitespace-nowrap">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {trustBadge && (
                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5 leading-none ${trustBadge.style}`}>{trustBadge.label}</span>
                              )}
                              {s.rating && (
                                <div className="flex items-center gap-1 mb-1">
                                  <span className="text-amber-400 text-[12px] leading-none">★</span>
                                  <span className="text-[11px] font-bold text-on-surface">{s.rating}</span>
                                  {reviewLabel && <span className="text-[10px] text-on-surface-variant/40">({reviewLabel})</span>}
                                </div>
                              )}
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
                {/* View all — multi-concern */}
                <div className="px-4 pt-1 pb-2">
                  <button
                    onClick={() => {
                      const picks = protocol.supplements.slice(0, 5).map((s) => s.id).join(",");
                      router.push(`/explore?picks=${encodeURIComponent(picks)}`);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-primary-container/20 border-dashed text-[12px] font-semibold text-primary-container/70 hover:bg-primary-container/5 transition-colors cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" strokeWidth={1.5} />
                    View all matched products
                  </button>
                </div>
              </div>
            ) : (
              /* Single concern — flat horizontal scroll */
              <div className="pt-4 pb-4">
              {concernList.length === 1 && (
                <div className="flex items-center gap-2 px-4 mb-2.5">
                  <span className="text-[16px] leading-none">{CONCERN_EMOJI[concernList[0]] ?? "✦"}</span>
                  <span className={`text-[12px] font-bold ${getConcernCategoryStyle(concernList[0]).text}`}>{CONCERN_DISPLAY[concernList[0]] ?? concernList[0]}</span>
                  <span className="text-[10px] text-on-surface-variant/40">· {protocol.supplements.length} matched</span>
                  <div className={`flex-1 h-px ${getConcernCategoryStyle(concernList[0]).line}`} />
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
                          <div className="absolute top-2 right-2 bg-amber-500 text-white rounded-full px-2 py-1 flex flex-col items-center leading-none">
                            <span className="text-[11px] font-extrabold tabular-nums">{displayScore}%</span>
                            <span className="text-[7px] font-bold opacity-80">match</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] font-bold text-primary-container/60 uppercase tracking-wider mb-0.5">{s.brand}</p>
                        <p className="text-[13px] font-bold text-on-surface leading-snug line-clamp-2 mb-1">{s.name}</p>
                        {s.reasonTags && s.reasonTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {s.reasonTags.slice(0, 2).map((tag, i) => (
                              <span key={i} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary-container/10 text-primary-container leading-none whitespace-nowrap">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {trustBadge && (
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5 leading-none ${trustBadge.style}`}>{trustBadge.label}</span>
                        )}
                        {s.rating && (
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-amber-400 text-[12px] leading-none">★</span>
                            <span className="text-[11px] font-bold text-on-surface">{s.rating}</span>
                            {reviewLabel && <span className="text-[10px] text-on-surface-variant/40">({reviewLabel})</span>}
                          </div>
                        )}
                        <p className="text-[10px] text-on-surface-variant/45 leading-none mb-1.5">👥 {getSocialCount(s)} similar</p>
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

            {/* Why these work — 2×2 grid */}
            {ingredientList.length > 0 && (
              <div className="mb-3 animate-fade-in-up">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/50 mb-2 px-1">
                  Why these work
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {ingredientList.map((item, idx) => {
                    // 4th card in multi-concern comes from secondary concern
                    const itemConcern = (concernList.length >= 2 && idx === 3)
                      ? (concernList[1] ?? concernList[0])
                      : (concernList[0] ?? "");
                    const cardStyle = getConcernCardBg(itemConcern);
                    const isExpanded = expandedReasonings.has(item.name);
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
                        className={`w-full text-left rounded-2xl border p-3 transition-all duration-200 cursor-pointer active:scale-[0.98] ${cardStyle}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xl leading-none">{getSupplementEmoji(item.name)}</span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-on-surface-variant/35 shrink-0 transition-transform duration-200 mt-0.5 ${isExpanded ? "rotate-180" : ""}`}
                            strokeWidth={2.5}
                          />
                        </div>
                        <p className="text-[12px] font-bold text-on-surface leading-snug mb-1.5">{item.name}</p>
                        <span className={`text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${badgeStyle}`}>
                          {item.priority}
                        </span>
                        <p className="text-[10px] text-on-surface-variant/55 mt-1.5 leading-relaxed">{item.timing}</p>
                        {isExpanded && (
                          <p className="text-[10px] text-on-surface-variant/80 mt-2 leading-relaxed border-t border-outline-variant/15 pt-2">
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
