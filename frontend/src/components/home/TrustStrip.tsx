const STATS = [
  { icon: '👥', value: '6.5M+', label: 'Users' },
  { icon: '🩺', value: '150+', label: 'Doctors' },
  { icon: '⭐', value: '4.8/5', label: 'Rating' },
  { icon: '🏆', value: '5 Years', label: 'of Data' },
  { icon: '🔬', value: '100%', label: 'Clinically Backed' },
  { icon: '📦', value: 'Free', label: 'Delivery ₹499+' },
];

export default function TrustStrip() {
  return (
    <div className="bg-brand py-4">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between gap-4 overflow-x-auto scrollbar-hide">
          {STATS.map(s => (
            <div key={s.label} className="flex items-center gap-2.5 flex-shrink-0">
              <span className="text-xl">{s.icon}</span>
              <div>
                <p className="text-white font-extrabold text-sm leading-none">{s.value}</p>
                <p className="text-white/60 text-label leading-none mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
