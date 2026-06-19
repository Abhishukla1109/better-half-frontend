"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ChevronRight, Check, Heart } from "lucide-react";
import ConcernCard from "@/components/feed/cards/ConcernCard";
import ProfilingCard from "@/components/feed/cards/ProfilingCard";
import UserMessageCard from "@/components/feed/cards/UserMessageCard";
import { supabase } from "@/lib/supabase/client";
import { track } from "@/lib/mixpanel";
import { useActiveProfile } from "@/hooks/useActiveProfile";

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

const KIDS_CONCERNS: Record<string, { key: string; emoji: string; label: string; sub: string }[]> = {
  "2-5": [
    { key: "immunity",  emoji: "🛡️", label: "Fewer colds",      sub: "Stronger immunity" },
    { key: "growth",    emoji: "🌱", label: "Healthy growth",    sub: "Height & weight" },
    { key: "sleep",     emoji: "😴", label: "Better sleep",      sub: "Calm bedtime" },
    { key: "energy",    emoji: "⚡", label: "More energy",       sub: "Active & playful" },
  ],
  "6-12": [
    { key: "focus",     emoji: "🧠", label: "Focus at school",   sub: "Attention & memory" },
    { key: "immunity",  emoji: "🛡️", label: "Fewer colds",       sub: "Stronger immunity" },
    { key: "growth",    emoji: "📏", label: "Height & growth",   sub: "Bone & muscle" },
    { key: "energy",    emoji: "⚡", label: "Energy all day",    sub: "Active after school" },
    { key: "sleep",     emoji: "😴", label: "Better sleep",      sub: "9+ hours of rest" },
    { key: "nutrition", emoji: "🥗", label: "Fussy eater",       sub: "Filling nutrition gaps" },
  ],
  "13+": [
    { key: "energy",    emoji: "⚡", label: "Energy & focus",    sub: "School & sports" },
    { key: "skin",      emoji: "✨", label: "Skin & acne",        sub: "Clear, healthy skin" },
    { key: "hair",      emoji: "💇", label: "Hair health",        sub: "Strong & shiny" },
    { key: "sleep",     emoji: "😴", label: "Better sleep",      sub: "Deep, uninterrupted" },
    { key: "immunity",  emoji: "🛡️", label: "Immunity",          sub: "Fewer sick days" },
  ],
};

