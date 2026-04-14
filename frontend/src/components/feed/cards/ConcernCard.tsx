"use client";

import { useState } from "react";

interface ConcernCardProps {
  onSelect: (concern: string) => void;
  onTextSubmit: (text: string) => void;
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

export default function ConcernCard({ onSelect, onTextSubmit }: ConcernCardProps) {
  const [text, setText] = useState("");

  return (
    <div className="feed-card-ai p-5 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
      <p className="text-base text-on-surface leading-relaxed">
        What&apos;s the <span className="font-semibold">one thing</span> you&apos;d most like to fix or improve about your health?
      </p>

      {/* Free text input */}
      <div className="mt-4">
        <div className="flex items-center gap-2 bg-surface-container-low rounded-xl px-4 py-3 border border-outline-variant/15">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && text.trim()) {
                onTextSubmit(text.trim());
              }
            }}
            placeholder="Type freely..."
            className="flex-1 bg-transparent text-base text-on-surface placeholder:text-on-surface-variant/40 outline-none"
          />
          {text.trim() && (
            <button
              onClick={() => onTextSubmit(text.trim())}
              className="text-sm font-semibold text-primary cursor-pointer hover:text-primary-container transition-colors"
            >
              Send
            </button>
          )}
        </div>
      </div>

      {/* Concern chips */}
      <p className="text-xs text-on-surface-variant/60 mt-4 mb-2 uppercase tracking-wider font-semibold">
        or pick the closest
      </p>
      <div className="grid grid-cols-2 gap-2">
        {concerns.map((label) => (
          <button
            key={label}
            onClick={() => onSelect(label)}
            className="chip-option flex items-center gap-2 min-h-[44px] px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/15 text-sm font-medium text-on-surface hover:bg-primary-fixed/15 hover:border-primary-container/25 cursor-pointer text-left"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
