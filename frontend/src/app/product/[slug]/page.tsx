"use client";

import { useState, useEffect, useRef } from "react";
import { use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  ShieldCheck,
  FlaskConical,
  Dumbbell,
  Brain,
  Zap,
  Heart,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Stethoscope,
  Share2,
  Plus,
  Minus,
  ShoppingCart,
  Shield,
  Moon,
  Droplets,
  TrendingUp,
  CheckCircle,
  type LucideIcon,
} from "lucide-react";
import { getProductBySlug } from "@/data/products";
import { getProductImage } from "@/data/images";

/* ── Icon resolver: maps string names from JSON config to Lucide components ── */
const iconMap: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  brain: Brain,
  zap: Zap,
  heart: Heart,
  shield: Shield,
  moon: Moon,
  droplets: Droplets,
  sparkles: Sparkles,
  "trending-up": TrendingUp,
  "check-circle": CheckCircle,
};

function resolveIcon(name: string): LucideIcon {
  return iconMap[name] || Zap;
}

/* ── Parallax Hook ── */
function useParallax(speed = 0.35) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) return;

    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const inView = rect.bottom > 0 && rect.top < window.innerHeight;
      if (inView) {
        setOffset(window.scrollY * speed);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed]);

  return { ref, offset };
}

/* ── Expandable Section ── */
function ExpandableSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-outline-variant/10">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 cursor-pointer"
      >
        <span className="text-sm font-semibold text-on-surface lg:text-base">{title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-on-surface-variant" />
        ) : (
          <ChevronDown className="w-4 h-4 text-on-surface-variant" />
        )}
      </button>
      {open && <div className="pb-5">{children}</div>}
    </div>
  );
}

