"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
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
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherProduct, setOtherProduct] = useState("");
  const [otherDuration, setOtherDuration] = useState("");
  const [transitioning, setTransitioning] = useState(false);

  // Reset state when type changes (build plan auto-advance)
  const prevTypeId = useRef(type.id);
  useEffect(() => {
    if (prevTypeId.current !== type.id) {
      setTransitioning(true);
      setTimeout(() => {
        setSelectedId(type.defaultProductId);
        setShowOtherInput(false);
        setOtherProduct("");
        setOtherDuration("");
        prevTypeId.current = type.id;
        setTransitioning(false);
      }, 150);
    }
  }, [type.id, type.defaultProductId]);

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

  const selectedProduct = type.products.find((p) => p.id === selectedId) || type.products[0];

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
        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0 border-b border-outline-variant/8">
          <div className={`transition-opacity duration-150 ${transitioning ? "opacity-0" : "opacity-100"}`}>
            <p className="text-base font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">
              Choose your {type.label}
            </p>
            <p className="text-label text-on-surface-variant/50">{type.timing}</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-container-low cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-on-surface-variant" strokeWidth={2} />
          </button>
        </div>

        {/* Product list */}
        <div className={`flex-1 overflow-y-auto min-h-0 transition-opacity duration-150 ${transitioning ? "opacity-0" : "opacity-100"}`}>
          {!showOtherInput ? (
            <div className="px-4 py-3 space-y-2">
              {type.products.slice(0, 4).map((p) => {
                const isSelected = p.id === selectedId;
                const discount = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl text-left cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "bg-primary-fixed/10 border border-primary-container"
                        : "bg-surface-container-lowest border border-outline-variant/8 hover:border-primary-container/40"
                    }`}
                  >
                    {/* Thumbnail */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-14 h-14 rounded-lg object-cover shrink-0"
                    />

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-body font-semibold leading-tight ${isSelected ? "text-primary-container" : "text-on-surface"}`}>
                        {p.name}
                      </p>
                      <p className="text-icon text-on-surface-variant/60 mt-0.5 leading-snug">
                        {p.usp}
                      </p>

                      {/* Price row */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`text-sm font-bold ${isSelected ? "text-primary-container" : "text-on-surface"}`}>
                          &#8377;{p.price}
                        </span>
                        {p.mrp > p.price && (
                          <>
                            <span className="text-icon text-on-surface-variant/35 line-through">
                              &#8377;{p.mrp}
                            </span>
                            <span className="text-2xs font-semibold text-primary-container">
                              {discount}% off
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Know more */}
                    <Link
                      href={`/product/${p.slug}?from=treatment&typeId=${type.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-icon font-semibold text-primary-container/70 hover:text-primary-container mt-1 shrink-0 underline underline-offset-2"
                    >
                      Know more
                    </Link>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-4 animate-fade-in-up">
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
                  onClick={() => onUsingOther(type.id)}
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
