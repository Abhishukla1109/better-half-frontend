"use client";

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, ArrowLeft, X } from "lucide-react";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { useCatalogProducts } from "@/hooks/useCatalogProducts";
import type { Product } from "@/lib/protocolEngine";

/* ── Category visual styles ── */
const CAT_STYLE: Record<string, { bgFrom: string; bgTo: string; accent: string; border: string }> = {
  gummies:         { bgFrom: "#fff8f0", bgTo: "#fff3e0", accent: "#f97316", border: "#fed7aa" },
  nutrition:       { bgFrom: "#f0fdf4", bgTo: "#dcfce7", accent: "#16a34a", border: "#bbf7d0" },
  "personal-care": { bgFrom: "#fdf2f8", bgTo: "#fce7f3", accent: "#db2777", border: "#fbcfe8" },
  healthysnacks:   { bgFrom: "#fffbeb", bgTo: "#fef9c3", accent: "#ca8a04", border: "#fde68a" },
};

function getStyle(category: string) {
  return CAT_STYLE[category] ?? CAT_STYLE.gummies;
}

/* ── Benefit one-liners ── */
function getBenefit(p: Product): string {
  if (p.followUp.some(f => ["brain","dha","focus","learning"].includes(f))) return "Supports focus & brain development";
  if (p.concern.includes("sleep"))                                           return "Promotes calm, restful sleep";
  if (p.followUp.some(f => ["immunity","vitamins"].includes(f)))             return "Boosts immunity, fewer sick days";
  if (p.followUp.some(f => ["calcium","bone"].includes(f)))                  return "Supports healthy bone growth";
  if (p.followUp.some(f => ["growth","protein","nutrition"].includes(f)))    return "Fills daily nutrition gaps";
  if (p.concern.includes("hair"))                                            return "Nourishes hair & scalp from within";
  if (p.concern.includes("skin"))                                            return "Gentle care for growing skin";
  if (p.category === "healthysnacks")                                        return "A healthier choice for snack time";
  return "Supports overall health & wellbeing";
}

/* ── Product matching ── */
const CONCERN_FOLLOWUP: Record<string, string[]> = {
  focus:     ["brain","dha","omega3","focus","learning"],
  immunity:  ["immunity","vitamins"],
  growth:    ["growth","nutrition","protein","calcium","bone"],
  sleep:     [],
  energy:    ["nutrition","vitamins"],
  skin:      [],
  hair:      ["hair","biotin"],
  nutrition: ["nutrition","protein","vitamins"],
};

function getKidsRecs(childAge: string, concern: string, ljProducts: Product[], nudgeAnswers: Record<string, string> = {}) {
  const seg =
    childAge === "2-5"  ? "kids-2-5"    :
    childAge === "6-12" ? "kids-6-12"   : "kids-13-plus";

  const followUps     = CONCERN_FOLLOWUP[concern] ?? [];
  const directConcern = ["sleep","skin","hair"].includes(concern);

  // Nudge-based score bonus — applied before slicing so the right products surface to primary
  function nudgeBonus(p: Product): number {
    let bonus = 0;
    if (nudgeAnswers.supplement_form === "Gummies"       && p.category === "gummies")   bonus += 15;
    if (nudgeAnswers.supplement_form === "Mixed in milk" && p.category === "nutrition") bonus += 15;
    if (nudgeAnswers.eating_habits   === "Very picky 😅" && p.category === "gummies")   bonus += 8;
    if (nudgeAnswers.diet_type === "Yes, vegetarian" &&
        p.followUp.some(f => ["protein","nutrition","growth"].includes(f)))             bonus += 6;
    if (nudgeAnswers.teen_gender === "Girl" &&
        ["skin","hair","personal-care"].some(t => p.category === t || p.concern.includes(t))) bonus += 10;
    return bonus;
  }

  let primary = ljProducts.filter(p => {
    if (!p.segment.includes(seg)) return false;
    if (directConcern) return p.concern.includes(concern);
    if (followUps.length === 0)   return p.concern.includes("energy");
    return p.followUp.some(f => followUps.some(t => f.toLowerCase().includes(t)));
  }).sort((a, b) => (b.baseScore + nudgeBonus(b)) - (a.baseScore + nudgeBonus(a))).slice(0, 3);

  // Pad to 3 with highest-scored same-segment products when catalog is thin
  if (primary.length < 3) {
    const primaryIds = new Set(primary.map(p => p.id));
    const filler = ljProducts
      .filter(p => p.segment.includes(seg) && !primaryIds.has(p.id))
      .sort((a, b) => (b.baseScore + nudgeBonus(b)) - (a.baseScore + nudgeBonus(a)))
      .slice(0, 3 - primary.length);
    primary = [...primary, ...filler];
  }

  const primaryIds = new Set(primary.map(p => p.id));
  const rest = ljProducts
    .filter(p => p.segment.includes(seg) && !primaryIds.has(p.id))
    .sort((a, b) => (b.baseScore + nudgeBonus(b)) - (a.baseScore + nudgeBonus(a)));

  return { primary, rest };
}

