"use client";

import Link from "next/link";
import { useState } from "react";
import { useAutoScroll } from "@/hooks/useAutoScroll";

type Diet = "vegetarian" | "non-veg" | "vegan" | "eggetarian" | null;
type Sleep = "poor" | "variable" | "good" | null;
type Activity = "sedentary" | "light" | "active" | "athlete" | null;

const dietOptions: { value: Diet; label: string }[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "non-veg", label: "Non-vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "eggetarian", label: "Eggetarian" },
];

const sleepOptions: { value: Sleep; label: string }[] = [
  { value: "poor", label: "Rarely good" },
  { value: "variable", label: "Hit or miss" },
  { value: "good", label: "Mostly fine" },
];

const activityOptions: { value: Activity; label: string }[] = [
  { value: "sedentary", label: "Desk-bound" },
  { value: "light", label: "Light activity" },
  { value: "active", label: "Regularly active" },
  { value: "athlete", label: "Athlete" },
];

export default function LifestylePage() {
  const [diet, setDiet] = useState<Diet>(null);
  const [sleep, setSleep] = useState<Sleep>(null);
  const [activity, setActivity] = useState<Activity>(null);

  const { ref: sleepRef, scrollToNext: scrollToSleep } = useAutoScroll();
  const { ref: activityRef, scrollToNext: scrollToActivity } = useAutoScroll();
  const { ref: ctaRef, scrollToNext: scrollToCta } = useAutoScroll();

  const isValid = diet !== null && sleep !== null && activity !== null;

  return (
    <>
      {/* Header */}
      <header className="flex justify-between items-center w-full px-6 py-6 bg-surface relative z-10">
        <Link
          href="/onboarding/concern"
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-primary">
            arrow_back
          </span>
        </Link>
        <span className="text-on-surface-variant font-semibold text-sm tracking-widest uppercase">
          Step 3 of 4
        </span>
        <div className="w-10" />
      </header>

      <div className="px-6 lg:px-8 pt-4 pb-32 lg:pb-8 flex-grow overflow-y-auto hide-scrollbar relative z-10">
        {/* Headline */}
        <section className="mb-10">
          <h1 className="text-[32px] leading-tight font-extrabold text-primary mb-2 tracking-tight font-[family-name:var(--font-manrope)]">
            Tell us about your day-to-day
          </h1>
          <p className="text-on-surface-variant text-lg">
            3 quick answers — no forms.
          </p>
        </section>

        {/* Section 1: Diet Type */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary-container">
              restaurant
            </span>
            <h2 className="text-sm font-semibold text-primary uppercase tracking-widest">
              Diet Type
            </h2>
          </div>
          <div className="space-y-3">
            {dietOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setDiet(opt.value); scrollToSleep(); }}
                className={`group w-full relative flex items-center p-5 rounded-xl border-l-4 cursor-pointer transition-all duration-300 shadow-sm active:scale-[0.98] ${
                  diet === opt.value
                    ? "bg-primary-container text-white border-primary shadow-lg shadow-primary/10"
                    : "bg-surface-container-lowest border-transparent hover:border-primary"
                }`}
              >
                <div className="flex-grow">
                  <h3
                    className={`font-bold ${diet === opt.value ? "text-white" : "text-on-surface"}`}
                  >
                    {opt.label}
                  </h3>
                </div>
                <span
                  className={`material-symbols-outlined ${
                    diet === opt.value
                      ? "text-white"
                      : "text-outline-variant group-hover:text-primary"
                  }`}
                  style={
                    diet === opt.value
                      ? { fontVariationSettings: "'FILL' 1" }
                      : undefined
                  }
                >
                  {diet === opt.value
                    ? "check_circle"
                    : "radio_button_unchecked"}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Section 2: Sleep Quality */}
        <section className="mb-10" ref={sleepRef}>
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary-container">
              bedtime
            </span>
            <h2 className="text-sm font-semibold text-primary uppercase tracking-widest">
              Sleep Quality
            </h2>
          </div>
          <div className="flex overflow-x-auto gap-3 pb-2 hide-scrollbar lg:flex-wrap">
            {sleepOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setSleep(opt.value); scrollToActivity(); }}
                className={`whitespace-nowrap px-6 py-3 rounded-full font-medium transition-colors cursor-pointer ${
                  sleep === opt.value
                    ? "bg-primary-fixed text-on-primary-fixed font-bold border-2 border-primary-container"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-primary-fixed hover:text-on-primary-fixed"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Section 3: Activity Level */}
        <section className="mb-10" ref={activityRef}>
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary-container">
              fitness_center
            </span>
            <h2 className="text-sm font-semibold text-primary uppercase tracking-widest">
              Activity Level
            </h2>
          </div>
          <div className="flex overflow-x-auto gap-3 pb-2 hide-scrollbar lg:flex-wrap">
            {activityOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setActivity(opt.value); scrollToCta(); }}
                className={`whitespace-nowrap px-6 py-3 rounded-full font-medium transition-colors cursor-pointer ${
                  activity === opt.value
                    ? "bg-primary-fixed text-on-primary-fixed font-bold border-2 border-primary-container"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-primary-fixed hover:text-on-primary-fixed"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* AI Context Card */}
        <div ref={ctaRef} className="mt-4 p-6 glass-card-light rounded-[24px] flex gap-4 items-start border border-primary-fixed/30">
          <span className="material-symbols-outlined text-primary-container mt-1">
            auto_awesome
          </span>
          <p className="text-sm text-primary leading-relaxed">
            Our AI uses these patterns to calculate your{" "}
            <span className="font-bold">Biological Rhythm</span> and metabolic
            baseline.
          </p>
        </div>

        {/* Desktop inline CTA */}
        <div className="hidden lg:block mt-10">
          <Link
            href="/home"
            className={`inline-flex py-4 px-12 bg-primary text-on-primary rounded-xl font-bold text-lg items-center gap-3 shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all active:scale-[0.98] ${
              !isValid ? "opacity-40 pointer-events-none" : ""
            }`}
            aria-disabled={!isValid}
            tabIndex={!isValid ? -1 : undefined}
          >
            Analyze my profile
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* Mobile sticky footer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-4 pt-8 bg-gradient-to-t from-surface via-surface to-transparent">
        <div className="max-w-[430px] mx-auto">
          <Link
            href="/home"
            className={`w-full h-16 bg-primary text-on-primary rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all ${
              !isValid ? "opacity-40 pointer-events-none" : ""
            }`}
            aria-disabled={!isValid}
            tabIndex={!isValid ? -1 : undefined}
          >
            Analyze my profile
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
      </div>
    </>
  );
}
