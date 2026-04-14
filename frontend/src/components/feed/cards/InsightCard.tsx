"use client";

import { Sparkles } from "lucide-react";

interface InsightCardProps {
  content: string;
  followUp?: string;
  pillarTag?: string;
  children?: React.ReactNode;
  delay?: number;
}

export default function InsightCard({ content, followUp, pillarTag, children, delay = 0 }: InsightCardProps) {
  return (
    <div
      className="feed-card-ai p-5 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {pillarTag && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-on-surface-variant/50 mb-2">
          {pillarTag}
        </p>
      )}
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-container/15 shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-primary-container" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-on-surface leading-relaxed">{content}</p>
          {followUp && (
            <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">{followUp}</p>
          )}
        </div>
      </div>
      {children && <div className="mt-4 pl-9">{children}</div>}
    </div>
  );
}