/* ── Parent daily habits ── */
type Habit = { emoji: string; text: string };
const HABITS: Record<string, Partial<Record<string, Habit[]>>> = {
  immunity: {
    "2-5":  [{ emoji: "🌅", text: "Give multivitamin with morning breakfast" }, { emoji: "🌳", text: "30 mins outdoor play today" }, { emoji: "💧", text: "6–8 glasses of water through the day" }],
    "6-12": [{ emoji: "🌅", text: "Supplement with morning meal" },             { emoji: "🌳", text: "Active outdoor time after school" },   { emoji: "🛌", text: "Lights out by 9pm for 10+ hrs sleep" }],
    "13+":  [{ emoji: "🌅", text: "Supplement with breakfast" },                { emoji: "🏃", text: "Daily movement or sport" },              { emoji: "😴", text: "10pm sleep target for immune recovery" }],
  },
  sleep: {
    "2-5":  [{ emoji: "🌙", text: "Magnesium Gummies after dinner" },  { emoji: "📵", text: "Screens off 30 mins before bedtime" }, { emoji: "📖", text: "Wind-down routine starting 7:30pm" }],
    "6-12": [{ emoji: "🌙", text: "Magnesium Gummies after dinner" },  { emoji: "📵", text: "No screens 1 hour before sleep" },     { emoji: "🛌", text: "Consistent bedtime, same time daily" }],
    "13+":  [{ emoji: "🌙", text: "Magnesium before bed" },            { emoji: "📵", text: "Phone off by 10pm" },                  { emoji: "🌡️", text: "Cool, dark room for better sleep" }],
  },
  focus: {
    "6-12": [{ emoji: "🧠", text: "Brain Gummies with morning breakfast" }, { emoji: "🥜", text: "Protein snack before homework time" }, { emoji: "🚫", text: "Distraction-free study space" }],
    "13+":  [{ emoji: "🧠", text: "Brain supplement with breakfast" },      { emoji: "⏱️", text: "25-min study blocks, 5-min breaks" },  { emoji: "💧", text: "Water bottle at the study desk" }],
  },
  growth: {
    "2-5":  [{ emoji: "🥛", text: "Calcium Gummies with milk at breakfast" }, { emoji: "🌞", text: "10–15 mins sunlight for Vitamin D" }, { emoji: "🥗", text: "Protein at every meal — eggs, dal, paneer" }],
    "6-12": [{ emoji: "🥛", text: "Calcium supplement with milk" },          { emoji: "🌞", text: "Outdoor play for natural Vitamin D" }, { emoji: "💪", text: "Daily physical activity for bone strength" }],
  },
  energy: {
    "2-5":  [{ emoji: "☀️", text: "Multivitamin with morning meal" }, { emoji: "🍌", text: "Healthy snack between meals" },      { emoji: "💤", text: "Consistent nap time for energy" }],
    "6-12": [{ emoji: "☀️", text: "Multivitamin with breakfast" },   { emoji: "🍎", text: "Fruit or healthy snack after school" }, { emoji: "💤", text: "9–10 hours sleep for full recovery" }],
    "13+":  [{ emoji: "☀️", text: "Supplement with breakfast" },     { emoji: "🏃", text: "Regular exercise for sustained energy" },{ emoji: "💤", text: "8–9 hours sleep minimum" }],
  },
  skin: {
    "13+":  [{ emoji: "🧴", text: "Gentle cleanser morning and night" }, { emoji: "💧", text: "8+ glasses of water daily" },          { emoji: "✨", text: "Supplement with morning meal" }],
  },
  hair: {
    "13+":  [{ emoji: "💇", text: "Hair Gummies after breakfast daily" }, { emoji: "🚿", text: "Gentle shampoo, not every day" },    { emoji: "🥗", text: "Protein-rich diet supports hair growth" }],
  },
  nutrition: {
    "6-12": [{ emoji: "🥛", text: "NutriMix in milk once a day" },     { emoji: "🥗", text: "Variety of vegetables at every meal" }, { emoji: "🌞", text: "Outdoor time for natural Vitamin D" }],
    "13+":  [{ emoji: "🥛", text: "NutriMix with breakfast or post school" }, { emoji: "🥜", text: "Protein-rich snacks through the day" }, { emoji: "🌞", text: "Daily sunlight for Vitamin D" }],
  },
};

