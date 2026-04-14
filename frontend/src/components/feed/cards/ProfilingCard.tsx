"use client";

interface ProfilingOption {
  label: string;
  value: string;
}

interface ProfilingCardProps {
  question: string;
  reason?: string;
  options: ProfilingOption[];
  onSelect: (value: string) => void;
  onSkip?: () => void;
  layout?: "row" | "grid";
  delay?: number;
}

export default function ProfilingCard({
  question,
  reason,
  options,
  onSelect,
  onSkip,
  layout = "row",
  delay = 0,
}: ProfilingCardProps) {
  return (
    <div
      className="feed-card-ai p-5 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-base text-on-surface leading-relaxed">{question}</p>
      {reason && (
        <p className="text-xs text-on-surface-variant/60 mt-1">{reason}</p>
      )}
      <div
        className={`mt-3 ${
          layout === "grid"
            ? "grid grid-cols-2 gap-2"
            : "flex flex-wrap gap-2"
        }`}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="chip-option min-h-[44px] px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/15 text-sm font-medium text-on-surface hover:bg-primary-fixed/15 hover:border-primary-container/25 cursor-pointer text-left transition-colors duration-200"
          >
            {opt.label}
          </button>
        ))}
      </div>
      {/* Skip / opt-out — spec Section 3.5 */}
      {onSkip && (
        <button
          onClick={onSkip}
          className="mt-3 text-xs text-on-surface-variant/50 cursor-pointer hover:text-on-surface-variant transition-colors"
        >
          Rather not say
        </button>
      )}
    </div>
  );
}
