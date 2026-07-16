"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ChevronRight, ChevronLeft, Check, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { track, identifyUser } from "@/lib/mixpanel";
import { useActiveProfile } from "@/hooks/useActiveProfile";

type ProfileLevel = "L0" | "L1" | "L2" | "L3";

interface UserProfile {
  concern: string;
  concerns?: string;
  name?: string;
  sex: string;
  age: string;
  diet: string;
  [key: string]: string | undefined;
}

type FlowStep =
  | "entry"
  | "name"
  | "gender"
  | "age"
  | "concern"
  | "qualifier"
  | "diet"
  | "child-name"
  | "child-age"
  | "child-concern"
  | "child-followup";

type MemberFlow = "me" | "partner" | "kids";

interface QualifierOption { label: string; value: string; }
interface QualifierDef { question: string; key: string; options: QualifierOption[]; }

const CONCERN_QUALIFIERS: Record<string, (sex?: string) => QualifierDef> = {
  "Hair / beard": () => ({
    question: "What's your main hair concern?",
    key: "hair_concern_type",
    options: [
      { label: "Hair fall & thinning",   value: "thinning"    },
      { label: "Dandruff & itchy scalp", value: "dandruff"    },
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
      { label: "Constantly",          value: "chronic"  },
      { label: "After oily food",     value: "dietary"  },
      { label: "When stressed",       value: "stress"   },
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

const MULTI_CONCERN_QUALIFIER: QualifierDef = {
  question: "What do you think is driving most of this?",
  key: "multi_concern_driver",
  options: [
    { label: "Stress & lifestyle", value: "stress"     },
    { label: "Poor sleep",         value: "poor_sleep" },
    { label: "Diet & gut health",  value: "diet"       },
    { label: "Hormonal changes",   value: "hormonal"   },
  ],
};

const KIDS_CONCERNS: Record<string, { key: string; emoji: string; label: string; sub: string }[]> = {
  "2-5": [
    { key: "immunity", emoji: "🛡️", label: "Fewer colds",    sub: "Stronger immunity" },
    { key: "growth",   emoji: "🌱", label: "Healthy growth", sub: "Height & weight"   },
    { key: "sleep",    emoji: "😴", label: "Better sleep",   sub: "Calm bedtime"      },
    { key: "energy",   emoji: "⚡", label: "More energy",    sub: "Active & playful"  },
  ],
  "6-12": [
    { key: "focus",     emoji: "🧠", label: "Focus at school", sub: "Attention & memory"    },
    { key: "immunity",  emoji: "🛡️", label: "Fewer colds",     sub: "Stronger immunity"     },
    { key: "growth",    emoji: "📏", label: "Height & growth", sub: "Bone & muscle"          },
    { key: "energy",    emoji: "⚡", label: "Energy all day",  sub: "Active after school"    },
    { key: "sleep",     emoji: "😴", label: "Better sleep",    sub: "9+ hours of rest"       },
    { key: "nutrition", emoji: "🥗", label: "Fussy eater",     sub: "Filling nutrition gaps" },
  ],
  "13+": [
    { key: "energy",   emoji: "⚡", label: "Energy & focus", sub: "School & sports"    },
    { key: "skin",     emoji: "✨", label: "Skin & acne",    sub: "Clear, healthy skin" },
    { key: "hair",     emoji: "💇", label: "Hair health",    sub: "Strong & shiny"     },
    { key: "sleep",    emoji: "😴", label: "Better sleep",   sub: "Deep, uninterrupted" },
    { key: "immunity", emoji: "🛡️", label: "Immunity",       sub: "Fewer sick days"    },
  ],
};

const KIDS_FOLLOW_UPS: Record<string, { q: string; opts: { emoji: string; label: string }[] }> = {
  immunity:  { q: "How often does {name} fall sick?",        opts: [{ emoji: "😷", label: "Very often" }, { emoji: "🤒", label: "Sometimes" }, { emoji: "💪", label: "Rarely" }] },
  growth:    { q: "Is {name} a fussy eater?",                opts: [{ emoji: "🙅", label: "Very picky" }, { emoji: "😐", label: "Sometimes" }, { emoji: "😋", label: "Eats most things" }] },
  focus:     { q: "How's {name}'s attention at school?",     opts: [{ emoji: "😵", label: "Hard to focus" }, { emoji: "😑", label: "Sometimes distracted" }, { emoji: "🎯", label: "Generally focused" }] },
  sleep:     { q: "When does {name} usually fall asleep?",   opts: [{ emoji: "🌙", label: "Before 9pm" }, { emoji: "🌛", label: "9–10pm" }, { emoji: "⭐", label: "After 10pm" }] },
  energy:    { q: "How active is {name} during the day?",    opts: [{ emoji: "🚀", label: "Very active" }, { emoji: "🚶", label: "Moderate" }, { emoji: "😴", label: "Often tired" }] },
  skin:      { q: "What's {name}'s main skin concern?",      opts: [{ emoji: "😤", label: "Breakouts / acne" }, { emoji: "🫧", label: "Oily skin" }, { emoji: "🌫️", label: "Dull or dry" }] },
  hair:      { q: "What's {name}'s main hair concern?",      opts: [{ emoji: "🪮", label: "Hair fall" }, { emoji: "💔", label: "Thin / dull" }, { emoji: "🌿", label: "Scalp issues" }] },
  nutrition: { q: "What's missing most from {name}'s diet?", opts: [{ emoji: "🥛", label: "Protein & dairy" }, { emoji: "🥦", label: "Vegetables" }, { emoji: "🌀", label: "Overall variety" }] },
};

const CONCERN_OPTIONS = [
  { label: "Hair / beard", femaleLabel: "Hair",   emoji: "💇", desc: "Fall, thinning & growth",   femaleDesc: "Fall, thinning & damage"  },
  { label: "Skin / acne",  emoji: "✨", desc: "Acne, glow & texture"       },
  { label: "Weight",       emoji: "🏋️", desc: "Fat loss, muscle & fitness" },
  { label: "Energy / gut", emoji: "⚡", desc: "Fatigue, bloating & fog"    },
  { label: "Sleep / mind", emoji: "🌙", desc: "Sleep, stress & anxiety"    },
  { label: "Hormones",     emoji: "🧬", desc: "Hormonal balance"           },
];

const DIET_OPTIONS = [
  { label: "Vegetarian", value: "veg",     emoji: "🥦" },
  { label: "Non-veg",    value: "non-veg", emoji: "🍗" },
  { label: "Vegan",      value: "vegan",   emoji: "🌱" },
  { label: "Eggetarian", value: "egg",     emoji: "🥚" },
];

const AGE_OPTIONS = [
  { label: "18 – 24", value: "18-24" },
  { label: "25 – 34", value: "25-34" },
  { label: "35 – 44", value: "35-44" },
  { label: "45+",     value: "45+"   },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return "Good morning ☀️";
  if (h >= 12 && h < 17) return "Good afternoon 🌤️";
  if (h >= 17 && h < 21) return "Good evening 🌙";
  return "Good night 🌙";
}

function heroImg(step: FlowStep, sex?: string, firstConcern?: string): string {
  const f = sex === "female";
  switch (step) {
    case "name":      return "/onboarding/name.png";
    case "gender":    return "/onboarding/gender.png";
    case "age":       return f ? "/onboarding/age-female.png"     : "/onboarding/age-male.png";
    case "concern":   return f ? "/onboarding/concern-female.png" : "/onboarding/concern-male.png";
    case "qualifier":
      if (f) return firstConcern === "Hair / beard" ? "/onboarding/qualifier-female-hair.png" : "/onboarding/qualifier-female.png";
      return "/onboarding/qualifier-male.png";
    case "diet":      return f ? "/onboarding/diet-female.png" : "/onboarding/diet.png";
    default:          return "/onboarding/gender.png";
  }
}


function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div
            key={i}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${
              done || active
                ? "bg-primary-container text-white"
                : "border-2 border-outline-variant/25 text-on-surface-variant/30"
            } ${active ? "ring-2 ring-primary-container/20 ring-offset-2" : ""}`}
          >
            {done ? <Check className="w-3 h-3" strokeWidth={3} /> : n}
          </div>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  const [level, setLevel] = useState<ProfileLevel>("L0");
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [name, setName] = useState("");
  const [nameText, setNameText] = useState("");
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [selectedQualifiers, setSelectedQualifiers] = useState<string[]>([]);
  const [showGenerating, setShowGenerating] = useState(false);
  const [generatingPhase, setGeneratingPhase] = useState<"generating" | "ready">("generating");
  const [restored, setRestored] = useState(false);
  const [memberFlow, setMemberFlow] = useState<MemberFlow | null>(null);
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState<"2-5" | "6-12" | "13+" | null>(null);
  const [childConcern, setChildConcern] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<FlowStep>("entry");
  const { addMember, members, activeMember, updateMemberProfile } = useActiveProfile();
  const router = useRouter();

  const [isAddMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("bh_add_mode") === "1" || window.location.search.includes("add=true");
  });

  const [isEditMode] = useState(() =>
    typeof window !== "undefined" && window.location.search.includes("edit=true")
  );

  const STATE_VERSION = "bh_v2";

  const applyTheme = (t: "male" | "female" | "child") => {
    localStorage.setItem("bh_theme", t);
    window.dispatchEvent(new Event("bh-theme-change"));
  };

  const advance = useCallback((next: FlowStep) => {
    setCurrentStep(next);
  }, []);

  const goBack = useCallback(() => {
    const qualifierShown =
      selectedConcerns.length > 1 ||
      (selectedConcerns.length === 1 && !!CONCERN_QUALIFIERS[selectedConcerns[0]]);

    if (memberFlow === "kids") {
      const kidsMap: Partial<Record<FlowStep, FlowStep>> = {
        "child-age":      "child-name",
        "child-concern":  "child-age",
        "child-followup": "child-concern",
      };
      const prev = kidsMap[currentStep];
      if (prev) { setCurrentStep(prev); return; }
      applyTheme("male");
      setMemberFlow(null);
      setCurrentStep("entry");
      return;
    }

    const adultMap: Partial<Record<FlowStep, FlowStep>> = {
      "name":      "entry",
      "gender":    "name",
      "age":       "gender",
      "concern":   "age",
      "qualifier": "concern",
      "diet":      qualifierShown ? "qualifier" : "concern",
    };
    const prev = adultMap[currentStep] ?? "entry";
    if (prev === "entry") { applyTheme("male"); setMemberFlow(null); }
    setCurrentStep(prev);
  }, [currentStep, memberFlow, selectedConcerns]);

  // Restore state
  useEffect(() => {
    if (isAddMode) {
      localStorage.removeItem("bh_add_mode");
      setRestored(true);
      return;
    }

    if (isEditMode) {
      try {
        const raw = localStorage.getItem("bh_profile");
        if (raw) {
          const p = JSON.parse(raw) as Partial<UserProfile>;
          setProfile(p);
          if (p.name) { setName(p.name); setNameText(p.name); }
          const concernsRaw = p.concerns ?? p.concern ?? "";
          const c = concernsRaw.split(",").map((s: string) => s.trim()).filter(Boolean);
          if (c.length > 0) setSelectedConcerns(c);
          let detectedFlow: MemberFlow = "me";
          try {
            const profilesRaw = localStorage.getItem("bh_profiles");
            const activeId = localStorage.getItem("bh_active_profile");
            if (profilesRaw && activeId) {
              const profiles = JSON.parse(profilesRaw) as Array<{ id: string }>;
              if (profiles.find((x) => x.id === activeId)?.id.startsWith("partner-")) detectedFlow = "partner";
            }
          } catch {}
          setMemberFlow(detectedFlow);
          setCurrentStep("gender");
        }
      } catch {}
      setRestored(true);
      return;
    }

    try {
      const raw = localStorage.getItem("bh_profile");
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.diet) { router.replace(p.memberType === "child" || p.sex === "child" ? "/kids" : "/protocol"); return; }
      }
    } catch {}

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
          memberFlow?: MemberFlow;
          childName?: string;
          childAge?: "2-5" | "6-12" | "13+";
          childConcern?: string;
          currentStep?: FlowStep;
        };
        if (state._version !== STATE_VERSION) {
          localStorage.removeItem("bh_onboarding_state");
          localStorage.removeItem("bh_profile");
          setRestored(true);
          return;
        }
        if (state.name) { setName(state.name); setNameText(state.name); }
        if (state.selectedConcerns?.length) setSelectedConcerns(state.selectedConcerns);
        if (state.profile) setProfile(state.profile);
        if (state.level) setLevel(state.level);
        if (state.memberFlow) setMemberFlow(state.memberFlow);
        if (state.childName) setChildName(state.childName);
        if (state.childAge) setChildAge(state.childAge);
        if (state.childConcern) setChildConcern(state.childConcern);
        if (state.currentStep) setCurrentStep(state.currentStep);
      }
    } catch {}
    setRestored(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist state
  useEffect(() => {
    if (!restored) return;
    if (currentStep === "entry" && selectedConcerns.length === 0) return;
    try {
      localStorage.setItem("bh_onboarding_state", JSON.stringify({
        _version: STATE_VERSION,
        name, selectedConcerns, profile, level,
        memberFlow, childName, childAge, childConcern, currentStep,
      }));
    } catch {}
  }, [name, selectedConcerns, profile, level, memberFlow, childName, childAge, childConcern, currentStep, restored, STATE_VERSION]);

  const handleToggleConcern = useCallback((concern: string) => {
    setSelectedConcerns((prev) => {
      const next = prev.includes(concern) ? prev.filter((c) => c !== concern) : [...prev, concern];
      setProfile((p) => ({ ...p, concern: next[0], concerns: next.join(",") }));
      return next;
    });
  }, []);

  const handleConcernContinue = useCallback(() => {
    track("Onboarding Concern Selected", { concerns: selectedConcerns.join(","), concern_count: selectedConcerns.length, member_flow: memberFlow });
    const isMulti = selectedConcerns.length > 1;
    const hasSingleQualifier = !isMulti && selectedConcerns[0] && CONCERN_QUALIFIERS[selectedConcerns[0]];
    if (isMulti || hasSingleQualifier) {
      setSelectedQualifiers([]);
      setCurrentStep("qualifier");
    } else {
      setLevel("L1");
      setCurrentStep("diet");
    }
  }, [selectedConcerns]);

  const handleQualifierAnswer = useCallback((key: string, value: string) => {
    if (key) setProfile((p) => ({ ...p, [key]: value }));
    setLevel("L1");
    track("Onboarding Qualifier Answered", { qualifier_key: key, answer: value, member_flow: memberFlow });
    setCurrentStep("diet");
  }, [memberFlow]);

  const handleNameSubmit = useCallback(() => {
    const trimmed = nameText.trim();
    if (trimmed) { setName(trimmed); setProfile((p) => ({ ...p, name: trimmed })); }
    track("Onboarding Name Entered", { member_flow: memberFlow });
    setCurrentStep("gender");
  }, [nameText]);

  const handleSexSelect = useCallback((sex: string) => {
    setProfile((p) => ({ ...p, sex }));
    applyTheme(sex === "female" ? "female" : "male");
    track("Onboarding Gender Selected", { gender: sex, member_flow: memberFlow });
    setCurrentStep("age");
  }, []);

  const handleAgeSelect = useCallback((age: string) => {
    setProfile((p) => ({ ...p, age }));
    track("Onboarding Age Selected", { age, member_flow: memberFlow });
    setCurrentStep("concern");
  }, []);

  const handleDietSelect = useCallback((diet: string) => {
    const fullProfile = { ...profile, diet, concerns: selectedConcerns.join(","), name: name || undefined };
    setProfile((p) => ({ ...p, diet }));
    setLevel("L3");
    track("Onboarding Diet Selected", { diet, concerns: selectedConcerns.join(","), member_flow: memberFlow });
    track("Onboarding Completed", { member_flow: memberFlow, gender: fullProfile.sex, age: fullProfile.age, concerns: selectedConcerns.join(","), diet });
    identifyUser(memberFlow === "me" ? `anon-${Date.now()}` : `partner-${Date.now()}`, {
      gender: fullProfile.sex,
      age_range: fullProfile.age,
      primary_concern: selectedConcerns[0],
      diet,
      member_flow: memberFlow,
    });
    localStorage.setItem("bh_profile", JSON.stringify(fullProfile));

    if (isEditMode && activeMember) {
      updateMemberProfile(activeMember.id, fullProfile);
    } else {
      const memberType = fullProfile.sex === "female" ? "female" as const : "male" as const;
      const memberId = memberFlow === "partner" ? `partner-${Date.now()}` : `me-${Date.now()}`;
      addMember({ id: memberId, type: memberType, name: fullProfile.name, profile: fullProfile });
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) supabase.from("profiles").upsert({ id: session.user.id, data: fullProfile }).then(() => {});
    });

    setGeneratingPhase("generating");
    setShowGenerating(true);
    setTimeout(() => setGeneratingPhase("ready"), 2800);
  }, [profile, selectedConcerns, name, memberFlow, isEditMode, activeMember, addMember, updateMemberProfile]);

  const handleKidsComplete = useCallback((answer: string) => {
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
    track("Onboarding Completed", { member_flow: "kids", child_age: childAge, child_concern: childConcern });
    addMember({ id: `kid-${Date.now()}`, type: "child", name: childName || undefined, childAge: (childAge ?? undefined) as "2-5" | "6-12" | "13+" | undefined, profile: childProfile });
    setGeneratingPhase("generating");
    setShowGenerating(true);
    setTimeout(() => setGeneratingPhase("ready"), 2800);
  }, [childName, childAge, childConcern, addMember]);

  // ── Blank screen during edit mode profile load ──
  if (isEditMode && memberFlow === null) return <div className="min-h-dvh bg-surface" />;

  // ── Protocol generating overlay ──
  if (showGenerating) {
    const isKids = memberFlow === "kids";
    const CONCERN_META: Record<string, { label: string; emoji: string }> = {
      "Hair / beard": { label: "Hair & Beard", emoji: "💇" },
      "Skin / acne":  { label: "Skin & Acne",  emoji: "✨" },
      "Weight":       { label: "Weight",        emoji: "🏋️" },
      "Energy / gut": { label: "Energy & Gut",  emoji: "⚡" },
      "Sleep / mind": { label: "Sleep & Mind",  emoji: "🌙" },
      "Hormones":     { label: "Hormones",      emoji: "🧬" },
    };
    const concern1 = selectedConcerns[0];
    const loadingSteps = isKids
      ? ["Checking age group", "Matching Little Joys products", "Setting up their profile"]
      : selectedConcerns.length === 1 && concern1
        ? [`Reading your ${CONCERN_META[concern1]?.label?.toLowerCase() ?? "health"} profile`, `Matching ${CONCERN_META[concern1]?.label?.toLowerCase() ?? "products"} to your needs`, "Crafting your daily habits"]
        : ["Reading your health profile", "Matching products to your needs", "Crafting your daily habits"];

    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6" style={{ background: "#004034" }}>
        {generatingPhase === "generating" && (
          <div className="flex flex-col items-center text-center animate-fade-in-up w-full max-w-xs">
            <div className="relative flex items-center justify-center w-24 h-24 mb-8">
              <div className="absolute inset-0 rounded-full border border-white/20 animate-ping" style={{ animationDuration: "2s" }} />
              <div className="absolute inset-0 rounded-full border border-white/12 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.65s" }} />
              <div className="absolute inset-0 rounded-full border border-white/07 animate-ping" style={{ animationDuration: "2s", animationDelay: "1.3s" }} />
              <div className="absolute inset-0 rounded-full" style={{ background: "rgba(147,211,192,0.18)" }} />
              <div className="absolute inset-2.5 rounded-full" style={{ background: "rgba(147,211,192,0.12)" }} />
              {isKids ? <span className="relative text-4xl leading-none">🧒</span> : <Sparkles className="relative w-9 h-9 text-white" strokeWidth={1.5} />}
            </div>
            <h2 className="text-[28px] font-extrabold text-white font-[family-name:var(--font-manrope)] mb-2 leading-tight">
              {isKids ? "Finding their picks…" : `Building ${name ? `${name}'s` : "your"} protocol…`}
            </h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.6)" }}>
              {isKids ? "Curating age-appropriate products from Little Joys." : "Scanning your profile and matching the right products."}
            </p>
            {!isKids && selectedConcerns.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center mb-6">
                {selectedConcerns.map((c) => {
                  const m = CONCERN_META[c];
                  return m ? (
                    <span key={c} className="text-[11px] font-semibold px-2.5 py-1 rounded-full border" style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.85)", borderColor: "rgba(255,255,255,0.18)" }}>
                      {m.emoji} {m.label}
                    </span>
                  ) : null;
                })}
              </div>
            )}
            <div className="flex gap-2 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full animate-pulse" style={{ background: "rgba(255,255,255,0.35)", animationDelay: `${i * 250}ms` }} />
              ))}
            </div>
            <div className="space-y-2.5 text-left w-full">
              {loadingSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-2.5 animate-fade-in-up" style={{ animationDelay: `${i * 600 + 200}ms` }}>
                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.12)" }}>
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {generatingPhase === "ready" && (
          <div className="flex flex-col items-center text-center animate-fade-in-up w-full max-w-xs">
            <div className="relative flex items-center justify-center w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full" style={{ background: "rgba(147,211,192,0.22)" }} />
              <div className="absolute inset-2 rounded-full" style={{ background: "rgba(147,211,192,0.14)" }} />
              {isKids ? <span className="relative text-4xl leading-none">🧒</span> : <Check className="relative w-9 h-9 text-white" strokeWidth={2.5} />}
            </div>
            <h2 className="text-[28px] font-extrabold text-white font-[family-name:var(--font-manrope)] mb-2 leading-tight">
              {isKids ? `${childName ? `${childName}'s` : "Their"} picks are ready!` : `${name ? `${name}, your` : "Your"} protocol is ready`}
            </h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.6)" }}>
              {isKids ? "Age-matched products from Little Joys, curated for your child." : "Your supplements, habits and daily routine — personalized for you."}
            </p>
            {!isKids && selectedConcerns.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center mb-7">
                {selectedConcerns.map((c) => {
                  const m = CONCERN_META[c];
                  return m ? (
                    <span key={c} className="text-[11px] font-semibold px-2.5 py-1 rounded-full border" style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.85)", borderColor: "rgba(255,255,255,0.18)" }}>
                      {m.emoji} {m.label}
                    </span>
                  ) : null;
                })}
              </div>
            )}
            <button
              onClick={() => router.replace(isKids ? "/kids" : "/protocol")}
              className="w-full py-4 rounded-2xl font-bold text-base cursor-pointer mb-3 transition-opacity hover:opacity-90"
              style={{ background: "#ffffff", color: "#004034" }}
            >
              {isKids ? `Set up ${childName ? `${childName}'s` : "their"} wellness →` : memberFlow === "partner" ? `View ${name ? `${name}'s` : "their"} protocol →` : "View my protocol →"}
            </button>
            {!isKids && <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>Free · Personalized · Updates as you share more</p>}
          </div>
        )}
      </div>
    );
  }

  // ── ENTRY SCREEN (no animation wrapper needed) ──
  if (currentStep === "entry" || memberFlow === null) {
    const hasMeProfile = members.some((m) => m.id.startsWith("me-"));
    const hasPartnerProfile = members.some((m) => m.id.startsWith("partner-"));
    const kidsProfiles = members.filter((m) => m.type === "child");
    const meDisabled = hasMeProfile && isAddMode;
    const partnerDisabled = hasPartnerProfile && isAddMode;

    return (
      <div className="min-h-[calc(100dvh-48px-68px)] lg:min-h-[calc(100dvh-48px)] flex flex-col">
        {isAddMode && (
          <div className="px-5 pt-5">
            <button onClick={() => router.push("/protocol")} className="flex items-center gap-1.5 text-xs text-on-surface-variant/50 hover:text-on-surface-variant mb-4 cursor-pointer transition-colors self-start">
              ← Back to my protocol
            </button>
          </div>
        )}
        {!isAddMode && (
          <div className="relative overflow-hidden" style={{ height: "30vh", minHeight: "200px", background: "#1a5243" }}>
            <img src="/onboarding/entry.png" alt="" className="w-full h-full object-cover" style={{ objectPosition: "center 20%" }} />
            <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-[#fbf9f5] to-transparent pointer-events-none" />
          </div>
        )}
        <div className="px-5 pt-4 pb-4">
          {isAddMode && members.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex -space-x-2.5">
                {members.slice(0, 4).map((m) => (
                  <div key={m.id} className="w-10 h-10 rounded-full bg-surface-container border-2 border-surface flex items-center justify-center text-lg shadow-sm">
                    {m.type === "child" ? "🧒" : m.type === "female" ? "👩" : "👤"}
                  </div>
                ))}
              </div>
              <p className="text-xs text-on-surface-variant/60 font-medium">{members.length} profile{members.length > 1 ? "s" : ""} in your family</p>
            </div>
          )}
          <h1 className="text-[26px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-tight mb-2">
            {isAddMode ? "Who are we\nadding next?" : "Your family's health,\nall in one place"}
          </h1>
          <p className="text-sm text-on-surface-variant/60 leading-relaxed">
            {isAddMode ? "Each profile gets its own protocol, picks, and coaching." : "Personalised protocols, curated picks, and AI coaching — for everyone in your family."}
          </p>
        </div>

        <div className="flex flex-col gap-3 flex-1 px-5">
          <button
            onClick={() => { if (!meDisabled) { applyTheme("male"); setMemberFlow("me"); track("Onboarding Started", { member_flow: "me" }); advance("name"); } }}
            disabled={meDisabled}
            className={`w-full flex items-center gap-4 py-4 px-5 rounded-2xl transition-all duration-150 ${meDisabled ? "bg-surface-container border border-outline-variant/10 cursor-not-allowed opacity-40" : "bg-primary-container shadow-sm cursor-pointer hover:opacity-90 active:scale-[0.99]"}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${meDisabled ? "bg-surface-container-high" : "bg-white/15"}`}>👤</div>
            <div className="text-left flex-1 min-w-0">
              <p className={`font-bold text-[13px] ${meDisabled ? "text-on-surface-variant" : "text-white"}`}>Just me</p>
              <p className={`text-[11px] mt-0.5 ${meDisabled ? "text-on-surface-variant/40" : "text-white/60"}`}>{meDisabled ? "Already set up" : "Full protocol · curated picks · coaching"}</p>
            </div>
            {meDisabled ? <Check className="w-4 h-4 text-on-surface-variant/30 shrink-0" strokeWidth={2.5} /> : <ChevronRight className="w-4 h-4 text-white/60 shrink-0" />}
          </button>

          <button
            onClick={() => { if (!partnerDisabled) { applyTheme("male"); setMemberFlow("partner"); setName(""); setNameText(""); track("Onboarding Started", { member_flow: "partner" }); advance("name"); } }}
            disabled={partnerDisabled}
            className={`w-full flex items-center gap-4 py-4 px-5 rounded-2xl border transition-all duration-150 ${partnerDisabled ? "bg-surface-container border-outline-variant/10 cursor-not-allowed opacity-40" : "border-outline-variant/15 bg-surface-container-lowest shadow-sm cursor-pointer hover:bg-surface-container-low active:scale-[0.99]"}`}
          >
            <div className="w-10 h-10 rounded-xl bg-primary-container/10 flex items-center justify-center text-xl shrink-0">💑</div>
            <div className="text-left flex-1 min-w-0">
              <p className={`font-bold text-[13px] ${partnerDisabled ? "text-on-surface-variant" : "text-on-surface"}`}>My partner</p>
              <p className={`text-[11px] mt-0.5 ${partnerDisabled ? "text-on-surface-variant/40" : "text-on-surface-variant/60"}`}>{partnerDisabled ? "Already set up" : "Their own personalised protocol"}</p>
            </div>
            {partnerDisabled ? <Check className="w-4 h-4 text-on-surface-variant/30 shrink-0" strokeWidth={2.5} /> : <ChevronRight className="w-4 h-4 text-on-surface-variant/35 shrink-0" />}
          </button>

          <button
            onClick={() => { applyTheme("child"); setMemberFlow("kids"); setName(""); setNameText(""); track("Onboarding Started", { member_flow: "kids" }); advance("child-name"); }}
            className="w-full flex items-center gap-4 py-4 px-5 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm cursor-pointer hover:bg-surface-container-low transition-all duration-150 active:scale-[0.99]"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-container/10 flex items-center justify-center text-xl shrink-0">🧒</div>
            <div className="text-left flex-1 min-w-0">
              <p className="font-bold text-[13px] text-on-surface">My kids</p>
              <p className="text-[11px] text-on-surface-variant/60 mt-0.5">
                {kidsProfiles.length > 0 ? `${kidsProfiles.length} child${kidsProfiles.length > 1 ? "ren" : ""} added · Add another` : "Age-matched essentials · Little Joys picks"}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/35 shrink-0" />
          </button>
        </div>
        <p className="text-center text-[11px] text-on-surface-variant/30 mt-8 px-5 pb-6">Manage profiles anytime from the menu in the top right.</p>
      </div>
    );
  }

  // ── Progress indicator value for current step ──
  const isKidsFlow = memberFlow === "kids";
  const total = isKidsFlow ? 3 : 4;
  const currentNum = (() => {
    if (isKidsFlow) return ["child-age", "child-concern", "child-followup"].indexOf(currentStep) + 1 || null;
    if (currentStep === "qualifier") return 3;
    return (["gender", "age", "concern", "diet"].indexOf(currentStep) + 1) || null;
  })();

  // ── Hero image for this step ──
  const heroSrc = heroImg(currentStep, profile.sex, selectedConcerns[0]);

  const HeroImage = () => (
    <div className="overflow-hidden relative" style={{ height: "30vh", minHeight: "200px", background: "#1a5243" }}>
      <img src={heroSrc} alt="" className="w-full h-full object-cover" style={{ objectPosition: "center 20%" }} />
      <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-[#fbf9f5] to-transparent pointer-events-none" />
    </div>
  );

  // ── Shared layout primitives ──
  const NavBar = ({ showBack = true, onSkip }: { showBack?: boolean; onSkip?: () => void }) => (
    <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
      <button
        onClick={goBack}
        className={`flex items-center gap-1 text-[13px] font-medium text-on-surface-variant/50 hover:text-on-surface-variant transition-colors cursor-pointer ${!showBack ? "invisible" : ""}`}
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      {currentNum !== null ? <ProgressDots current={currentNum} total={total} /> : <div />}
      {onSkip
        ? <button onClick={onSkip} className="text-[13px] font-semibold cursor-pointer" style={{ color: "var(--color-primary-container)" }}>Skip</button>
        : <div className="w-8" />
      }
    </div>
  );

  const QuestionBlock = ({ q, sub }: { q: string; sub?: string }) => (
    <div className="px-5 pt-3 pb-1">
      <h2 className="text-[22px] font-extrabold text-on-surface leading-tight font-[family-name:var(--font-manrope)]">{q}</h2>
      {sub && <p className="text-[12px] text-on-surface-variant/55 mt-1 leading-relaxed">{sub}</p>}
    </div>
  );

  // ── Screen renderer — returns content, no fixed wrapper ──
  const renderScreen = () => {
    // NAME
    if (currentStep === "name") return (
      <>
        <NavBar showBack onSkip={() => { setNameText(""); handleNameSubmit(); }} />
        <HeroImage />
        <div className="px-5 pt-4 pb-1">
          <p className="text-[18px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">{getGreeting()}</p>
          <p className="text-[13px] text-on-surface-variant/60 mt-0.5">
            {memberFlow === "partner"
              ? "Now let's personalise things for your partner too."
              : "Welcome to BetterHalf — your personalised health journey starts here."}
          </p>
        </div>
        <QuestionBlock q={memberFlow === "partner" ? "What's your partner's name?" : "What should we call you?"} />
        <div className="px-4 mt-4">
          <div className="bg-white rounded-2xl px-5 py-4 shadow-[0_2px_16px_rgba(0,58,45,0.08)]">
            <input
              autoFocus
              type="text"
              value={nameText}
              onChange={(e) => setNameText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && nameText.trim()) handleNameSubmit(); }}
              placeholder={memberFlow === "partner" ? "Their first name" : "Your first name"}
              className="w-full bg-transparent text-[22px] font-semibold text-on-surface placeholder:text-on-surface-variant/30 outline-none"
            />
          </div>
        </div>
      </>
    );

    // GENDER
    if (currentStep === "gender") return (
      <>
        <NavBar onSkip={() => handleSexSelect("undisclosed")} />
        <HeroImage />
        <QuestionBlock
          q={name
            ? memberFlow === "partner"
              ? `Tell me about ${name}`
              : `Tell me about yourself, ${name}`
            : memberFlow === "partner"
              ? "Tell me about your partner"
              : "Who are we building this for?"}
          sub="This helps us personalise supplement picks, brands and daily habits."
        />
        <div className="px-4 grid grid-cols-2 gap-3 mt-3">
          {[{ sex: "male", emoji: "👨", label: "A man" }, { sex: "female", emoji: "👩", label: "A woman" }].map((opt) => (
            <button key={opt.sex} onClick={() => handleSexSelect(opt.sex)}
              className="flex flex-col items-center justify-center gap-3 py-9 rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,58,45,0.08)] hover:shadow-[0_4px_24px_rgba(0,58,45,0.13)] transition-all duration-200 cursor-pointer active:scale-[0.97]"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary-container/10 flex items-center justify-center">
                <span className="text-4xl leading-none">{opt.emoji}</span>
              </div>
              <p className="text-[16px] font-extrabold text-on-surface">{opt.label}</p>
            </button>
          ))}
        </div>
      </>
    );

    // AGE
    if (currentStep === "age") return (
      <>
        <NavBar onSkip={() => handleAgeSelect("unknown")} />
        <HeroImage />
        <QuestionBlock
          q={memberFlow === "partner" ? `How old is ${name || "your partner"}?` : "And roughly how old are you?"}
          sub="Helps us match the right products for your life stage."
        />
        <div className="px-4 grid grid-cols-2 gap-3 mt-3">
          {AGE_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => handleAgeSelect(opt.value)}
              className="flex items-center justify-center py-8 rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,58,45,0.08)] hover:shadow-[0_4px_24px_rgba(0,58,45,0.13)] transition-all duration-200 cursor-pointer active:scale-[0.97]"
            >
              <p className="text-[22px] font-extrabold text-on-surface">{opt.label}</p>
            </button>
          ))}
        </div>
      </>
    );

    // CONCERN
    if (currentStep === "concern") return (
      <>
        <NavBar />
        <HeroImage />
        <QuestionBlock
          q={memberFlow === "partner"
            ? (name ? `What's on ${name}'s mind?` : "What are their main health goals?")
            : (name ? `What's on your mind, ${name}?` : "What's your main health goal?")}
          sub={memberFlow === "partner"
            ? "Pick one or more — we'll tailor everything to their concerns."
            : "Pick one or more — we'll tailor everything to your concerns."}
        />
        <div className="px-4 grid grid-cols-2 gap-3 mt-3">
          {CONCERN_OPTIONS.map((opt) => {
            const sel = selectedConcerns.includes(opt.label);
            const isFemale = profile.sex === "female";
            const displayLabel = isFemale && opt.femaleLabel ? opt.femaleLabel : opt.label;
            const displayDesc  = isFemale && opt.femaleDesc  ? opt.femaleDesc  : opt.desc;
            return (
              <button key={opt.label} onClick={() => handleToggleConcern(opt.label)}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all duration-200 cursor-pointer active:scale-[0.97] min-h-[90px] ${sel ? "bg-primary-container/10 shadow-[0_2px_16px_rgba(0,58,45,0.14)] ring-2 ring-primary-container/40" : "bg-white shadow-[0_2px_16px_rgba(0,58,45,0.08)] hover:shadow-[0_4px_24px_rgba(0,58,45,0.12)]"}`}
              >
                <div className="relative">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sel ? "bg-primary-container/20" : "bg-surface-container"}`}>
                    <span className="text-xl leading-none">{opt.emoji}</span>
                  </div>
                  {sel && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary-container flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" strokeWidth={3} /></div>}
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-extrabold text-on-surface leading-snug">{displayLabel}</p>
                  <p className="text-[10px] text-on-surface-variant/50 mt-0.5">{displayDesc}</p>
                </div>
              </button>
            );
          })}
        </div>
        {selectedConcerns.length === 0 && (
          <p className="text-center text-[11px] text-on-surface-variant/40 mt-4 px-4">Select at least one to continue</p>
        )}
      </>
    );

    // QUALIFIER
    if (currentStep === "qualifier") {
      let qualifier: QualifierDef | null = null;
      if (selectedConcerns.length > 1) qualifier = MULTI_CONCERN_QUALIFIER;
      else if (selectedConcerns[0]) { const fn = CONCERN_QUALIFIERS[selectedConcerns[0]]; qualifier = fn ? fn(profile.sex) : null; }
      if (!qualifier) { handleQualifierAnswer("", ""); return null; }
      return (
        <>
          <NavBar onSkip={() => handleQualifierAnswer("", "")} />
          <HeroImage />
          <QuestionBlock q={memberFlow === "partner"
            ? qualifier.question.replace(/\byour\b/gi, "their").replace(/\byou\b/gi, "they")
            : qualifier.question} />
          <div className="px-4 grid grid-cols-2 gap-3 mt-3">
            {qualifier.options.map((opt) => {
              const sel = selectedQualifiers.includes(opt.value);
              return (
                <button key={opt.value}
                  onClick={() => setSelectedQualifiers(prev =>
                    prev.includes(opt.value) ? prev.filter(v => v !== opt.value) : [...prev, opt.value]
                  )}
                  className={`relative flex items-center justify-center px-3 py-8 rounded-2xl transition-all duration-200 cursor-pointer active:scale-[0.97] text-center ${
                    sel
                      ? "bg-primary-container/10 shadow-[0_2px_16px_rgba(0,58,45,0.14)] ring-2 ring-primary-container/40"
                      : "bg-white shadow-[0_2px_16px_rgba(0,58,45,0.08)] hover:shadow-[0_4px_24px_rgba(0,58,45,0.13)]"
                  }`}
                >
                  {sel && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary-container flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                  <p className="text-[14px] font-bold text-on-surface leading-snug">{opt.label}</p>
                </button>
              );
            })}
          </div>
          <div className="px-4 mt-4">
            <button
              onClick={() => handleQualifierAnswer(qualifier!.key, selectedQualifiers.join(","))}
              disabled={selectedQualifiers.length === 0}
              className="w-full py-4 bg-[#004f54] text-white rounded-2xl font-extrabold text-base disabled:opacity-40 transition-opacity"
            >
              Continue →
            </button>
          </div>
        </>
      );
    }

    // DIET
    if (currentStep === "diet") return (
      <>
        <NavBar onSkip={() => handleDietSelect("unknown")} />
        <HeroImage />
        <QuestionBlock
          q={memberFlow === "partner"
            ? `What does ${name || "their"} diet look like?`
            : "What does your diet look like?"}
          sub="Diet type directly affects which nutrients you might be missing."
        />
        <div className="px-4 grid grid-cols-2 gap-3 mt-3">
          {DIET_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => handleDietSelect(opt.value)}
              className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,58,45,0.08)] hover:shadow-[0_4px_24px_rgba(0,58,45,0.13)] transition-all duration-200 cursor-pointer active:scale-[0.97]"
            >
              <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center">
                <span className="text-2xl leading-none">{opt.emoji}</span>
              </div>
              <p className="text-[15px] font-extrabold text-on-surface">{opt.label}</p>
            </button>
          ))}
        </div>
      </>
    );

    // CHILD NAME
    if (currentStep === "child-name") return (
      <>
        <NavBar onSkip={() => { setChildName(""); advance("child-age"); }} />
        <HeroImage />
        <QuestionBlock q="What's your child's name?" />
        <div className="px-4 mt-4">
          <div className="bg-white rounded-2xl px-5 py-4 shadow-[0_2px_16px_rgba(0,58,45,0.08)]">
            <input
              autoFocus
              type="text"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") advance("child-age"); }}
              placeholder="Their name"
              className="w-full bg-transparent text-[22px] font-semibold text-on-surface placeholder:text-on-surface-variant/30 outline-none"
            />
          </div>
        </div>
      </>
    );

    // CHILD AGE
    if (currentStep === "child-age") return (
      <>
        <NavBar />
        <HeroImage />
        <QuestionBlock q={`How old is ${childName || "your child"}?`} sub="Age-appropriate picks from Little Joys." />
        <div className="px-4 flex flex-col gap-3 mt-3">
          {([
            { value: "2-5",  label: "2 – 5 years",  desc: "Toddler & early childhood", emoji: "🧸" },
            { value: "6-12", label: "6 – 12 years", desc: "School age",                emoji: "🎒" },
            { value: "13+",  label: "13+ years",    desc: "Teen",                      emoji: "🎧" },
          ] as const).map((opt) => (
            <button key={opt.value} onClick={() => { setChildAge(opt.value); advance("child-concern"); }}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,58,45,0.08)] hover:shadow-[0_4px_24px_rgba(0,58,45,0.13)] transition-all cursor-pointer active:scale-[0.98]"
            >
              <span className="text-3xl leading-none shrink-0">{opt.emoji}</span>
              <div className="flex-1 text-left">
                <p className="font-bold text-[16px] text-on-surface">{opt.label}</p>
                <p className="text-[12px] text-on-surface-variant/50 mt-0.5">{opt.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-on-surface-variant/30 shrink-0" />
            </button>
          ))}
        </div>
      </>
    );

    // CHILD CONCERN
    if (currentStep === "child-concern") {
      const concerns = childAge ? (KIDS_CONCERNS[childAge] ?? KIDS_CONCERNS["6-12"]) : [];
      return (
        <>
          <NavBar />
          <HeroImage />
          <QuestionBlock q={`What's your main focus for ${childName || "them"}?`} />
          <div className="px-4 grid grid-cols-2 gap-3 mt-3">
            {concerns.map((c) => (
              <button key={c.key} onClick={() => { setChildConcern(c.key); advance("child-followup"); }}
                className="flex flex-col items-center justify-center gap-2.5 p-5 rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,58,45,0.08)] hover:shadow-[0_4px_24px_rgba(0,58,45,0.12)] transition-all cursor-pointer active:scale-[0.97] min-h-[110px]"
              >
                <span className="text-3xl leading-none">{c.emoji}</span>
                <div className="text-center">
                  <p className="text-[13px] font-extrabold text-on-surface leading-snug">{c.label}</p>
                  <p className="text-[10px] text-on-surface-variant/45 mt-0.5">{c.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      );
    }

    // CHILD FOLLOWUP
    if (currentStep === "child-followup") {
      const followUp = childConcern ? KIDS_FOLLOW_UPS[childConcern] : null;
      const displayName = childName || "your child";
      if (!followUp) { handleKidsComplete(""); return null; }
      return (
        <>
          <NavBar onSkip={() => handleKidsComplete("")} />
          <HeroImage />
          <QuestionBlock q={followUp.q.replace("{name}", displayName)} />
          <div className="px-4 flex flex-col gap-3 mt-3">
            {followUp.opts.map((opt, i) => (
              <button key={i} onClick={() => handleKidsComplete(opt.label)}
                className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,58,45,0.08)] hover:shadow-[0_4px_24px_rgba(0,58,45,0.13)] transition-all cursor-pointer active:scale-[0.98]"
              >
                <span className="text-3xl leading-none shrink-0">{opt.emoji}</span>
                <p className="text-[16px] font-semibold text-on-surface">{opt.label}</p>
              </button>
            ))}
          </div>
        </>
      );
    }

    return null;
  };

  // Bottom bar: what appears on the right side
  const showContinue = currentStep === "concern" || currentStep === "name" || currentStep === "child-name";
  const continueEnabled =
    currentStep === "concern"    ? selectedConcerns.length > 0 :
    currentStep === "name"       ? !!nameText.trim() :
    true;
  const onContinueClick =
    currentStep === "concern"    ? handleConcernContinue :
    currentStep === "name"       ? handleNameSubmit :
    () => advance("child-age");

  return (
    <>
      {/* Full-screen scrollable overlay — fixed wrapper outside AnimatePresence avoids position:fixed + transform conflict */}
      <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "#fbf9f5" }}>
        <div className="min-h-full pb-28 max-w-[420px] mx-auto">
          {renderScreen()}
        </div>
      </div>

      {/* Frosted bottom bar — z-[51] so it sits above the overlay */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[51]"
        style={{
          background: "rgba(251,249,245,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div className="max-w-[420px] mx-auto flex items-center justify-between px-5 py-4">
        <button
          onClick={goBack}
          className="flex items-center gap-1 text-[13px] font-bold cursor-pointer transition-opacity hover:opacity-70"
          style={{ color: "#8c4c4d" }}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>
        {showContinue && (
          <button
            onClick={onContinueClick}
            disabled={!continueEnabled}
            className="flex items-center gap-1.5 font-bold text-[14px] px-6 py-3 rounded-full text-white cursor-pointer disabled:opacity-35 transition-opacity hover:opacity-90"
            style={{ background: "var(--color-primary-container)" }}
          >
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        )}
        </div>
      </div>
    </>
  );
}
