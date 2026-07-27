"use client";

import { useState } from "react";
import { Camera } from "lucide-react";

interface MealPhotoCardProps {
  mealType: string;
  onPhotoTap: () => void;
  onTextSubmit: (text: string) => void;
  delay?: number;
}

export default function MealPhotoCard({ mealType, onPhotoTap, onTextSubmit, delay = 0 }: MealPhotoCardProps) {
  const [text, setText] = useState("");

  return (
    <div
      className="feed-card p-5 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-label font-semibold uppercase tracking-[0.5px] text-on-surface-variant/50 mb-2">
        Diet &middot; {mealType}
      </p>
      <p className="text-base text-on-surface leading-relaxed">
        What did {mealType.toLowerCase()} look like today?
      </p>

      {/* Camera capture area */}
      <button
        onClick={onPhotoTap}
        className="mt-3 w-full py-8 rounded-2xl border-2 border-dashed border-outline-variant/25 bg-surface-container-low/50 flex flex-col items-center gap-2 cursor-pointer hover:bg-surface-container-low hover:border-primary-container/25 transition-all duration-200"
      >
        <div className="w-12 h-12 rounded-full bg-primary-fixed/15 flex items-center justify-center">
          <Camera className="w-6 h-6 text-primary-container" strokeWidth={1.5} />
        </div>
        <span className="text-sm text-on-surface-variant">Snap a quick photo</span>
      </button>

      {/* Text fallback */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-on-surface-variant/40">or describe it:</span>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim()) {
              onTextSubmit(text.trim());
              setText("");
            }
          }}
          className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/30 outline-none border-b border-outline-variant/15 pb-0.5"
          placeholder="dal, rice, salad..."
        />
      </div>
    </div>
  );
}
