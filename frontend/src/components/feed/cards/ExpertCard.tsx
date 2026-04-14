"use client";

import { Sparkles, Star, Clock } from "lucide-react";

interface ExpertCardProps {
  reason: string;
  doctorName: string;
  specialty: string;
  rating: number;
  consultCount: string;
  price: number;
  duration: string;
  nextSlot?: string;
  delay?: number;
}

export default function ExpertCard({
  reason,
  doctorName,
  specialty,
  rating,
  consultCount,
  price,
  duration,
  nextSlot,
  delay = 0,
}: ExpertCardProps) {
  return (
    <div
      className="feed-card-expert p-5 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* AI reasoning */}
      <div className="flex items-start gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-primary-container shrink-0 mt-0.5" strokeWidth={1.5} />
        <p className="text-sm text-on-surface leading-relaxed">{reason}</p>
      </div>

      {/* Doctor card */}
      <div className="bg-surface-container-lowest/80 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          {/* Avatar placeholder */}
          <div className="w-12 h-12 rounded-full bg-primary-fixed/20 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-primary-container">
              {doctorName.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-on-surface">{doctorName}</p>
            <p className="text-xs text-on-surface-variant">{specialty}</p>

            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex items-center gap-0.5 text-xs text-on-surface-variant">
                <Star className="w-3 h-3 text-tertiary-container fill-tertiary-container" />
                {rating}
              </span>
              <span className="text-xs text-on-surface-variant/50">{consultCount} consults</span>
            </div>

            {nextSlot && (
              <div className="flex items-center gap-1 mt-1.5">
                <Clock className="w-3 h-3 text-on-surface-variant/50" strokeWidth={1.5} />
                <span className="text-xs text-on-surface-variant">Next: {nextSlot}</span>
              </div>
            )}
          </div>
        </div>

        {/* Book CTA */}
        <button className="mt-3 w-full py-2.5 rounded-xl bg-primary-container text-sm font-semibold text-on-primary-container cursor-pointer hover:bg-primary transition-colors duration-200">
          Book &middot; &#8377;{price} &middot; {duration}
        </button>
      </div>

      {/* Maybe later */}
      <button className="mt-3 text-xs text-on-surface-variant/50 cursor-pointer hover:text-on-surface-variant transition-colors">
        Maybe later
      </button>
    </div>
  );
}
