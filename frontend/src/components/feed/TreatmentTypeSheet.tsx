"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { TreatmentType, TreatmentProduct } from "@/data/treatment-types";

interface TreatmentTypeSheetProps {
  type: TreatmentType;
  onClose: () => void;
  onAddToPlan: (typeId: string, product: TreatmentProduct) => void;
  onAlreadyUsing: (typeId: string, product: TreatmentProduct) => void;
  onUsingOther: (typeId: string) => void;
}

export default function TreatmentTypeSheet({
  type,
  onClose,
  onAddToPlan,
  onAlreadyUsing,
  onUsingOther,
}: TreatmentTypeSheetProps) {
  const [selectedId, setSelectedId] = useState(type.defaultProductId);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherProduct, setOtherProduct] = useState("");
  const [otherDuration, setOtherDuration] = useState("");

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const header = document.querySelector("[data-header-visible]") as HTMLElement;
    if (header) header.style.transform = "translateY(-100%)";
    return () => {
      document.body.style.overflow = "";
      const h = document.querySelector("[data-header-visible]") as HTMLElement;
      if (h) h.style.transform = "";
    };
  }, []);

  const toggleFilter = (value: string) => {
    setActiveFilters((prev) =>
      prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]
    );
  };

  const filteredProducts = activeFilters.length === 0
    ? type.products
    : type.products.filter((p) => activeFilters.some((f) => p.tags.includes(f)));

  const selectedProduct = type.products.find((p) => p.id === selectedId) || type.products[0];

  const handleSubmitOther = () => {
    if (otherProduct.trim()) {
      onUsingOther(type.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-on-surface/40"
        style={{ animation: "fadeInUp 150ms ease-out" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative w-full bg-surface rounded-t-3xl overflow-hidden animate-fade-in-up flex flex-col"
        style={{ animationDuration: "250ms", maxHeight: "70dvh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
          <div>
            <p className="text-base font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">
              Choose your {type.label}
            </p>
            <p className="text-[11px] text-on-surface-variant/50">{type.timing}</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-container-low cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-on-surface-variant" strokeWidth={2} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 px-5 pb-3 overflow-x-auto hide-scrollbar shrink-0">
          {type.filters.map((f) => (
            <button
              key={f.value}
              onClick={() => toggleFilter(f.value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                activeFilters.includes(f.value)
                  ? "bg-primary-fixed/15 text-primary-container border border-primary-container"
                  : "bg-surface-container-low text-on-surface-variant border border-transparent hover:border-primary-container/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto px-5 min-h-0">
          {!showOtherInput ? (
            <div className="space-y-1.5 pb-2">
              {filteredProducts.map((p) => {
                const isSelected = p.id === selectedId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "bg-primary-fixed/15 border border-primary-container"
                        : "bg-surface-container-low border border-transparent hover:border-primary-container/40"
                    }`}
                  >
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-tight ${isSelected ? "text-primary-container" : "text-on-surface"}`}>
                        {p.name}
                      </p>
                      <p className="text-[10px] text-on-surface-variant/50 mt-0.5">{p.brand} &middot; {p.size}</p>
                    </div>

                    {/* Price */}
                    <span className={`text-sm font-bold shrink-0 ${isSelected ? "text-primary-container" : "text-on-surface"}`}>
                      &#8377;{p.price}
                    </span>
                  </button>
                );
              })}

              {filteredProducts.length === 0 && (
                <p className="text-sm text-on-surface-variant/50 text-center py-6">No products match these filters</p>
              )}
            </div>
          ) : (
            /* "I'm taking something else" input */
            <div className="py-4 animate-fade-in-up">
              <p className="text-sm font-semibold text-on-surface mb-3">What are you currently using?</p>
              <input
                type="text"
                value={otherProduct}
                onChange={(e) => setOtherProduct(e.target.value)}
                placeholder="Product name..."
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/15 text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none mb-3"
                autoFocus
              />
              <p className="text-sm font-semibold text-on-surface mb-2">Since how long?</p>
              <div className="flex gap-2 flex-wrap">
                {["< 1 month", "1–3 months", "3–6 months", "6+ months"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setOtherDuration(d)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      otherDuration === d
                        ? "bg-primary-fixed/15 text-primary-container border border-primary-container"
                        : "bg-surface-container-low text-on-surface-variant border border-transparent hover:border-primary-container/40"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              {otherProduct.trim() && otherDuration && (
                <button
                  onClick={handleSubmitOther}
                  className="mt-4 w-full py-3 rounded-xl bg-primary-container text-sm font-semibold text-white cursor-pointer hover:bg-primary transition-colors animate-fade-in-up"
                >
                  Save
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sticky CTAs */}
        {!showOtherInput && (
          <div className="shrink-0 px-5 pt-3 pb-5 border-t border-outline-variant/8 bg-surface">
            <div className="flex gap-2">
              <button
                onClick={() => onAddToPlan(type.id, selectedProduct)}
                className="flex-1 py-3 rounded-xl bg-primary-container text-sm font-semibold text-white cursor-pointer hover:bg-primary transition-colors"
              >
                Add to Plan
              </button>
              <button
                onClick={() => onAlreadyUsing(type.id, selectedProduct)}
                className="flex-1 py-3 rounded-xl bg-surface-container-low text-sm font-semibold text-on-surface cursor-pointer hover:bg-surface-container-high transition-colors"
              >
                Already using
              </button>
            </div>
            <button
              onClick={() => setShowOtherInput(true)}
              className="mt-2 w-full text-center text-xs text-on-surface-variant/50 cursor-pointer hover:text-on-surface-variant transition-colors py-2"
            >
              I&apos;m taking something else
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
