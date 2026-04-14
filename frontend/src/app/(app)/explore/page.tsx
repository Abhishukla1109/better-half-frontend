export default function ExplorePage() {
  return (
    <div className="px-6 pt-8 lg:pt-12 lg:px-10">
      <h1 className="text-2xl lg:text-3xl font-extrabold text-primary tracking-tight font-[family-name:var(--font-manrope)]">
        Explore
      </h1>
      <p className="text-on-surface-variant mt-2 mb-8">
        AI-curated products for your health journey.
      </p>

      {/* Responsive product grid: 2 cols mobile, 3 on md, 4 on lg */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface-container-lowest rounded-xl p-4 shadow-sm"
          >
            <div className="w-full aspect-square bg-surface-container-low rounded-lg mb-3" />
            <div className="h-3 bg-surface-container-low rounded w-3/4 mb-2" />
            <div className="h-3 bg-surface-container-low rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