/* ── Star Rating ── */
function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-4 h-4 ${
              s <= Math.floor(rating)
                ? "text-tertiary-container fill-tertiary-container"
                : s - 0.5 <= rating
                ? "text-tertiary-container fill-tertiary-container/50"
                : "text-outline-variant/30"
            }`}
            strokeWidth={0}
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-on-surface">{rating}</span>
      <span className="text-xs text-on-surface-variant">({count} reviews)</span>
    </div>
  );
}

/* ── Hero Image with Parallax ── */
function HeroImage({
  productName,
  productSlug,
  unitsSold,
  imageCount,
  activeImage,
  setActiveImage,
}: {
  productName: string;
  productSlug: string;
  unitsSold: string;
  imageCount: number;
  activeImage: number;
  setActiveImage: (i: number) => void;
}) {
  const heroImg = getProductImage(productSlug);
  const { ref: parallaxRef, offset } = useParallax(0.3);

  return (
    <div ref={parallaxRef} className="bg-surface-container-lowest overflow-hidden lg:rounded-3xl">
      {/* Main image with parallax */}
      <div className="relative aspect-square flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-b from-surface-container-low/50 to-surface-container-lowest flex items-center justify-center will-change-transform"
          style={{ transform: `translateY(${-offset}px) scale(${1 + offset * 0.001})` }}
        >
          {heroImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImg} alt={productName} className="w-64 h-64 lg:w-80 lg:h-80 object-cover rounded-3xl transition-transform duration-700" />
          ) : (
            <div className="w-64 h-64 lg:w-80 lg:h-80 rounded-3xl bg-gradient-to-br from-primary-container/20 to-primary-fixed/10 flex items-center justify-center transition-transform duration-700">
              <span className="text-6xl lg:text-8xl font-extrabold text-primary-container/30 font-[family-name:var(--font-manrope)]">
                {productName.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Units sold badge */}
        <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-primary-container/90 text-xs font-semibold text-on-primary-container z-10">
          {unitsSold} sold
        </div>
      </div>

      {/* Image dots */}
      <div className="flex justify-center gap-2 py-3">
        {Array.from({ length: imageCount }, (_, i) => (
          <button
            key={i}
            onClick={() => setActiveImage(i)}
            className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
              activeImage === i
                ? "bg-primary-container w-6"
                : "bg-outline-variant/30"
            }`}
            aria-label={`View image ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Main PDP ── */
export default function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromTreatment = searchParams.get("from") === "treatment";
  const product = getProductBySlug(slug);

  useEffect(() => {
    if (!product) {
      router.replace("/explore");
    }
  }, [product, router]);

  if (!product) return null;

  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedPack, setSelectedPack] = useState(0);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const currentPrice = product.packs[selectedPack]?.price ?? product.price;

  return (
    <div className="min-h-dvh bg-surface">
      {/* ─── Sticky Header ─── */}
      <header className="glass-header fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-12 px-4">
          <Link
            href="/explore"
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container-low transition-colors"
            aria-label="Back to catalog"
          >
            <ArrowLeft className="w-5 h-5 text-on-surface" strokeWidth={1.5} />
          </Link>
          <span
            className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ backgroundColor: product.brandColor + "15", color: product.brandColor }}
          >
            {product.brand}
          </span>
          <button
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container-low transition-colors cursor-pointer"
            aria-label="Share product"
          >
            <Share2 className="w-5 h-5 text-on-surface" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* ─── Desktop: Side-by-side layout / Mobile: Stacked ─── */}
      <div className="pt-12 lg:pt-14 max-w-7xl mx-auto lg:grid lg:grid-cols-[1fr_1fr] lg:gap-12 xl:gap-16">

        {/* ── LEFT: Sticky image column (desktop) ── */}
        <div className="lg:sticky lg:top-14 lg:self-start lg:h-[calc(100dvh-3.5rem)] lg:flex lg:items-center lg:p-8 xl:p-12">
          <div className="w-full">
            <HeroImage productName={product.name} productSlug={product.slug} unitsSold={product.unitsSold} imageCount={product.heroImages.length} activeImage={activeImage} setActiveImage={setActiveImage} />
          </div>
        </div>

        {/* ── RIGHT: Scrollable details column ── */}
        <div className="lg:py-8 xl:py-12">
          {/* Product Info */}
          <section className="px-5 pt-6 lg:px-0 lg:pt-0">
            <h1 className="text-2xl lg:text-4xl font-extrabold text-on-surface leading-tight tracking-tight font-[family-name:var(--font-manrope)]">
              {product.name}
            </h1>
            <p className="text-sm lg:text-base text-on-surface-variant mt-1">{product.subtitle}</p>

            <div className="mt-3">
              <StarRating rating={product.rating} count={product.reviewCount} />
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mt-4">
              <span className="text-3xl lg:text-4xl font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">
                &#8377;{currentPrice}
              </span>
              {product.originalPrice > product.price && (
                <>
                  <span className="text-base text-on-surface-variant/50 line-through">
                    &#8377;{product.originalPrice}
                  </span>
                  <span className="text-xs font-semibold text-primary-container bg-primary-fixed/20 px-2 py-0.5 rounded-full">
                    {product.discount}% off
                  </span>
                </>
              )}
            </div>
          </section>

          {/* AI Context Card */}
          <section className="px-5 mt-6 lg:px-0">
            <div className="feed-card-ai p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary-container" strokeWidth={1.5} />
                <span className="text-xs font-semibold text-primary-container uppercase tracking-wider">
                  {product.aiContext.title}
                </span>
              </div>
              <ul className="space-y-2.5">
                {product.aiContext.points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-container mt-2 shrink-0" />
                    <span className="text-sm text-on-surface leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Cohort Evidence */}
          <section className="px-5 mt-4 lg:px-0">
            <div className="flex items-center gap-3 p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/10">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-fixed/15 shrink-0">
                <span className="text-lg font-extrabold text-primary-container font-[family-name:var(--font-manrope)]">
                  {product.cohort.percentage}%
                </span>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                of users with your profile improved in <strong className="text-on-surface">{product.cohort.days} days</strong> — {product.cohort.users} users
              </p>
            </div>
          </section>

          {/* Variant Selectors */}
          <section className="px-5 mt-8 lg:px-0">
            {/* Variants (flavour, size, etc.) */}
            {product.variants && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/50 mb-2.5">
                {product.variants.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.options.map((v, i) => (
                  <button
                    key={v.value}
                    onClick={() => setSelectedVariant(i)}
                    className={`px-4 min-h-[44px] rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                      selectedVariant === i
                        ? "bg-primary-fixed/15 text-primary-container border border-primary-container"
                        : "bg-surface-container-low text-on-surface border border-outline-variant/10 hover:border-primary-container/40"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Pack size */}
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/50 mb-2.5">
                Pack size
              </p>
              <div className="flex gap-2">
                {product.packs.map((p, i) => (
                  <button
                    key={p.label}
                    onClick={() => setSelectedPack(i)}
                    className={`relative px-5 min-h-[44px] rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                      selectedPack === i
                        ? "bg-primary-fixed/15 text-primary-container border border-primary-container"
                        : "bg-surface-container-low text-on-surface border border-outline-variant/10 hover:border-primary-container/40"
                    }`}
                  >
                    {p.label}
                    {p.badge && (
                      <span className="absolute -top-2 -right-1 text-[10px] font-bold text-primary-container bg-primary-fixed/30 px-1.5 py-0.5 rounded-full">
                        {p.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity + Desktop Add to Cart */}
            <div className="mt-5 flex items-end gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/50 mb-2.5">
                  Quantity
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="flex items-center justify-center w-11 h-11 rounded-xl bg-surface-container-low cursor-pointer hover:bg-surface-container-high transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4 text-on-surface-variant" strokeWidth={2} />
                  </button>
                  <span className="text-lg font-semibold text-on-surface w-8 text-center">{qty}</span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="flex items-center justify-center w-11 h-11 rounded-xl bg-surface-container-low cursor-pointer hover:bg-surface-container-high transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4 text-on-surface-variant" strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Desktop inline CTA */}
              <button
                onClick={fromTreatment ? () => router.back() : undefined}
                className="hidden lg:flex flex-1 items-center justify-center gap-2 min-h-[48px] rounded-2xl bg-primary-container text-sm font-bold text-white cursor-pointer hover:bg-primary transition-colors duration-200 active:scale-[0.98]"
              >
                <ShoppingCart className="w-4 h-4" strokeWidth={2} />
                {fromTreatment ? "Choose product" : `Add to Cart · \u20B9${currentPrice * qty}`}
              </button>
            </div>
          </section>

          {/* Benefits */}
          <section className="px-5 mt-10 lg:px-0">
            <h2 className="text-lg lg:text-xl font-extrabold text-on-surface tracking-tight font-[family-name:var(--font-manrope)] mb-4">
              Benefits
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {product.benefits.map((b) => {
                const Icon = resolveIcon(b.icon);
                return (
                  <div key={b.title} className="p-4 lg:p-5 bg-surface-container-lowest rounded-2xl border border-outline-variant/8">
                    <Icon className="w-5 h-5 text-primary-container mb-2.5" strokeWidth={1.5} />
                    <p className="text-sm font-semibold text-on-surface">{b.title}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{b.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Trust Badges */}
          <section className="px-5 mt-8 lg:px-0">
            <div className="flex flex-wrap gap-2">
              {product.badges.map((badge) => (
                <span
                  key={badge}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-container-low text-xs font-medium text-on-surface-variant"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-primary-container" strokeWidth={1.5} />
                  {badge}
                </span>
              ))}
            </div>
          </section>

          {/* Expandable Sections */}
          <section className="px-5 mt-8 lg:px-0">
            <ExpandableSection title="Ingredients & Composition" defaultOpen>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {product.ingredients}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-primary-container" strokeWidth={1.5} />
                <span className="text-xs font-medium text-primary-container">View lab certificate</span>
              </div>
            </ExpandableSection>

            <ExpandableSection title="How to Use">
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {product.howToUse}
              </p>
            </ExpandableSection>

            <ExpandableSection title={`Reviews (${product.reviewCount})`}>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-center">
                  <p className="text-3xl font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">
                    {product.rating}
                  </p>
                  <StarRating rating={product.rating} count={product.reviewCount} />
                </div>
              </div>
              <div className="space-y-3">
                {product.reviews.map((review, idx) => (
                  <div key={idx} className="p-3 bg-surface-container-low rounded-xl">
                    <div className="flex items-center gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${s <= review.rating ? "text-tertiary-container fill-tertiary-container" : "text-outline-variant/30"}`}
                          strokeWidth={0}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-on-surface">&ldquo;{review.text}&rdquo;</p>
                    <p className="text-xs text-on-surface-variant/50 mt-1">
                      {review.author}, {review.age} {review.verified && "· Verified purchase"}
                    </p>
                  </div>
                ))}
              </div>
            </ExpandableSection>
          </section>

          {/* Protocol Fit */}
          <section className="px-5 mt-6 lg:px-0">
            <div className="feed-card-ai p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary-container" strokeWidth={1.5} />
                <span className="text-xs font-semibold text-primary-container uppercase tracking-wider">
                  Protocol fit
                </span>
              </div>
              <p className="text-sm text-on-surface">
                This fits your <strong>morning protocol</strong>. Take post-workout for best absorption, or with breakfast on rest days.
              </p>
              <button className="mt-3 w-full py-2.5 rounded-xl bg-primary-fixed/15 text-sm font-semibold text-primary-container cursor-pointer hover:bg-primary-fixed/25 transition-colors">
                {product.protocolFit}
              </button>
            </div>
          </section>

          {/* Expert Consult CTA */}
          <section className="px-5 mt-4 mb-32 lg:mb-12 lg:px-0">
            <div className="flex items-center gap-3 p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/10">
              <div className="w-10 h-10 rounded-full bg-primary-fixed/15 flex items-center justify-center shrink-0">
                <Stethoscope className="w-5 h-5 text-primary-container" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-on-surface">Not sure if this is right for you?</p>
                <p className="text-xs text-on-surface-variant">Free consult with a nutritionist</p>
              </div>
              <button className="px-4 py-2 rounded-xl bg-primary-container text-xs font-semibold text-white cursor-pointer hover:bg-primary transition-colors shrink-0">
                Book
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* ─── Sticky Add to Cart Footer (mobile only) ─── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-container-lowest border-t border-outline-variant/10">
        <div className="flex items-center gap-3 px-5 py-3">
          <div className="min-w-0">
            <p className="text-lg font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">
              &#8377;{currentPrice * qty}
            </p>
            {qty > 1 && (
              <p className="text-[11px] text-on-surface-variant">
                {qty} × &#8377;{currentPrice}
              </p>
            )}
          </div>
          <button
            onClick={fromTreatment ? () => router.back() : undefined}
            className="flex-1 flex items-center justify-center gap-2 min-h-[48px] rounded-2xl bg-primary-container text-sm font-bold text-white cursor-pointer hover:bg-primary transition-colors duration-200 active:scale-[0.98]"
          >
            <ShoppingCart className="w-4 h-4" strokeWidth={2} />
            {fromTreatment ? "Choose product" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
