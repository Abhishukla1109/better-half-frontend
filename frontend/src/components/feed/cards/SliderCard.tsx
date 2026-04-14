"use client";

import { useState } from "react";

interface SliderCardProps {
  question: string;
  pillarTag?: string;
  leftLabel: string;
  rightLabel: string;
  steps?: number;
  onSelect: (value: number) => void;
  delay?: number;
}

export default function SliderCard({
  question,
  pillarTag,
  leftLabel,
  rightLabel,
  steps = 5,
  onSelect,
  delay = 0,
}: SliderCardProps) {
  const [value, setValue] = useState(Math.ceil(steps / 2));
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (v: number) => {
    setValue(v);
  };

  const handleSubmit = () => {
    setSubmitted(true);
    onSelect(value);
  };

  // Map value to a warm/cool tone for background
  const intensity = ((value - 1) / (steps - 1)) * 100;

  return (
    <div
      className="feed-card p-5 animate-fade-in-up transition-colors duration-300"
      style={{
        animationDelay: `${delay}ms`,
        background: submitted
          ? undefined
          : `linear-gradient(135deg, rgba(175,240,219,${0.03 + (1 - intensity / 100) * 0.07}) 0%, rgba(255,181,153,${0.03 + (intensity / 100) * 0.07}) 100%)`,
      }}
    >
      {pillarTag && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-on-surface-variant/50 mb-2">
          {pillarTag}
        </p>
      )}
      <p className="text-base text-on-surface leading-relaxed">{question}</p>

      <div className="mt-4">
        {!submitted ? (
          <>
            {/* Range slider */}
            <div className="px-1">
              <input
                type="range"
                min={1}
                max={steps}
                step={1}
                value={value}
                onChange={(e) => handleChange(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-container [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(21,89,74,0.3)] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-shadow [&::-webkit-slider-thumb]:duration-200
                  [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary-container [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-[0_0_8px_rgba(21,89,74,0.3)] [&::-moz-range-thumb]:cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--color-primary-container) ${intensity}%, var(--color-surface-container-high) ${intensity}%)`,
                }}
                aria-label={question}
                aria-valuemin={1}
                aria-valuemax={steps}
                aria-valuenow={value}
              />
            </div>
            <div className="flex justify-between mt-1.5 px-1">
              <span className="text-[11px] text-on-surface-variant/40">{leftLabel}</span>
              <span className="text-sm font-semibold text-primary-container">{value}/{steps}</span>
              <span className="text-[11px] text-on-surface-variant/40">{rightLabel}</span>
            </div>
            <button
              onClick={handleSubmit}
              className="mt-3 w-full py-2.5 rounded-xl bg-primary-fixed/15 text-sm font-semibold text-primary-container cursor-pointer hover:bg-primary-fixed/25 transition-colors duration-200"
            >
              Log it
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 py-2 animate-fade-in-up">
            <div className="flex gap-0.5">
              {Array.from({ length: steps }, (_, i) => (
                <div
                  key={i}
                  className={`w-6 h-2 rounded-full transition-colors ${
                    i < value ? "bg-primary-container" : "bg-surface-container-high"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-on-surface-variant/50 ml-2">Logged: {value}/{steps}</span>
          </div>
        )}
      </div>
    </div>
  );
}