function getHabits(concern: string, age: string): Habit[] {
  const map = HABITS[concern];
  if (!map) return HABITS.immunity["6-12"]!;
  return map[age] ?? map["6-12"] ?? (Object.values(map)[0] as Habit[]) ?? [];
}

/* ── Personalized headline ── */
const CONCERN_HEADLINE: Record<string, string> = {
  immunity:  "Building stronger immunity",
  growth:    "Supporting healthy growth",
  focus:     "Sharpening focus at school",
  sleep:     "Building better sleep habits",
  energy:    "Keeping energy levels high",
  skin:      "Taking care of skin health",
  hair:      "Nourishing hair from within",
  nutrition: "Filling daily nutrition gaps",
};

const CONCERN_LABEL: Record<string, string> = {
  immunity: "Immunity & colds", growth: "Healthy growth", focus: "Focus at school",
  sleep: "Better sleep",        energy: "Energy",          skin: "Skin & acne",
  hair: "Hair health",          nutrition: "Nutrition gaps",
};

/* ── Educational tips by age ── */
const EDU_TIPS: Record<string, { emoji: string; title: string; body: string }[]> = {
  "2-5": [
    { emoji: "🧠", title: "Brain growth is fastest right now",      body: "Over 90% of brain development happens before age 5. DHA and key vitamins play a direct role in how neural connections form during this critical window." },
    { emoji: "🦴", title: "Calcium now, strong bones forever",       body: "Calcium absorbed in early childhood shapes bone strength well into adulthood. The foundation is literally being built right now." },
    { emoji: "🛡️", title: "Immunity learns by doing",              body: "Young immune systems grow stronger through every challenge they overcome. Zinc and Vitamin C directly strengthen that response." },
  ],
  "6-12": [
    { emoji: "📏", title: "Peak bone density window: ages 9–13",    body: "Calcium and Vitamin D absorbed in this period literally determines their skeleton strength at 40. This window doesn't come back." },
    { emoji: "🧠", title: "Focus starts with nutrition",             body: "Iron deficiency is the #1 cause of poor attention in school-age children in India. Even mild deficiency measurably impacts memory and focus." },
    { emoji: "😴", title: "Sleep is when the brain actually learns", body: "During deep sleep, kids consolidate everything from the day. It's not downtime — it's the most productive part of their school experience." },
  ],
  "13+": [
    { emoji: "🌞", title: "80% of Indian teens are Vitamin D deficient", body: "Low D3 affects mood, focus, immunity, and bone strength simultaneously. It's the single highest-impact gap to close for most teenagers." },
    { emoji: "💪", title: "Teens need more protein than adults",         body: "Growing teenagers need 1.2g of protein per kg — more than most adults. Most Indian diets fall significantly short of this during peak growth." },
    { emoji: "🧘", title: "Stress hits teens harder than we realise",    body: "Chronic academic pressure elevates cortisol, disrupting sleep, skin, and immunity all at once. Magnesium is the most evidence-backed solution." },
  ],
};

