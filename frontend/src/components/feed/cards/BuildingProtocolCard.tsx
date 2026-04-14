"use client";

import { useState, useEffect } from "react";

interface BuildingProtocolCardProps {
  onComplete: () => void;
  delay?: number;
}

const steps = [
  "Analysing your concerns...",
  "Matching against 6.5M health profiles...",
  "Identifying nutrient gaps...",
  "Building your protocol...",
];

export default function BuildingProtocolCard({ onComplete, delay = 0 }: BuildingProtocolCardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    if (activeStep < steps.length) {
      const timer = setTimeout(() => setActiveStep((s) => s + 1), 900);
      return () => clearTimeout(timer);
    } else {
      const finish = setTimeout(() => {
        setDone(true);
        onComplete();
      }, 500);
      return () => clearTimeout(finish);
    }
  }, [activeStep, done, onComplete]);

  return (
    <div
      className="feed-card-ai p-5 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Pulsing AI indicator */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative w-10 h-10 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary-container/20 animate-ping" style={{ animationDuration: "1.5s" }} />
          <div className="relative w-8 h-8 rounded-full bg-primary-container/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-primary-container" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            </svg>
          </div>
        </div>
        <p className="text-sm font-semibold text-primary-container">
          Building your protocol
        </p>
      </div>

      {/* Step list */}
      <div className="space-y-3 pl-2">
        {steps.map((step, i) => {
          const isActive = i === activeStep;
          const isComplete = i < activeStep;

          return (
            <div
              key={step}
              className={`flex items-center gap-3 transition-opacity duration-300 ${
                isComplete || isActive ? "opacity-100" : "opacity-20"
              }`}
            >
              {/* Status indicator */}
              {isComplete ? (
                <div className="w-5 h-5 rounded-full bg-primary-container/20 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-primary-container" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
              ) : isActive ? (
                <div className="w-5 h-5 rounded-full border-2 border-primary-container/40 border-t-primary-container shrink-0 animate-spin" style={{ animationDuration: "0.8s" }} />
              ) : (
                <div className="w-5 h-5 rounded-full bg-surface-container-high/50 shrink-0" />
              )}

              <span className={`text-sm transition-colors duration-300 ${
                isComplete ? "text-on-surface-variant" : isActive ? "text-on-surface font-medium" : "text-on-surface-variant/40"
              }`}>
                {step}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-5 h-1 bg-surface-container-high rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-container rounded-full transition-all duration-700 ease-out"
          style={{ width: `${(activeStep / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
