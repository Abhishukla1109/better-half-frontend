interface Props {
  pct: number;
  minPct?: number;
}

export default function DiscountBadge({ pct, minPct = 5 }: Props) {
  if (pct < minPct) return null;
  return (
    <span className="absolute top-2 left-2 bg-primary-container text-white text-2xs font-extrabold px-1.5 py-0.5 rounded-md leading-none">
      {pct}% OFF
    </span>
  );
}