/* ── Concern options per age (for edit sheet) ── */
const EDIT_CONCERNS: Record<string, { key: string; emoji: string; label: string }[]> = {
  "2-5":  [
    { key: "immunity", emoji: "🛡️", label: "Fewer colds" },
    { key: "growth",   emoji: "🌱", label: "Healthy growth" },
    { key: "sleep",    emoji: "😴", label: "Better sleep" },
    { key: "energy",   emoji: "⚡", label: "More energy" },
  ],
  "6-12": [
    { key: "focus",     emoji: "🧠", label: "Focus at school" },
    { key: "immunity",  emoji: "🛡️", label: "Fewer colds" },
    { key: "growth",    emoji: "📏", label: "Height & growth" },
    { key: "energy",    emoji: "⚡", label: "Energy all day" },
    { key: "sleep",     emoji: "😴", label: "Better sleep" },
    { key: "nutrition", emoji: "🥗", label: "Fussy eater" },
  ],
  "13+":  [
    { key: "energy",   emoji: "⚡", label: "Energy & focus" },
    { key: "skin",     emoji: "✨", label: "Skin & acne" },
    { key: "hair",     emoji: "💇", label: "Hair health" },
    { key: "sleep",    emoji: "😴", label: "Better sleep" },
    { key: "immunity", emoji: "🛡️", label: "Immunity" },
  ],
};

/* ── Progressive nudge system ── */
const NUDGE_DEFS: Array<{
  id: string; emoji: string; question: string;
  options: string[]; minVisit: number; ageGroups?: string[];
}> = [
  { id: "eating_habits",   emoji: "🍽️", question: "Is [name] a picky eater?",    options: ["Very picky 😅", "Sometimes", "Eats anything"],  minVisit: 1 },
  { id: "supplement_form", emoji: "💊",  question: "What form works for [name]?", options: ["Gummies", "Mixed in milk", "Either works"],     minVisit: 2 },
  { id: "diet_type",       emoji: "🌱",  question: "Is [name] vegetarian?",       options: ["Yes, vegetarian", "No, eats non-veg"],          minVisit: 3 },
  { id: "teen_gender",     emoji: "👤",  question: "Is [name] a boy or girl?",    options: ["Boy", "Girl"],                                  minVisit: 1, ageGroups: ["13+"] },
];

type NudgeRecord = Record<string, { status: "answered" | "dismissed"; answer?: string }>;

function readKidsNudges(memberId: string): NudgeRecord {
  try {
    const all = JSON.parse(localStorage.getItem("bh_kids_nudges") ?? "{}") as Record<string, NudgeRecord>;
    return all[memberId] ?? {};
  } catch { return {}; }
}

function writeKidsNudge(memberId: string, id: string, status: "answered" | "dismissed", answer?: string) {
  try {
    const all = JSON.parse(localStorage.getItem("bh_kids_nudges") ?? "{}") as Record<string, NudgeRecord>;
    if (!all[memberId]) all[memberId] = {};
    all[memberId][id] = { status, ...(answer ? { answer } : {}) };
    localStorage.setItem("bh_kids_nudges", JSON.stringify(all));
  } catch {}
}

function bumpKidsVisit(memberId: string): number {
  try {
    const all = JSON.parse(localStorage.getItem("bh_kids_visits") ?? "{}") as Record<string, number>;
    const next = (all[memberId] ?? 0) + 1;
    all[memberId] = next;
    localStorage.setItem("bh_kids_visits", JSON.stringify(all));
    return next;
  } catch { return 1; }
}

function pickNextNudge(memberId: string, childAge: string, visits: number) {
  const done = readKidsNudges(memberId);
  return NUDGE_DEFS.find(n => {
    if (done[n.id]) return false;
    if (n.ageGroups && !n.ageGroups.includes(childAge)) return false;
    return visits >= n.minVisit;
  }) ?? null;
}

