"use client";

import { useState, useEffect, useCallback } from "react";

interface BrandSlide {
  brand: string;
  tagline: string;
  sub: string;
  bg: string;
  accent: string;
  icon: string;
}

const SLIDES: BrandSlide[] = [
  {
    brand: "Man Matters",
    tagline: "Built for men who take health seriously.",
    sub: "Hair, skin, sleep & performance — backed by science.",
    bg: "linear-gradient(135deg, #0d3d36 0%, #1e6b5e 60%, #0d3d36 100%)",
    accent: "#4ecdc4",
    icon: "⚡",
  },
  {
    brand: "Be Bodywise",
    tagline: "Wellness crafted for every woman.",
    sub: "Hormonal balance, skin health & more — science-first.",
    bg: "linear-gradient(135deg, #3a1248 0%, #6b2fa0 60%, #3a1248 100%)",
    accent: "#e879f9",
    icon: "✨",
  },
  {
    brand: "Little Joys",
    tagline: "Happy, healthy kids start here.",
    sub: "Trusted nutrition & care for your little ones.",
    bg: "linear-gradient(135deg, #1a3a1a 0%, #2e6e2e 60%, #1a3a1a 100%)",
    accent: "#a3e635",
    icon: "🌱",
  },
];

const INTERVAL_MS = 4500;

interface Props {
  onBrandTap: (brand: string) => void;
}

export default function BrandHeroBanners({ onBrandTap }: Props) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((p) => (p + 1) % SLIDES.length), INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  const slide = SLIDES[active];

  const handleTap = useCallback(() => {
    onBrandTap(slide.brand);
  }, [onBrandTap, slide.brand]);

  return (
    <div className="mx-4 mt-4 mb-1">
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ background: slide.bg, minHeight: 136 }}
      >
        {/* Decorative circle */}
        <div
          className="absolute -right-8 -top-8 w-32 h-32 rounded-full"
          style={{ background: slide.accent, opacity: 0.08 }}
        />
        <div
          className="absolute right-4 bottom-4 w-16 h-16 rounded-full"
          style={{ background: slide.accent, opacity: 0.06 }}
        />

        {/* Content */}
        <div className="relative px-5 pt-4 pb-4">
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
            style={{ color: slide.accent }}
          >
            {slide.icon} {slide.brand}
          </p>
          <p className="text-[17px] font-bold text-white leading-snug" style={{ maxWidth: 210 }}>
            {slide.tagline}
          </p>
          <p className="text-[11px] text-white/55 mt-1 leading-relaxed" style={{ maxWidth: 200 }}>
            {slide.sub}
          </p>
          <button
            onClick={handleTap}
            className="mt-3 px-4 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition-opacity hover:opacity-85"
            style={{ background: slide.accent, color: "#000" }}
          >
            Shop {slide.brand} →
          </button>
        </div>

        {/* Dot indicators */}
        <div className="absolute bottom-4 right-4 flex items-center gap-1.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="rounded-full transition-all duration-300 cursor-pointer"
              style={{
                width: i === active ? 16 : 6,
                height: 6,
                background: i === active ? slide.accent : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
