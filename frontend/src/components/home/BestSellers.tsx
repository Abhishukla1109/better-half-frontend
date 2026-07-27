'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useRef } from 'react';
import { useCatalogProducts } from '@/hooks/useCatalogProducts';

export default function BestSellers() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { products, loading } = useCatalogProducts();
  const bestsellers = products.filter(p => p.image && p.mrp > p.price).slice(0, 12);

  function scroll(dir: 'left' | 'right') {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
  }

  return (
    <section className="py-10 bg-surface-teal">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-on-dark">🏆 Bestsellers</h2>
            <p className="text-sm text-gray-500 mt-0.5">Trusted by millions across India</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              className="w-9 h-9 rounded-full border border-border-light bg-white flex items-center justify-center hover:border-brand transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-9 h-9 rounded-full border border-border-light bg-white flex items-center justify-center hover:border-brand transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory"
        >
          {loading && (
            <div className="flex gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-48 h-64 bg-white rounded-2xl border border-border-light animate-pulse" />
              ))}
            </div>
          )}
          {bestsellers.map((p, i) => (
            <Link
              key={p.id}
              href={`/product/${p.id}`}
              className="flex-shrink-0 w-48 snap-start group"
            >
              <div className="bg-white rounded-2xl border border-border-light overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="relative aspect-square bg-surface-teal">
                  {i < 3 && (
                    <span className="absolute top-2 left-2 z-10 bg-amber-500 text-white text-icon font-bold px-2 py-0.5 rounded-full">
                      #{i + 1} Best
                    </span>
                  )}
                  {p.image && (
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      unoptimized
                      sizes="192px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-icon font-bold text-brand uppercase tracking-wide">{p.brand}</p>
                  <p className="text-xs font-semibold text-on-dark line-clamp-2 leading-snug mt-0.5">{p.name}</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <div className="flex">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={9} className={s <= 4 ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
                      ))}
                    </div>
                    <span className="text-icon text-gray-400">(4.0)</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-sm font-extrabold text-brand">₹{p.price.toLocaleString('en-IN')}</span>
                    {p.mrp > p.price && (
                      <span className="text-icon text-gray-400 line-through">₹{p.mrp.toLocaleString('en-IN')}</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
