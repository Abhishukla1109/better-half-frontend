"use client";

import { Sparkles } from "lucide-react";

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
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-container/20 shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 text-primary-container" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold text-primary font-[family-name:var(--font-manrope)] leading-tight">
            {timeGreeting}, {name}.
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
