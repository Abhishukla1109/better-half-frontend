'use client';

import React, { useState, useMemo } from 'react';
import { Search, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import type { Product as ShopifyProduct } from '@/lib/shopify/types';
import type { LocalProduct } from '@/lib/localProducts';

const CONCERN_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'hair', label: '💇 Hair' },
  { key: 'skin', label: '✨ Skin' },
  { key: 'energy', label: '⚡ Energy' },
  { key: 'sleep', label: '😴 Sleep' },
  { key: 'fitness', label: '💪 Fitness' },
  { key: 'hormones', label: '🌸 Hormones' },
  { key: 'gut', label: '🫁 Gut' },
  { key: 'wellness', label: '🌿 Wellness' },
  { key: 'kids', label: '👶 Kids' },
];

interface Props {
  shopifyProducts: ShopifyProduct[];
  localProducts: LocalProduct[];
}

export default function ExploreClient({ shopifyProducts, localProducts }: Props) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const usingShopify = shopifyProducts.length > 0;

  const filtered = useMemo(() => {
    if (usingShopify) {
      return shopifyProducts.filter(p => {
        const matchConcern = activeFilter === 'all' ||
          p.tags.some(t => t.toLowerCase().includes(activeFilter)) ||
          p.title.toLowerCase().includes(activeFilter);
        const matchSearch = !searchQuery.trim() ||
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
        return matchConcern && matchSearch;
      });
    }

    return localProducts.filter(p => {
      const matchConcern = activeFilter === 'all' ||
        p.concern === activeFilter ||
        p.tags.some(t => t.toLowerCase().includes(activeFilter));
      const matchSearch = !searchQuery.trim() ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase());
      return matchConcern && matchSearch;
    });
  }, [shopifyProducts, localProducts, activeFilter, searchQuery, usingShopify]);

  return (
    <div className="min-h-screen bg-[#f7fafa] pb-24">
      {/* Sticky header + filters */}
      <div className="sticky top-0 z-20 bg-[#f7fafa]/95 backdrop-blur-sm border-b border-[#e2e8e8] px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-xl font-extrabold text-[#004f54] mb-3">Shop</h1>
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search products…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#e2e8e8] rounded-xl text-sm focus:outline-none focus:border-[#004f54] transition-colors"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CONCERN_CHIPS.map(chip => (
              <button
                key={chip.key}
                onClick={() => setActiveFilter(chip.key)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  activeFilter === chip.key
                    ? 'bg-[#004f54] text-white'
                    : 'bg-white border border-[#e2e8e8] text-[#4b5563] hover:border-[#004f54]'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <span className="text-5xl">🔍</span>
            <p className="text-[#6b7280]">No products found</p>
            <button
              onClick={() => { setActiveFilter('all'); setSearchQuery(''); }}
              className="text-[#004f54] font-semibold text-sm underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-[#9ca3af] mb-4">{filtered.length} products</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {usingShopify
                ? (filtered as ShopifyProduct[]).map(p => <ShopifyCard key={p.id} product={p} />)
                : (filtered as LocalProduct[]).map(p => <LocalCard key={p.id} product={p} />)
              }
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Local product card (uses data from response.json) ────────

function LocalCard({ product: p }: { product: LocalProduct }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const { addItem } = useCart();

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    if (!p.available || state !== 'idle') return;
    setState('loading');
    // Shopify variant ID isn't available yet — this shows the intent.
    // When Shopify credentials are added, replace with: await addItem(variantId)
    await new Promise(r => setTimeout(r, 400));
    setState('done');
    setTimeout(() => setState('idle'), 2000);
  }

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-[#e2e8e8] flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#004f54]/10">
      <Link href={`/product/${p.handle}`} className="relative block aspect-square bg-[#f7fafa] overflow-hidden">
        {p.discountPct > 0 && (
          <span className="absolute top-2 left-2 z-10 text-[11px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-md">
            {p.discountPct}% off
          </span>
        )}
        {p.image ? (
          <Image
            src={p.image}
            alt={p.title}
            fill
            unoptimized
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">💊</div>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1 gap-2">
        <p className="text-[11px] font-bold text-[#004f54] uppercase tracking-wide">{p.brand}</p>
        <Link
          href={`/product/${p.handle}`}
          className="text-sm font-semibold text-[#1a2e2e] leading-snug line-clamp-2 hover:text-[#004f54] transition-colors"
        >
          {p.title}
        </Link>
        {p.forWith && (
          <p className="text-xs text-[#6b7280] line-clamp-1">{p.forWith.for}</p>
        )}

        <div className="flex items-center gap-2 mt-auto">
          <span className="text-base font-extrabold text-[#004f54]">₹{p.price.toLocaleString('en-IN')}</span>
          {p.compareAtPrice && (
            <span className="text-sm text-[#9ca3af] line-through">₹{p.compareAtPrice.toLocaleString('en-IN')}</span>
          )}
        </div>

        <button
          onClick={handleAdd}
          disabled={!p.available || state !== 'idle'}
          className={`w-full mt-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2
            ${!p.available
              ? 'bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed'
              : state === 'done'
                ? 'bg-green-600 text-white'
                : 'bg-[#004f54] text-white hover:bg-[#01696f] active:scale-[0.98]'
            }`}
        >
          <ShoppingBag size={14} />
          {!p.available ? 'Out of Stock' : state === 'loading' ? 'Adding…' : state === 'done' ? 'Added!' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}

// ── Shopify card (when credentials are configured) ───────────

function ShopifyCard({ product: p }: { product: ShopifyProduct }) {
  const firstVariant = p.variants[0];
  const price = firstVariant?.price;
  const compare = firstVariant?.compareAtPrice;
  const onSale = compare && parseFloat(compare.amount) > parseFloat(price?.amount ?? '0');

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-[#e2e8e8] flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <Link href={`/product/${p.handle}`} className="relative block aspect-square bg-[#f7fafa] overflow-hidden">
        {onSale && (
          <span className="absolute top-2 left-2 z-10 text-[11px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-md">Sale</span>
        )}
        {p.featuredImage ? (
          <Image src={p.featuredImage.url} alt={p.featuredImage.altText || p.title} fill sizes="25vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">💊</div>
        )}
      </Link>
      <div className="p-4 flex flex-col flex-1 gap-2">
        <p className="text-[11px] font-bold text-[#004f54] uppercase tracking-wide">{p.vendor}</p>
        <Link href={`/product/${p.handle}`} className="text-sm font-semibold text-[#1a2e2e] leading-snug line-clamp-2 hover:text-[#004f54]">
          {p.title}
        </Link>
        <div className="flex items-center gap-2 mt-auto">
          {price && <span className="text-base font-extrabold text-[#004f54]">₹{parseFloat(price.amount).toLocaleString('en-IN')}</span>}
          {compare && onSale && <span className="text-sm text-[#9ca3af] line-through">₹{parseFloat(compare.amount).toLocaleString('en-IN')}</span>}
        </div>
      </div>
    </div>
  );
}
