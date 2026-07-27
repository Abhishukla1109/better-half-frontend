import Link from 'next/link';

const CATEGORIES = [
  { key: 'hair', emoji: '💇', label: 'Hair', color: 'bg-surface-teal', href: '/explore?filter=hair' },
  { key: 'skin', emoji: '✨', label: 'Skin', color: 'bg-[#f5eafa]', href: '/explore?filter=skin' },
  { key: 'energy', emoji: '⚡', label: 'Energy', color: 'bg-[#fff8e7]', href: '/explore?filter=energy' },
  { key: 'sleep', emoji: '😴', label: 'Sleep', color: 'bg-[#ede8f5]', href: '/explore?filter=sleep' },
  { key: 'fitness', emoji: '💪', label: 'Fitness', color: 'bg-[#e8f6ef]', href: '/explore?filter=fitness' },
  { key: 'hormones', emoji: '🌸', label: 'Hormones', color: 'bg-[#fff0ec]', href: '/explore?filter=hormones' },
  { key: 'gut', emoji: '🫁', label: 'Gut Health', color: 'bg-[#fff3e8]', href: '/explore?filter=gut' },
  { key: 'kids', emoji: '👶', label: 'Kids', color: 'bg-[#fef3c7]', href: '/explore?filter=kids' },
  { key: 'wellness', emoji: '🌿', label: 'Wellness', color: 'bg-surface-teal', href: '/explore?filter=wellness' },
  { key: 'mind', emoji: '🧠', label: 'Mind', color: 'bg-[#e8eef8]', href: '/explore?filter=mind' },
];

export default function ShopByCategory() {
  return (
    <section className="py-10 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-xl md:text-2xl font-extrabold text-on-dark mb-6">Shop by Category</h2>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.key}
              href={cat.href}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={`w-full aspect-square ${cat.color} rounded-2xl flex items-center justify-center text-2xl md:text-3xl transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-md`}>
                {cat.emoji}
              </div>
              <span className="text-label font-semibold text-gray-700 text-center leading-tight">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
