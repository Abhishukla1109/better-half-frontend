"use client";

import { useState } from "react";

interface ProfilingOption {
  label: string;
  value: string;
  emoji?: string;
}

interface ProfilingCardProps {
  question: string;
  reason?: string;
  options: ProfilingOption[];
  onSelect: (value: string) => void;
  onSkip?: () => void;
  layout?: "row" | "grid";
  delay?: number;
}

export default function ProfilingCard({
  question,
  reason,
  options,
  onSelect,
  onSkip,
  layout = "row",
  delay = 0,
}: ProfilingCardProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (value: string) => {
    setSelected(value);
    onSelect(value);
  };

  const handleSkip = () => {
    setSelected("skipped");
    onSkip?.();
  };

  const selectedOption = options.find((o) => o.value === selected);
  const selectedLabel = selected === "skipped" ? "Rather not say" : selectedOption?.label;
  const selectedEmoji = selectedOption?.emoji;

  return (
    <div
      className="feed-card-ai p-5 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-base text-on-surface leading-relaxed">{question}</p>
      {reason && !selected && (
        <p className="text-xs text-on-surface-variant/60 mt-1">{reason}</p>
      )}

      {!selected ? (
        <>
          <div
            className={`mt-3 ${
              layout === "grid"
                ? "grid grid-cols-2 gap-2"
                : "flex flex-wrap gap-2"
            }`}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`chip-option rounded-xl bg-surface-container-low border border-outline-variant/15 text-sm font-medium text-on-surface hover:border-primary-container/40 cursor-pointer text-left transition-colors duration-200 ${
                  opt.emoji && layout === "grid"
                    ? "flex flex-col items-start gap-1.5 px-4 pt-4 pb-3 min-h-[84px]"
                    : "min-h-[44px] px-4 py-2.5"
                }`}
              >
                {opt.emoji && layout === "grid" && (
                  <span className="text-2xl leading-none">{opt.emoji}</span>
                )}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
          {onSkip && (
            <button
              onClick={handleSkip}
              className="mt-3 text-xs text-on-surface-variant/50 cursor-pointer hover:text-on-surface-variant transition-colors"
            >
              Rather not say
            </button>
          )}
        </>
      ) : (
        <div className="mt-3 flex items-center gap-2 animate-fade-in-up">
          <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-container/15 border border-primary-container/20 text-sm font-semibold text-primary-container">
            {selectedEmoji && <span className="text-base leading-none">{selectedEmoji}</span>}
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
