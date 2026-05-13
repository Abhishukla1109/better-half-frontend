import Link from 'next/link';

const BRANDS = [
  {
    name: 'Man Matters',
    tagline: 'Hair & wellness for men',
    emoji: '💈',
    color: 'from-[#1e3a5f] to-[#1d4ed8]',
    href: '/explore?brand=man-matters',
    count: '9 products',
  },
  {
    name: 'Be Bodywise',
    tagline: 'Science for women\'s health',
    emoji: '🌸',
    color: 'from-[#5b21b6] to-[#7c3aed]',
    href: '/explore?brand=be-bodywise',
    count: '24 products',
  },
  {
    name: 'Little Joys',
    tagline: 'Nutrition for kids & moms',
    emoji: '🌈',
    color: 'from-[#b45309] to-[#f59e0b]',
    href: '/explore?brand=little-joys',
    count: '40+ products',
  },
];

export default function BrandsRow() {
  return (
    <section className="py-10 bg-[#f7fafa]">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-xl md:text-2xl font-extrabold text-[#1a2e2e] mb-6">Our Brands</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BRANDS.map(b => (
            <Link
              key={b.name}
              href={b.href}
              className={`relative overflow-hidden bg-gradient-to-br ${b.color} rounded-2xl p-6 text-white group hover:-translate-y-1 hover:shadow-xl transition-all duration-200`}
            >
              <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="text-4xl mb-3">{b.emoji}</div>
              <h3 className="text-lg font-extrabold mb-1">{b.name}</h3>
              <p className="text-white/75 text-sm mb-3">{b.tagline}</p>
              <span className="inline-flex items-center gap-1 text-xs font-bold bg-white/20 rounded-full px-3 py-1">
                {b.count} →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
