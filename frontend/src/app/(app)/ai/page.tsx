export default function AIPage() {
  return (
    <div className="flex flex-col h-[calc(100dvh-68px)] lg:h-dvh">
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <span
            className="material-symbols-outlined text-primary text-3xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            auto_awesome
          </span>
          <h1 className="text-2xl font-extrabold text-primary tracking-tight font-[family-name:var(--font-manrope)]">
            AI Companion
          </h1>
        </div>
        <p className="text-on-surface-variant mt-2">
          Your personalised health assistant with full context.
        </p>
      </div>

      {/* Chat area placeholder */}
      <div className="flex-1 px-6 flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-outline-variant/30 mb-4 block">
            chat_bubble
          </span>
          <p className="text-on-surface-variant text-sm">
            AI chat coming soon. Ask about nutrition, protocols, or symptoms.
          </p>
        </div>
      </div>

      {/* Input placeholder */}
      <div className="px-6 pb-6">
        <div className="flex items-center gap-3 bg-surface-container-low rounded-2xl p-4">
          <input
            className="flex-1 bg-transparent border-none outline-none text-on-surface placeholder:text-outline-variant/60"
            placeholder="Ask me anything about your health…"
            disabled
          />
          <span className="material-symbols-outlined text-outline-variant">
            send
          </span>
        </div>
      </div>
    </div>
  );
}
