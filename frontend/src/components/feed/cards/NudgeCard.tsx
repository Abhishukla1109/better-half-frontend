"use client";

interface NudgeOption {
  label: string;
  value: string;
}

interface NudgeCardProps {
  question: string;
  options: NudgeOption[];
  onSelect: (value: string) => void;
  pillarTag?: string;
  delay?: number;
}

export default function NudgeCard({
  question,
  options,
  onSelect,
  pillarTag,
  delay = 0,
}: NudgeCardProps) {
  return (
    <div
      className="feed-card p-5 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {pillarTag && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-on-surface-variant/50 mb-2">
          {pillarTag}
        </p>
      )}
      <p className="text-base text-on-surface leading-relaxed">{question}</p>
      <div className="flex flex-wrap gap-2 mt-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="chip-option px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/15 text-sm font-medium text-on-surface hover:bg-primary-fixed/15 hover:border-primary-container/25 cursor-pointer transition-colors duration-200"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
