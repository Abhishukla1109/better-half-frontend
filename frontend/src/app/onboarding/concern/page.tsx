"use client";

import Link from "next/link";
import { useState } from "react";

const nutritionTags = [
  "Not eating right",
  "Protein intake",
  "Gut / digestion",
  "Weight management",
];

const symptomTags = [
  "Low energy",
  "Hormones / PCOS",
  "Hair & skin",
  "Sleep problems",
  "Stress / anxiety",
];

export default function ConcernPage() {
  const [text, setText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, tag];
    });
  }

  const isValid = text.length >= 10 || selectedTags.length > 0;

  return (
    <>
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-6 w-full relative z-10">
        <Link
          href="/onboarding/identity"
          aria-label="Go back"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-primary">
            arrow_back
          </span>
        </Link>
        <span className="text-sm font-semibold tracking-widest text-on-surface-variant uppercase">
          Step 2 of 4
        </span>
        <div className="w-10" />
      </header>

      {/* Content */}
      <div className="flex-grow px-6 pt-4 pb-32 lg:pb-8 overflow-y-auto relative z-10">
        {/* Headline */}
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-primary leading-[1.1] tracking-tight mb-3 font-[family-name:var(--font-manrope)]">
            What brings you here?
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed">
            Your words, not our categories. Hindi, Hinglish, English — all fine.
          </p>
        </div>

        {/* AI Listening indicator */}
        <div className="flex items-center gap-2 mb-4 px-1">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-fixed opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
          </div>
          <span className="text-xs font-bold tracking-widest uppercase text-primary/80">
            AI is listening…
          </span>
        </div>

        {/* Free text input */}
        <div className="relative mb-12">
          <textarea
            className="w-full p-6 text-xl bg-surface-container-low border-none rounded-2xl placeholder:text-on-surface-variant/40 focus:ring-0 focus:bg-surface-container-lowest transition-all shadow-sm outline-none resize-none"
            placeholder="e.g. Always tired, no energy, gut issues, not sure what to eat…"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="absolute bottom-4 right-4 text-on-surface-variant/20">
            <span className="material-symbols-outlined">edit_note</span>
          </div>
        </div>

        {/* Suggestion tags */}
        <div className="space-y-6">
          {/* Nutrition row */}
          <div>
            <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-on-surface-variant/60 mb-3 px-1">
              Nutrition Focus
            </h3>
            <div className="flex flex-wrap gap-2">
              {nutritionTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-4 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95 cursor-pointer ${
                    selectedTags.includes(tag)
                      ? "bg-primary text-on-primary shadow-md"
                      : "border border-primary/20 text-primary hover:bg-primary-fixed/30"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Symptom row */}
          <div>
            <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-on-surface-variant/60 mb-3 px-1">
              Symptoms & Vitality
            </h3>
            <div className="flex flex-wrap gap-2">
              {symptomTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-4 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95 cursor-pointer ${
                    selectedTags.includes(tag)
                      ? "bg-primary text-on-primary shadow-md"
                      : "border border-primary/20 text-primary hover:bg-primary-fixed/30"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop inline CTA */}
        <div className="hidden lg:block mt-12">
          <Link
            href="/onboarding/lifestyle"
            className={`inline-flex py-4 px-12 bg-primary text-on-primary rounded-2xl font-bold text-lg shadow-xl shadow-primary/10 active:scale-[0.98] transition-all text-center ${
              !isValid ? "opacity-40 pointer-events-none" : ""
            }`}
            aria-disabled={!isValid}
            tabIndex={!isValid ? -1 : undefined}
          >
            Continue
          </Link>
        </div>
      </div>

      {/* Mobile sticky footer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-4 pt-8 bg-gradient-to-t from-surface via-surface to-transparent">
        <div className="max-w-[430px] mx-auto">
          <Link
            href="/onboarding/lifestyle"
            className={`block w-full bg-primary text-on-primary py-5 rounded-2xl font-bold text-lg shadow-xl shadow-primary/10 active:scale-[0.98] transition-all text-center ${
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
