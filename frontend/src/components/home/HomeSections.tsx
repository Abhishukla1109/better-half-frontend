'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { useCatalogProducts } from '@/hooks/useCatalogProducts';
import type { Product } from '@/lib/protocolEngine';

// ── Hero Carousel ─────────────────────────────────────────────

import { useEffect, useCallback } from 'react';

const SLIDES = [
  { id: 1, bg: 'from-[#004f54] to-[#017a80]', emoji: '🧬', eyebrow: 'AI-Powered Health', headline: 'Your protocol,\nbuilt in 60 seconds', sub: 'Science-backed supplements personalized by AI.', cta: { label: 'Build My Protocol', href: '/home#ai' }, ctaColor: '#004f54' },
  { id: 2, bg: 'from-[#5b21b6] to-[#7c3aed]', emoji: '🌸', eyebrow: 'Be Bodywise', headline: 'Hair, skin & hormones\nfixed from within', sub: 'Doctor-formulated for women. Backed by science.', cta: { label: 'Shop Be Bodywise', href: '/explore?filter=hair' }, ctaColor: '#5b21b6' },
  { id: 3, bg: 'from-[#b45309] to-[#f59e0b]', emoji: '👶', eyebrow: 'Little Joys', headline: 'Give your kids the\nbest nutrition', sub: 'Tasty supplements trusted by 1M+ families.', cta: { label: 'Shop Little Joys', href: '/explore?filter=kids' }, ctaColor: '#b45309' },
];

export function HeroCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const next = useCallback(() => setActive(i => (i + 1) % SLIDES.length), []);
  const prev = useCallback(() => setActive(i => (i - 1 + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 4000);
    return () => clearInterval(id);
  }, [paused, next]);

  const s = SLIDES[active];
  return (
    <div className={`relative bg-gradient-to-br ${s.bg} rounded-2xl mx-4 overflow-hidden transition-all duration-500`}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="px-5 py-7 flex items-center gap-4">
        <div className="flex-1 text-white">
          <div className="text-label font-bold uppercase tracking-widest opacity-70 mb-2">{s.eyebrow}</div>
          <h2 className="text-xl font-extrabold leading-tight whitespace-pre-line mb-2">{s.headline}</h2>
          <p className="text-white/75 text-xs leading-relaxed mb-4">{s.sub}</p>
          <Link href={s.cta.href}
            className="inline-block px-5 py-2.5 bg-white font-bold text-xs rounded-xl active:scale-95 transition-transform"
            style={{ color: s.ctaColor }}>
            {s.cta.label} →
          </Link>
        </div>
        <div className="flex-shrink-0 w-20 h-20 bg-white/15 rounded-2xl flex items-center justify-center text-4xl">
          {s.emoji}
        </div>
      </div>
      {/* Prev/Next */}
      <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white" aria-label="Previous"><ChevronLeft size={14} /></button>
      <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white" aria-label="Next"><ChevronRight size={14} /></button>
      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => setActive(i)}
            className={`h-1 rounded-full transition-all ${i === active ? 'w-5 bg-white' : 'w-1 bg-white/40'}`}
            aria-label={`Slide ${i + 1}`} />
        ))}
      </div>
    </div>
  );
}

// ── Category Grid ─────────────────────────────────────────────

const CATS = [
  { key: 'hair', emoji: '💇', label: 'Hair', bg: 'bg-surface-teal' },
  { key: 'skin', emoji: '✨', label: 'Skin', bg: 'bg-[#f5eafa]' },
  { key: 'energy', emoji: '⚡', label: 'Energy', bg: 'bg-[#fff8e7]' },
  { key: 'sleep', emoji: '😴', label: 'Sleep', bg: 'bg-[#ede8f5]' },
  { key: 'fitness', emoji: '💪', label: 'Fitness', bg: 'bg-[#e8f6ef]' },
  { key: 'hormones', emoji: '🌸', label: 'Hormones', bg: 'bg-[#fff0ec]' },
  { key: 'gut', emoji: '🫁', label: 'Gut', bg: 'bg-[#fff3e8]' },
  { key: 'kids', emoji: '👶', label: 'Kids', bg: 'bg-[#fef3c7]' },
];

