interface UserMessageCardProps {
  message: string;
  timestamp?: string;
}

export default function UserMessageCard({ message, timestamp }: UserMessageCardProps) {
  return (
    <div className="feed-card-user p-4 animate-fade-in-up">
      <p className="text-sm text-on-surface leading-relaxed">{message}</p>
      {timestamp && (
        <p className="text-[11px] text-on-surface-variant/40 mt-1 text-right">{timestamp}</p>
      )}
    </div>
  );
}
