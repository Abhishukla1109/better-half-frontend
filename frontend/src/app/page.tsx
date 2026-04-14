import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="w-full min-h-dvh hero-gradient flex flex-col relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-20%] w-[300px] h-[300px] rounded-full bg-primary-container/30 blur-[80px]" />
      <div className="absolute bottom-[20%] left-[-10%] w-[250px] h-[250px] rounded-full bg-primary/40 blur-[100px]" />

      {/* Content shell */}
      <div className="relative z-10 flex flex-col min-h-dvh px-6 sm:px-8 pt-12 sm:pt-16 pb-12 max-w-7xl mx-auto w-full">
        {/* Logo */}
        <div className="mb-8 lg:mb-12">
          <span className="text-2xl font-extrabold tracking-tight text-white font-[family-name:var(--font-manrope)]">
            BetterHalf
          </span>
        </div>

        {/* Two-column layout on desktop */}
        <div className="flex-grow flex flex-col lg:flex-row lg:items-center lg:gap-16 xl:gap-24">
          {/* Left column: Hero text + CTAs */}
          <div className="flex-1 flex flex-col justify-center lg:max-w-xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white leading-[1.1] tracking-tight mb-6 font-[family-name:var(--font-manrope)]">
              The AI that truly knows your body.
            </h1>
            <p className="text-lg lg:text-xl text-primary-fixed leading-relaxed opacity-90 mb-10 max-w-md">
              Personalised health protocols — powered by 6.5M real Indian health
              journeys.
            </p>

            {/* CTA — desktop only (inline) */}
            <div className="hidden lg:block max-w-md">
              <Link
                href="/auth"
                className="bg-primary-fixed hover:bg-white text-on-primary-fixed font-bold py-5 px-8 rounded-xl flex justify-between items-center transition-all duration-300 group shadow-lg shadow-black/10"
              >
                <span className="text-lg">Start my health journey</span>
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>

          {/* Right column: Trust block + Testimonial */}
          <div className="flex-1 lg:max-w-md xl:max-w-lg">
            {/* Trust block */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="glass-card rounded-xl p-4 lg:p-6 flex flex-col gap-2">
                <span className="material-symbols-outlined text-primary-fixed">
                  groups
                </span>
                <div>
                  <p className="text-white font-bold text-lg lg:text-2xl leading-none">
                    6.5M
                  </p>
                  <p className="text-primary-fixed/70 text-xs uppercase tracking-widest font-medium">
                    Users
                  </p>
                </div>
              </div>
              <div className="glass-card rounded-xl p-4 lg:p-6 flex flex-col gap-2">
                <span className="material-symbols-outlined text-primary-fixed">
                  stethoscope
                </span>
                <div>
                  <p className="text-white font-bold text-lg lg:text-2xl leading-none">
                    150+
                  </p>
                  <p className="text-primary-fixed/70 text-xs uppercase tracking-widest font-medium">
                    Doctors
                  </p>
                </div>
              </div>
              <div className="glass-card rounded-xl p-4 lg:p-6 col-span-2 flex items-center gap-4">
                <span className="material-symbols-outlined text-primary-fixed">
                  history
                </span>
                <div>
                  <p className="text-white font-bold text-lg lg:text-2xl leading-none">
                    5 Years
                  </p>
                  <p className="text-primary-fixed/70 text-xs uppercase tracking-widest font-medium">
                    Real Clinical Data
                  </p>
                </div>
              </div>
            </div>

            {/* Testimonial */}
            <div className="bg-primary-fixed/10 border-l-2 border-primary-fixed/30 p-6 rounded-r-2xl relative">
              <span
                className="material-symbols-outlined absolute top-4 right-4 text-primary-fixed/40 text-xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                format_quote
              </span>
              <p className="text-primary-fixed text-sm lg:text-base italic leading-relaxed">
                &ldquo;BetterHalf felt like it actually understood my gut issues
                without me having to explain the clinical terms.&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-10 mb-24 lg:mb-0 text-center lg:text-left">
          <p className="text-[10px] text-primary-fixed/40 uppercase tracking-[0.2em] font-medium">
            Powered by Mosaic Wellness
          </p>
        </footer>
      </div>

      {/* Sticky floating CTA — mobile only */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-[#004034] via-[#004034]/90 to-transparent pt-10">
        <Link
          href="/auth"
          className="w-full bg-primary-fixed hover:bg-white text-on-primary-fixed font-bold py-5 px-8 rounded-xl flex justify-between items-center transition-all duration-300 group shadow-lg shadow-black/20"
        >
          <span className="text-lg">Start my health journey</span>
          <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </Link>
      </div>
    </main>
  );
}
