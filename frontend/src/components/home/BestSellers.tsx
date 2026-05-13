'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useRef } from 'react';
import { localProducts } from '@/lib/localProducts';

// Pick top products with images as "bestsellers"
const BESTSELLERS = localProducts
  .filter(p => p.image && p.available && p.discountPct > 0)
  .slice(0, 12);

export default function BestSellers() {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(dir: 'left' | 'right') {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
  }

  return (
    <section className="py-10 bg-[#f7fafa]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-[#1a2e2e]">🏆 Bestsellers</h2>
            <p className="text-sm text-[#6b7280] mt-0.5">Trusted by millions across India</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              className="w-9 h-9 rounded-full border border-[#e2e8e8] bg-white flex items-center justify-center hover:border-[#004f54] transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-9 h-9 rounded-full border border-[#e2e8e8] bg-white flex items-center justify-center hover:border-[#004f54] transition-colors"
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
          {BESTSELLERS.map((p, i) => (
            <Link
              key={p.id}
              href={`/product/${p.handle}`}
              className="flex-shrink-0 w-48 snap-start group"
            >
              <div className="bg-white rounded-2xl border border-[#e2e8e8] overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="relative aspect-square bg-[#f7fafa]">
                  {i < 3 && (
                    <span className="absolute top-2 left-2 z-10 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      #{i + 1} Best
                    </span>
                  )}
                  {p.image && (
                    <Image
                      src={p.image}
                      alt={p.title}
                      fill
                      unoptimized
                      sizes="192px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-[10px] font-bold text-[#004f54] uppercase tracking-wide">{p.brand}</p>
                  <p className="text-xs font-semibold text-[#1a2e2e] line-clamp-2 leading-snug mt-0.5">{p.title}</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <div className="flex">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={9} className={s <= 4 ? 'fill-amber-400 text-amber-400' : 'text-[#d1d5db]'} />
                      ))}
                    </div>
                    <span className="text-[10px] text-[#9ca3af]">(4.0)</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-sm font-extrabold text-[#004f54]">₹{p.price.toLocaleString('en-IN')}</span>
                    {p.compareAtPrice && (
                      <span className="text-[10px] text-[#9ca3af] line-through">₹{p.compareAtPrice.toLocaleString('en-IN')}</span>
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
