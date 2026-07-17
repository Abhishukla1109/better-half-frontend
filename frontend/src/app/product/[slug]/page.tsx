"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Loader2,
  AlertCircle,
  Search,
  User,
  Menu,
  X,
  Home,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import ProfileSidebar from "@/components/layout/ProfileSidebar";
import { getProductBySlug } from "@/data/products";
import { getProductImage } from "@/data/images";
import { useCart } from "@/context/CartContext";
import { resolveVariantId } from "@/lib/shopify/variant-resolver";
import { resolveSegment } from "@/lib/protocolEngine";
import { useCatalogProducts } from "@/hooks/useCatalogProducts";
import type { Product } from "@/lib/protocolEngine";
import type { EnrichedPDP } from "@/data/enrichedProducts";
import { getEnrichedPDP } from "@/data/enrichedProducts";
import { PRODUCT_PAIRINGS, ROUTINE_HEADER, type PairingItem } from "@/data/productPairings";
import { useShopifyPDP } from "@/hooks/useShopifyPDP";
import { track } from "@/lib/mixpanel";
import { useActiveProfile } from "@/hooks/useActiveProfile";

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

/* ── Bold ingredient names in Product Details bullets ── */
const INGREDIENT_RE = new RegExp(
  [
    /\d+(?:\.\d+)?%\s*[A-Z][\w-]*/.source,      // "2% Niacinamide", "1.5%Zinc"
    /\b[A-Z][A-Z0-9]{1,}(?:-[A-Z0-9]+)*\b/.source, // ZPTO, KSM-66, BHA, DHT
    /\b[A-Z][a-z]{2,}(?:ol|in|ide|ase|ine|yl|ic|ate|one|ose|ene|ole)\b/.source, // Glycerin, Ceramide, Niacinamide
  ].join("|"),
  "g"
);