const KIDS_FOLLOW_UPS: Record<string, { q: string; opts: { emoji: string; label: string }[] }> = {
  immunity:  { q: "How often does {name} fall sick?",         opts: [{ emoji: "😷", label: "Very often" },      { emoji: "🤒", label: "Sometimes" },           { emoji: "💪", label: "Rarely" }] },
  growth:    { q: "Is {name} a fussy eater?",                 opts: [{ emoji: "🙅", label: "Very picky" },      { emoji: "😐", label: "Sometimes" },           { emoji: "😋", label: "Eats most things" }] },
  focus:     { q: "How's {name}'s attention at school?",      opts: [{ emoji: "😵", label: "Hard to focus" },   { emoji: "😑", label: "Sometimes distracted" }, { emoji: "🎯", label: "Generally focused" }] },
  sleep:     { q: "When does {name} usually fall asleep?",    opts: [{ emoji: "🌙", label: "Before 9pm" },      { emoji: "🌛", label: "9–10pm" },              { emoji: "⭐", label: "After 10pm" }] },
  energy:    { q: "How active is {name} during the day?",     opts: [{ emoji: "🚀", label: "Very active" },     { emoji: "🚶", label: "Moderate" },            { emoji: "😴", label: "Often tired" }] },
  skin:      { q: "What's {name}'s main skin concern?",       opts: [{ emoji: "😤", label: "Breakouts / acne" },{ emoji: "🫧", label: "Oily skin" },           { emoji: "🌫️", label: "Dull or dry" }] },
  hair:      { q: "What's {name}'s main hair concern?",       opts: [{ emoji: "🪮", label: "Hair fall" },       { emoji: "💔", label: "Thin / dull" },         { emoji: "🌿", label: "Scalp issues" }] },
  nutrition: { q: "What's missing most from {name}'s diet?",  opts: [{ emoji: "🥛", label: "Protein & dairy" }, { emoji: "🥦", label: "Vegetables" },          { emoji: "🌀", label: "Overall variety" }] },
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
  const [showSplash, setShowSplash] = useState(false);
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

  // Family member flow
  type MemberFlow = "me" | "partner" | "kids";
  const [memberFlow, setMemberFlow] = useState<MemberFlow | null>(null);
  // Kids-specific state
  const [childName, setChildName] = useState("");
  const [childNameSubmitted, setChildNameSubmitted] = useState(false);
  const [childAge, setChildAge] = useState<"2-5" | "6-12" | "13+" | null>(null);
  const [childConcern, setChildConcern] = useState<string | null>(null);

  const { addMember, members, activeMember, updateMemberProfile } = useActiveProfile();

  // True when navigated here to add a new family member (profile already exists)
  // Uses a localStorage flag (set by ProfileSidebar) rather than URL params
  // to avoid Next.js client navigation timing issues.
  const [isAddMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const flag = localStorage.getItem("bh_add_mode") === "1";
    const urlFlag = window.location.search.includes("add=true");
    return flag || urlFlag;
  });

  const [isEditMode] = useState(() =>
    typeof window !== "undefined" && window.location.search.includes("edit=true")
  );


  const applyTheme = (t: "male" | "female" | "child") => {
    localStorage.setItem("bh_theme", t);
    window.dispatchEvent(new Event("bh-theme-change"));
  };

  const router = useRouter();

  // Bump this whenever the saved-state shape changes — auto-clears old data
  const STATE_VERSION = "bh_v2";

  // Restore onboarding state from localStorage on mount
  useEffect(() => {
    // isAddMode is captured in useState (stable across Strict Mode double-invocation).
    // Re-reading localStorage here would fail on the 2nd run because the flag was
    // already consumed on the 1st run.
    if (isAddMode) {
      localStorage.removeItem("bh_add_mode"); // consume the flag (idempotent)
      setRestored(true);
      return;
    }

    // Edit mode: load directly from bh_profile (the active profile) so gender and all
    // fields always match the profile being edited, regardless of onboarding state.
    if (isEditMode) {
      try {
        const raw = localStorage.getItem("bh_profile");
        if (raw) {
          const p = JSON.parse(raw) as Partial<UserProfile>;
          setProfile(p);
          if (p.name) { setName(p.name); setNameText(p.name); setNameSubmitted(true); }
          const concernsRaw = p.concerns ?? p.concern ?? "";
          const c = concernsRaw.split(",").map((s: string) => s.trim()).filter(Boolean);
          if (c.length > 0) setSelectedConcerns(c);
          if (p.diet) setLevel("L3");
          else if (c.length > 0) setLevel("L2");
          else if (p.sex) setLevel("L1");
          // Determine whether this is the "me" or "partner" profile — always falls back to "me"
          let detectedFlow: MemberFlow = "me";
          try {
            const profilesRaw = localStorage.getItem("bh_profiles");
            const activeProfileId = localStorage.getItem("bh_active_profile");
            if (profilesRaw && activeProfileId) {
              const profiles = JSON.parse(profilesRaw) as Array<{ id: string }>;
              const active = profiles.find((x) => x.id === activeProfileId);
              if (active?.id.startsWith("partner-")) detectedFlow = "partner";
            }
          } catch { /* non-critical */ }
          setMemberFlow(detectedFlow);
        }
      } catch { /* non-critical */ }
      setRestored(true);
      return;
    }

    // If onboarding is complete (profile with diet exists), go straight to correct page
    if (!isEditMode) {
      try {
        const raw = localStorage.getItem("bh_profile");
        if (raw) {
          const p = JSON.parse(raw);
          if (p?.diet) { router.replace(p.memberType === "child" || p.sex === "child" ? "/kids" : "/protocol"); return; }
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
          memberFlow?: MemberFlow;
          childName?: string;
          childAge?: "2-5" | "6-12" | "13+";
          childConcern?: string;
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
        if (state.memberFlow) setMemberFlow(state.memberFlow);
        if (state.childName) { setChildName(state.childName); setChildNameSubmitted(true); }
        if (state.childAge) setChildAge(state.childAge);
        if (state.childConcern) setChildConcern(state.childConcern);
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
        memberFlow, childName, childAge, childConcern,
      }));
    } catch {}
  }, [name, selectedConcerns, profile, level, userMessages, memberFlow, childName, childAge, childConcern, restored, STATE_VERSION]);

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
    track("Onboarding Step Completed", { step: "name" });
    scrollToCard("card-sex");
  }, [scrollToCard]);

  const handleSexSelect = useCallback((sex: string) => {
    setProfile((p) => ({ ...p, sex }));
    applyTheme(sex === "female" ? "female" : "male");
    track("Onboarding Step Completed", { step: "gender", value: sex });
    scrollToCard("card-age");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToCard]);

  const handleAgeSelect = useCallback((age: string) => {
    setProfile((p) => ({ ...p, age }));
    track("Onboarding Step Completed", { step: "age", value: age });
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
    track("Onboarding Step Completed", { step: "concern", concern: selectedConcerns.join(","), diet });
    localStorage.setItem("bh_profile", JSON.stringify(fullProfile));

    if (isEditMode && activeMember) {
      // Update the existing member in place — don't create a duplicate
      updateMemberProfile(activeMember.id, fullProfile);
    } else {
      // Write to bh_profiles (multi-profile store)
      const memberType = fullProfile.sex === "female" ? "female" as const : "male" as const;
      const memberId = memberFlow === "partner"
        ? `partner-${Date.now()}`
        : `me-${Date.now()}`;
      addMember({ id: memberId, type: memberType, name: fullProfile.name, profile: fullProfile });
    }

    // Persist to Supabase (fire-and-forget, doesn't block UI)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from("profiles").upsert({ id: session.user.id, data: fullProfile }).then(() => {});
      }
    });

    setGeneratingPhase("generating");
    setShowGenerating(true);
    setTimeout(() => setGeneratingPhase("ready"), 2800);
  }, [profile, selectedConcerns, name, memberFlow, isEditMode, activeMember, addMember, updateMemberProfile]);

  // In edit mode, memberFlow starts null and is set by the restore effect.
  // Return a blank screen until restoration completes to avoid flashing the entry chooser.
  if (isEditMode && memberFlow === null) return <div className="min-h-dvh bg-surface" />;

  /* ═══════════════════════════════════════════════════════
     ENTRY SCREEN — who are we building this for?
     Shown to first-time users before any onboarding starts.
     ═══════════════════════════════════════════════════════ */
  if (memberFlow === null) {
    const hasMeProfile = members.some((m) => m.id.startsWith("me-"));
    const hasPartnerProfile = members.some((m) => m.id.startsWith("partner-"));
    const kidsProfiles = members.filter((m) => m.type === "child");
    const meDisabled = hasMeProfile && isAddMode;
    const partnerDisabled = hasPartnerProfile && isAddMode;

    return (
      <div
        className="min-h-[calc(100dvh-48px-68px)] lg:min-h-[calc(100dvh-48px)] flex flex-col px-5 py-8"
        style={{ background: "linear-gradient(180deg, rgba(21,89,74,0.06) 0%, transparent 35%)" }}
      >
        {/* Back link */}
        {isAddMode && (
          <button
            onClick={() => router.push("/protocol")}
            className="flex items-center gap-1.5 text-xs text-on-surface-variant/50 hover:text-on-surface-variant mb-6 cursor-pointer transition-colors self-start"
          >
            ← Back to my protocol
          </button>
        )}

        {/* ── Top identity block ────────────────────────────── */}
        <div className="mb-8">
          {isAddMode && members.length > 0 ? (
            /* Add mode: stacked avatars */
            <div className="flex items-center gap-3 mb-5">
              <div className="flex -space-x-2.5">
                {members.slice(0, 4).map((m) => (
                  <div
                    key={m.id}
                    className="w-10 h-10 rounded-full bg-surface-container border-2 border-surface flex items-center justify-center text-lg shadow-sm"
                  >
                    {m.type === "child" ? "🧒" : m.type === "female" ? "👩" : "👤"}
                  </div>
                ))}
              </div>
              <p className="text-xs text-on-surface-variant/60 font-medium">
                {members.length} profile{members.length > 1 ? "s" : ""} in your family
              </p>
            </div>
          ) : (
            /* First time: branded icon */
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-5 shadow-sm"
              style={{ background: "linear-gradient(135deg, #004034 0%, #15594a 100%)" }}
            >
              👨‍👩‍👧
            </div>
          )}

          <h1 className="text-[26px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-tight mb-2">
            {isAddMode ? "Who are we\nadding next?" : "Your family's health,\nall in one place"}
          </h1>
          <p className="text-sm text-on-surface-variant/60 leading-relaxed">
            {isAddMode
              ? "Each profile gets its own protocol, picks, and coaching."
              : "Personalised protocols, curated picks, and AI coaching — for everyone in your family."}
          </p>
        </div>

        {/* ── Choice cards ──────────────────────────────────── */}
        <div className="flex flex-col gap-3 flex-1">

          {/* Just me */}
          <button
            onClick={() => { if (!meDisabled) { applyTheme("male"); setMemberFlow("me"); } }}
            disabled={meDisabled}
            className={`w-full flex items-center gap-4 py-4 px-5 rounded-2xl transition-all duration-150 ${
              meDisabled
                ? "bg-surface-container border border-outline-variant/10 cursor-not-allowed opacity-40"
                : "bg-primary-container shadow-sm cursor-pointer hover:opacity-90 active:scale-[0.99]"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${meDisabled ? "bg-surface-container-high" : "bg-white/15"}`}>
              👤
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className={`font-bold text-[13px] ${meDisabled ? "text-on-surface-variant" : "text-white"}`}>Just me</p>
              <p className={`text-[11px] mt-0.5 leading-relaxed ${meDisabled ? "text-on-surface-variant/40" : "text-white/60"}`}>
                {meDisabled ? "Already set up" : "Full protocol · curated picks · coaching"}
              </p>
            </div>
            {meDisabled
              ? <Check className="w-4 h-4 text-on-surface-variant/30 shrink-0" strokeWidth={2.5} />
              : <ChevronRight className="w-4 h-4 text-white/60 shrink-0" />
            }
          </button>

          {/* My partner */}
          <button
            onClick={() => { if (!partnerDisabled) { applyTheme("male"); setMemberFlow("partner"); } }}
            disabled={partnerDisabled}
            className={`w-full flex items-center gap-4 py-4 px-5 rounded-2xl border transition-all duration-150 ${
              partnerDisabled
                ? "bg-surface-container border-outline-variant/10 cursor-not-allowed opacity-40"
                : "border-outline-variant/15 bg-surface-container-lowest shadow-sm cursor-pointer hover:bg-surface-container-low active:scale-[0.99]"
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-primary-container/10 flex items-center justify-center text-xl shrink-0">
              💑
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className={`font-bold text-[13px] ${partnerDisabled ? "text-on-surface-variant" : "text-on-surface"}`}>My partner</p>
              <p className={`text-[11px] mt-0.5 ${partnerDisabled ? "text-on-surface-variant/40" : "text-on-surface-variant/60"}`}>
                {partnerDisabled ? "Already set up" : "Their own personalised protocol"}
              </p>
            </div>
            {partnerDisabled
              ? <Check className="w-4 h-4 text-on-surface-variant/30 shrink-0" strokeWidth={2.5} />
              : <ChevronRight className="w-4 h-4 text-on-surface-variant/35 shrink-0" />
            }
          </button>

          {/* My kids */}
          <button
            onClick={() => { applyTheme("child"); setMemberFlow("kids"); }}
            className="w-full flex items-center gap-4 py-4 px-5 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm cursor-pointer hover:bg-surface-container-low transition-all duration-150 active:scale-[0.99]"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-container/10 flex items-center justify-center text-xl shrink-0">
              🧒
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="font-bold text-[13px] text-on-surface">My kids</p>
              <p className="text-[11px] text-on-surface-variant/60 mt-0.5">
                {kidsProfiles.length > 0
                  ? `${kidsProfiles.length} child${kidsProfiles.length > 1 ? "ren" : ""} added · Add another`
                  : "Age-matched essentials · Little Joys picks"}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/35 shrink-0" />
          </button>
        </div>

        <p className="text-center text-[11px] text-on-surface-variant/30 mt-8 leading-relaxed">
          Manage profiles anytime from the menu in the top right.
        </p>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     KIDS FLOW — simple 2-step: name + age group
     ═══════════════════════════════════════════════════════ */
  /* ═══════════════════════════════════════════════════════
     PROTOCOL GENERATION + FAKE AUTH OVERLAY
     — checked before any member-flow screen so it always renders
     ═══════════════════════════════════════════════════════ */
  if (showGenerating) {
    const isKids = memberFlow === "kids";

    const CONCERN_META: Record<string, { label: string; emoji: string; style: string }> = {
      "Hair / beard": { label: "Hair & Beard", emoji: "🪮", style: "bg-rose-500/10 text-rose-700 border border-rose-500/20" },
      "Skin / acne":  { label: "Skin & Acne",  emoji: "✨", style: "bg-amber-500/10 text-amber-700 border border-amber-500/20" },
      "Weight":       { label: "Weight",        emoji: "⚖️", style: "bg-orange-500/10 text-orange-700 border border-orange-500/20" },
      "Energy / gut": { label: "Energy & Gut",  emoji: "⚡", style: "bg-yellow-500/10 text-yellow-700 border border-yellow-500/20" },
      "Sleep / mind": { label: "Sleep & Mind",  emoji: "🌙", style: "bg-indigo-500/10 text-indigo-700 border border-indigo-500/20" },
      "Hormones":     { label: "Hormones",      emoji: "🧬", style: "bg-teal-500/10 text-teal-700 border border-teal-500/20" },
    };

    const concern1 = selectedConcerns[0];
    const loadingSteps = isKids
      ? ["Checking age group", "Matching Little Joys products", "Setting up their profile"]
      : selectedConcerns.length === 1 && concern1
        ? [
            `Reading your ${CONCERN_META[concern1]?.label?.toLowerCase() ?? "health"} profile`,
            `Matching ${CONCERN_META[concern1]?.label?.toLowerCase() ?? "products"} to your needs`,
            "Crafting your daily habits",
          ]
        : ["Reading your health profile", "Matching products to your needs", "Crafting your daily habits"];

    return (
      <div
        className="fixed inset-0 z-[80] flex flex-col items-center justify-center px-6"
        style={{ background: "linear-gradient(160deg, rgba(21,89,74,0.09) 0%, rgba(255,255,255,1) 62%)" }}
      >

        {/* Generating phase */}
        {generatingPhase === "generating" && (
          <div className="flex flex-col items-center text-center animate-fade-in-up w-full max-w-xs">
            <div className="relative flex items-center justify-center w-24 h-24 mb-7">
              <div className="absolute inset-0 rounded-full bg-primary-container/15 animate-ping" style={{ animationDuration: "1.4s" }} />
              <div className="absolute inset-2 rounded-full bg-primary-container/10" />
              {isKids
                ? <span className="relative text-4xl leading-none">🧒</span>
                : <Sparkles className="relative w-9 h-9 text-primary-container" strokeWidth={1.5} />}
            </div>

            <h2 className="text-[26px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] mb-2 leading-tight">
              {isKids ? "Finding their picks…" : `Building ${name ? `${name}'s` : "your"} protocol…`}
            </h2>
            <p className="text-sm text-on-surface-variant/60 max-w-xs leading-relaxed mb-5">
              {isKids
                ? "Curating age-appropriate products from Little Joys for your child."
                : "Scanning your profile and matching the right products for you."}
            </p>

            {!isKids && selectedConcerns.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center mb-5">
                {selectedConcerns.map((c) => {
                  const m = CONCERN_META[c];
                  return m ? (
                    <span key={c} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${m.style}`}>
                      {m.emoji} {m.label}
                    </span>
                  ) : null;
                })}
              </div>
            )}

            <div className="flex gap-2 mb-5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-primary-container/40 animate-pulse" style={{ animationDelay: `${i * 250}ms` }} />
              ))}
            </div>

            <div className="space-y-2 text-left w-full">
              {loadingSteps.map((step, i) => (
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
            <div className="relative flex items-center justify-center w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full bg-primary-container/15" />
              {isKids
                ? <span className="relative text-4xl leading-none">🧒</span>
                : <Sparkles className="relative w-9 h-9 text-primary-container" strokeWidth={1.5} />}
            </div>

            <h2 className="text-[26px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] mb-2 leading-tight">
              {isKids
                ? `${childName ? `${childName}'s` : "Their"} picks are ready!`
                : `${name ? `${name}, your` : "Your"} protocol is ready`}
            </h2>
            <p className="text-sm text-on-surface-variant/60 leading-relaxed mb-5">
              {isKids
                ? "We've curated age-matched products from Little Joys for your child."
                : "Your supplements, habits and daily routine — personalized for you."}
            </p>

            {!isKids && selectedConcerns.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center mb-6">
                {selectedConcerns.map((c) => {
                  const m = CONCERN_META[c];
                  return m ? (
                    <span key={c} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${m.style}`}>
                      {m.emoji} {m.label}
                    </span>
                  ) : null;
                })}
              </div>
            )}

            <button
              onClick={() => router.replace(isKids ? "/kids" : "/protocol")}
              className="w-full py-4 rounded-2xl bg-primary-container text-white font-bold text-base hover:bg-primary transition-colors duration-200 cursor-pointer mb-3"
            >
              {isKids
                ? `Set up ${childName ? `${childName}'s` : "their"} wellness →`
                : memberFlow === "partner"
                  ? `View ${name ? `${name}'s` : "their"} protocol →`
                  : "View my protocol →"}
            </button>
            {!isKids && (
              <p className="text-[11px] text-on-surface-variant/40">Free · Personalized · Updates as you share more</p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (memberFlow === "kids") {
    const kidsDisplayName = childName || "your child";
    const followUp = childConcern ? KIDS_FOLLOW_UPS[childConcern] : null;
    const concerns = childAge ? (KIDS_CONCERNS[childAge] ?? KIDS_CONCERNS["6-12"]) : [];

    const handleKidsComplete = (answer: string) => {
      const childProfile = {
        name: childName || undefined,
        memberType: "child",
        childAge: childAge ?? undefined,
        sex: "child",
        diet: "unknown",
        concern: childConcern ?? undefined,
        kidsFollowUp: answer,
        kidsOnboardingDone: "true",
      } as Parameters<typeof addMember>[0]["profile"];
      localStorage.setItem("bh_profile", JSON.stringify(childProfile));
      addMember({
        id: `kid-${Date.now()}`,
        type: "child",
        name: childName || undefined,
        childAge: (childAge ?? undefined) as "2-5" | "6-12" | "13+" | undefined,
        profile: childProfile,
      });
      setGeneratingPhase("generating");
      setShowGenerating(true);
      setTimeout(() => setGeneratingPhase("ready"), 2800);
    };

    const editSvg = (
      <svg className="w-3.5 h-3.5 text-on-surface-variant/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
      </svg>
    );

    return (
      <div className="px-4 py-4">
        <div className="flex flex-col gap-2">

          {/* Greeting */}
          <div className="feed-card-ai p-5 animate-fade-in-up">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg, #004034 0%, #15594a 100%)" }}>
                <Heart className="w-4 h-4 text-white" strokeWidth={2} fill="white" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-primary font-[family-name:var(--font-manrope)] leading-tight">
                  {childNameSubmitted && childName ? `Let's build ${childName}'s plan.` : "Adding a child's profile."}
                </h1>
                <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
                  A few quick questions — I'll find the best Little Joys picks for them.
                </p>
              </div>
            </div>
          </div>

          {/* Back to profiles */}
          <button
            onClick={() => { applyTheme("male"); setMemberFlow(null); }}
            className="flex items-center gap-1.5 text-xs text-on-surface-variant/50 hover:text-on-surface-variant cursor-pointer transition-colors px-1 py-1"
          >
            ← Back to profiles
          </button>

          {/* Name card */}
          <div className="feed-card-ai p-5 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
            {childNameSubmitted ? (
              <div className="flex items-center gap-2 flex-wrap animate-fade-in-up">
                <p className="text-sm text-on-surface-variant">Their name is</p>
                <span className="px-4 py-2.5 rounded-xl bg-primary-container/15 border border-primary-container/20 text-sm font-semibold text-primary-container">
                  {childName || "not given"}
                </span>
                <button
                  onClick={() => { setChildNameSubmitted(false); setChildAge(null); setChildConcern(null); }}
                  className="w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center cursor-pointer transition-colors"
                  aria-label="Edit name"
                >
                  {editSvg}
                </button>
              </div>
            ) : (
              <>
                <p className="text-base text-on-surface leading-relaxed">What&apos;s your child&apos;s name?</p>
                <div className="mt-3 flex items-center gap-2 bg-surface-container-low rounded-xl px-4 py-3 border border-outline-variant/15">
                  <input
                    type="text"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") setChildNameSubmitted(true); }}
                    placeholder="Their name"
                    className="flex-1 bg-transparent text-base text-on-surface placeholder:text-on-surface-variant/40 outline-none"
                    autoFocus
                  />
                  {childName.trim() && (
                    <button
                      onClick={() => setChildNameSubmitted(true)}
                      className="text-sm font-semibold text-primary cursor-pointer hover:text-primary-container transition-colors"
                    >
                      Continue
                    </button>
                  )}
                </div>
                <button
                  onClick={() => { setChildName(""); setChildNameSubmitted(true); }}
                  className="mt-2 text-xs text-on-surface-variant/50 cursor-pointer hover:text-on-surface-variant transition-colors"
                >
                  Skip
                </button>
              </>
            )}
          </div>

          {/* Age card — appears after name */}
          {childNameSubmitted && (
            <div className="feed-card-ai p-5 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              {childAge ? (
                <div className="flex items-center gap-2 animate-fade-in-up">
                  <p className="text-sm text-on-surface-variant">Age group</p>
                  <span className="px-4 py-2.5 rounded-xl bg-primary-container/15 border border-primary-container/20 text-sm font-semibold text-primary-container">
                    {childAge === "2-5" ? "2–5 years" : childAge === "6-12" ? "6–12 years" : "13+ years"}
                  </span>
                  <button
                    onClick={() => { setChildAge(null); setChildConcern(null); }}
                    className="w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center cursor-pointer transition-colors"
                    aria-label="Edit age"
                  >
                    {editSvg}
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-base text-on-surface leading-relaxed">How old is {kidsDisplayName}?</p>
                  <p className="text-[11px] text-on-surface-variant/50 mt-0.5 mb-3">Age-appropriate picks from Little Joys.</p>
                  <div className="space-y-2 mt-1">
                    {([
                      { value: "2-5",  label: "2 – 5 years",  desc: "Toddler & early childhood", emoji: "🧸" },
                      { value: "6-12", label: "6 – 12 years", desc: "School age",                emoji: "🎒" },
                      { value: "13+",  label: "13+ years",    desc: "Teen",                      emoji: "🎧" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setChildAge(opt.value)}
                        className="w-full flex items-center gap-3.5 py-3.5 px-4 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest hover:border-primary-container/40 hover:bg-primary-container/5 transition-all cursor-pointer text-left active:scale-[0.98]"
                      >
                        <span className="text-xl leading-none shrink-0">{opt.emoji}</span>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-on-surface">{opt.label}</p>
                          <p className="text-[11px] text-on-surface-variant/50 mt-0.5">{opt.desc}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-on-surface-variant/30 shrink-0" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Concern card — appears after age */}
          {childNameSubmitted && childAge && (
            <div className="feed-card-ai p-5 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              {childConcern ? (
                <div className="flex items-center gap-2 animate-fade-in-up">
                  <p className="text-sm text-on-surface-variant">Main goal</p>
                  <span className="px-4 py-2.5 rounded-xl bg-primary-container/15 border border-primary-container/20 text-sm font-semibold text-primary-container">
                    {concerns.find(c => c.key === childConcern)?.label ?? childConcern}
                  </span>
                  <button
                    onClick={() => setChildConcern(null)}
                    className="w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center cursor-pointer transition-colors"
                    aria-label="Edit concern"
                  >
                    {editSvg}
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-base text-on-surface leading-relaxed">What&apos;s your main focus for {kidsDisplayName}?</p>
                  <div className="grid grid-cols-2 gap-2.5 mt-4">
                    {concerns.map(c => (
                      <button
                        key={c.key}
                        onClick={() => setChildConcern(c.key)}
                        className="flex flex-col items-start gap-2 p-4 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest hover:border-primary-container/30 hover:bg-primary-container/5 text-left transition-all cursor-pointer active:scale-[0.97]"
                      >
                        <span className="text-2xl leading-none">{c.emoji}</span>
                        <div>
                          <p className="text-[13px] font-extrabold text-on-surface leading-snug">{c.label}</p>
                          <p className="text-[10px] text-on-surface-variant/45 mt-0.5">{c.sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Follow-up card — appears after concern */}
          {childNameSubmitted && childAge && childConcern && followUp && (
            <div className="feed-card-ai p-5 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              <p className="text-base text-on-surface leading-relaxed">
                {followUp.q.replace("{name}", kidsDisplayName)}
              </p>
              <div className="flex flex-col gap-2.5 mt-4">
                {followUp.opts.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleKidsComplete(opt.label)}
                    className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest hover:border-primary-container/30 hover:bg-primary-container/5 text-left transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <span className="text-xl leading-none shrink-0">{opt.emoji}</span>
                    <span className="text-[14px] font-semibold text-on-surface">{opt.label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleKidsComplete("")}
                className="mt-3 text-xs text-on-surface-variant/45 cursor-pointer hover:text-on-surface-variant transition-colors"
              >
                Skip
              </button>
            </div>
          )}

        </div>
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
      <div className="flex flex-col gap-2">

        {/* L0: Hero block */}
        <div
          className="relative rounded-2xl px-5 pt-5 pb-4 overflow-hidden animate-fade-in-up"
          style={{ background: "linear-gradient(135deg, #0d3d36 0%, #1e6b5e 60%, #0d3d36 100%)" }}
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full" style={{ background: "#4ecdc4", opacity: 0.08 }} />
          <div className="absolute right-4 bottom-4 w-16 h-16 rounded-full" style={{ background: "#4ecdc4", opacity: 0.06 }} />
          <p className="relative text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#4ecdc4" }}>
            ✦ BetterHalf
          </p>
          <p className="relative text-[19px] font-bold text-white leading-snug">
            {name ? `Hey ${name} 👋` : "Your health, personalised."}
          </p>
          <div className="relative flex items-center gap-2 mt-2.5">
            <span className="flex items-center gap-1.5 bg-white/15 border border-white/20 rounded-full px-3 py-1">
              <span className="text-[11px]">⚡</span>
              <span className="text-[11px] font-bold text-white">4 questions · 60 seconds</span>
            </span>
          </div>
          <p className="relative text-[11px] mt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)", maxWidth: 240 }}>
            I&apos;ll build a supplement protocol just for you.
          </p>
        </div>

        {/* Name — first thing, right after greeting */}
        <div id="card-name" className={nameSubmitted && !nameEditing ? "animate-fade-in-up" : "feed-card-ai p-5 animate-fade-in-up"} style={{ animationDelay: "150ms" }}>
          {nameSubmitted && !nameEditing ? (
            <div className="flex items-center gap-3 px-2 py-1 animate-fade-in-up">
              <div className="w-5 h-5 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
              <p className="flex-1 text-[13px] font-semibold text-on-surface">{name || "friend"}</p>
              <button
                onClick={() => setNameEditing(true)}
                className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-surface-container-low cursor-pointer transition-colors"
                aria-label="Edit name"
              >
                <svg className="w-3 h-3 text-on-surface-variant/35" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
              </button>
            </div>
          ) : (
            <>
              <p className="text-base text-on-surface leading-relaxed">
                {isEditMode
                  ? (name ? `Update ${name}'s name` : memberFlow === "partner" ? "Update their name" : "Update your name")
                  : (memberFlow === "partner" ? "What's your partner's name?" : "What should I call you?")}
              </p>
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
        <div id="card-sex" className={profile.sex ? "animate-fade-in-up" : "feed-card-ai p-5 animate-fade-in-up"} style={{ animationDelay: "150ms" }}>
          {profile.sex ? (
            <div className="flex items-center gap-3 px-2 py-1 animate-fade-in-up">
              <div className="w-5 h-5 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
              <p className="flex-1 text-[13px] font-semibold text-on-surface">
                {memberFlow === "partner"
                  ? profile.sex === "male" ? `${name || "Partner"} — a man` : profile.sex === "female" ? `${name || "Partner"} — a woman` : "Prefer not to say"
                  : profile.sex === "male" ? "For a man" : profile.sex === "female" ? "For a woman" : "I'd rather not say"}
              </p>
              <button
                onClick={() => {
                  setProfile((p) => ({ ...p, sex: undefined, age: undefined, concern: undefined, concerns: undefined }));
                  setSelectedConcerns([]);
                  setLevel("L0");
                }}
                className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-surface-container-low cursor-pointer transition-colors shrink-0"
                aria-label="Edit selection"
              >
                <svg className="w-3 h-3 text-on-surface-variant/35" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
              </button>
            </div>
          ) : (
            <>
              <p className="text-base text-on-surface leading-relaxed">
                {memberFlow === "partner" ? `Tell me about ${name || "your partner"}` : "Who are we building this for?"}
              </p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  onClick={() => handleSexSelect("male")}
                  className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-primary-container/25 bg-primary-container/12 hover:bg-primary-container/22 hover:border-primary-container/45 transition-all duration-200 cursor-pointer py-5 active:scale-[0.97]"
                >
                  <span className="text-3xl leading-none">👨</span>
                  <p className="text-[14px] font-extrabold text-primary-container">A man</p>
                </button>
                <button
                  onClick={() => handleSexSelect("female")}
                  className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-rose-400/25 bg-rose-400/10 hover:bg-rose-400/20 hover:border-rose-400/45 transition-all duration-200 cursor-pointer py-5 active:scale-[0.97]"
                >
                  <span className="text-3xl leading-none">👩</span>
                  <p className="text-[14px] font-extrabold text-rose-600">A woman</p>
                </button>
              </div>
              <button
                onClick={() => handleSexSelect("undisclosed")}
                className="mt-3 text-xs text-on-surface-variant/45 cursor-pointer hover:text-on-surface-variant transition-colors"
              >
                I&apos;d rather not say
              </button>
            </>
          )}
        </div>


        {/* Step 2: Age — shown after gender */}
        {profile.sex && (
          <div id="card-age" className={profile.age ? "animate-fade-in-up" : "feed-card-ai p-5 animate-fade-in-up"} style={{ animationDelay: "200ms" }}>
            {profile.age ? (
              <div className="flex items-center gap-3 px-2 py-1 animate-fade-in-up">
                <div className="w-5 h-5 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
                <p className="flex-1 text-[13px] font-semibold text-on-surface">
                  {ageBucketLabel(profile.age)} years old
                </p>
                <button
                  onClick={() => {
                    setProfile((p) => ({ ...p, age: undefined, concern: undefined, concerns: undefined }));
                    setSelectedConcerns([]);
                    setLevel("L0");
                  }}
                  className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-surface-container-low cursor-pointer transition-colors"
                  aria-label="Edit age"
                >
                  <svg className="w-3 h-3 text-on-surface-variant/35" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
                </button>
              </div>
            ) : (
              <>
                <p className="text-base text-on-surface leading-relaxed">
                  {memberFlow === "partner" ? `How old is ${name || "your partner"}?` : "And roughly how old are you?"}
                </p>
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

        {/* Rather browse first — always at the bottom */}
        {!profile.diet && (
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
            <div className="flex gap-3 px-4 pb-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {SNEAK_PEEK.map((p) => (
                <button
                  key={p.slug}
                  onClick={() => router.push(`/explore/product/${p.slug}`)}
                  className="flex-shrink-0 w-[108px] text-left cursor-pointer group"
                >
                  <div className="w-full h-[96px] rounded-xl overflow-hidden bg-surface-container-low mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <p className="text-[11px] font-semibold text-on-surface leading-tight line-clamp-2 mb-1">{p.name}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-bold text-on-surface">₹{p.price}</span>
                    <span className="text-[10px] text-on-surface-variant/40 line-through">₹{p.original}</span>
                  </div>
                </button>
              ))}
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

      </div>
    </div>
  );
}
