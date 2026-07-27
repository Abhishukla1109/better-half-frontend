'use client';

import React, { useState, useMemo } from 'react';
import { Search, ShoppingBag } from 'lucide-react';
import AddToCartButton from '@/components/shop/AddToCartButton';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { track } from '@/lib/mixpanel';
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

// Symptom/synonym → concern chip key
const KEYWORD_CONCERN_MAP: Record<string, string> = {
  "hairfall": "hair",  "hair fall": "hair",  "hair loss": "hair",
  "dandruff": "hair",  "scalp": "hair",      "shampoo": "hair",
  "beard": "hair",     "bald": "hair",       "serum": "hair",
  "acne": "skin",      "pimple": "skin",     "sunscreen": "skin",
  "moisturizer": "skin", "pigmentation": "skin", "glow": "skin",
  "brightening": "skin", "body wash": "skin", "niacinamide": "skin",
  "tired": "energy",   "fatigue": "energy",  "stamina": "energy",
  "strength": "energy", "shilajit": "energy",
  "insomnia": "sleep", "melatonin": "sleep",
  "creatine": "fitness", "protein": "fitness", "workout": "fitness",
  "muscle": "fitness", "gym": "fitness",
  "pcos": "hormones",  "thyroid": "hormones", "period": "hormones",
  "testosterone": "hormones", "hormonal": "hormones",
  "digestion": "gut",  "bloating": "gut",    "probiotic": "gut",
  "stomach": "gut",    "constipation": "gut",
  "vitamin": "wellness", "immunity": "wellness", "multivitamin": "wellness",
  "omega": "wellness", "magnesium": "wellness", "zinc": "wellness",
  "child": "kids",     "baby": "kids",       "children": "kids",
  "toddler": "kids",   "gummies": "kids",
};

function impliedConcern(query: string): string | null {
  const q = query.toLowerCase().trim();
  for (const [keyword, concern] of Object.entries(KEYWORD_CONCERN_MAP)) {
    if (q.includes(keyword)) return concern;
  }
  return null;
}

interface Props {
  shopifyProducts: ShopifyProduct[];
  localProducts: LocalProduct[];
}

export default function ExploreClient({ shopifyProducts, localProducts }: Props) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const usingShopify = shopifyProducts.length > 0;

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const concern = q ? impliedConcern(q) : null;

    if (usingShopify) {
      return shopifyProducts.filter(p => {
        const matchConcern = activeFilter === 'all' ||
          p.tags.some(t => t.toLowerCase().includes(activeFilter)) ||
          p.title.toLowerCase().includes(activeFilter);

        if (!q) return matchConcern;

        const searchable = [
          p.title,
          p.vendor ?? '',
          p.description ?? '',
          ...(p.tags ?? []),
        ].join(' ').toLowerCase();

        const matchSearch = searchable.includes(q) ||
          (concern !== null && p.tags.some(t => t.toLowerCase().includes(concern)));

        return matchConcern && matchSearch;
      });
    }

    return localProducts.filter(p => {
      const matchConcern = activeFilter === 'all' ||
        p.concern === activeFilter ||
        p.tags.some(t => t.toLowerCase().includes(activeFilter));

      if (!q) return matchConcern;

      const searchable = [
        p.title,
        p.brand,
        p.description,
        p.concern,
        p.forWith?.for ?? '',
        p.forWith?.with ?? '',
        ...p.tags,
        ...p.ingredients,
      ].join(' ').toLowerCase();

      const matchSearch = searchable.includes(q) ||
        (concern !== null && p.concern.includes(concern));

      return matchConcern && matchSearch;
    });
  }, [shopifyProducts, localProducts, activeFilter, searchQuery, usingShopify]);

  return (
    <div className="min-h-screen bg-surface-teal pb-24">
      {/* Sticky header + filters */}
      <div className="sticky top-0 z-20 bg-surface-teal/95 backdrop-blur-sm border-b border-border-light px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-xl font-extrabold text-brand mb-3">Shop</h1>
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-border-light rounded-xl text-sm focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CONCERN_CHIPS.map(chip => (
              <button
                key={chip.key}
                onClick={() => { setActiveFilter(chip.key); if (chip.key !== 'all') track("Explore Filter Applied", { filter: chip.key }); }}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  activeFilter === chip.key
                    ? 'bg-brand text-white'
                    : 'bg-white border border-border-light text-gray-600 hover:border-brand'
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
            <p className="text-gray-500">No products found</p>
            <button
              onClick={() => { setActiveFilter('all'); setSearchQuery(''); }}
              className="text-brand font-semibold text-sm underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-4">{filtered.length} products</p>
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
    <div className="group bg-white rounded-2xl overflow-hidden border border-border-light flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#004f54]/10">
      <Link href={`/product/${p.handle}`} className="relative block aspect-square bg-surface-teal overflow-hidden">
        {p.discountPct > 0 && (
          <span className="absolute top-2 left-2 z-10 text-label font-bold bg-red-500 text-white px-2 py-0.5 rounded-md">
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
        <p className="text-label font-bold text-brand uppercase tracking-wide">{p.brand}</p>
        <Link
          href={`/product/${p.handle}`}
          className="text-sm font-semibold text-on-dark leading-snug line-clamp-2 hover:text-brand transition-colors"
        >
          {p.title}
        </Link>
        {p.forWith && (
          <p className="text-xs text-gray-500 line-clamp-1">{p.forWith.for}</p>
        )}

        <div className="flex items-center gap-2 mt-auto">
          <span className="text-base font-extrabold text-brand">₹{p.price.toLocaleString('en-IN')}</span>
          {p.compareAtPrice && (
            <span className="text-sm text-gray-400 line-through">₹{p.compareAtPrice.toLocaleString('en-IN')}</span>
          )}
        </div>

        <button
          onClick={handleAdd}
          disabled={!p.available || state !== 'idle'}
          className={`w-full mt-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2
            ${!p.available
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : state === 'done'
                ? 'bg-green-600 text-white'
                : 'bg-brand text-white hover:bg-brand-hover active:scale-[0.98]'
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
    <div className="group bg-white rounded-2xl overflow-hidden border border-border-light flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <Link href={`/product/${p.handle}`} className="relative block aspect-square bg-surface-teal overflow-hidden">
        {onSale && (
          <span className="absolute top-2 left-2 z-10 text-label font-bold bg-red-500 text-white px-2 py-0.5 rounded-md">Sale</span>
        )}
        {p.featuredImage ? (
          <Image src={p.featuredImage.url} alt={p.featuredImage.altText || p.title} fill sizes="25vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">💊</div>
        )}
      </Link>
      <div className="p-4 flex flex-col flex-1 gap-2">
        <p className="text-label font-bold text-brand uppercase tracking-wide">{p.vendor}</p>
        <Link href={`/product/${p.handle}`} className="text-sm font-semibold text-on-dark leading-snug line-clamp-2 hover:text-brand">
          {p.title}
        </Link>
        <div className="flex items-center gap-2 mt-auto">
          {price && <span className="text-base font-extrabold text-brand">₹{parseFloat(price.amount).toLocaleString('en-IN')}</span>}
          {compare && onSale && <span className="text-sm text-gray-400 line-through">₹{parseFloat(compare.amount).toLocaleString('en-IN')}</span>}
        </div>
        <AddToCartButton
          variantId={firstVariant?.id ?? ''}
          available={firstVariant?.availableForSale ?? false}
          productName={p.title}
          brand={p.vendor ?? undefined}
          price={price ? parseFloat(price.amount) : undefined}
          source="explore"
          className="w-full mt-1 py-2.5 text-sm"
        />
      </div>
    </div>
  );
}