export function CategoryGrid() {
  return (
    <div className="px-4">
      <h2 className="text-base font-extrabold text-on-dark mb-3">Shop by concern</h2>
      <div className="grid grid-cols-4 gap-2.5">
        {CATS.map(c => (
          <Link key={c.key} href={`/explore?filter=${c.key}`}
            className="flex flex-col items-center gap-1.5 group">
            <div className={`w-full aspect-square ${c.bg} rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:-translate-y-0.5 group-active:scale-95`}>
              {c.emoji}
            </div>
            <span className="text-label font-semibold text-gray-700 text-center">{c.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Spotlight Tabs ────────────────────────────────────────────

const SPOTLIGHT_TABS = [
  { key: 'hair', label: '💇 Hair' },
  { key: 'skin', label: '✨ Skin' },
  { key: 'wellness', label: '🌿 Wellness' },
  { key: 'kids', label: '👶 Kids' },
];

export function SpotlightSection() {
  const [tab, setTab] = useState('hair');
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const { products: allProducts, loading } = useCatalogProducts();

  const products = allProducts
    .filter(p => p.concern.includes(tab) && p.image)
    .slice(0, 8);

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-extrabold text-on-dark">Today&apos;s Spotlight</h2>
        <Link href="/explore" className="text-xs font-semibold text-brand">View all →</Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {SPOTLIGHT_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              tab === t.key ? 'bg-on-dark text-white border-on-dark' : 'bg-white text-gray-700 border-border-light'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Horizontal scroll */}
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
        {loading && [...Array(4)].map((_, i) => (
          <div key={i} className="flex-shrink-0 w-40 h-56 rounded-2xl bg-white border border-border-light animate-pulse" />
        ))}
        {!loading && products.map(p => (
          <SpotlightCard key={p.id} product={p}
            wishlisted={wishlist.has(p.id)}
            onWishlist={() => setWishlist(prev => { const n = new Set(prev); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })} />
        ))}
        {!loading && products.length === 0 && (
          <p className="text-sm text-gray-400 py-4">No products in this category yet.</p>
        )}
      </div>
    </div>
  );
}

function SpotlightCard({ product: p, wishlisted, onWishlist }: { product: Product; wishlisted: boolean; onWishlist: () => void }) {
  const discountPct = p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;

  return (
    <div className="flex-shrink-0 w-40 snap-start bg-white rounded-2xl border border-border-light overflow-hidden group hover:shadow-md transition-shadow">
      <Link href={`/product/${p.id}`} className="relative block aspect-square bg-surface-teal overflow-hidden">
        {discountPct > 0 && (
          <span className="absolute top-1.5 left-1.5 z-10 bg-red-500 text-white text-2xs font-bold px-1.5 py-0.5 rounded">
            {discountPct}% off
          </span>
        )}
        <button onClick={e => { e.preventDefault(); onWishlist(); }}
          className={`absolute top-1.5 right-1.5 z-10 w-6 h-6 flex items-center justify-center rounded-full transition-all
            ${wishlisted ? 'bg-red-50 text-red-500' : 'bg-white/80 text-gray-400 opacity-0 group-hover:opacity-100'}`}>
          <Heart size={11} fill={wishlisted ? 'currentColor' : 'none'} />
        </button>
        {p.image && (
          <Image src={p.image} alt={p.name} fill unoptimized sizes="160px"
            className="object-cover group-hover:scale-105 transition-transform duration-300" />
        )}
      </Link>
      <div className="p-3">
        <p className="text-icon font-bold text-brand uppercase tracking-wide">{p.brand}</p>
        <Link href={`/product/${p.id}`}>
          <p className="text-label font-semibold text-on-dark line-clamp-2 leading-snug mt-0.5 mb-2">{p.name}</p>
        </Link>
        <div className="flex items-center gap-1 mb-2">
          <span className="text-sm font-extrabold text-brand">₹{p.price.toLocaleString('en-IN')}</span>
          {p.mrp > p.price && (
            <span className="text-icon text-gray-400 line-through">₹{p.mrp.toLocaleString('en-IN')}</span>
          )}
        </div>
        <Link href={`/product/${p.id}`}
          className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl text-label font-bold bg-brand text-white hover:bg-brand-hover active:scale-95 transition-all">
          View
        </Link>
      </div>
    </div>
  );
}

// ── Bestsellers ───────────────────────────────────────────────

export function BestSellersStrip() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { products, loading } = useCatalogProducts();
  const bestsellers = products.filter(p => p.image && p.mrp > p.price).slice(0, 10);

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-extrabold text-on-dark">🏆 Bestsellers</h2>
        <Link href="/explore" className="text-xs font-semibold text-brand">View all →</Link>
      </div>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
        {loading && [...Array(5)].map((_, i) => (
          <div key={i} className="flex-shrink-0 w-36 h-48 rounded-2xl bg-white border border-border-light animate-pulse" />
        ))}
        {bestsellers.map((p, i) => (
          <Link key={p.id} href={`/product/${p.id}`}
            className="flex-shrink-0 w-36 snap-start bg-white rounded-2xl border border-border-light overflow-hidden hover:shadow-md transition-shadow group">
            <div className="relative aspect-square bg-surface-teal">
              {i < 3 && (
                <span className="absolute top-1.5 left-1.5 z-10 bg-amber-500 text-white text-2xs font-bold px-1.5 py-0.5 rounded-full">
                  #{i + 1} Best
                </span>
              )}
              {p.image && (
                <Image src={p.image} alt={p.name} fill unoptimized sizes="144px"
                  className="object-cover group-hover:scale-105 transition-transform duration-300" />
              )}
            </div>
            <div className="p-2.5">
              <p className="text-icon font-bold text-brand uppercase">{p.brand}</p>
              <p className="text-label font-semibold text-on-dark line-clamp-2 leading-snug mt-0.5">{p.name}</p>
              <div className="flex items-center gap-1 mt-1.5">
                <span className="text-xs font-extrabold text-brand">₹{p.price.toLocaleString('en-IN')}</span>
                {p.mrp > p.price && (
                  <span className="text-icon text-gray-400 line-through">₹{p.mrp.toLocaleString('en-IN')}</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