function highlightIngredients(text: string): React.ReactNode {
  INGREDIENT_RE.lastIndex = 0;
  const ranges: [number, number][] = [];
  let m: RegExpExecArray | null;
  while ((m = INGREDIENT_RE.exec(text)) !== null) {
    ranges.push([m.index, m.index + m[0].length]);
  }

  // Fallback: bold first 3 words when no ingredient pattern detected
  if (ranges.length === 0) {
    const wordRe = /\S+/g;
    let count = 0;
    let wm: RegExpExecArray | null;
    while ((wm = wordRe.exec(text)) !== null && count < 3) {
      ranges.push([wm.index, wm.index + wm[0].length]);
      count++;
    }
    // Merge the three word ranges into one span covering first N chars
    if (ranges.length > 0) {
      ranges.splice(0, ranges.length, [ranges[0][0], ranges[ranges.length - 1][1]]);
    }
  }

  if (ranges.length === 0) return text;

  // Merge overlapping/adjacent ranges
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [s, e] of ranges) {
    if (merged.length && s <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
    } else {
      merged.push([s, e]);
    }
  }

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  for (const [s, e] of merged) {
    if (s > cursor) nodes.push(text.slice(cursor, s));
    nodes.push(
      <strong key={s} className="font-semibold text-[#0a1e1e]">
        {text.slice(s, e)}
      </strong>
    );
    cursor = e;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
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

/* ── Why-recommended context ── */
const CONCERN_LABEL: Record<string, string> = {
  hair: "hair health and growth",
  beard: "beard growth and density",
  skin: "skin health and clarity",
  weight: "weight management",
  energy: "energy, nutrition, and gut health",
  sleep: "sleep quality and recovery",
  hormones: "hormonal balance and performance",
};

const CONCERN_DISPLAY: Record<string, string> = {
  hair: "Hair & Growth",
  beard: "Beard & Growth",
  energy: "Energy & Vitality",
  weight: "Weight Management",
  sleep: "Sleep & Recovery",
  hormones: "Hormones & Vitality",
  immunity: "Immunity",
  skin: "Skin & Glow",
  nutrition: "Nutrition",
};

const BRAND_COLOR: Record<string, string> = {
  "Man Matters": "#00897B",
  "Be Bodywise": "#E91E8C",
  "Little Joys": "#F59E0B",
};

function buildWhyContext(product: Product): string[] {
  const concern = product.concern[0] ?? "general wellness";
  const area = CONCERN_LABEL[concern] ?? concern;
  const meaningful = product.followUp.filter((f) => f !== "general health");

  const lines: string[] = [
    `Picked for ${area}.`,
  ];
  if (meaningful.length > 0) {
    lines.push(
      `Specifically targets: ${meaningful.slice(0, 3).join(", ")}.`,
    );
  }
  if (product.rating && product.reviewCount) {
    const count = product.reviewCount >= 1000
      ? `${(product.reviewCount / 1000).toFixed(1)}k`
      : product.reviewCount;
    lines.push(`Rated ${product.rating}/5 by ${count}+ verified users.`);
  }
  return lines;
}

/* ── Lightweight / Enriched PDP for new-catalog products ── */
function NewProductPDP({
  product,
  enriched,
  onBack,
}: {
  product: Product;
  enriched: EnrichedPDP | null;
  onBack: () => void;
}) {
  const router = useRouter();
  const { addItem, cart, openCart, checkout } = useCart();
  const { activeMember } = useActiveProfile();
  const hasProfile = activeMember !== null;

  const matchScore = useMemo(() => {
    if (!activeMember) return null;
    const profile = activeMember.profile;
    const gender = activeMember.type === "female" ? "female" : "male";

    // Map onboarding labels ("Hair / beard") → product concern values (["hair","beard"])
    const CONCERN_MAP: Record<string, string[]> = {
      "Hair / beard": ["hair", "beard"],
      "Skin / acne": ["skin"],
      "Energy / gut": ["energy"],
      "Weight": ["weight"],
      "Hormones": ["hormones"],
      "Sleep / mind": ["sleep"],
    };
    const rawConcerns = (profile.concerns as string | undefined) ?? profile.concern ?? "";
    const concernValues = rawConcerns.split(",").map((s) => s.trim()).filter(Boolean)
      .flatMap((c) => CONCERN_MAP[c] ?? [c.toLowerCase()]);

    const concernMatch = product.concern.some((c) => concernValues.includes(c));
    if (!concernMatch) return null;
    const genderOk = product.gender.includes(gender) || product.gender.includes("all");
    if (!genderOk) return null;

    let score = product.baseScore;
    const userSegments = resolveSegment(gender, profile.age ?? "", profile.shoppingFor, profile.kidsAge);
    const segmentOverlap = product.segment.some((s) => userSegments.includes(s));
    if (segmentOverlap) score += 5; else score -= 10;

    // Check follow-up answers stored under any key (hair_concern_type, etc.)
    const followUpStr = Object.values(profile).filter(Boolean).join(" ").toLowerCase();
    if (followUpStr && product.followUp.some((f) => followUpStr.includes(f.toLowerCase()))) score += 20;

    score = Math.min(score, 99);
    return score >= 80 ? score : null;
  }, [activeMember, product]);

  const images = enriched?.images?.length ? enriched.images : product.image ? [product.image] : [];
  const initialIndex = 0;

  // Deduplicate by label, sort smallest size first, keep first 2
  const packOptions = enriched?.packs
    ? [...new Map(enriched.packs.map((p) => [p.label, p])).values()]
        .sort((a, b) => (parseInt(a.label) || 0) - (parseInt(b.label) || 0))
        .slice(0, 2)
    : [];

  const cartCount = cart?.totalQuantity ?? 0;

  const [cartState, setCartState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [activeImage, setActiveImage] = useState(initialIndex);
  const [selectedPack, setSelectedPack] = useState(0);
  const [routineCartState, setRoutineCartState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const pairedItems = useMemo(() => {
    const pairs: PairingItem[] = PRODUCT_PAIRINGS[product.id] ?? [];
    return pairs.map((pair) => {
      const e = getEnrichedPDP(pair.slug);
      if (!e) return null;
      return { slug: pair.slug, reason: pair.reason, enriched: e };
    }).filter((x): x is { slug: string; reason: string; enriched: EnrichedPDP } => x !== null);
  }, [product.id]);

  const [selectedPairs, setSelectedPairs] = useState<Set<string>>(new Set());
  const [includeMain, setIncludeMain] = useState(true);
  const [pairPrices, setPairPrices] = useState<Record<string, number>>({});

  // Fetch prices for paired items that don't have one in local JSON
  useEffect(() => {
    const missing = pairedItems.filter(p => p.enriched.price == null);
    if (missing.length === 0) return;
    Promise.allSettled(
      missing.map(p =>
        fetch(`/api/shopify/pdp?handle=${encodeURIComponent(p.slug)}`)
          .then(r => r.json())
          .then((data: { price?: number } | null) => ({ slug: p.slug, price: data?.price }))
      )
    ).then(results => {
      const map: Record<string, number> = {};
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.price != null) map[r.value.slug] = r.value.price;
      }
      if (Object.keys(map).length > 0) setPairPrices(map);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairedItems.length]);

  // Initialise selection once pairedItems are known
  useEffect(() => {
    if (pairedItems.length > 0) {
      setSelectedPairs(new Set(pairedItems.map((p) => p.slug)));
    }
  }, [pairedItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePair = useCallback((slug: string) => {
    setSelectedPairs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  }, []);

  const routineTotal =
    (includeMain ? (enriched?.price ?? 0) : 0) +
    pairedItems
      .filter((p) => selectedPairs.has(p.slug))
      .reduce((sum, p) => sum + (p.enriched.price ?? pairPrices[p.slug] ?? 0), 0);

  const routineItemCount = (includeMain ? 1 : 0) + selectedPairs.size;

  const handleAddRoutine = useCallback(async () => {
    try { if (!localStorage.getItem("bh_auth")) { router.push("/"); return; } } catch {}
    if (routineCartState !== "idle" || routineItemCount === 0) return;
    setRoutineCartState("loading");
    // Collect variant IDs already in cart to avoid double-adding
    const inCartIds = new Set((cart?.items ?? []).map((i) => i.variantId));
    try {
      // Main product first (if selected)
      if (includeMain) {
        const mainVariantId = await resolveVariantId(product.id);
        if (mainVariantId && !inCartIds.has(mainVariantId)) {
          await addItem(mainVariantId, 1, { product_name: product.name, source: "routine-builder" });
          inCartIds.add(mainVariantId);
        }
      }
      // Paired products
      const toAdd = pairedItems.filter((p) => selectedPairs.has(p.slug));
      for (const item of toAdd) {
        const variantId = await resolveVariantId(item.slug);
        if (variantId && !inCartIds.has(variantId)) {
          await addItem(variantId, 1, { product_name: item.slug, source: "routine-builder" });
          inCartIds.add(variantId);
        }
      }
      setRoutineCartState("done");
    } catch {
      setRoutineCartState("error");
    } finally {
      setTimeout(() => setRoutineCartState("idle"), 2500);
    }
  }, [routineCartState, routineItemCount, includeMain, selectedPairs, pairedItems, cart, product.id, product.name, router, addItem]);

  // Fire once when this product page loads
  useEffect(() => {
    const source = (() => {
      try {
        const ref = document.referrer;
        if (ref.includes("/protocol")) return "protocol";
        if (ref.includes("/explore")) return "explore";
        if (ref.includes("/kids")) return "kids";
        return "direct";
      } catch { return "unknown"; }
    })();
    track("PDP Viewed", {
      product_id:   product.id,
      product_name: product.name,
      brand:        product.brand,
      price:        product.price,
      concern:      product.concern?.[0] ?? "",
      source,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  // Replace trailing size like "(30 N)" with the selected pack label
  const displayName = (() => {
    const base = enriched?.name ?? product.name;
    if (!packOptions.length) return base;
    const label = packOptions[selectedPack]?.label ?? "";
    return base.replace(/\(\d+\s*[Nn]\)\s*$/, `(${label})`).trim() || base;
  })();

  const [expandedIngredient, setExpandedIngredient] = useState<number | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "how-to-use">("details");
  const [pincode, setPincode] = useState("");
  const [deliveryMsg, setDeliveryMsg] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  const checkDelivery = () => {
    if (pincode.length !== 6) return;
    setDeliveryMsg(`Delivery available to ${pincode} · Usually ships in 2–3 days`);
  };

  const discountPct =
    product.mrp > product.price
      ? Math.round((1 - product.price / product.mrp) * 100)
      : 0;

  const brandColor = BRAND_COLOR[product.brand] ?? "#00897B";
  const whyLines = buildWhyContext(product);

  const handleShare = useCallback(() => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({ title: displayName, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  }, [displayName]);

  const handleAddToCart = useCallback(async () => {
    try { if (!localStorage.getItem("bh_auth")) { router.push("/"); return; } } catch {}
    if (cartState !== "idle") return;
    setCartState("loading");
    try {
      const variantId = await resolveVariantId(product.id);
      if (!variantId) throw new Error("not found");
      const source = (() => {
        try {
          const ref = document.referrer;
          if (ref.includes("/protocol")) return "protocol";
          if (ref.includes("/explore")) return "explore";
          return "direct";
        } catch { return "unknown"; }
      })();
      await addItem(variantId, 1, {
        product_name: product.name,
        brand: product.brand,
        price: product.price,
        concern: product.concern?.[0],
        source,
      });
      setCartState("done");
    } catch {
      setCartState("error");
    } finally {
      setTimeout(() => setCartState("idle"), 2500);
    }
  }, [addItem, cartState, product.id, product.name, product.brand, product.price, product.concern, router]);

  const handleBuyNow = useCallback(async () => {
    try { if (!localStorage.getItem("bh_auth")) { router.push("/"); return; } } catch {}
    if (cartState !== "idle") return;
    setCartState("loading");
    try {
      const variantId = await resolveVariantId(product.id);
      if (!variantId) throw new Error("not found");
      const source = (() => {
        try {
          const ref = document.referrer;
          if (ref.includes("/protocol")) return "protocol";
          if (ref.includes("/explore")) return "explore";
          return "direct";
        } catch { return "unknown"; }
      })();
      await addItem(variantId, 1, {
        product_name: product.name,
        brand: product.brand,
        price: product.price,
        concern: product.concern?.[0],
        source,
      });
      checkout();
    } catch {
      setCartState("error");
      setTimeout(() => setCartState("idle"), 2500);
    }
  }, [addItem, checkout, cartState, product.id, product.name, product.brand, product.price, product.concern, router]);

  return (
    <div className="min-h-dvh bg-surface pb-24">

      {/* ── Sticky header ── */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ background: "linear-gradient(135deg, #004D40 0%, #00695C 60%, #00897B 100%)" }}>
        <div className="max-w-2xl mx-auto flex items-center h-14 px-4 gap-3">
          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={() => setNavOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer shrink-0"
              aria-label="Menu"
            >
              <Menu className="w-4 h-4 text-white" strokeWidth={1.5} />
            </button>
            <span className="text-sm font-extrabold text-white tracking-wide font-[family-name:var(--font-manrope)]">BetterHalf</span>
          </div>
          {/* Right: search + profile + cart */}
          <div className="flex items-center gap-0.5">
            <Link href="/explore" className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer" aria-label="Search">
              <Search className="w-4 h-4 text-white" strokeWidth={1.5} />
            </Link>
            <button
              onClick={() => window.dispatchEvent(new Event("bh-profile-sidebar-open"))}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              aria-label="Profile"
            >
              <User className="w-4 h-4 text-white" strokeWidth={1.5} />
            </button>
            <button onClick={openCart} className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer" aria-label="Cart">
              <ShoppingCart className="w-4 h-4 text-white" strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-400 text-[9px] font-extrabold text-white flex items-center justify-center leading-none">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="pt-14 max-w-2xl mx-auto">

        {/* ── Hero image ── */}
        {(() => {
          let touchStartX = 0;
          const onTouchStart = (e: React.TouchEvent) => { touchStartX = e.touches[0].clientX; };
          const onTouchEnd = (e: React.TouchEvent) => {
            const dx = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(dx) < 40) return;
            if (dx < 0) setActiveImage((p) => Math.min(p + 1, images.length - 1));
            else setActiveImage((p) => Math.max(p - 1, 0));
          };
          return (
            <div
              className="relative w-full h-80 bg-surface-container-low overflow-hidden select-none"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {images.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={images[activeImage]} alt={product.name} className="w-full h-full object-contain transition-opacity duration-300 pointer-events-none" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-8xl font-extrabold text-primary-container/15 font-[family-name:var(--font-manrope)]">{product.name.charAt(0)}</span>
                </div>
              )}
              {discountPct >= 5 && (
                <span className="absolute top-4 left-4 bg-primary-container text-white text-xs font-extrabold px-2.5 py-1 rounded-lg leading-none">{discountPct}% OFF</span>
              )}
              {/* Dot indicators */}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {images.map((_, i) => (
                    <button key={i} onClick={() => setActiveImage(i)} className={`rounded-full transition-all cursor-pointer ${activeImage === i ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"}`} />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="flex gap-2 px-4 pt-3 overflow-x-auto scrollbar-hide">
            {images.map((img, i) => (
              <button key={i} onClick={() => setActiveImage(i)} className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${activeImage === i ? "border-primary-container" : "border-transparent opacity-50"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* ── Product info block ── */}
        <div className="px-5 pt-5">
          {/* Brand pill */}
          <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full mb-3" style={{ backgroundColor: brandColor + "22", color: brandColor }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: brandColor }} />
            {product.brand}
          </span>

          {/* Little Joys: age badge */}
          {enriched?.ageGroup && (
            <div className="mb-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-400/20">
                👶 Ages {enriched.ageGroup}
              </span>
            </div>
          )}

          <div className="flex items-start gap-2">
            <h1 className="flex-1 text-xl font-extrabold text-on-surface leading-snug tracking-tight font-[family-name:var(--font-manrope)]">
              {displayName}
            </h1>
            <button
              onClick={handleShare}
              className="shrink-0 w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center transition-colors cursor-pointer mt-0.5"
              aria-label="Share product"
            >
              <Share2 className="w-3.5 h-3.5 text-on-surface-variant/60" strokeWidth={1.5} />
            </button>
          </div>
          {enriched?.subtitle && (
            <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">{enriched.subtitle}</p>
          )}

          {/* Variant picker — shown when siblings exist (size / flavour / pack / age) */}
          {enriched?.siblings && enriched.siblings.length > 1 && (
            <div className="mt-3">
              <p className="text-[11px] font-semibold text-on-surface-variant/60 uppercase tracking-wide mb-1.5">
                {enriched.siblings.length > 2 ? "Choose variant" : "Choose size"}
              </p>
              <div className="flex flex-wrap gap-2">
                {enriched.siblings.map(s => {
                  const isCurrent = s.slug === enriched.slug;
                  return (
                    <button
                      key={s.slug}
                      onClick={() => !isCurrent && router.push(`/product/${s.slug}`)}
                      className={[
                        "px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold border transition-all",
                        isCurrent
                          ? "bg-[#004f54] text-white border-[#004f54] shadow-sm"
                          : "bg-white text-[#1a2e2e] border-[#c8d8d8] hover:border-[#004f54]",
                      ].join(" ")}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* For / With callout (Be Bodywise) */}
          {enriched?.forWith && (
            <div className="flex flex-wrap gap-2 mt-2.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant/10 text-on-surface-variant">
                <span className="text-on-surface-variant/50 font-medium">For</span> {enriched.forWith.for}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant/10 text-on-surface-variant">
                <span className="text-on-surface-variant/50 font-medium">With</span> {enriched.forWith.with}
              </span>
              {enriched.recommendation && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                  ✦ {enriched.recommendation} recommend
                </span>
              )}
            </div>
          )}

          {/* Suitability chips */}
          {(() => {
            const chips: { emoji: string; text: string }[] = [];
            const suitableFor = enriched?.productDetails.details.find(
              (d) => d.feature.toLowerCase() === "suitable for age"
            )?.value;
            if (suitableFor) chips.push({ emoji: "👤", text: suitableFor });
            for (const c of product.concern ?? []) {
              const concernLabel = CONCERN_DISPLAY[c?.toLowerCase() ?? ""];
              if (concernLabel) chips.push({ emoji: "🎯", text: concernLabel });
            }
            if (!chips.length && matchScore === null) return null;
            return (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {chips.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/10">
                    {c.emoji} {c.text}
                  </span>
                ))}
                {matchScore !== null && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                    ✦ {matchScore}% match
                  </span>
                )}
              </div>
            );
          })()}

          {/* Little Joys: allergen warning */}
          {enriched?.allergens && enriched.allergens.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200/60">
                ⚠️ Contains: {enriched.allergens.join(", ")}
              </span>
            </div>
          )}

          {/* Rating — catalog value or enriched fallback */}
          {(() => {
            const r = product.rating ?? enriched?.rating?.average ?? null;
            const cnt = product.reviewCount ?? enriched?.rating?.count ?? null;
            if (!r) return null;
            return (
            <div className="flex items-center gap-1.5 mt-2.5">
              <div className="flex">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} className={`w-4 h-4 ${s <= Math.floor(r) ? "text-amber-400 fill-amber-400" : "text-outline-variant/30"}`} strokeWidth={0} />
                ))}
              </div>
              <span className="text-sm font-semibold text-on-surface">{r.toFixed(1)}</span>
              {cnt && (
                <span className="text-xs text-on-surface-variant/50">({cnt >= 1000 ? `${(cnt / 1000).toFixed(1)}k` : cnt} reviews)</span>
              )}
            </div>
            );
          })()}

          {/* Price */}
          <div className="flex items-baseline gap-3 mt-3">
            <span className="text-3xl font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">&#8377;{product.price}</span>
            {product.mrp > product.price && (
              <>
                <span className="text-base text-on-surface-variant/40 line-through">&#8377;{product.mrp}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: brandColor + "18", color: brandColor }}>{discountPct}% off</span>
              </>
            )}
          </div>

          {/* Pack size pills */}
          {packOptions.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/50 mb-2">📦 Pack size</p>
              <div className="flex gap-2">
                {packOptions.map((p, i) => (
                  <button
                    key={p.label}
                    onClick={() => setSelectedPack(i)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer active:scale-95 ${
                      selectedPack === i
                        ? "bg-primary-container text-white border-primary-container shadow-sm"
                        : "bg-surface-container-low text-on-surface border-outline-variant/20 hover:border-primary-container/40"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Delivery bar ── */}
          <div className="mt-4 rounded-2xl overflow-hidden border border-teal-100">
            <div className="flex items-center gap-3 px-4 py-3" style={{ background: "linear-gradient(135deg, #E0F2F1 0%, #F0FBF9 100%)" }}>
              <span className="text-2xl shrink-0">🚚</span>
              <div>
                <p className="text-xs font-bold text-teal-800">Free delivery across India</p>
                <p className="text-[10px] text-teal-700/70 mt-0.5">Ships in 2–3 business days &nbsp;·&nbsp; Cash on delivery available</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white/70 border-t border-teal-100/80">
              <span className="text-sm shrink-0">📍</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Check delivery by pincode"
                maxLength={6}
                value={pincode}
                onChange={(e) => { setPincode(e.target.value.slice(0, 6)); setDeliveryMsg(null); }}
                className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none"
              />
              <button
                onClick={checkDelivery}
                className="text-xs font-bold text-teal-700 cursor-pointer hover:opacity-80 transition-opacity shrink-0 bg-teal-100 hover:bg-teal-200 px-2.5 py-1 rounded-full"
              >
                Check
              </button>
            </div>
            {deliveryMsg && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border-t border-green-100">
                <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" strokeWidth={2} />
                <p className="text-xs text-green-700 font-medium">{deliveryMsg}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Little Joys trust strip ── */}
        {product.brand === "Little Joys" && (
          <div className="mt-3 mx-5 flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)", border: "1px solid #FCD34D40" }}>
            <span className="text-2xl shrink-0">🔬</span>
            <div>
              <p className="text-[12px] font-extrabold text-amber-800">Developed by Paediatricians</p>
              <p className="text-[10px] text-amber-700/70 mt-0.5">Every batch lab-tested · No preservatives · No refined sugar</p>
            </div>
          </div>
        )}

        {/* ── BetterHalf AI card ── */}
        {hasProfile ? (
          <div className="mt-4 mx-5 rounded-2xl overflow-hidden" style={{ background: "linear-gradient(145deg, #00352E 0%, #004D40 60%, #00564A 100%)" }}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-extrabold text-white/50 uppercase tracking-widest">BetterHalf AI</span>
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-300/10 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3" strokeWidth={2.5} />
                  Matched to your {CONCERN_DISPLAY[product.concern?.[0]?.toLowerCase() ?? ""] ?? "Health"} protocol
                </span>
              </div>
              <p className="text-[11px] font-bold text-amber-300/90 uppercase tracking-wider mb-3">Why we picked this for you</p>
              <ul className="space-y-2.5">
                {whyLines.map((line, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-amber-300/50 mt-1 text-[10px] shrink-0">◆</span>
                    <span className="text-sm text-white/90 leading-relaxed">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-4 py-2.5 border-t border-white/8 bg-black/10 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-white/30" strokeWidth={1.5} />
              <span className="text-[10px] text-white/30">Personalised using your health profile</span>
            </div>
          </div>
        ) : (
          <div className="mt-4 mx-5 rounded-2xl overflow-hidden border border-teal-100/80" style={{ background: "linear-gradient(135deg, #E0F2F1 0%, #F0FBF9 100%)" }}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-600/10">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-extrabold text-teal-600/70 uppercase tracking-widest">BetterHalf AI</span>
              </div>
              <p className="text-sm font-extrabold text-on-surface mb-1 font-[family-name:var(--font-manrope)]">Not sure if this is right for you?</p>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-4">Take our free 2-min health assessment and get a protocol built specifically for your concern and stage.</p>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer"
                style={{ background: "linear-gradient(135deg, #004D40 0%, #00897B 100%)" }}
              >
                <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
                Take the free quiz
              </Link>
            </div>
          </div>
        )}

        {/* ── Little Joys: Benefits ── */}
        {enriched?.benefits && enriched.benefits.length > 0 && (
          <div className="mt-6 px-5">
            <h2 className="text-lg font-extrabold text-on-surface tracking-tight font-[family-name:var(--font-manrope)] mb-3">✨ Key Benefits</h2>
            <div className="grid grid-cols-2 gap-3">
              {enriched.benefits.map((b, i) => (
                <div key={i} className="flex flex-col gap-2 p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.icon} alt={b.title} className="w-10 h-10 object-contain" />
                  <p className="text-[12px] font-bold text-on-surface leading-snug">{b.title}</p>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">{b.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Product Details / How to Use tabs ── */}
        {enriched && (
          <div className="mt-6">
            {/* Tab bar */}
            <div className="flex border-b-2 border-[#e2e8e8] px-5">
              {(["details", "how-to-use"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3.5 text-[14px] font-700 cursor-pointer transition-colors ${
                    activeTab === tab
                      ? "text-[#004f54] border-b-2 border-[#004f54] -mb-[2px]"
                      : "text-[#9ca3af]"
                  }`}
                >
                  {tab === "details" ? "Product Details" : "How to Use"}
                </button>
              ))}
            </div>

            <div className="px-5 pt-5 pb-2">
              {activeTab === "details" ? (
                <div>
                  {/* Supplement facts grid */}
                  {(() => {
                    const SKIP = new Set(["price", "lasts for"]);
                    const FEAT_EMOJI: Record<string, string> = {
                      "suitable for age": "👤", "net qty": "📦", "flavour": "🍬",
                      "properties": "🌱", "country of origin": "🌏", "net weight": "⚖️",
                      "form": "💊", "shelf life": "📅",
                    };
                    const rows = enriched.productDetails.details.filter(
                      (d) => !SKIP.has(d.feature.toLowerCase())
                    );
                    if (!rows.length) return null;
                    return (
                      <div className="grid grid-cols-2 gap-2 mb-5">
                        {rows.map((d, i) => {
                          const emoji = FEAT_EMOJI[d.feature.toLowerCase()] ?? "•";
                          const isLong = d.value.length > 35;
                          return (
                            <div key={i} className={`flex items-start gap-2.5 px-3.5 py-3 rounded-2xl bg-[#f7fafa] border border-[#e2e8e8] ${isLong ? "col-span-2" : ""}`}>
                              <span className="text-base shrink-0 mt-0.5">{emoji}</span>
                              <div className="min-w-0">
                                <p className="text-[10px] font-700 text-[#9ca3af] uppercase tracking-wider">{d.feature}</p>
                                <p className="text-[13px] font-600 text-[#1a2e2e] mt-0.5 leading-snug">{d.value}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Description bullets */}
                  {enriched.productDetails.description.length > 0 && (() => {
                    const fullText = enriched.productDetails.description.join(" ").trim();
                    const EMOJI_RE = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}\u{2700}-\u{27BF}]/u;
                    const segments: string[] = [];
                    let buf = "";
                    const chars = [...fullText];
                    for (let idx = 0; idx < chars.length; idx++) {
                      const ch = chars[idx];
                      if (idx > 0 && EMOJI_RE.test(ch)) {
                        const trimmed = buf.replace(/[.\s]+$/, "").trim();
                        if (trimmed) segments.push(trimmed);
                        buf = ch;
                      } else {
                        buf += ch;
                      }
                    }
                    const last = buf.replace(/[.\s]+$/, "").trim();
                    if (last) segments.push(last);

                    const DISCLAIMER_RE = /medical advice|physician|dietician|nutritionist|consult a/i;
                    const bullets: { icon: string; text: string }[] = [];
                    let disclaimer = "";

                    for (const seg of segments) {
                      if (DISCLAIMER_RE.test(seg)) { disclaimer = seg; continue; }
                      const m = seg.match(/^([\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}\u{2700}-\u{27BF}][\u{FE0F}]?)\s*/u);
                      if (m) {
                        bullets.push({ icon: m[1], text: seg.slice(m[0].length).trim() });
                      } else {
                        seg.split(/\.\s+/).map(s => s.replace(/\.$/, "").trim()).filter(s => s.length > 8)
                          .forEach(s => bullets.push({ icon: "", text: s }));
                      }
                    }

                    return (
                      <div className="space-y-2.5">
                        {bullets.map((b, i) => (
                          <div key={i} className="flex items-start gap-3.5 bg-[#f7fafa] rounded-2xl px-4 py-3.5 border border-[#e8f0f0]">
                            {b.icon
                              ? <span className="text-xl leading-none shrink-0 mt-0.5">{b.icon}</span>
                              : <span className="w-2 h-2 rounded-full bg-[#004f54] shrink-0 mt-[7px]" />
                            }
                            <p className="text-[13.5px] font-[450] text-[#1a2e2e] leading-relaxed">{highlightIngredients(b.text)}</p>
                          </div>
                        ))}
                        {disclaimer && (
                          <div className="flex gap-3 px-4 py-3.5 rounded-2xl bg-blue-50 border border-blue-100">
                            <span className="text-lg shrink-0 mt-0.5">👨‍⚕️</span>
                            <p className="text-[12px] text-blue-700 leading-relaxed">{disclaimer}.</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* How to Use */
                <ol className="space-y-3">
                  {(() => {
                    const raw = enriched.howToUse || "Take as directed. Consistent daily use recommended for best results.";

                    // Strip section headers like "How to use (Product Name)\n"
                    const cleaned = raw
                      .replace(/^How to use[^\n]*\n+/i, "")
                      .replace(/^How to Use\s*[:\-]?\s*\n+/i, "")
                      .trim();

                    let steps: string[];
                    const hasStepMarker = /(?:Step\s*)?\d+\s*[:.]/i.test(cleaned);

                    if (hasStepMarker) {
                      // Split on step markers whether newline-separated or inline-concatenated.
                      // Lookahead keeps the split clean; (?<![0-9-]) avoids splitting "2-3 minutes".
                      steps = cleaned
                        .split(/\n+\s*(?:Step\s*)?\d+\s*[:.]\s*/i)
                        .flatMap(chunk =>
                          // If a chunk still contains inline step markers (e.g. "week2: Rinse"),
                          // split those too — but only when NOT preceded by digit or dash.
                          chunk.split(/(?<![0-9\-])(?:Step\s*)?\d+\s*[:.]\s*/i)
                        )
                        .map(s => s.replace(/^(?:Step\s*)?\d+\s*[:.]\s*/i, "").replace(/\.$/, "").trim())
                        .filter(s => s.length > 5);
                    } else {
                      // No step markers — split on newlines first, then sentences
                      const byLine = cleaned.split(/\n+/).map(s => s.trim()).filter(s => s.length > 10);
                      steps = byLine.length > 1 ? byLine : cleaned.split(/\.\s+/).map(s => s.trim()).filter(s => s.length > 10);
                    }

                    // Dedupe near-identical steps
                    const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
                    const deduped = steps.reduce<string[]>((kept, s) => {
                      const dominated = kept.some(k => {
                        if (norm(k) === norm(s)) return true;
                        const a = norm(k), b = norm(s);
                        const shorter = a.length < b.length ? a : b;
                        const longer  = a.length < b.length ? b : a;
                        const words = shorter.split(" ").filter(w => w.length > 3);
                        return words.length > 0 && words.filter(w => longer.includes(w)).length / words.length > 0.7;
                      });
                      if (!dominated) kept.push(s);
                      return kept;
                    }, []);

                    return deduped.map((step, i) => (
                      <li key={i} className="flex items-start gap-4 bg-[#f7fafa] rounded-2xl px-4 py-3.5 border border-[#e8f0f0]">
                        <span className="w-8 h-8 rounded-full bg-[#004f54] text-white text-[13px] font-700 flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-[13.5px] font-500 text-[#1a2e2e] leading-relaxed pt-1">{step}</p>
                      </li>
                    ));
                  })()}
                </ol>
              )}
            </div>
          </div>
        )}

        {/* ── Safe & Effective badges grid ── */}
        {enriched?.badges && enriched.badges.length > 0 && (
          <div className="mt-6 px-5">
            <h2 className="text-lg font-extrabold text-on-surface tracking-tight font-[family-name:var(--font-manrope)] mb-3">🛡️ Safe &amp; Effective</h2>
            <div className="grid grid-cols-3 gap-3">
              {enriched.badges.map((badge, i) => (
                <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/8 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={badge.icon} alt={badge.label} className="w-10 h-10 object-contain" />
                  <span className="text-[11px] font-medium text-on-surface-variant leading-tight">{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Key ingredients ── */}
        {enriched?.ingredients && enriched.ingredients.length > 0 && (
          <div className="mt-8 bg-surface-container-lowest py-6">
            <h2 className="text-lg font-extrabold text-on-surface tracking-tight font-[family-name:var(--font-manrope)] px-5 mb-4">
              🌿 Key Ingredients
            </h2>
            <div className="px-5 space-y-2">
              {enriched.ingredients.map((ing, i) => {
                const bgColors = ["bg-green-50","bg-amber-50","bg-blue-50","bg-purple-50","bg-rose-50"];
                const bg = bgColors[i % bgColors.length];
                const isOpen = expandedIngredient === i;
                return (
                <div key={i} className="rounded-2xl bg-surface border border-outline-variant/10 overflow-hidden">
                  <button
                    onClick={() => setExpandedIngredient(isOpen ? null : i)}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 cursor-pointer text-left"
                  >
                    <div className={`shrink-0 w-12 h-12 rounded-xl ${bg} flex items-center justify-center`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ing.icon} alt={ing.name} className="w-9 h-9 object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface leading-snug">{ing.name}</p>
                      <p className="text-[10px] text-on-surface-variant/45 mt-0.5">
                        {isOpen ? "Tap to collapse" : "Tap to learn more"}
                      </p>
                    </div>
                    {isOpen
                      ? <ChevronUp className="w-4 h-4 text-on-surface-variant/40 shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-on-surface-variant/40 shrink-0" />
                    }
                  </button>
                  {isOpen && (ing.shortDesc || ing.longDesc) && (
                    <div className="px-4 pb-4">
                      <div className="h-px bg-outline-variant/10 mb-3" />
                      {ing.shortDesc && (
                        <p className="text-[13px] text-on-surface-variant leading-relaxed">
                          {ing.shortDesc.replace(/^Our paediatricians say:\s*/i, "").replace(/^Doctors? say:\s*/i, "")}
                        </p>
                      )}
                      {ing.longDesc && (
                        <p className="text-[13px] text-on-surface-variant leading-relaxed mt-2">{ing.longDesc}</p>
                      )}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── What to expect / Key ingredients (timeline) ── */}
        {enriched?.timeline && enriched.timeline.length > 0 && (() => {
          const isIngredientList = enriched.timeline.every(s => !s.period);
          return (
            <div className="mt-8 bg-surface-container-lowest py-6">
              <h2 className="text-lg font-extrabold text-on-surface tracking-tight font-[family-name:var(--font-manrope)] px-5 mb-5">
                {isIngredientList ? "🧪 Key ingredients" : "📅 What to expect"}
              </h2>
              <div className="px-5 space-y-0">
                {enriched.timeline.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shrink-0 z-10">
                        <span className="text-xs font-bold text-white">{i + 1}</span>
                      </div>
                      {i < enriched.timeline.length - 1 && <div className="w-0.5 flex-1 bg-primary-container/20 my-1" />}
                    </div>
                    <div className={`flex-1 ${i < enriched.timeline.length - 1 ? "pb-6" : "pb-0"}`}>
                      {step.period ? (
                        <span className="inline-block text-[11px] font-bold text-primary-container bg-primary-container/10 px-2.5 py-1 rounded-full mb-1.5">{step.period.trim()}</span>
                      ) : null}
                      {step.title.trim() && step.title.trim() !== step.period?.trim() && (
                        <p className="text-sm font-semibold text-on-surface">{step.title.trim()}</p>
                      )}
                      {step.description?.trim() && (
                        <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">{
                          (() => {
                            const sentences = step.description.trim().match(/[^.!?]*(?:[.!?]+|$)/g)
                              ?.map(s => s.trim()).filter(Boolean) ?? [];
                            return sentences.slice(0, 2).join(' ').trim() || step.description.trim();
                          })()
                        }</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}


        {/* ── Complete your routine ── */}
        {pairedItems.length > 0 && (
          <div className="mt-8" style={{ background: "linear-gradient(145deg, #00352E 0%, #004D40 60%, #00564A 100%)" }}>
            <div className="px-5 pt-5 pb-6">
              {/* Header */}
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3 h-3 text-amber-300/70" strokeWidth={1.5} />
                <span className="text-[10px] font-extrabold text-white/40 uppercase tracking-widest">Pairs well with</span>
              </div>
              <h2 className="text-[18px] font-extrabold text-white font-[family-name:var(--font-manrope)] mb-4">
                {ROUTINE_HEADER[product.concern?.[0] ?? ""] ?? "Complete your routine"}
              </h2>

              {/* Selectable cards — horizontal scroll, peek effect */}
              <div className="-mx-5 px-5 flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                {/* Main product card (first) */}
                {(() => {
                  const img = enriched?.images?.[0];
                  const avg = enriched?.rating?.average;
                  const cnt = enriched?.rating?.count;
                  const price = enriched?.price;
                  return (
                    <button
                      key="__main__"
                      onClick={() => setIncludeMain(prev => !prev)}
                      className={`shrink-0 w-[148px] flex flex-col rounded-2xl overflow-hidden text-left transition-all duration-200 cursor-pointer active:scale-[0.97] ${includeMain ? "opacity-100" : "opacity-50"}`}
                      style={{ background: "rgba(255,255,255,0.97)" }}
                    >
                      <div className="relative aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt={enriched?.name ?? product.name} className="w-full h-full object-contain p-2" />
                        ) : (
                          <span className="text-4xl font-extrabold text-gray-200">{(enriched?.name ?? product.name).charAt(0)}</span>
                        )}
                        <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${includeMain ? "bg-primary-container shadow-sm" : "bg-white/80 border-2 border-gray-300"}`}>
                          {includeMain && <CheckCircle className="w-4 h-4 text-white" strokeWidth={2.5} />}
                        </div>
                      </div>
                      <div className="flex flex-col flex-1 p-3">
                        <div className="flex-1 flex flex-col gap-1">
                          <p className="text-[12px] font-semibold text-on-surface leading-snug line-clamp-2">{enriched?.name ?? product.name}</p>
                          <span className="self-start text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full leading-snug">
                            Your pick
                          </span>
                          {avg != null && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" strokeWidth={0} />
                              <span className="text-[11px] font-semibold text-on-surface">{avg.toFixed(1)}</span>
                              {cnt != null && (
                                <span className="text-[10px] text-on-surface-variant/40">
                                  ({cnt >= 1000 ? `${(cnt / 1000).toFixed(1)}k` : cnt})
                                </span>
                              )}
                            </div>
                          )}
                          {price != null && (
                            <p className="text-[15px] font-extrabold text-on-surface mt-0.5">₹{price}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })()}

                {/* Paired product cards */}
                {pairedItems.map(({ slug, reason, enriched: pe }) => {
                  const selected = selectedPairs.has(slug);
                  const img = pe.images?.[0];
                  const avg = pe.rating?.average;
                  const cnt = pe.rating?.count;
                  const price = pe.price ?? pairPrices[slug];
                  return (
                    <div
                      key={slug}
                      className={`shrink-0 w-[148px] relative flex flex-col rounded-2xl overflow-hidden transition-opacity duration-200 ${selected ? "opacity-100" : "opacity-50"}`}
                      style={{ background: "rgba(255,255,255,0.97)" }}
                    >
                      {/* Tick — toggles selection, does NOT navigate */}
                      <button
                        onClick={() => togglePair(slug)}
                        className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${selected ? "bg-primary-container shadow-sm" : "bg-white/80 border-2 border-gray-300"}`}
                        aria-label={selected ? "Remove from routine" : "Add to routine"}
                      >
                        {selected && <CheckCircle className="w-4 h-4 text-white" strokeWidth={2.5} />}
                      </button>
                      {/* Card body — tapping opens the full PDP */}
                      <Link href={`/product/${slug}`} className="flex flex-col flex-1 active:scale-[0.97] transition-transform duration-150">
                        <div className="relative aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt={pe.name} className="w-full h-full object-contain p-2" />
                          ) : (
                            <span className="text-4xl font-extrabold text-gray-200">{pe.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex flex-col flex-1 p-3">
                          <div className="flex-1 flex flex-col gap-1">
                            <p className="text-[12px] font-semibold text-on-surface leading-snug line-clamp-2">{pe.name}</p>
                            <span className="self-start text-[10px] font-semibold text-primary-container bg-primary-container/10 px-2 py-0.5 rounded-full leading-snug">
                              {reason}
                            </span>
                            {avg != null && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" strokeWidth={0} />
                                <span className="text-[11px] font-semibold text-on-surface">{avg.toFixed(1)}</span>
                                {cnt != null && (
                                  <span className="text-[10px] text-on-surface-variant/40">
                                    ({cnt >= 1000 ? `${(cnt / 1000).toFixed(1)}k` : cnt})
                                  </span>
                                )}
                              </div>
                            )}
                            {price != null && (
                              <p className="text-[15px] font-extrabold text-on-surface mt-0.5">₹{price}</p>
                            )}
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* Single CTA */}
              <button
                onClick={handleAddRoutine}
                disabled={routineCartState !== "idle" || routineItemCount === 0}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[13px] font-bold text-white transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-50"
                style={
                  routineCartState === "done"  ? { background: "#22c55e" } :
                  routineCartState === "error" ? { background: "#ef4444" } :
                  routineItemCount === 0       ? { background: "rgba(255,255,255,0.15)" } :
                  { background: "linear-gradient(135deg, #004034 0%, #1a6b58 100%)" }
                }
              >
                {routineCartState === "loading" && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />}
                {routineCartState === "done"    && <CheckCircle className="w-4 h-4" strokeWidth={2.5} />}
                {routineCartState === "idle"    && <ShoppingCart className="w-4 h-4" strokeWidth={2} />}
                {routineCartState === "loading" ? "Adding to cart…"
                  : routineCartState === "done" ? "Added to cart!"
                  : routineCartState === "error" ? "Something went wrong"
                  : routineItemCount === 0 ? "Select at least one"
                  : `Add ${routineItemCount} to cart${routineTotal > 0 ? ` · ₹${routineTotal}` : ""}`}
              </button>
            </div>
          </div>
        )}

        {/* ── Reviews ── */}
        {enriched?.reviews && enriched.reviews.length > 0 && (
          <div className="mt-8 bg-surface-container-lowest py-6">
            <h2 className="text-lg font-extrabold text-on-surface tracking-tight font-[family-name:var(--font-manrope)] px-5 mb-4">⭐ What customers say</h2>
            <div className="px-5 space-y-3">
              {enriched.reviews.map((review, i) => (
                <div key={i} className="p-4 bg-surface rounded-2xl border border-outline-variant/8">
                  <div className="flex items-center gap-1 mb-2">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? "text-amber-400 fill-amber-400" : "text-outline-variant/20"}`} strokeWidth={0} />
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-on-surface mb-1">{review.title}</p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">&ldquo;{review.body}&rdquo;</p>
                  <p className="text-[11px] text-on-surface-variant/40 mt-2">{review.author}{review.verified && " · Verified"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Things to note ── */}
        {enriched?.disclaimers && enriched.disclaimers.length > 0 && (
          <div className="mt-8 px-5">
            <h2 className="text-base font-extrabold text-on-surface tracking-tight font-[family-name:var(--font-manrope)] mb-3">⚠️ Things to note</h2>
            <div className="space-y-3">
              {enriched.disclaimers.map((d, i) => (
                <div key={i} className="flex gap-3 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/8">
                  {d.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.image} alt={d.title} className="w-10 h-10 object-contain shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-on-surface-variant/40 shrink-0 mt-0.5" strokeWidth={1.5} />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{d.title}</p>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{d.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FAQs ── */}
        {enriched?.faqs && enriched.faqs.length > 0 && (
          <div className="mt-8 px-5">
            <h2 className="text-lg font-extrabold text-on-surface tracking-tight font-[family-name:var(--font-manrope)] mb-4">💬 Got Questions?</h2>
            <div className="space-y-2">
              {enriched.faqs.map((faq, i) => (
                <div key={i} className="rounded-2xl border border-outline-variant/10 overflow-hidden bg-surface-container-lowest">
                  <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)} className="w-full flex items-start justify-between gap-3 px-4 py-4 cursor-pointer text-left">
                    <span className="text-sm font-semibold text-on-surface leading-snug">{faq.question}</span>
                    {expandedFaq === i
                      ? <ChevronUp className="w-4 h-4 text-on-surface-variant/50 shrink-0 mt-0.5" />
                      : <ChevronDown className="w-4 h-4 text-on-surface-variant/50 shrink-0 mt-0.5" />
                    }
                  </button>
                  {expandedFaq === i && (
                    <div className="px-4 pb-4">
                      <div className="h-px bg-outline-variant/10 mb-3" />
                      <p className="text-sm text-on-surface-variant leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Little Joys: Medical advisory notice ── */}
        {product.brand === "Little Joys" && (enriched?.productType === "kids" || enriched?.ageGroup) && (
          <div className="mt-6 mx-5 flex gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-200/60">
            <span className="text-xl shrink-0 mt-0.5">👨‍⚕️</span>
            <div>
              <p className="text-[12px] font-bold text-blue-900">Consult before starting</p>
              <p className="text-[11px] text-blue-800/70 mt-0.5 leading-relaxed">
                For children with any medical condition or dietary restriction, consult a paediatrician before use.
              </p>
            </div>
          </div>
        )}

        {/* ── Additional information ── */}
        {enriched?.additionalInfo && enriched.additionalInfo.length > 0 && (
          <div className="mt-8 px-5">
            <h2 className="text-base font-extrabold text-on-surface tracking-tight font-[family-name:var(--font-manrope)] mb-3">📋 Additional Information</h2>
            <div className="rounded-2xl border border-outline-variant/10 overflow-hidden bg-surface-container-lowest divide-y divide-outline-variant/8">
              {enriched.additionalInfo.map((row, i) => (
                <div key={i} className="flex items-baseline gap-3 px-4 py-3">
                  <span className="text-[11px] font-semibold text-on-surface-variant/55 uppercase tracking-wide shrink-0 w-28 leading-relaxed">{row.title}</span>
                  <span className="text-xs text-on-surface leading-relaxed flex-1">{row.content}</span>
                </div>
              ))}
            </div>
          </div>
        )}


      </div>

      {/* ── Sticky Footer: Add to Cart + Buy Now ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface-container-lowest border-t border-outline-variant/10">
        {/* Trust strip */}
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-3 pt-2 pb-0 px-4">
          <span className="flex items-center gap-1 text-[10px] font-medium text-on-surface-variant/50">
            <CheckCircle className="w-3 h-3 text-green-500 shrink-0" strokeWidth={2.5} />
            Authentic product
          </span>
          <span className="text-outline-variant/30 text-[10px]">·</span>
          <span className="text-[10px] font-medium text-on-surface-variant/50">Free delivery</span>
          <span className="text-outline-variant/30 text-[10px]">·</span>
          <span className="text-[10px] font-medium text-on-surface-variant/50">Cash on delivery</span>
        </div>
        <div className="max-w-2xl mx-auto flex items-center gap-2.5 px-4 py-3">
          <div className="min-w-0 shrink-0">
            <p className="text-base font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">&#8377;{product.price}</p>
            {product.mrp > product.price && (
              <p className="text-[10px] text-on-surface-variant/40 line-through">&#8377;{product.mrp}</p>
            )}
          </div>
          {/* Add to Cart — outlined */}
          <button
            onClick={handleAddToCart}
            disabled={cartState !== "idle"}
            className={`flex-1 flex items-center justify-center gap-1.5 min-h-[48px] rounded-2xl text-sm font-bold border-2 transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-70 ${
              cartState === "done" ? "border-green-500 text-green-600 bg-green-50"
              : cartState === "error" ? "border-red-400 text-red-500 bg-red-50"
              : "border-primary-container text-primary-container bg-transparent hover:bg-primary-container/8"
            }`}
          >
            {cartState === "loading" && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />}
            {cartState === "done" && <CheckCircle className="w-4 h-4" strokeWidth={2} />}
            {cartState === "error" && <AlertCircle className="w-4 h-4" strokeWidth={2} />}
            {cartState === "idle" && <ShoppingCart className="w-4 h-4" strokeWidth={2} />}
            <span>{cartState === "loading" ? "Adding…" : cartState === "done" ? "Added!" : cartState === "error" ? "Error" : "Add to Cart"}</span>
          </button>
          {/* Buy Now — solid */}
          <button
            onClick={handleBuyNow}
            disabled={cartState !== "idle"}
            className={`flex-1 flex items-center justify-center gap-1.5 min-h-[48px] rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-70 ${
              cartState === "done" ? "bg-green-500 text-white"
              : cartState === "error" ? "bg-red-500 text-white"
              : "bg-primary-container text-white hover:bg-primary shadow-sm"
            }`}
          >
            {cartState === "loading" && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />}
            {cartState === "done" && <CheckCircle className="w-4 h-4" strokeWidth={2} />}
            {cartState === "error" && <AlertCircle className="w-4 h-4" strokeWidth={2} />}
            <span>{cartState === "loading" ? "Processing…" : cartState === "done" ? "Done!" : cartState === "error" ? "Unavailable" : "Buy Now"}</span>
          </button>
        </div>
      </div>

      {/* ── Hamburger nav drawer ── */}
      {navOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]"
            onClick={() => setNavOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed top-0 left-0 bottom-0 z-[61] w-[280px] max-w-[85vw] flex flex-col shadow-2xl animate-slide-in-left" style={{ background: "linear-gradient(180deg, #00352E 0%, #004D40 100%)" }}>
            {/* Drawer header — matches main header layout exactly */}
            <div className="flex items-center gap-2 h-14 px-4 border-b border-white/8">
              <button
                onClick={() => setNavOpen(false)}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer shrink-0"
                aria-label="Close menu"
              >
                <Menu className="w-4 h-4 text-white" strokeWidth={1.5} />
              </button>
              <span className="text-sm font-extrabold text-white tracking-wide font-[family-name:var(--font-manrope)]">BetterHalf</span>
            </div>

            {/* Nav links */}
            <nav className="flex-1 px-3 py-5 space-y-1">
              {[
                { href: "/protocol", icon: Home, label: "Home" },
                { href: "/explore", icon: Search, label: "Shop" },
                { href: "/experts", icon: Stethoscope, label: "Experts" },
                { href: "/insights", icon: BarChart3, label: "Insights" },
              ].map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setNavOpen(false)}
                  className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <Icon className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                  <span className="text-sm font-semibold">{label}</span>
                </Link>
              ))}

              <div className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-white/25 cursor-default select-none">
                <Sparkles className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                <span className="text-sm font-semibold">Ask AI</span>
                <span className="ml-auto text-[9px] font-bold text-white/25 uppercase tracking-widest">Soon</span>
              </div>
            </nav>

            {/* Footer */}
            <div className="px-5 pb-8 pt-3 border-t border-white/8">
              <button
                onClick={() => { setNavOpen(false); window.dispatchEvent(new Event("bh-profile-sidebar-open")); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/8 hover:bg-white/15 transition-colors cursor-pointer"
              >
                <User className="w-4 h-4 text-white/60 shrink-0" strokeWidth={1.5} />
                <span className="text-sm font-semibold text-white/70">My profiles</span>
              </button>
              <p className="text-[10px] text-white/20 uppercase tracking-widest text-center mt-4">Powered by Mosaic Wellness</p>
            </div>
          </div>
        </>
      )}

      {/* Profile sidebar — listens for bh-profile-sidebar-open event */}
      <ProfileSidebar />
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
  const { products: catalogProducts, loading: catalogLoading } = useCatalogProducts();
  const newProduct = !product ? catalogProducts.find((p) => p.id === slug) : undefined;
  const { enriched } = useShopifyPDP(slug);

  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedPack, setSelectedPack] = useState(0);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [cartState, setCartState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const { addItem } = useCart();

  useEffect(() => {
    if (!product && !catalogLoading && !newProduct) {
      router.replace("/explore");
    }
  }, [product, newProduct, catalogLoading, router]);

  if (!product && !newProduct) return null;

  /* ── Lightweight / Enriched PDP for new catalog products ── */
  const handleBack = () => window.history.length > 1 ? router.back() : router.replace("/explore");
  if (newProduct) {
    // For Little Joys products, the slug (e.g. "multivitamin-gummies") may collide with a
    // Man Matters enriched entry. Look up the lj- prefixed key first; if not found, pass null
    // so the PDP falls back to raw Shopify catalog data rather than showing wrong brand content.
    const productEnriched = newProduct.brand === "Little Joys"
      ? (getEnrichedPDP(`lj-${slug}`) ?? null)
      : enriched;
    return <NewProductPDP product={newProduct} enriched={productEnriched} onBack={handleBack} />;
  }

  /* product is guaranteed non-null from here — new catalog was handled above */
  if (!product) return null;

  const currentPrice = product.packs[selectedPack]?.price ?? product.price;

  const handleAddToCart = useCallback(async () => {
    if (fromTreatment) { router.back(); return; }
    try { if (!localStorage.getItem("bh_auth")) { router.push("/"); return; } } catch {}
    if (cartState !== "idle") return;
    setCartState("loading");
    try {
      const variantId = await resolveVariantId(slug);
      if (!variantId) throw new Error("variant not found");
      await addItem(variantId, qty);
      setCartState("done");
    } catch {
      setCartState("error");
    } finally {
      setTimeout(() => setCartState("idle"), 2500);
    }
  }, [fromTreatment, router, cartState, slug, qty, addItem]);

  return (
    <div className="min-h-dvh bg-surface">
      {/* ─── Sticky Header ─── */}
      <header className="glass-header fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-12 px-4">
          <button
            onClick={() => window.history.length > 1 ? router.back() : router.replace("/explore")}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container-low transition-colors cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-on-surface" strokeWidth={1.5} />
          </button>
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
                onClick={handleAddToCart}
                disabled={cartState !== "idle"}
                className="hidden lg:flex flex-1 items-center justify-center gap-2 min-h-[48px] rounded-2xl bg-primary-container text-sm font-bold text-white cursor-pointer hover:bg-primary transition-colors duration-200 active:scale-[0.98] disabled:opacity-70"
              >
                {cartState === "loading" && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />}
                {cartState === "done" && <CheckCircle className="w-4 h-4" strokeWidth={2} />}
                {cartState === "error" && <AlertCircle className="w-4 h-4" strokeWidth={2} />}
                {cartState === "idle" && <ShoppingCart className="w-4 h-4" strokeWidth={2} />}
                {fromTreatment
                  ? "Choose product"
                  : cartState === "loading" ? "Adding…"
                  : cartState === "done" ? "Added to cart!"
                  : cartState === "error" ? "Not available"
                  : `Add to Cart · ₹${currentPrice * qty}`}
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
            onClick={handleAddToCart}
            disabled={cartState !== "idle"}
            className="flex-1 flex items-center justify-center gap-2 min-h-[48px] rounded-2xl bg-primary-container text-sm font-bold text-white cursor-pointer hover:bg-primary transition-colors duration-200 active:scale-[0.98] disabled:opacity-70"
          >
            {cartState === "loading" && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />}
            {cartState === "done" && <CheckCircle className="w-4 h-4" strokeWidth={2} />}
            {cartState === "error" && <AlertCircle className="w-4 h-4" strokeWidth={2} />}
            {cartState === "idle" && <ShoppingCart className="w-4 h-4" strokeWidth={2} />}
            {fromTreatment
              ? "Choose product"
              : cartState === "loading" ? "Adding…"
              : cartState === "done" ? "Added!"
              : cartState === "error" ? "Not available"
              : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
