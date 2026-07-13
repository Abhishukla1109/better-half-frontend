'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ChevronRight } from 'lucide-react';
import { useCatalogProducts } from '@/hooks/useCatalogProducts';
import type { Product } from '@/lib/protocolEngine';

const TABS = [
  { key: 'hair', label: '💇 Hair' },
  { key: 'skin', label: '✨ Skin' },
  { key: 'wellness', label: '🌿 Wellness' },
  { key: 'kids', label: '👶 Kids' },
  { key: 'fitness', label: '💪 Fitness' },
];

export default function TodaySpotlight() {
  const [activeTab, setActiveTab] = useState('hair');
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const { products: allProducts, loading } = useCatalogProducts();

  const products = allProducts
    .filter(p => p.concern.includes(activeTab))
    .slice(0, 6);

  function toggleWishlist(id: string) {
    setWishlist(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <section className="py-10 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl md:text-2xl font-extrabold text-[#1a2e2e]">Today&apos;s Spotlight</h2>
          <Link href="/explore" className="flex items-center gap-1 text-sm font-semibold text-[#004f54] hover:underline">
            View all <ChevronRight size={15} />
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all border ${
                activeTab === t.key
                  ? 'bg-[#1a2e2e] text-white border-[#1a2e2e]'
                  : 'bg-white text-[#374151] border-[#e2e8e8] hover:border-[#004f54]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Product row */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-[#f9fafb] border border-[#e2e8e8] aspect-[3/4] animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-[#9ca3af] text-sm py-8 text-center">No products in this category yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {products.map(p => (
              <SpotlightCard
                key={p.id}
                product={p}
                wishlisted={wishlist.has(p.id)}
                onWishlist={() => toggleWishlist(p.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SpotlightCard({
  product: p,
  wishlisted,
  onWishlist,
}: {
  product: Product;
  wishlisted: boolean;
  onWishlist: () => void;
}) {
  const discountPct = p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;

  return (
    <div className="group relative bg-[#f9fafb] rounded-2xl overflow-hidden border border-[#e2e8e8] hover:border-[#004f54]/30 hover:shadow-md transition-all duration-200">
      <Link href={`/product/${p.id}`}>
        <div className="relative aspect-square bg-white overflow-hidden">
          {discountPct > 0 && (
            <span className="absolute top-2 left-2 z-10 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              {discountPct}% off
            </span>
          )}
          <button
            onClick={e => { e.preventDefault(); onWishlist(); }}
            className={`absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded-full transition-all
              ${wishlisted ? 'bg-red-50 text-red-500' : 'bg-white/80 text-[#9ca3af] opacity-0 group-hover:opacity-100'}`}
            aria-label="Add to wishlist"
          >
            <Heart size={13} fill={wishlisted ? 'currentColor' : 'none'} />
          </button>
          {p.image ? (
            <Image
              src={p.image}
              alt={p.name}
              fill
              unoptimized
              sizes="(max-width: 640px) 50vw, 16vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">💊</div>
          )}
        </div>
      </Link>

      <div className="p-3">
        <p className="text-[10px] font-bold text-[#004f54] uppercase tracking-wide mb-0.5">{p.brand}</p>
        <Link href={`/product/${p.id}`}>
          <p className="text-xs font-semibold text-[#1a2e2e] line-clamp-2 leading-snug mb-2 hover:text-[#004f54]">
            {p.name}
          </p>
        </Link>
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-sm font-extrabold text-[#004f54]">₹{p.price.toLocaleString('en-IN')}</span>
          {p.mrp > p.price && (
            <span className="text-[10px] text-[#9ca3af] line-through">₹{p.mrp.toLocaleString('en-IN')}</span>
          )}
        </div>
        <Link
          href={`/product/${p.id}`}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-[#004f54] text-white hover:bg-[#01696f] active:scale-95 transition-all"
        >
          View Product
        </Link>
      </div>
    </div>
  );
}
