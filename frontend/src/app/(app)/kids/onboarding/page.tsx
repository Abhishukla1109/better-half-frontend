"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActiveProfile } from "@/hooks/useActiveProfile";

const CONCERNS = {
  "2-5": [
    { key: "immunity",  emoji: "🛡️", label: "Fewer colds",      sub: "Stronger immunity" },
    { key: "growth",    emoji: "🌱", label: "Healthy growth",    sub: "Height & weight" },
    { key: "sleep",     emoji: "😴", label: "Better sleep",      sub: "Calm bedtime" },
    { key: "energy",    emoji: "⚡", label: "More energy",       sub: "Active & playful" },
  ],
  "6-12": [
    { key: "focus",     emoji: "🧠", label: "Focus at school",  sub: "Attention & memory" },
    { key: "immunity",  emoji: "🛡️", label: "Fewer colds",      sub: "Stronger immunity" },
    { key: "growth",    emoji: "📏", label: "Height & growth",  sub: "Bone & muscle" },
    { key: "energy",    emoji: "⚡", label: "Energy all day",   sub: "Active after school" },
    { key: "sleep",     emoji: "😴", label: "Better sleep",     sub: "9+ hours of rest" },
    { key: "nutrition", emoji: "🥗", label: "Fussy eater",      sub: "Filling nutrition gaps" },
  ],
  "13+": [
    { key: "energy",    emoji: "⚡", label: "Energy & focus",   sub: "School & sports" },
    { key: "skin",      emoji: "✨", label: "Skin & acne",       sub: "Clear, healthy skin" },
    { key: "hair",      emoji: "💇", label: "Hair health",       sub: "Strong & shiny" },
    { key: "sleep",     emoji: "😴", label: "Better sleep",     sub: "Deep, uninterrupted" },
    { key: "immunity",  emoji: "🛡️", label: "Immunity",         sub: "Fewer sick days" },
  ],
} as const;

const FOLLOW_UPS: Record<string, { q: string; opts: { emoji: string; label: string }[] }> = {
  immunity:   { q: "How often does {name} fall sick?",          opts: [{ emoji: "😷", label: "Very often" }, { emoji: "🤒", label: "Sometimes" }, { emoji: "💪", label: "Rarely" }] },
  growth:     { q: "Is {name} a fussy eater?",                  opts: [{ emoji: "🙅", label: "Very picky" }, { emoji: "😐", label: "Sometimes" }, { emoji: "😋", label: "Eats most things" }] },
  focus:      { q: "How's {name}'s attention at school?",       opts: [{ emoji: "😵", label: "Hard to focus" }, { emoji: "😑", label: "Sometimes distracted" }, { emoji: "🎯", label: "Generally focused" }] },
  sleep:      { q: "When does {name} usually fall asleep?",     opts: [{ emoji: "🌙", label: "Before 9pm" }, { emoji: "🌛", label: "9–10pm" }, { emoji: "⭐", label: "After 10pm" }] },
  energy:     { q: "How active is {name} during the day?",      opts: [{ emoji: "🚀", label: "Very active" }, { emoji: "🚶", label: "Moderate" }, { emoji: "😴", label: "Often tired" }] },
  skin:       { q: "What's {name}'s main skin concern?",        opts: [{ emoji: "😤", label: "Breakouts / acne" }, { emoji: "🫧", label: "Oily skin" }, { emoji: "🌫️", label: "Dull or dry" }] },
  hair:       { q: "What's {name}'s main hair concern?",        opts: [{ emoji: "🪮", label: "Hair fall" }, { emoji: "💔", label: "Thin / dull" }, { emoji: "🌿", label: "Scalp issues" }] },
  nutrition:  { q: "What's missing most from {name}'s diet?",   opts: [{ emoji: "🥛", label: "Protein & dairy" }, { emoji: "🥦", label: "Vegetables" }, { emoji: "🌀", label: "Overall variety" }] },
};

export default function KidsOnboardingPage() {
  const router = useRouter();
  const { activeMember, updateMemberProfile } = useActiveProfile();

  const [step, setStep]               = useState<1 | 2>(1);
  const [selectedConcern, setSelected] = useState<string | null>(null);
  const [animating, setAnimating]     = useState(false);

  const childName = activeMember?.name;
  const childAge  = activeMember?.childAge ?? "6-12";
  const concerns  = CONCERNS[childAge as keyof typeof CONCERNS] ?? CONCERNS["6-12"];
  const displayName = childName || "your child";

  useEffect(() => {
    if (!activeMember) return;
    const p = activeMember.profile as Record<string, unknown>;
    if (p?.kidsOnboardingDone) router.replace("/kids");
  }, [activeMember, router]);

  const handleConcern = (key: string) => {
    setSelected(key);
    setAnimating(true);
    setTimeout(() => { setStep(2); setAnimating(false); }, 280);
  };

  const handleFollowUp = (answer: string) => {
    if (!activeMember || !selectedConcern) return;
    updateMemberProfile(activeMember.id, {
      concern: selectedConcern,
      kidsFollowUp: answer,
      kidsOnboardingDone: "true",
    } as Record<string, string>);
    setTimeout(() => router.replace("/kids"), 150);
  };

  const followUp = selectedConcern ? FOLLOW_UPS[selectedConcern] : null;

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "linear-gradient(150deg, #fffbf5 0%, #fff8f0 50%, #f0fdf8 100%)" }}>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2 pt-10">
        {[1, 2].map(s => (
          <div key={s} className="h-1.5 rounded-full transition-all duration-400"
            style={{ width: s === step ? 28 : 8, background: s <= step ? "#f97316" : "#fde8d0" }} />
        ))}
      </div>

      <div className={`flex-1 flex flex-col justify-center px-6 max-w-sm mx-auto w-full py-10 transition-opacity duration-200 ${animating ? "opacity-0" : "opacity-100"}`}>

        {/* Step 1 — Concern */}
        {step === 1 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#f97316" }}>
              Just 2 quick questions
            </p>
            <h2 className="text-[22px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-tight mb-1">
              What&apos;s your main focus
            </h2>
            <p className="text-[22px] font-extrabold leading-tight mb-7 font-[family-name:var(--font-manrope)]" style={{ color: "#f97316" }}>
              for {displayName}?
            </p>

            <div className="grid grid-cols-2 gap-3">
              {concerns.map(c => (
                <button
                  key={c.key}
                  onClick={() => handleConcern(c.key)}
                  className="flex flex-col items-start gap-2 p-4 rounded-3xl border-2 border-orange-100 bg-white text-left transition-all duration-150 cursor-pointer active:scale-95 hover:border-orange-300 hover:bg-orange-50"
                >
                  <span className="text-[24px] leading-none">{c.emoji}</span>
                  <div>
                    <p className="text-[13px] font-extrabold text-on-surface leading-snug">{c.label}</p>
                    <p className="text-[10px] text-on-surface-variant/45 mt-0.5">{c.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Follow-up */}
        {step === 2 && followUp && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#f97316" }}>
              One more
            </p>
            <h2 className="text-[22px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-snug mb-7">
              {followUp.q.replace("{name}", displayName)}
            </h2>

            <div className="flex flex-col gap-3">
              {followUp.opts.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleFollowUp(opt.label)}
                  className="flex items-center gap-3.5 px-4 py-4 rounded-3xl border-2 border-orange-100 bg-white text-left transition-all duration-150 cursor-pointer active:scale-95 hover:border-orange-300 hover:bg-orange-50"
                >
                  <span className="text-[22px] leading-none shrink-0">{opt.emoji}</span>
                  <span className="text-[14px] font-semibold text-on-surface">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
