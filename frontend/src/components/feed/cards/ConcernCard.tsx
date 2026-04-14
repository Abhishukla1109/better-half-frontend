"use client";

import { useState } from "react";

interface ConcernCardProps {
  onSelect: (concerns: string[]) => void;
  onTextSubmit: (text: string) => void;
  maxSelections?: number;
}

const concerns = [
  "Hair / beard",
  "Skin / acne",
  "Energy / gut",
  "Weight",
  "Hormones",
  "Sleep / mind",
  "Just curious",
];

export default function ConcernCard({ onSelect, onTextSubmit, maxSelections = 4 }: ConcernCardProps) {
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const toggleChip = (label: string) => {
    setPicked((prev) => {
      if (prev.includes(label)) return prev.filter((c) => c !== label);
      if (prev.length >= maxSelections) return prev;
      return [...prev, label];
    });
  };

  const handleSubmit = () => {
    if (picked.length === 0) return;
    setSubmitted(true);
    onSelect(picked);
  };

  const handleTextSubmit = (value: string) => {
    setSubmitted(true);
    setPicked([value]);
    onTextSubmit(value);
  };

  const handleEdit = () => {
    setSubmitted(false);
  };

  return (
    <div className="feed-card-ai p-5 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
      <p className="text-base text-on-surface leading-relaxed">
        What would you most like to fix or improve about your health?
        <span className="text-on-surface-variant text-sm ml-1">(pick up to {maxSelections})</span>
      </p>

      {!submitted ? (
        <>
          {/* Free text input */}
          <div className="mt-4">
            <div className="flex items-center gap-2 bg-surface-container-low rounded-xl px-4 py-3 border border-outline-variant/15">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && text.trim()) {
                    handleTextSubmit(text.trim());
                  }
                }}
                placeholder="Type freely..."
                className="flex-1 bg-transparent text-base text-on-surface placeholder:text-on-surface-variant/40 outline-none"
              />
              {text.trim() && (
                <button
                  onClick={() => handleTextSubmit(text.trim())}
                  className="text-sm font-semibold text-primary cursor-pointer hover:text-primary-container transition-colors"
                >
                  Send
                </button>
              )}
            </div>
          </div>

          {/* Concern chips — multi-select */}
          <p className="text-xs text-on-surface-variant/60 mt-4 mb-2 uppercase tracking-wider font-semibold">
            or pick the closest
          </p>
          <div className="grid grid-cols-2 gap-2">
            {concerns.map((label) => {
              const isSelected = picked.includes(label);
              const isDisabled = !isSelected && picked.length >= maxSelections;
              return (
                <button
                  key={label}
                  onClick={() => toggleChip(label)}
                  disabled={isDisabled}
                  className={`chip-option flex items-center gap-2 min-h-[44px] px-4 py-3 rounded-xl text-sm font-medium cursor-pointer text-left transition-all duration-200 ${
                    isSelected
                      ? "bg-primary-container text-on-primary-container border border-primary-container"
                      : isDisabled
                      ? "bg-surface-container-low border border-outline-variant/10 text-on-surface-variant/30 cursor-not-allowed"
                      : "bg-surface-container-low border border-outline-variant/15 text-on-surface hover:bg-primary-fixed/15 hover:border-primary-container/25"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Continue button — appears when at least 1 is selected */}
          {picked.length > 0 && (
            <button
              onClick={handleSubmit}
              className="mt-4 w-full py-3 rounded-xl bg-primary-container text-sm font-semibold text-on-primary-container cursor-pointer hover:bg-primary transition-colors duration-200 animate-fade-in-up"
            >
              Continue with {picked.length} concern{picked.length > 1 ? "s" : ""}
            </button>
          )}
        </>
      ) : (
        <div className="mt-3 flex items-center gap-2 animate-fade-in-up flex-wrap">
          {picked.map((c) => (
            <span
              key={c}
              className="inline-block px-4 py-2.5 rounded-xl bg-primary-container/15 border border-primary-container/20 text-sm font-semibold text-primary-container"
            >
              {c}
            </span>
          ))}
          <button
            onClick={handleEdit}
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
