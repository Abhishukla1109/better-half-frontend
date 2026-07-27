interface Props {
  score: number;
  minScore?: number;
}

export default function MatchScoreBadge({ score, minScore = 70 }: Props) {
  if (score < minScore) return null;
  return (
    <div className="absolute top-2 right-2 bg-amber-500 text-white rounded-full px-2 py-1 flex flex-col items-center leading-none">
      <span className="text-label font-extrabold tabular-nums">{score}%</span>
      <span className="text-[7px] font-bold opacity-80">match</span>
    </div>
  );
}
