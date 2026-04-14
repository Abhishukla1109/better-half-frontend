"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Sparkles, SlidersHorizontal } from "lucide-react";
import { products, getCategories, getBrands } from "@/data/products";
import type { ProductConfig } from "@/data/products";

const categories = getCategories();
const brands = getBrands();

function ProductCard({ product }: { product: ProductConfig }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer group"
    >
      {/* Image */}
      <div className="aspect-square bg-gradient-to-br from-surface-container-low/80 to-surface-container-lowest flex items-center justify-center relative overflow-hidden">
        <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-gradient-to-br from-primary-container/15 to-primary-fixed/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
          <span className="text-3xl lg:text-4xl font-extrabold text-primary-container/25 font-[family-name:var(--font-manrope)]">
            {product.name.charAt(0)}
          </span>
        </div>
        {/* Discount badge */}
        {product.discount > 0 && (
          <span className="absolute top-2 left-2 text-[10px] font-bold text-on-primary-container bg-primary-container/90 px-2 py-0.5 rounded-full">
            {product.discount}% off
          </span>
        )}
        {/* Brand badge */}
        <span
          className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{ backgroundColor: product.brandColor + "15", color: product.brandColor }}
        >
          {product.brandCode}
        </span>
      </div>

      {/* Info */}
      <div className="p-3 lg:p-4">
        <p className="text-sm font-semibold text-on-surface leading-snug line-clamp-2">
          {product.name}
        </p>
        <p className="text-[11px] text-on-surface-variant mt-0.5">{product.subtitle}</p>

        {/* Rating */}
        <div className="flex items-center gap-1 mt-1.5">
          <Star className="w-3 h-3 text-tertiary-container fill-tertiary-container" strokeWidth={0} />
          <span className="text-xs font-semibold text-on-surface">{product.rating}</span>
          <span className="text-[10px] text-on-surface-variant">({product.reviewCount})</span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1.5 mt-1.5">
          <span className="text-base font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">
            &#8377;{product.price}
          </span>
          {product.originalPrice > product.price && (
            <span className="text-[11px] text-on-surface-variant/50 line-through">
              &#8377;{product.originalPrice}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function ExplorePage() {
  const [activeCategory, setActiveCategory] = useState<string | null>("for-you");
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = products.filter((p) => {
    if (activeCategory && activeCategory !== "for-you" && p.category !== activeCategory) return false;
    if (activeBrand && p.brandCode !== activeBrand) return false;
    return true;
  });

  return (
    <div className="px-4 pt-6 lg:pt-8 lg:px-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-primary-container" strokeWidth={1.5} />
        <span className="text-[11px] font-semibold text-primary-container uppercase tracking-wider">
          AI-curated for you
        </span>
      </div>
      <h1 className="text-2xl lg:text-3xl font-extrabold text-primary tracking-tight font-[family-name:var(--font-manrope)]">
        Explore
      </h1>
      <p className="text-sm text-on-surface-variant mt-1 mb-5">
        {products.length} products across {brands.length} brands
      </p>

      {/* Category filters */}
      <div className="flex items-center gap-2 mb-2 -mx-4 px-4">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 flex-1 min-w-0">
          <button
            onClick={() => { setActiveCategory("for-you"); setActiveBrand(null); }}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeCategory === "for-you"
                ? "bg-primary-container text-on-primary-container"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <Sparkles className="w-3 h-3" strokeWidth={1.5} />
            For You
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? "for-you" : cat)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                activeCategory === cat
                  ? "bg-primary-container text-on-primary-container"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-full transition-colors cursor-pointer ${
            showFilters || activeBrand
              ? "bg-primary-container text-on-primary-container"
              : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
          }`}
          aria-label="Toggle filters"
        >
          <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Brand filters (collapsible) */}
      {showFilters && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-3 mb-4 -mx-4 px-4">
          {brands.map((b) => (
            <button
              key={b.code}
              onClick={() => setActiveBrand(activeBrand === b.code ? null : b.code)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer border ${
                activeBrand === b.code
                  ? "border-current"
                  : "border-transparent"
              }`}
              style={{
                backgroundColor: (activeBrand === b.code ? b.color + "20" : b.color + "08"),
                color: b.color,
              }}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      {/* Product grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
        {filtered.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-sm text-on-surface-variant">No products match this filter.</p>
          <button
            onClick={() => { setActiveCategory(null); setActiveBrand(null); }}
            className="mt-2 text-sm font-semibold text-primary-container cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
