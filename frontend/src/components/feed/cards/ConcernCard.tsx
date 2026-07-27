"use client";

import { useState } from "react";
import { getGenderedConcernImage } from "@/data/images";

interface ConcernCardProps {
  onSelect: (concerns: string[]) => void;
  onTextSubmit: (text: string) => void;
  sex?: string;
  maxSelections?: number;
}

interface ConcernDef {
  key: string;    // Stored in profile — never changes (protocol engine depends on this)
  label: string;  // Display label — gender-aware
}

function getConcernDefs(sex?: string): ConcernDef[] {
  const isFemale = sex === "female";
  return [
    { key: "Hair / beard",  label: isFemale ? "Hair health"              : "Hair & beard"             },
    { key: "Skin / acne",   label: "Skin & acne"                                                       },
    { key: "Energy / gut",  label: "Energy & gut"                                                      },
    { key: "Weight",        label: "Weight & body"                                                     },
    { key: "Hormones",      label: isFemale ? "PCOS & hormones"          : "Testosterone & hormones"  },
    { key: "Sleep / mind",  label: "Sleep & mind"                                                      },
    { key: "Just curious",  label: "Just curious"                                                      },
  ];
}

export default function ConcernCard({ onSelect, onTextSubmit, sex, maxSelections = 4 }: ConcernCardProps) {
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string[]>([]);   // stores keys
  const [submitted, setSubmitted] = useState(false);

  const concerns = getConcernDefs(sex);

  const toggleChip = (key: string) => {
    setPicked((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= maxSelections) return prev;
      return [...prev, key];
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

  const handleEdit = () => setSubmitted(false);

  return (
    <div className="feed-card-ai p-5 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
      <p className="text-base text-on-surface leading-relaxed">
        What would you most like to fix or improve about your health?
        <span className="text-on-surface-variant text-sm ml-1">(pick up to {maxSelections})</span>
      </p>

      {!submitted ? (
        <>
          {/* Free text */}
          <div className="mt-4">
            <div className="flex items-center gap-2 bg-surface-container-low rounded-xl px-4 py-3 border border-outline-variant/15">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) handleTextSubmit(text.trim()); }}
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

          <p className="text-xs text-on-surface-variant/60 mt-4 mb-2 uppercase tracking-wider font-semibold">
            or pick the closest
          </p>

          {/* Concern grid */}
          <div className="grid grid-cols-2 gap-2">
            {concerns.map(({ key, label }) => {
              const isSelected  = picked.includes(key);
              const isDisabled  = !isSelected && picked.length >= maxSelections;
              const img         = key === "Just curious" ? undefined : getGenderedConcernImage(key, sex);
              return (
                <button
                  key={key}
                  onClick={() => toggleChip(key)}
                  disabled={isDisabled}
                  className={`chip-option relative flex items-end min-h-[72px] rounded-xl overflow-hidden cursor-pointer text-left transition-all duration-200 ${
                    isSelected
                      ? "ring-2 ring-primary-container"
                      : isDisabled
                      ? "opacity-40 cursor-not-allowed"
                      : "ring-1 ring-outline-variant/10 hover:ring-primary-container/40"
                  }`}
                >
                  {img ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-surface-container-low" />
                  )}
                  <span className={`relative z-10 px-3 pb-2.5 text-body font-semibold leading-tight ${
                    img ? "text-white" : isSelected ? "text-primary-container" : "text-on-surface"
                  }`}>
                    {label}
                  </span>
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary-container flex items-center justify-center z-10">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {picked.length > 0 && (
            <button
              onClick={handleSubmit}
              className="mt-4 w-full py-3 rounded-xl bg-primary-container text-sm font-semibold text-white cursor-pointer hover:bg-primary transition-colors duration-200 animate-fade-in-up"
            >
              Continue with {picked.length} concern{picked.length > 1 ? "s" : ""}
            </button>
          )}
        </>
      ) : (
        <div className="mt-3 flex items-center gap-2 animate-fade-in-up flex-wrap">
          {picked.map((key) => {
            const def = concerns.find((c) => c.key === key);
            const img = key === "Just curious" ? undefined : getGenderedConcernImage(key, sex);
            return (
              <div
                key={key}
                className="flex items-center rounded-xl bg-primary-container/15 border border-primary-container/20 overflow-hidden"
              >
                {img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="" className="w-10 h-10 object-cover shrink-0" />
                )}
                <span className="px-3 py-2 text-sm font-semibold text-primary-container">
                  {def?.label ?? key}
                </span>
              </div>
            );
          })}
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
