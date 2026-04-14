"use client";

import Link from "next/link";
import { useState } from "react";
import { useAutoScroll } from "@/hooks/useAutoScroll";

type Sex = "male" | "female" | "undisclosed" | null;
type LifeStage = "student" | "working" | "parent" | "senior" | null;
type AgeRange = "18-24" | "25-34" | "35-44" | "45-59" | "60+" | null;

const sexOptions: { value: Sex; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "undisclosed", label: "Prefer not to say" },
];

const lifeStageOptions: { value: LifeStage; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "working", label: "Working Professional" },
  { value: "parent", label: "Parent" },
  { value: "senior", label: "Senior" },
];

const ageOptions: AgeRange[] = ["18-24", "25-34", "35-44", "45-59", "60+"];

export default function IdentityPage() {
  const [sex, setSex] = useState<Sex>(null);
  const [lifeStage, setLifeStage] = useState<LifeStage>(null);
  const [ageRange, setAgeRange] = useState<AgeRange>(null);

  const { ref: lifeStageRef, scrollToNext: scrollToLifeStage } = useAutoScroll();
  const { ref: ageRef, scrollToNext: scrollToAge } = useAutoScroll();
  const { ref: ctaRef, scrollToNext: scrollToCta } = useAutoScroll();

  const isValid = sex !== null && lifeStage !== null && ageRange !== null;

  return (
    <>
      {/* Header */}
      <header className="flex justify-between items-center w-full px-6 py-6 bg-surface relative z-10">
        <Link
          href="/auth"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-primary">
            arrow_back
          </span>
        </Link>
        <span className="text-sm font-semibold tracking-wider text-on-surface-variant uppercase">
          Step 1 of 4
        </span>
        <div className="w-10" />
      </header>

      <main className="px-6 pb-32 lg:pb-8 flex-grow relative z-10">
        {/* Headline */}
        <h1 className="text-3xl font-[800] leading-tight tracking-tight text-primary mt-4 mb-6 font-[family-name:var(--font-manrope)]">
          Who are we building this for?
        </h1>

        {/* AI Signal Bar */}
        <div className="bg-primary-container rounded-xl p-4 mb-8 flex items-center gap-3 shadow-lg shadow-primary-container/10">
          <span
            className="material-symbols-outlined text-primary-fixed"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            auto_awesome
          </span>
          <p className="text-sm text-on-primary-container font-medium leading-relaxed">
            AI pre-seeding from 6.5M profiles — we already have a head start
          </p>
        </div>

        {/* Selection 1: Biological Sex */}
        <section className="mb-10">
          <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 px-1">
            Biological Sex
          </label>
          <div className="space-y-3">
            {sexOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setSex(opt.value); scrollToLifeStage(); }}
                className={`w-full text-left p-5 rounded-xl flex justify-between items-center transition-all duration-200 shadow-sm cursor-pointer ${
                  sex === opt.value
                    ? "bg-surface-container-lowest border-2 border-primary"
                    : "bg-surface-container-lowest hover:bg-primary-fixed border-2 border-transparent"
                }`}
              >
                <span className="text-lg font-semibold text-primary">
                  {opt.label}
                </span>
                <span
                  className={`material-symbols-outlined text-primary ${
                    sex === opt.value ? "" : "opacity-0"
                  }`}
                  style={
                    sex === opt.value
                      ? { fontVariationSettings: "'FILL' 1" }
                      : undefined
                  }
                >
                  check_circle
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Selection 2: Life Stage */}
        <section className="mb-10" ref={lifeStageRef}>
          <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 px-1">
            Life Stage
          </label>
          <div className="flex flex-wrap gap-3">
            {lifeStageOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setLifeStage(opt.value); scrollToAge(); }}
                className={`px-5 py-3 rounded-full font-semibold transition-colors cursor-pointer ${
                  lifeStage === opt.value
                    ? "bg-primary text-on-primary shadow-md"
                    : "bg-surface-container-low text-primary hover:bg-primary-fixed"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Selection 3: Age Range */}
        <section className="mb-12" ref={ageRef}>
          <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 px-1">
            Age Range
          </label>
          <div className="overflow-x-auto hide-scrollbar -mx-6 px-6 lg:mx-0 lg:px-0">
            <div className="flex gap-3 pb-2 lg:flex-wrap">
              {ageOptions.map((age) => (
                <button
                  key={age}
                  onClick={() => { setAgeRange(age); scrollToCta(); }}
                  className={`flex-shrink-0 px-6 py-3 rounded-full font-semibold transition-colors cursor-pointer ${
                    ageRange === age
                      ? "bg-primary text-on-primary shadow-md"
                      : "bg-surface-container-low text-primary hover:bg-primary-fixed"
                  }`}
                >
                  {age}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Desktop inline CTA */}
        <div className="hidden lg:block" ref={ctaRef}>
          <Link
            href="/onboarding/concern"
            className={`inline-flex py-4 px-12 bg-primary text-on-primary rounded-xl font-bold text-lg shadow-xl shadow-primary/20 hover:scale-[0.98] transition-all text-center ${
              !isValid ? "opacity-40 pointer-events-none" : ""
            }`}
            aria-disabled={!isValid}
            tabIndex={!isValid ? -1 : undefined}
          >
            Continue
          </Link>
        </div>
      </main>

      {/* Mobile sticky footer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-4 pt-8 bg-gradient-to-t from-surface via-surface to-transparent">
        <div className="max-w-[430px] mx-auto">
          <Link
            href="/onboarding/concern"
            className={`block w-full py-4 bg-primary text-on-primary rounded-xl font-bold text-lg shadow-xl shadow-primary/20 active:scale-[0.98] transition-all text-center ${
              !isValid ? "opacity-40 pointer-events-none" : ""
            }`}
            aria-disabled={!isValid}
            tabIndex={!isValid ? -1 : undefined}
          >
            Continue
          </Link>
        </div>
      </div>
    </>
  );
}
