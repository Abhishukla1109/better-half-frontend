"use client";

import { useState } from "react";
import { Check, X, AlertTriangle, ShoppingCart } from "lucide-react";
import { shopifyStoreUrl } from "@/lib/shopify-url";

interface Supplement {
  name: string;
  brand: string;
  timing: string;
}

interface SupplementCardProps {
  supplements: Supplement[];
  dayCount: number;
  onAction: (name: string, action: "taken" | "missed" | "ran_out") => void;
  delay?: number;
}

export default function SupplementCard({ supplements, dayCount, onAction, delay = 0 }: SupplementCardProps) {
  const [completed, setCompleted] = useState<Record<string, string>>({});
  const [supplyLevel, setSupplyLevel] = useState(75); // percentage

  const handleAction = (name: string, action: "taken" | "missed" | "ran_out") => {
    setCompleted((prev) => ({ ...prev, [name]: action }));
    onAction(name, action);
  };

  const allDone = supplements.length > 0 && supplements.every((s) => completed[s.name]);
  const daysLeft = Math.round((supplyLevel / 100) * 30);

  return (
    <div
      className="feed-card p-5 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-on-surface-variant/50">
          Diet &middot; morning protocol
        </p>
        <span className="text-xs text-primary-container font-semibold">Day {dayCount}</span>
      </div>

      <div className="space-y-3">
        {supplements.map((sup) => {
          const state = completed[sup.name];
          return (
            <div key={sup.name}>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${state === "taken" ? "text-primary-container" : "text-on-surface"}`}>
                    {sup.name}
                  </p>
                  <p className="text-xs text-on-surface-variant/50">{sup.brand} &middot; {sup.timing}</p>
                </div>

                {!state ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(sup.name, "taken")}
                      className="flex items-center gap-1.5 min-w-[44px] min-h-[44px] px-3 rounded-xl bg-primary-fixed/15 text-xs font-semibold text-primary-container hover:bg-primary-fixed/25 cursor-pointer transition-colors justify-center"
                    >
                      <Check className="w-4 h-4" strokeWidth={2} />
                      Taken
                    </button>
                    <button
                      onClick={() => handleAction(sup.name, "missed")}
                      className="flex items-center gap-1.5 min-w-[44px] min-h-[44px] px-3 rounded-xl bg-surface-container-low text-xs font-medium text-on-surface-variant hover:bg-surface-container-high cursor-pointer transition-colors justify-center"
                    >
                      <X className="w-4 h-4" strokeWidth={2} />
                      Missed
                    </button>
                    <button
                      onClick={() => handleAction(sup.name, "ran_out")}
                      className="flex items-center gap-1.5 min-w-[44px] min-h-[44px] px-3 rounded-xl bg-surface-container-low text-xs font-medium text-on-surface-variant hover:bg-surface-container-high cursor-pointer transition-colors justify-center"
                    >
                      <AlertTriangle className="w-4 h-4" strokeWidth={2} />
                      Ran out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setCompleted((prev) => {
                      const next = { ...prev };
                      delete next[sup.name];
                      return next;
                    })}
                    className={`text-xs font-semibold px-4 min-h-[44px] flex items-center gap-2 rounded-xl cursor-pointer hover:opacity-80 transition-opacity ${
                      state === "taken"
                        ? "bg-primary-fixed/15 text-primary-container"
                        : state === "ran_out"
                        ? "bg-tertiary-fixed/15 text-tertiary-container"
                        : "bg-surface-container-low text-on-surface-variant"
                    }`}
                  >
                    {state === "taken" ? "Taken" : state === "ran_out" ? "Ran out" : "Missed"}
                    <span className="text-[10px] font-normal opacity-50">Edit</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Streak note when all done */}
      {allDone && (
        <p className="text-xs text-primary-container font-medium mt-3 animate-fade-in-up">
          All done! That&apos;s consistency building.
        </p>
      )}

      {/* Supply tracker */}
      <div className="mt-5 pt-4 border-t border-outline-variant/10">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-on-surface-variant">How&apos;s the supply?</p>
          <p className="text-xs text-on-surface-variant/50">~{daysLeft} days left</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-on-surface-variant/40 shrink-0">Plenty</span>
          <input
            type="range"
            min={0}
            max={100}
            value={supplyLevel}
            onChange={(e) => setSupplyLevel(Number(e.target.value))}
            className="flex-1 h-2 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-container [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary-container [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--color-primary-container) ${supplyLevel}%, var(--color-surface-container-high) ${supplyLevel}%)`,
            }}
            aria-label="Supply level"
          />
          <span className="text-[11px] text-on-surface-variant/40 shrink-0">Almost out</span>
        </div>

        {/* Reorder CTA when low */}
        {supplyLevel <= 25 && (
          <a
            href={shopifyStoreUrl() || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-tertiary-container/15 text-sm font-semibold text-tertiary-container cursor-pointer hover:bg-tertiary-container/25 transition-colors animate-fade-in-up"
          >
            <ShoppingCart className="w-4 h-4" strokeWidth={1.5} />
            Reorder now
          </a>
        )}
      </div>
    </div>
  );
}
