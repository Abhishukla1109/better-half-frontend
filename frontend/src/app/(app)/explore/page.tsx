"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Star, Plus, Minus, Sparkles } from "lucide-react";
import { products, getCategories } from "@/data/products";
import type { ProductConfig } from "@/data/products";
import { getProductImage } from "@/data/images";

const categories = ["For You", "All", ...getCategories()];

/* ── Product Card ── */
function ProductCard({ product, onQtyChange }: { product: ProductConfig; onQtyChange: (slug: string, qty: number) => void }) {
  const [qty, setQty] = useState(0);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = qty + 1;
    setQty(next);
    onQtyChange(product.slug, next);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = Math.max(0, qty - 1);
    setQty(next);
    onQtyChange(product.slug, next);
  };

  return (
    <Link
      href={`/product/${product.slug}`}
      className="flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/8 hover:border-primary-container/20 transition-all duration-200 cursor-pointer group"
    >
      {/* Image */}
      <div className="relative bg-surface-container-low/30 flex items-center justify-center py-4">
        {getProductImage(product.slug) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getProductImage(product.slug)}
            alt={product.name}
            className="w-16 h-16 object-cover rounded-xl group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-surface-container-lowest flex items-center justify-center group-hover:scale-[1.03] transition-transform duration-300 shadow-sm">
            <span className="text-xl font-extrabold text-primary-container/30 font-[family-name:var(--font-manrope)]">
              {product.name.charAt(0)}
            </span>
          </div>
        )}

        {/* Qty control */}
        <div className="absolute top-1.5 right-1.5">
          {qty === 0 ? (
            <button
              onClick={handleAdd}
              className="flex items-center justify-center w-6 h-6 rounded-md bg-surface-container-lowest border border-outline-variant/15 hover:border-primary-container/40 transition-all duration-200 cursor-pointer active:scale-90"
              aria-label="Add to cart"
            >
              <Plus className="w-3.5 h-3.5 text-on-surface-variant" strokeWidth={2} />
            </button>
          ) : (
            <div className="flex items-center bg-primary-container rounded-md overflow-hidden animate-fade-in-up" style={{ animationDuration: "150ms" }}>
              <button
                onClick={handleRemove}
                className="flex items-center justify-center w-6 h-6 cursor-pointer hover:bg-primary transition-colors active:scale-90"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3 h-3 text-white" strokeWidth={2.5} />
              </button>
              <span className="text-[10px] font-bold text-white w-4 text-center">{qty}</span>
              <button
                onClick={handleAdd}
                className="flex items-center justify-center w-6 h-6 cursor-pointer hover:bg-primary transition-colors active:scale-90"
                aria-label="Increase quantity"
              >
                <Plus className="w-3 h-3 text-white" strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="px-2 pb-2 pt-1.5 flex flex-col flex-1 overflow-hidden">
        <p className="text-[12px] font-semibold text-on-surface leading-[1.25] line-clamp-2 break-words">
          {product.name}
        </p>
        <p className="text-[9px] text-on-surface-variant/50 mt-0.5 truncate">
          {product.subtitle}
        </p>

        {/* Price row */}
        <div className="flex items-center justify-between mt-auto pt-1.5">
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-[13px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">
              &#8377;{product.price}
            </span>
            {product.originalPrice > product.price && (
              <span className="text-[8px] text-on-surface-variant/35 line-through">
                &#8377;{product.originalPrice}
              </span>
            )}
          </div>
          {product.discount > 0 && (
            <span className="text-[9px] font-semibold text-primary-container">
              {product.discount}%off
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ── Explore Page ── */
export default function ExplorePage() {
  const [activeCategory, setActiveCategory] = useState("For You");
  const [cart, setCart] = useState<Record<string, number>>({});

  const handleQtyChange = useCallback((slug: string, qty: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) { delete next[slug]; } else { next[slug] = qty; }
      return next;
    });
  }, []);

  const filtered = activeCategory === "For You" || activeCategory === "All"
    ? products
    : products.filter((p) => p.category === activeCategory);

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  return (
    <div className="flex h-[calc(100dvh-68px-48px)] lg:h-[calc(100dvh-48px)]">
      {/* ── Left sidebar: category list ── */}
      <nav className="w-[72px] shrink-0 bg-surface-container-low/50 border-r border-outline-variant/8 overflow-y-auto hide-scrollbar py-2">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`w-full flex flex-col items-center gap-1 py-3 px-1 text-center cursor-pointer transition-colors relative ${
                isActive
                  ? "bg-surface-container-lowest"
                  : "hover:bg-surface-container-lowest/50"
              }`}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary-container rounded-r-full" />
              )}

              {/* Category icon placeholder */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isActive ? "bg-primary-container/15" : "bg-surface-container-high/50"
              }`}>
                {cat === "For You" ? (
                  <Sparkles className={`w-4 h-4 ${isActive ? "text-primary-container" : "text-on-surface-variant/50"}`} strokeWidth={1.5} />
                ) : (
                  <span className={`text-xs font-bold ${isActive ? "text-primary-container" : "text-on-surface-variant/40"}`}>
                    {cat.charAt(0)}
                  </span>
                )}
              </div>

              <span className={`text-[9px] leading-tight font-medium ${
                isActive ? "text-primary-container" : "text-on-surface-variant/60"
              }`}>
                {cat}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── Right: product grid ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Category header */}
        <div className="px-3 pt-4 pb-2">
          <h1 className="text-lg font-extrabold text-on-surface tracking-tight font-[family-name:var(--font-manrope)]">
            {activeCategory}
          </h1>
          <p className="text-[11px] text-on-surface-variant/50 mt-0.5">
            {filtered.length} product{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Grid */}
        <div className="px-2 pb-4 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {filtered.map((p) => (
            <ProductCard key={p.slug} product={p} onQtyChange={handleQtyChange} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 px-4">
            <p className="text-sm text-on-surface-variant">No products in this category yet.</p>
          </div>
        )}
      </div>

      {/* ── Cart bar (shows when items in cart) ── */}
      {cartCount > 0 && (
        <div className="fixed bottom-[68px] lg:bottom-0 left-0 right-0 z-30 px-4 pb-2 lg:left-[240px] xl:left-[280px] animate-fade-in-up">
          <div className="max-w-2xl mx-auto bg-primary-container rounded-2xl px-5 py-3 flex items-center justify-between shadow-lg shadow-primary/10">
            <div>
              <p className="text-sm font-bold text-white">{cartCount} item{cartCount !== 1 ? "s" : ""} in cart</p>
            </div>
            <button className="px-4 py-2 rounded-xl bg-white text-sm font-semibold text-primary-container cursor-pointer hover:bg-primary-fixed transition-colors">
              View Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
