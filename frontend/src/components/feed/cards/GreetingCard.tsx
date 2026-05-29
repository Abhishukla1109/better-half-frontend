"use client";

import { Heart } from "lucide-react";

interface GreetingCardProps {
  name: string;
  contextLine?: string;
  children?: React.ReactNode;
}

export default function GreetingCard({ name, contextLine, children }: GreetingCardProps) {
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="feed-card-ai p-5 animate-fade-in-up">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg, #004034 0%, #15594a 100%)" }}>
          <Heart className="w-4 h-4 text-white" strokeWidth={2} fill="white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold text-primary font-[family-name:var(--font-manrope)] leading-tight">
            {timeGreeting}{name ? `, ${name}` : ""}.
          </h1>
          {contextLine && (
            <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
              {contextLine}
            </p>
          )}
        </div>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
