"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const STEPS = [
  "Analysing your health profile",
  "Matching products to your concerns",
  "Building your protocol",
];

export default function ProtocolLoader({ message }: { message?: string }) {
  const [visibleSteps, setVisibleSteps] = useState(0);

  useEffect(() => {
    if (visibleSteps >= STEPS.length) return;
    const t = setTimeout(() => setVisibleSteps((v) => v + 1), 600);
    return () => clearTimeout(t);
  }, [visibleSteps]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-8">
      {/* Pulsing orb */}
      <div className="relative flex items-center justify-center w-20 h-20 mb-8">
        <div
          className="absolute inset-0 rounded-full opacity-20 animate-ping"
          style={{ background: "radial-gradient(circle, #93d3c0, #004034)", animationDuration: "1.4s" }}
        />
        <div className="absolute inset-2 rounded-full opacity-10" style={{ background: "#15594a" }} />
        <Sparkles className="relative w-8 h-8 text-primary-container" strokeWidth={1.5} />
      </div>

      {/* Steps */}
      <div className="space-y-3 w-full max-w-xs">
        {STEPS.map((step, i) => (
          <div
            key={step}
            className={`flex items-center gap-3 transition-all duration-500 ${
              i < visibleSteps ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-300 ${
              i < visibleSteps - 1 ? "bg-primary-container" : "bg-primary-container/40"
            }`} />
            <span className={`text-sm transition-colors duration-300 ${
              i < visibleSteps - 1
                ? "text-on-surface-variant/50 line-through"
                : i === visibleSteps - 1
                  ? "text-on-surface font-medium"
                  : "text-on-surface-variant/30"
            }`}>
              {step}
            </span>
          </div>
        ))}
      </div>

      {message && (
        <p className="mt-6 text-xs text-on-surface-variant/40 text-center animate-fade-in-up">
          {message}
        </p>
      )}
    </div>
  );
}
