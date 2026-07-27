"use client";

import { useState } from "react";

interface NudgeOption {
  label: string;
  value: string;
}

interface NudgeCardProps {
  question: string;
  options: NudgeOption[];
  onSelect: (value: string) => void;
  pillarTag?: string;
  delay?: number;
}

export default function NudgeCard({
  question,
  options,
  onSelect,
  pillarTag,
  delay = 0,
}: NudgeCardProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (value: string) => {
    setSelected(value);
    onSelect(value);
  };

  const selectedLabel = options.find((o) => o.value === selected)?.label;

  return (
    <div
      className="feed-card p-5 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {pillarTag && (
        <p className="text-label font-semibold uppercase tracking-[0.5px] text-on-surface-variant/50 mb-2">
          {pillarTag}
        </p>
      )}
      <p className="text-base text-on-surface leading-relaxed">{question}</p>

      {!selected ? (
        <div className="flex flex-wrap gap-2 mt-3">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className="chip-option px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/15 text-sm font-medium text-on-surface hover:border-primary-container/40 cursor-pointer transition-colors duration-200"
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 animate-fade-in-up">
          <span className="inline-block px-4 py-2.5 rounded-xl bg-primary-container/15 border border-primary-container/20 text-sm font-semibold text-primary-container">
            {selectedLabel}
          </span>
          <button
            onClick={() => setSelected(null)}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-container-low cursor-pointer transition-colors"
            aria-label="Edit selection"
          >
            <svg className="w-3.5 h-3.5 text-on-surface-variant/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}
