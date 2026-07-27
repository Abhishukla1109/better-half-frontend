interface Props {
  rating: number;
  count?: number | null;
  className?: string;
}

function formatCount(count: number): string {
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : `${count}`;
}

export default function RatingPill({ rating, count, className = "" }: Props) {
  const reviewLabel = count ? formatCount(count) : null;
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="flex items-center gap-1 bg-amber-400/15 border border-amber-400/25 rounded-full px-2 py-0.5">
        <span className="text-amber-500 text-label leading-none">★</span>
        <span className="text-label font-bold text-amber-700">{rating.toFixed(1)}</span>
      </span>
      {reviewLabel && <span className="text-icon text-on-surface-variant/40">({reviewLabel})</span>}
    </div>
  );
}
