export default function InsightsPage() {
  const dimensions = [
    { name: "Energy", icon: "bolt" },
    { name: "Gut", icon: "gastroenterology" },
    { name: "Hormones", icon: "monitoring" },
    { name: "Immunity", icon: "shield" },
    { name: "Mind", icon: "psychology" },
    { name: "Sleep", icon: "bedtime" },
  ];

  return (
    <div className="px-6 pt-8 lg:pt-12 lg:px-10">
      <h1 className="text-2xl lg:text-3xl font-extrabold text-primary tracking-tight font-[family-name:var(--font-manrope)]">
        Insights
      </h1>
      <p className="text-on-surface-variant mt-2 mb-8">
        Your longitudinal health picture.
      </p>

      {/* Health dimension dials: 3 cols mobile, 6 on desktop */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 lg:gap-4">
        {dimensions.map((dim) => (
          <div
            key={dim.name}
            className="flex flex-col items-center gap-2 p-4 lg:p-6 bg-surface-container-lowest rounded-xl shadow-sm"
          >
            <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-surface-container-low flex items-center justify-center">
              <span className="material-symbols-outlined text-outline-variant">
                {dim.icon}
              </span>
            </div>
            <span className="text-xs font-semibold text-on-surface-variant">
              {dim.name}
            </span>
            <span className="text-lg font-bold text-outline-variant">—</span>
          </div>
        ))}
      </div>

      {/* Check-in history placeholder */}
      <div className="mt-8 p-6 lg:p-8 bg-surface-container-lowest rounded-xl shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4">
          Check-in History
        </h2>
        <p className="text-sm text-outline-variant">
          Start checking in daily to see your 30-day trend heatmap here.
        </p>
      </div>
    </div>
  );
}
