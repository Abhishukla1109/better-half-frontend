interface Props {
  badge: { label: string; style: string } | null;
}

export default function TrustBadge({ badge }: Props) {
  if (!badge) return null;
  return (
    <span className={`inline-block text-icon font-bold px-2 py-0.5 rounded-full mb-1.5 leading-none ${badge.style}`}>
      {badge.label}
    </span>
  );
}