/* ── Page ── */
export default function KidsHomePage() {
  const router = useRouter();
  const { activeMember, activeProfile, updateMemberProfile } = useActiveProfile();
  const { products } = useCatalogProducts();
  const ljProducts = products.filter(p => p.brand === "Little Joys");

  const childAge    = activeMember?.childAge ?? "6-12";
  const childName   = activeMember?.name;
  const displayName = childName ?? "your child";
  const profile     = activeProfile as Record<string, unknown>;
  const concern     = (profile?.concern as string) ?? "immunity";
  const onboarded   = profile?.kidsOnboardingDone;

  // Edit sheet state
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editConcern, setEditConcern] = useState("");
  const [editAge, setEditAge] = useState<"2-5" | "6-12" | "13+">("6-12");

  // Nudge state
  const [currentNudge, setCurrentNudge] = useState<typeof NUDGE_DEFS[number] | null>(null);
  const [nudgeAnswers, setNudgeAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!activeMember) return;
    if (activeMember.type !== "child") { router.replace("/protocol"); return; }
    // If somehow landed here without completing onboarding, send back to add-member flow
    if (!onboarded) {
      localStorage.setItem("bh_add_mode", "1");
      router.replace("/home");
    }
  }, [activeMember, onboarded, router]);

  // Visit counting + nudge selection (runs once per member load)
  useEffect(() => {
    if (!activeMember?.id || !onboarded) return;
    const visits = bumpKidsVisit(activeMember.id);
    // Load all previously answered nudges for rec scoring
    const saved = readKidsNudges(activeMember.id);
    const answers: Record<string, string> = {};
    Object.entries(saved).forEach(([k, v]) => { if (v.status === "answered" && v.answer) answers[k] = v.answer; });
    setNudgeAnswers(answers);
    // Only surface a nudge from the second visit onward so first visit stays clean
    if (visits > 1) setCurrentNudge(pickNextNudge(activeMember.id, childAge, visits));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMember?.id]);

  const openEdit = () => {
    setEditName(childName ?? "");
    setEditConcern(concern);
    setEditAge(childAge as "2-5" | "6-12" | "13+");
    setShowEdit(true);
  };

  const handleEditAgeChange = (age: "2-5" | "6-12" | "13+") => {
    setEditAge(age);
    const validConcerns = (EDIT_CONCERNS[age] ?? []).map(c => c.key);
    if (!validConcerns.includes(editConcern)) setEditConcern(validConcerns[0] ?? "immunity");
  };

  const handleNudgeAnswer = (nudgeId: string, answer: string) => {
    if (!activeMember) return;
    writeKidsNudge(activeMember.id, nudgeId, "answered", answer);
    setNudgeAnswers(prev => ({ ...prev, [nudgeId]: answer }));
    setCurrentNudge(null);
  };

  const handleNudgeDismiss = (nudgeId: string) => {
    if (!activeMember) return;
    writeKidsNudge(activeMember.id, nudgeId, "dismissed");
    setCurrentNudge(null);
  };

  const saveEdit = () => {
    if (!activeMember) return;
    const patch: Record<string, string> = { concern: editConcern, kidsOnboardingDone: "true" };
    if (editName.trim()) patch.name = editName.trim();
    updateMemberProfile(activeMember.id, patch);
    // Update top-level member fields (name, childAge) directly in localStorage
    try {
      const raw = localStorage.getItem("bh_profiles");
      if (raw) {
        const profiles = JSON.parse(raw) as Array<Record<string, unknown>>;
        const updated = profiles.map(p => {
          if (p.id !== activeMember.id) return p;
          const memberPatch: Record<string, unknown> = { childAge: editAge };
          if (editName.trim()) memberPatch.name = editName.trim();
          return { ...p, ...memberPatch };
        });
        localStorage.setItem("bh_profiles", JSON.stringify(updated));
      }
    } catch { /* non-critical */ }
    setShowEdit(false);
    window.location.reload();
  };

  const { primary, rest } = useMemo(() => getKidsRecs(childAge, concern, ljProducts, nudgeAnswers), [childAge, concern, ljProducts, nudgeAnswers]);
  const habits = useMemo(() => getHabits(concern, childAge), [concern, childAge]);

  const tips = EDU_TIPS[childAge] ?? EDU_TIPS["6-12"];
  const tip  = tips[new Date().getDate() % tips.length];

  const ageLabel =
    childAge === "2-5"  ? "Ages 2–5"  :
    childAge === "6-12" ? "Ages 6–12" : "Ages 13+";

  const headline = CONCERN_HEADLINE[concern] ?? "Supporting your child's wellness";

  if (!activeMember || activeMember.type !== "child" || !onboarded) return null;

  return (
    <>
    <div className="min-h-dvh pb-28 lg:pb-10" style={{ background: "#fffbf5" }}>
      <div className="pt-8 lg:pt-12 space-y-5">

        {/* ── Edit profile ── */}
        <div className="px-5">
          <button
            onClick={openEdit}
            className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            <span>Edit profile</span>
          </button>
        </div>

        {/* ── Hero banner ── */}
        <div
          className="mx-5 rounded-3xl p-5 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #fff3e0 0%, #ffe8cc 60%, #fff8f0 100%)", border: "1px solid #fed7aa" }}
        >
          {/* Decorative circles */}
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-20" style={{ background: "#f97316" }} />
          <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full opacity-10" style={{ background: "#fb923c" }} />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#ea580c" }}>Little Joys</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ color: "#c2410c", background: "rgba(255,255,255,0.7)", border: "1px solid #fed7aa" }}>
                  {ageLabel}
                </span>
              </div>

            <h1 className="text-[26px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-tight tracking-tight mb-1">
              {childName ? `${childName}'s Wellness` : "Your Child's Wellness"}
            </h1>
            <p className="text-[13px] font-semibold mb-3" style={{ color: "#c2410c" }}>
              {headline} {childName ? `for ${childName}` : ""}
            </p>

            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full"
              style={{ color: "#c2410c", background: "rgba(255,255,255,0.75)", border: "1px solid #fed7aa" }}
            >
              <span>🎯</span> Focus: {CONCERN_LABEL[concern] ?? concern}
            </span>
          </div>

          {/* Habits merged into hero card */}
          {habits.length > 0 && (
            <>
              <div className="mx-0 mt-4 mb-0 h-px" style={{ background: "rgba(249,115,22,0.2)" }} />
              <div className="pt-3.5">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "#c2410c", opacity: 0.6 }}>
                  Today&apos;s parent habits
                </p>
                <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-5 px-5" style={{ scrollbarWidth: "none" }}>
                  {habits.map((h, i) => (
                    <div
                      key={i}
                      className="shrink-0 flex items-start gap-2 px-3.5 py-3 rounded-2xl"
                      style={{ background: "rgba(255,255,255,0.7)", border: "1px solid #fed7aa", minWidth: 160, maxWidth: 200 }}
                    >
                      <span className="text-[18px] leading-none shrink-0 mt-0.5">{h.emoji}</span>
                      <p className="text-[11px] font-semibold text-on-surface leading-snug">{h.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Progressive nudge card ── */}
        {currentNudge && (
          <div
            className="mx-5 rounded-3xl p-4 animate-fade-in-up"
            style={{ background: "linear-gradient(135deg, #fff8f0, #fff3e0)", border: "1px solid #fed7aa" }}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-start gap-2.5">
                <span className="text-[22px] leading-none mt-0.5">{currentNudge.emoji}</span>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#f97316" }}>
                    Quick question
                  </p>
                  <p className="text-[13px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-snug">
                    {currentNudge.question.replace("[name]", childName ?? "your child")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleNudgeDismiss(currentNudge.id)}
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer hover:bg-orange-100 transition-colors mt-0.5"
              >
                <X className="w-3.5 h-3.5" style={{ color: "#c2410c", opacity: 0.5 }} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentNudge.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => handleNudgeAnswer(currentNudge.id, opt)}
                  className="px-3 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer transition-all active:scale-95"
                  style={{ background: "rgba(255,255,255,0.85)", border: "1px solid #fed7aa", color: "#c2410c" }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Unified picks card: top picks + complete the kit ── */}
        <div
          className="mx-5 rounded-3xl overflow-hidden"
          style={{ border: "1px solid #fed7aa", background: "linear-gradient(175deg, rgba(249,115,22,0.07) 0%, rgba(249,115,22,0.03) 50%, rgba(255,255,255,0.8) 100%)" }}
        >
          {/* Card header */}
          <div className="px-5 pt-5 pb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#f97316" }}>
              Little Joys · AI-matched picks
            </p>
            <p className="text-[18px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-tight">
              {displayName === "your child" ? "Top picks" : `${displayName}'s picks`}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "#c2410c", opacity: 0.7 }}>
              Matched for {CONCERN_LABEL[concern] ?? concern} · {ageLabel}
            </p>
          </div>

          {/* Hairline divider */}
          <div className="mx-5 h-px mb-4" style={{ background: "rgba(249,115,22,0.15)" }} />

          {/* Top picks — horizontal scroll */}
          <div className="flex gap-3 overflow-x-auto pb-4 px-5" style={{ scrollbarWidth: "none" }}>
            {primary.map(p => {
              const sty = getStyle(p.category);
              return (
                <div
                  key={p.id}
                  className="shrink-0 w-[160px] rounded-2xl overflow-hidden flex flex-col"
                  style={{ background: `linear-gradient(160deg, ${sty.bgFrom}, white)`, border: `1px solid ${sty.border}` }}
                >
                  <div className="h-36 flex items-center justify-center px-2 pt-2">
                    {p.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt={p.name} className="w-32 h-32 object-contain" />
                    )}
                  </div>
                  <div className="px-3 pb-3.5 flex flex-col flex-1">
                    <p className="text-[8px] font-bold uppercase tracking-widest mb-0.5" style={{ color: sty.accent }}>Little Joys</p>
                    <p className="text-[12px] font-extrabold text-on-surface leading-snug font-[family-name:var(--font-manrope)] flex-1">{p.name}</p>
                    <p className="text-[10px] text-on-surface-variant/45 mt-1 leading-snug">{getBenefit(p)}</p>
                    <div className="flex items-center justify-between mt-2.5">
                      <div>
                        <p className="text-[13px] font-extrabold text-on-surface">₹{p.price}</p>
                        {p.mrp > p.price && <p className="text-[9px] text-on-surface-variant/40 line-through">₹{p.mrp}</p>}
                      </div>
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold"
                          style={{ color: "white", background: sty.accent }}>
                          <ShoppingBag className="w-2.5 h-2.5" strokeWidth={2.5} /> Shop
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Complete the kit — horizontal scroll inside the same card */}
          {rest.length > 0 && (
            <>
              <div className="mx-5 h-px mt-5 mb-4" style={{ background: "rgba(249,115,22,0.15)" }} />
              <div className="px-5 pb-1 flex items-baseline justify-between">
                <p className="text-[13px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">
                  Complete {childName ? `${childName}'s` : "the"} kit
                </p>
                <span className="text-[11px] font-semibold" style={{ color: "#f97316" }}>{rest.length} more</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-5 pt-3 px-5" style={{ scrollbarWidth: "none" }}>
                {rest.map(p => {
                  const sty = getStyle(p.category);
                  return (
                    <div
                      key={p.id}
                      className="shrink-0 w-[140px] rounded-2xl overflow-hidden flex flex-col"
                      style={{ background: `linear-gradient(160deg, ${sty.bgFrom}, white)`, border: `1px solid ${sty.border}` }}
                    >
                      <div className="h-32 flex items-center justify-center px-2 pt-2">
                        {p.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image} alt={p.name} className="w-28 h-28 object-contain" />
                        )}
                      </div>
                      <div className="px-3 pb-3.5 flex flex-col flex-1">
                        <p className="text-[8px] font-bold uppercase tracking-widest mb-0.5" style={{ color: sty.accent }}>Little Joys</p>
                        <p className="text-[11px] font-extrabold text-on-surface leading-snug font-[family-name:var(--font-manrope)] flex-1">{p.name}</p>
                        <p className="text-[10px] text-on-surface-variant/45 mt-1 leading-snug">{getBenefit(p)}</p>
                        <div className="flex items-center justify-between mt-2.5">
                          <p className="text-[13px] font-extrabold text-on-surface">₹{p.price}</p>
                          {p.url && (
                            <a href={p.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold"
                              style={{ color: sty.accent, background: sty.bgFrom, border: `1px solid ${sty.border}` }}>
                              <ShoppingBag className="w-2.5 h-2.5" strokeWidth={2.5} /> Shop
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Bottom padding when no kit section */}
          {rest.length === 0 && <div className="pb-5" />}
        </div>

        {/* ── Educational tip ── */}
        <div className="mx-5 rounded-3xl p-5"
          style={{ background: "linear-gradient(135deg, #fff8f0, #fff3e0)", border: "1px solid #fed7aa" }}>
          <div className="flex items-start gap-3.5">
            <span className="text-[30px] leading-none shrink-0 mt-0.5">{tip.emoji}</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#f97316" }}>Good to know</p>
              <p className="text-[14px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-snug mb-2">{tip.title}</p>
              <p className="text-[12px] text-on-surface-variant/60 leading-relaxed">{tip.body}</p>
            </div>
          </div>
        </div>

        {/* ── Browse all CTA ── */}
        <div className="mx-5 rounded-3xl p-5 flex items-center justify-between"
          style={{ background: "white", border: "1px solid #fed7aa" }}>
          <div>
            <p className="text-[14px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">Browse all Little Joys</p>
            <p className="text-[11px] text-on-surface-variant/45 mt-0.5">Gummies, nutrition, personal care & more</p>
          </div>
          <button
            onClick={() => router.push("/explore")}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[12px] font-bold text-white cursor-pointer hover:opacity-90 transition-opacity"
            style={{ background: "#f97316" }}
          >
            <ShoppingBag className="w-3.5 h-3.5" strokeWidth={2.5} /> Shop all
          </button>
        </div>

      </div>
    </div>

    {/* ── Edit profile sheet ── */}
    {showEdit && (
      <>
        <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]" onClick={() => setShowEdit(false)} />
        <div className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-3xl max-w-xl mx-auto shadow-2xl animate-fade-in-up overflow-hidden">

          {/* Warm header */}
          <div className="px-5 pt-4 pb-4" style={{ background: "linear-gradient(135deg, #fff3e0, #ffe8cc)" }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "rgba(194,65,12,0.2)" }} />
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">
                Edit {childName ? `${childName}'s` : "child's"} profile
              </h2>
              <button
                onClick={() => setShowEdit(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: "rgba(194,65,12,0.1)" }}
              >
                <X className="w-4 h-4" style={{ color: "#c2410c" }} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-5 pt-4 pb-12">

            {/* Name */}
            <div className="mb-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant/45 mb-1.5">Name</p>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={childName ?? "Their name"}
                className="w-full bg-surface-container-low rounded-xl px-4 py-3 border border-outline-variant/15 text-sm text-on-surface outline-none"
              />
            </div>

            {/* Age group */}
            <div className="mb-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant/45 mb-1.5">Age group</p>
              <div className="flex gap-2">
                {(["2-5", "6-12", "13+"] as const).map(age => (
                  <button
                    key={age}
                    onClick={() => handleEditAgeChange(age)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-[13px] font-bold cursor-pointer transition-all ${
                      editAge === age
                        ? "border-orange-400 bg-orange-50 text-orange-700"
                        : "border-outline-variant/15 bg-surface-container-lowest text-on-surface-variant/60"
                    }`}
                  >
                    {age === "2-5" ? "2–5 yrs" : age === "6-12" ? "6–12 yrs" : "13+ yrs"}
                  </button>
                ))}
              </div>
            </div>

            {/* Main focus */}
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant/45 mb-2">Main focus</p>
              <div className={`grid gap-2 ${(EDIT_CONCERNS[editAge] ?? []).length > 4 ? "grid-cols-3" : "grid-cols-2"}`}>
                {(EDIT_CONCERNS[editAge] ?? EDIT_CONCERNS["6-12"]).map(c => (
                  <button
                    key={c.key}
                    onClick={() => setEditConcern(c.key)}
                    className={`flex items-center gap-1.5 px-2.5 py-2.5 rounded-2xl border-2 text-left cursor-pointer transition-all text-[12px] font-semibold ${
                      editConcern === c.key
                        ? "border-orange-400 bg-orange-50 text-orange-700"
                        : "border-outline-variant/15 bg-surface-container-lowest text-on-surface"
                    }`}
                  >
                    <span className="text-base leading-none shrink-0">{c.emoji}</span>
                    <span className="leading-tight">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={saveEdit}
              className="w-full py-4 rounded-2xl text-white font-bold text-sm cursor-pointer hover:opacity-90 transition-opacity"
              style={{ background: "#f97316" }}
            >
              Save changes
            </button>
          </div>
        </div>
      </>
    )}
    </>
  );
}
