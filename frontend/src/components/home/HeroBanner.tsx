'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SLIDES = [
  {
    id: 1,
    eyebrow: 'AI-Personalized Health',
    headline: 'Your body deserves\na protocol built for it',
    sub: 'Answer 3 questions. Get a science-backed supplement plan in 60 seconds.',
    cta: { label: 'Build My Protocol', href: '/home' },
    ctaSecondary: { label: 'Shop All', href: '/explore' },
    bg: 'from-[#004f54] to-[#017a80]',
    accent: '#e8f5f5',
    badge: '6.5M+ users',
    emoji: '🧬',
  },
  {
    id: 2,
    eyebrow: 'Be Bodywise',
    headline: 'Hair, skin & hormones —\nfixed from within',
    sub: 'Doctor-formulated supplements for women, backed by 5 years of real data.',
    cta: { label: 'Shop Be Bodywise', href: '/explore?filter=skin' },
    ctaSecondary: { label: 'View Hair Range', href: '/explore?filter=hair' },
    bg: 'from-[#5b21b6] to-[#7c3aed]',
    accent: '#f5eafa',
    badge: 'Bestseller',
    emoji: '🌸',
  },
  {
    id: 3,
    eyebrow: 'Little Joys',
    headline: 'Give your kids the\nbest start in life',
    sub: 'Tasty, science-backed nutrition for kids 2–14. Trusted by 1M+ families.',
    cta: { label: 'Shop Little Joys', href: '/explore?filter=kids' },
    ctaSecondary: { label: 'View NutriMix', href: '/explore?filter=kids' },
    bg: 'from-[#b45309] to-[#d97706]',
    accent: '#fff8e7',
    badge: '#1 Kids Nutrition',
    emoji: '👶',
  },
  {
    id: 4,
    eyebrow: 'Man Matters',
    headline: 'Performance, energy\nand confidence — restored',
    sub: 'Clinically proven hair and wellness protocols for men who want results.',
    cta: { label: 'Shop Man Matters', href: '/explore' },
    ctaSecondary: { label: 'Free Assessment', href: '/home' },
    bg: 'from-[#1e3a5f] to-[#1d4ed8]',
    accent: '#e8eef8',
    badge: 'Doctor approved',
    emoji: '💪',
  },
];

export default function HeroBanner() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setActive(i => (i + 1) % SLIDES.length), []);
  const prev = useCallback(() => setActive(i => (i - 1 + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 4500);
    return () => clearInterval(id);
  }, [paused, next]);

  const slide = SLIDES[active];

  return (
    <div
      className={`relative bg-gradient-to-br ${slide.bg} overflow-hidden transition-all duration-700`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Decorative blobs */}
      <div className="absolute top-[-20%] right-[-10%] w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-5%] w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-5 py-12 md:py-16 lg:py-20 flex flex-col md:flex-row md:items-center gap-8">
        {/* Text */}
        <div className="flex-1 text-white">
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-4 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            {slide.eyebrow}
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-[1.15] mb-4 whitespace-pre-line">
            {slide.headline}
          </h2>

          <p className="text-white/80 text-base md:text-lg leading-relaxed mb-8 max-w-md">
            {slide.sub}
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href={slide.cta.href}
              className="px-6 py-3 bg-white text-[#004f54] font-bold rounded-xl hover:bg-white/90 transition-all text-sm md:text-base active:scale-95"
              style={{ color: slide.bg.includes('5b21b6') ? '#5b21b6' : slide.bg.includes('b45309') ? '#b45309' : slide.bg.includes('1e3a5f') ? '#1e3a5f' : '#004f54' }}
            >
              {slide.cta.label}
            </Link>
            <Link
              href={slide.ctaSecondary.href}
              className="px-6 py-3 bg-white/15 text-white font-semibold rounded-xl hover:bg-white/25 transition-all text-sm md:text-base border border-white/20 backdrop-blur-sm active:scale-95"
            >
              {slide.ctaSecondary.label}
            </Link>
          </div>
        </div>

        {/* Visual */}
        <div className="flex-shrink-0 flex items-center justify-center">
          <div
            className="w-40 h-40 md:w-56 md:h-56 rounded-3xl flex items-center justify-center text-8xl md:text-9xl shadow-2xl"
            style={{ background: slide.accent }}
          >
            {slide.emoji}
          </div>
        </div>
      </div>

      {/* Controls */}
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition-all"
        aria-label="Previous slide"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition-all"
        aria-label="Next slide"
      >
        <ChevronRight size={20} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === active ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
