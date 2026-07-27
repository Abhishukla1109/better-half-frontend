import Link from 'next/link';

export default function AIProtocolBanner() {
  return (
    <section className="py-10 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-gradient-to-br from-[#004f54] to-[#01696f] rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 overflow-hidden relative">
          {/* Background blobs */}
          <div className="absolute top-[-20%] right-[-5%] w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-[-30%] left-[30%] w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex-1 text-white relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-5 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Powered by BetterHalf AI
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold leading-tight mb-4">
              Get your personalized<br />health protocol in 60 seconds
            </h2>
            <p className="text-white/80 text-base leading-relaxed mb-8 max-w-lg">
              Tell us your goal. Our AI analyzes your profile against 6.5M real health journeys and builds you a protocol — not a product list.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/home"
                className="px-7 py-3.5 bg-white text-brand font-extrabold rounded-xl hover:bg-white/90 active:scale-95 transition-all"
              >
                Start free assessment →
              </Link>
              <Link
                href="/explore"
                className="px-7 py-3.5 bg-white/15 text-white font-semibold rounded-xl hover:bg-white/25 border border-white/20 backdrop-blur-sm active:scale-95 transition-all"
              >
                Browse products
              </Link>
            </div>
          </div>

          <div className="flex-shrink-0 grid grid-cols-2 gap-3 relative z-10">
            {[
              { icon: '💇', label: 'Hair Loss', detail: 'Protocol ready' },
              { icon: '✨', label: 'Skin Glow', detail: 'Protocol ready' },
              { icon: '⚡', label: 'Energy', detail: 'Protocol ready' },
              { icon: '😴', label: 'Sleep', detail: 'Protocol ready' },
            ].map(item => (
              <div key={item.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 flex flex-col items-center gap-2 w-28 border border-white/10">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs font-bold text-white">{item.label}</span>
                <span className="text-icon text-white/60 bg-white/10 rounded-full px-2 py-0.5">{item.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
