"use client";

import { useState, useEffect, useCallback } from "react";

interface BrandSlide {
  brand: string;
  tagline: string;
  sub: string;
  bg: string;
  accent: string;
  icon: string;
  images: [string, string, string];
}

const SLIDES: BrandSlide[] = [
  {
    brand: "Man Matters",
    tagline: "Built for men who take health seriously.",
    sub: "Hair, skin, sleep & performance.",
    bg: "linear-gradient(135deg, #0d3d36 0%, #1e6b5e 60%, #0d3d36 100%)",
    accent: "#4ecdc4",
    icon: "⚡",
    images: [
      "https://i.mscwlns.co/media/misc/pdp_rcl/13222757/Artboard%201_k9ysur.png?tr=w-300",
      "https://i.mscwlns.co/media/misc/others/1.1%20%282%29_hd2bs9.jpg?tr=w-300",
      "https://i.mscwlns.co/media/misc/pdp_rcl/26167095/Growmax%20Derma%20Roller_8rotnv.jpg?tr=w-300",
    ],
  },
  {
    brand: "Be Bodywise",
    tagline: "Wellness crafted for every woman.",
    sub: "Hormonal balance, skin health & more.",
    bg: "linear-gradient(135deg, #3a1248 0%, #6b2fa0 60%, #3a1248 100%)",
    accent: "#e879f9",
    icon: "✨",
    images: [
      "https://i.mscwlns.co/media/misc/pdp_rcl/collagen-skin-gummies/Collagen%20gummies_bs7jyl.jpg?tr=w-300",
      "https://i.mscwlns.co/media/misc/pdp_rcl/glutathione-gummies-60/Hero-60_ksw1u2.jpg?tr=w-300",
      "https://i.mscwlns.co/media/misc/pdp_rcl/5-niacinamide-body-wash/Product_Hero%20%2810%29_hyvhn4.jpg?tr=w-300",
    ],
  },
  {
    brand: "Little Joys",
    tagline: "Happy, healthy kids start here.",
    sub: "Trusted nutrition & care for your little ones.",
    bg: "linear-gradient(135deg, #1a3a1a 0%, #2e6e2e 60%, #1a3a1a 100%)",
    accent: "#a3e635",
    icon: "🌱",
    images: [
      "https://i.mscwlns.co/media/misc/others/chocolate_kvpit8.png?tr=w-300",
      "https://i.mscwlns.co/media/misc/pdp/brain-booster-gummies/dha%2030-2_anwsi7.jpg?tr=w-300",
      "https://i.mscwlns.co/media/misc/pdp/calcium-gummies-strawberry/1.%20Hero%20A%20%281%29_8en917.png?tr=w-300",
    ],
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
        style={{ background: slide.bg, minHeight: 148 }}
      >
        {/* Subtle glow circle behind images */}
        <div
          className="absolute right-0 top-0 w-48 h-48 rounded-full"
          style={{ background: slide.accent, opacity: 0.07, transform: "translate(30%, -30%)" }}
        />

        {/* Left: text content */}
        <div className="relative px-5 pt-4 pb-4" style={{ maxWidth: "58%" }}>
          <p
            className="text-icon font-bold uppercase tracking-widest mb-1.5"
            style={{ color: slide.accent }}
          >
            {slide.icon} {slide.brand}
          </p>
          <p className="text-base font-bold text-white leading-snug mb-1">
            {slide.tagline}
          </p>
          <p className="text-label mb-3 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
            {slide.sub}
          </p>
          <button
            onClick={handleTap}
            className="px-4 py-1.5 rounded-full text-label font-bold cursor-pointer transition-opacity hover:opacity-85 active:opacity-70"
            style={{ background: slide.accent, color: "#000" }}
          >
            Shop now →
          </button>
        </div>

        {/* Right: product image fan */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ width: 110, height: 110 }}>
          {/* Back image */}
          <div
            className="absolute rounded-xl overflow-hidden border-2 shadow-lg"
            style={{
              width: 68, height: 68,
              right: 62, top: 16,
              transform: "rotate(-9deg)",
              borderColor: "rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.08)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.images[2]} alt="" className="w-full h-full object-contain" />
          </div>
          {/* Mid image */}
          <div
            className="absolute rounded-xl overflow-hidden border-2 shadow-lg"
            style={{
              width: 72, height: 72,
              right: 32, top: 8,
              transform: "rotate(-2deg)",
              borderColor: "rgba(255,255,255,0.22)",
              background: "rgba(255,255,255,0.1)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.images[1]} alt="" className="w-full h-full object-contain" />
          </div>
          {/* Front image */}
          <div
            className="absolute rounded-xl overflow-hidden border-2 shadow-xl"
            style={{
              width: 76, height: 76,
              right: 0, top: 18,
              transform: "rotate(5deg)",
              borderColor: "rgba(255,255,255,0.28)",
              background: "rgba(255,255,255,0.12)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.images[0]} alt="" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Dot indicators */}
        <div className="absolute bottom-3.5 left-5 flex items-center gap-1.5">
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
