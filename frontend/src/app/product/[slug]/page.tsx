"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
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
import { getProductImage } from "@/data/images";
import { useCart } from "@/context/CartContext";
import { resolveVariantId } from "@/lib/shopify/variant-resolver";
import { resolveSegment } from "@/lib/protocolEngine";
import { useCatalogProducts } from "@/hooks/useCatalogProducts";
import type { Product } from "@/lib/protocolEngine";
import type { EnrichedPDP } from "@/data/enrichedProducts";
import { ROUTINE_HEADER } from "@/data/productPairings";
import { useShopifyPDP } from "@/hooks/useShopifyPDP";
import { track } from "@/lib/mixpanel";
import { useActiveProfile } from "@/hooks/useActiveProfile";

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim();
}

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

  // Helper to pull a typed section from pdpContent
  function pdp<T>(type: string): T | null {
    const s = enriched?.pdpContent?.find(sec => sec.type === type);
    return s ? s.data as T : null;
  }

  // If pdpContent exists, old metafield sections are suppressed entirely
  const hasPdpContent = !!enriched?.pdpContent?.length;

  const images = enriched?.images?.length ? enriched.images : product.image ? [product.image] : [];
  const initialIndex = 0;

  // Deduplicate by label, strip internal SKU codes (MWxx.nnnnn format), keep first 2
  const SKU_RE = /^MW[A-Z]{2,}\.\d{4,}/i;
  const packOptions = enriched?.packs
    ? [...new Map(enriched.packs.map((p) => [p.label, p])).values()]
        .filter((p) => p.label && !SKU_RE.test(p.label))
        .sort((a, b) => (parseInt(a.label) || 0) - (parseInt(b.label) || 0))
        .slice(0, 2)
    : [];

  const cartCount = cart?.totalQuantity ?? 0;

  const [cartState, setCartState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [activeImage, setActiveImage] = useState(initialIndex);
  const [selectedPack, setSelectedPack] = useState(0);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [routineCartState, setRoutineCartState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const [pairedItems, setPairedItems] = useState<Array<{ slug: string; reason: string; enriched: EnrichedPDP }>>([]);
  const [selectedPairs, setSelectedPairs] = useState<Set<string>>(new Set());
  const [includeMain, setIncludeMain] = useState(true);

  // Fetch enriched data for each paired product from Shopify
  useEffect(() => {
    const raw = enriched?.pairings ?? [];
    if (raw.length === 0) { setPairedItems([]); return; }
    let cancelled = false;
    Promise.allSettled(
      raw.map(({ slug, reason }) =>
        fetch(`/api/shopify/pdp?handle=${encodeURIComponent(slug)}`)
          .then((r) => r.json())
          .then((data: EnrichedPDP | null) => data ? { slug, reason, enriched: data } : null)
      )
    ).then((results) => {
      if (cancelled) return;
      const items = results
        .filter((r): r is PromiseFulfilledResult<{ slug: string; reason: string; enriched: EnrichedPDP } | null> => r.status === "fulfilled")
        .map((r) => r.value)
        .filter((x): x is { slug: string; reason: string; enriched: EnrichedPDP } => x !== null);
      setPairedItems(items);
      if (items.length > 0) setSelectedPairs(new Set(items.map((p) => p.slug)));
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enriched?.pairings]);

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
      .reduce((sum, p) => sum + (p.enriched.price ?? 0), 0);

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

  const selectedShopifyVariant = enriched?.shopifyVariants?.[selectedVariantIdx];
  const displayPrice = selectedShopifyVariant?.price ?? product.price;
  const displayMrp   = selectedShopifyVariant?.mrp   ?? product.mrp;

  const discountPct =
    displayMrp > displayPrice
      ? Math.round((1 - displayPrice / displayMrp) * 100)
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
      const variantId = selectedShopifyVariant?.id ?? await resolveVariantId(product.id);
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
        price: displayPrice,
        concern: product.concern?.[0],
        source,
      });
      setCartState("done");
    } catch {
      setCartState("error");
    } finally {
      setTimeout(() => setCartState("idle"), 2500);
    }
  }, [addItem, cartState, selectedShopifyVariant, product.id, product.name, product.brand, displayPrice, product.concern, router]);

  const handleBuyNow = useCallback(async () => {
    try { if (!localStorage.getItem("bh_auth")) { router.push("/"); return; } } catch {}
    if (cartState !== "idle") return;
    setCartState("loading");
    try {
      const variantId = selectedShopifyVariant?.id ?? await resolveVariantId(product.id);
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
        price: displayPrice,
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
      <header className="fixed top-0 left-0 right-0 z-50 gradient-pdp-header">
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
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-400 text-2xs font-extrabold text-white flex items-center justify-center leading-none">
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
              className="relative w-full h-[380px] bg-surface-container-low overflow-hidden select-none"
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
              <span className="inline-flex items-center gap-1.5 text-label font-bold px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-400/20">
                👶 Ages {enriched.ageGroup}
              </span>
            </div>
          )}

          <div className="flex items-start gap-2">
            <h1 className="flex-1 text-2xl font-extrabold text-on-surface leading-snug tracking-tight font-[family-name:var(--font-manrope)]">
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
              <p className="text-label font-semibold text-on-surface-variant/60 uppercase tracking-wide mb-1.5">
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
                        "px-3.5 py-1.5 rounded-full text-label font-semibold border transition-all",
                        isCurrent
                          ? "bg-brand text-white border-brand shadow-sm"
                          : "bg-white text-on-dark border-[#c8d8d8] hover:border-brand",
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
              <span className="inline-flex items-center gap-1.5 text-label font-semibold px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant/10 text-on-surface-variant">
                <span className="text-on-surface-variant/50 font-medium">For</span> {enriched.forWith.for}
              </span>
              <span className="inline-flex items-center gap-1.5 text-label font-semibold px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant/10 text-on-surface-variant">
                <span className="text-on-surface-variant/50 font-medium">With</span> {enriched.forWith.with}
              </span>
              {enriched.recommendation && (
                <span className="inline-flex items-center gap-1 text-label font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
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
                  <span key={i} className="inline-flex items-center gap-1 text-label font-medium px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/10">
                    {c.emoji} {c.text}
                  </span>
                ))}
                {matchScore !== null && (
                  <span className="inline-flex items-center gap-1 text-label font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                    ✦ {matchScore}% match
                  </span>
                )}
              </div>
            );
          })()}

          {/* Little Joys: allergen warning */}
          {enriched?.allergens && enriched.allergens.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1 text-icon font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200/60">
                ⚠️ Contains: {enriched.allergens.join(", ")}
              </span>
            </div>
          )}

          {/* Rating — catalog value or enriched fallback */}
          {(() => {
            const r = enriched?.rating?.average ?? product.rating ?? null;
            const cnt = enriched?.rating?.count ?? product.reviewCount ?? null;
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
            <span className="text-3xl font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">&#8377;{displayPrice}</span>
            {displayMrp > displayPrice && (
              <>
                <span className="text-base text-on-surface-variant/40 line-through">&#8377;{displayMrp}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: brandColor + "18", color: brandColor }}>{discountPct}% off</span>
              </>
            )}
          </div>

          {/* Pack size pills — Shopify variants (functional) */}
          {enriched?.shopifyVariants && enriched.shopifyVariants.length > 1 && (
            <div className="mt-4">
              <p className="text-label font-semibold uppercase tracking-wider text-on-surface-variant/50 mb-2">Pack size</p>
              <div className="flex gap-2 flex-wrap">
                {enriched.shopifyVariants.map((v, i) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariantIdx(i)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer active:scale-95 ${
                      selectedVariantIdx === i
                        ? "bg-primary-container text-white border-primary-container shadow-sm"
                        : "bg-surface-container-low text-on-surface border-outline-variant/20 hover:border-primary-container/40"
                    }`}
                  >
                    {v.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pack size pills — legacy bh_packs cosmetic (for products without Shopify variants) */}
          {(!enriched?.shopifyVariants || enriched.shopifyVariants.length <= 1) && packOptions.length > 0 && (
            <div className="mt-4">
              <p className="text-label font-semibold uppercase tracking-wider text-on-surface-variant/50 mb-2">📦 Pack size</p>
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
                <p className="text-icon text-teal-700/70 mt-0.5">Ships in 2–3 business days &nbsp;·&nbsp; Cash on delivery available</p>
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
              <p className="text-xs font-extrabold text-amber-800">Developed by Paediatricians</p>
              <p className="text-icon text-amber-700/70 mt-0.5">Every batch lab-tested · No preservatives · No refined sugar</p>
            </div>
          </div>
        )}

        {/* ── BetterHalf AI card ── */}
        {hasProfile ? (
          <div className="mt-4 mx-5 rounded-2xl overflow-hidden gradient-pdp-dark">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" strokeWidth={1.5} />
                </div>
                <span className="text-icon font-extrabold text-white/50 uppercase tracking-widest">BetterHalf AI</span>
                <span className="ml-auto inline-flex items-center gap-1 text-icon font-bold text-amber-300 bg-amber-300/10 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3" strokeWidth={2.5} />
                  Matched to your {CONCERN_DISPLAY[product.concern?.[0]?.toLowerCase() ?? ""] ?? "Health"} protocol
                </span>
              </div>
              <p className="text-label font-bold text-amber-300/90 uppercase tracking-wider mb-3">Why we picked this for you</p>
              <ul className="space-y-2.5">
                {whyLines.map((line, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-amber-300/50 mt-1 text-icon shrink-0">◆</span>
                    <span className="text-sm text-white/90 leading-relaxed">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-4 py-2.5 border-t border-white/8 bg-black/10 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-white/30" strokeWidth={1.5} />
              <span className="text-icon text-white/30">Personalised using your health profile</span>
            </div>
          </div>
        ) : (
          <div className="mt-4 mx-5 rounded-2xl overflow-hidden border border-teal-100/80" style={{ background: "linear-gradient(135deg, #E0F2F1 0%, #F0FBF9 100%)" }}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-600/10">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" strokeWidth={1.5} />
                </div>
                <span className="text-icon font-extrabold text-teal-600/70 uppercase tracking-widest">BetterHalf AI</span>
              </div>
              <p className="text-sm font-extrabold text-on-surface mb-1 font-[family-name:var(--font-manrope)]">Not sure if this is right for you?</p>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-4">Take our free 2-min health assessment and get a protocol built specifically for your concern and stage.</p>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer gradient-pdp-header"
              >
                <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
                Take the free quiz
              </Link>
            </div>
          </div>
        )}

        {/* ── Key Benefits ── */}
        {(() => {
          type KBItem = { icon?: string; text?: string; title?: string; description?: string };
          const pdpBenefits = pdp<{ items: KBItem[] }>("key_benefits");
          if (pdpBenefits?.items?.length) {
            return (
              <div className="mt-6">
                <h2 className="text-xl font-extrabold text-on-surface tracking-tight font-[family-name:var(--font-manrope)] px-5 mb-3">✨ Key Benefits</h2>
                <div className="flex gap-3 px-5 overflow-x-auto scrollbar-hide pb-1">
                  {pdpBenefits.items.map((b, i) => (
                    <div key={i} className="shrink-0 w-[160px] rounded-2xl bg-surface-container-lowest border border-outline-variant/8 overflow-hidden">
                      {b.icon ? (
                        <div className="w-full aspect-square overflow-hidden bg-gray-50 flex items-center justify-center p-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={b.icon} alt={b.text ?? ""} className="w-full h-full object-contain" />
                        </div>
                      ) : null}
                      <div className="p-3">
                        <p className="text-label font-bold text-on-surface leading-snug">{b.text ?? b.title ?? ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          const APP_PROMO = /\bapp\b|download|daily reminder|\breward|order usin|install|\bwallet\b|play.?store|app.?store|cashback|google play|apple store/i;
          if (hasPdpContent) return null;
          const cleanBenefits = (enriched?.benefits ?? []).filter(
            b => !APP_PROMO.test(b.title ?? "") && !APP_PROMO.test(b.description ?? "")
          );
          if (!cleanBenefits.length) return null;
          return (
          <div className="mt-6">
            <h2 className="text-xl font-extrabold text-on-surface tracking-tight font-[family-name:var(--font-manrope)] px-5 mb-3">✨ Key Benefits</h2>
            <div className="flex gap-3 px-5 overflow-x-auto scrollbar-hide pb-1">
              {cleanBenefits.map((b, i) => (
                <div key={i} className="shrink-0 w-[180px] rounded-2xl bg-surface-container-lowest border border-outline-variant/8 overflow-hidden">
                  {b.icon ? (
                    <div className="w-full aspect-square overflow-hidden bg-gray-50 flex items-center justify-center p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={b.icon} alt={b.title} className="w-full h-full object-contain" />
                    </div>
                  ) : null}
                  <div className="p-3">
                    <p className="text-label font-bold text-on-surface leading-snug mb-1">{b.title}</p>
                    {b.description && !/^[-\s]+$/.test(b.description) && (
                      <p className="text-label text-on-surface-variant leading-relaxed">{stripHtml(b.description)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          );
        })()}

        {/* ── Product Details / How to Use tabs ── */}
        {enriched && (
          <div className="mt-6">
            {/* Tab bar */}
            <div className="flex border-b-2 border-border-light px-5">
              {(["details", "how-to-use"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3.5 text-sm font-700 cursor-pointer transition-colors ${
                    activeTab === tab
                      ? "text-brand border-b-2 border-brand -mb-[2px]"
                      : "text-gray-400"
                  }`}
                >
                  {tab === "details" ? "Product Details" : "How to Use"}
                </button>
              ))}
            </div>

            <div className="px-5 pt-5 pb-2">
              {activeTab === "details" ? (
                <div>
                  {hasPdpContent
                    ? <div dangerouslySetInnerHTML={{ __html: pdp<{ html: string }>("description")?.html ?? "" }} className="text-body text-on-dark leading-relaxed" />
                    : enriched.productDetails?.description?.length > 0 && (() => {
                    const DISCLAIMER_RE = /medical advice|physician|dietician|nutritionist|consult a/i;
                    const iconFor = (text: string): LucideIcon => {
                      const t = text.toLowerCase();
                      if (/biotin|zinc|vitamin|ingredient|compound|extract|acid|protein|mineral|nutrient|collagen|keratin|niacin/i.test(t)) return FlaskConical;
                      if (/day|week|month|result|visible|proven|clinical|study|user|reported|consistent/i.test(t)) return TrendingUp;
                      if (/free|safe|tested|certified|gmo|gluten|preservative|artificial|natural|pure/i.test(t)) return ShieldCheck;
                      if (/hair|scalp|growth|follicle|strand|baldness/i.test(t)) return Zap;
                      if (/skin|moisture|hydrat|pore|glow|ceramide/i.test(t)) return Droplets;
                      return CheckCircle;
                    };

                    const bullets: { emoji: string; title: string; body: string }[] = [];
                    let disclaimer = "";

                    for (const item of enriched.productDetails.description) {
                      const seg = item.trim().replace(/^[►▶→•·▸▹◆◇✓✔]+\s*/u, "");
                      if (!seg) continue;
                      if (DISCLAIMER_RE.test(seg)) { disclaimer = seg; continue; }
                      const emojiMatch = seg.match(/^([\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}\u{2700}-\u{27BF}][\u{FE0F}]?)\s*/u);
                      const rawText = emojiMatch ? seg.slice(emojiMatch[0].length).trim() : seg;
                      const emoji = emojiMatch ? emojiMatch[1] : "";
                      const colonIdx = rawText.indexOf(":");
                      const hasColon = colonIdx > 0 && colonIdx < 45;
                      bullets.push({
                        emoji,
                        title: hasColon ? rawText.slice(0, colonIdx).trim() : "",
                        body:  hasColon ? rawText.slice(colonIdx + 1).trim() : rawText,
                      });
                    }

                    return (
                      <div>
                        {bullets.map((b, i) => {
                          const Icon = iconFor(b.title + " " + b.body);
                          return (
                            <div key={i} className={`flex items-start gap-3.5 py-4 ${i < bullets.length - 1 ? "border-b border-[#eff4f4]" : ""}`}>
                              <div className="shrink-0 w-8 h-8 rounded-full bg-brand/8 flex items-center justify-center mt-0.5">
                                {b.emoji
                                  ? <span className="text-base leading-none">{b.emoji}</span>
                                  : <Icon className="w-[15px] h-[15px] text-brand" strokeWidth={1.5} />
                                }
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                {b.title && <p className="text-body font-bold text-on-dark leading-snug mb-1">{b.title}</p>}
                                <p className={`leading-relaxed ${b.title ? "text-label text-gray-500" : "text-body text-on-dark"}`}>{stripHtml(b.body)}</p>
                              </div>
                            </div>
                          );
                        })}
                        {disclaimer && (
                          <div className="flex gap-3 px-4 py-3.5 rounded-2xl bg-blue-50 border border-blue-100 mt-2">
                            <span className="text-lg shrink-0 mt-0.5">👨‍⚕️</span>
                            <p className="text-xs text-blue-700 leading-relaxed">{disclaimer}.</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* How to Use */
                <div>
                  {(() => {
                    type HTUStep = { title?: string; description?: string; image?: string | null };
                    const pdpHtu = pdp<{ steps?: HTUStep[]; html?: string }>("how_to_use");
                    if (hasPdpContent && pdpHtu?.steps?.length) {
                      return pdpHtu.steps.filter(s => s.description?.trim()).map((s, i) => (
                        <div key={i} className={`flex items-start gap-3.5 py-4 ${i < (pdpHtu.steps!.length - 1) ? "border-b border-[#eff4f4]" : ""}`}>
                          {s.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.image} alt={s.description ?? ""} className="shrink-0 w-14 h-14 rounded-xl object-contain bg-gray-50" />
                          ) : (
                            <div className="shrink-0 w-8 h-8 rounded-full bg-brand/8 flex items-center justify-center mt-0.5">
                              <span className="text-body font-bold text-brand">{i + 1}</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0 pt-0.5">
                            {s.title && <p className="text-body font-bold text-on-dark leading-snug mb-1">{s.title}</p>}
                            <p className={`leading-relaxed ${s.title ? "text-label text-gray-500" : "text-body text-on-dark"}`}>{stripHtml(s.description ?? "")}</p>
                          </div>
                        </div>
                      ));
                    }
                    if (hasPdpContent && pdpHtu?.html) {
                      return <div dangerouslySetInnerHTML={{ __html: pdpHtu.html }} className="text-body text-on-dark leading-relaxed px-1" />;
                    }
                    if (hasPdpContent) return null;
                    const raw = enriched.howToUse || "Take as directed. Consistent daily use recommended for best results.";

                    const cleaned = raw
                      .replace(/^How to use[^\n]*\n+/i, "")
                      .replace(/^How to Use\s*[:\-]?\s*\n+/i, "")
                      .trim();

                    let steps: string[];
                    const hasStepMarker = /(?:Step\s*)?\d+\s*[:.]/i.test(cleaned);

                    if (hasStepMarker) {
                      steps = cleaned
                        .split(/\n+\s*(?:Step\s*)?\d+\s*[:.]\s*/i)
                        .flatMap(chunk => chunk.split(/(?<![0-9\-])(?:Step\s*)?\d+\s*[:.]\s*/i))
                        .map(s => s.replace(/^(?:Step\s*)?\d+\s*[:.]\s*/i, "").replace(/\.$/, "").trim())
                        .filter(s => s.length > 5);
                    } else {
                      const byLine = cleaned.split(/\n+/).map(s => s.trim()).filter(s => s.length > 10);
                      if (byLine.length > 1) {
                        steps = byLine;
                      } else {
                        // Kit products: split on "ProductName: instruction" pattern
                        const byLabel = cleaned
                          .split(/(?<=[a-z\)])\s+(?=[A-Z][^:]{2,30}:)/)
                          .map(s => s.trim())
                          .filter(s => s.length > 5);
                        steps = byLabel.length > 1 ? byLabel : cleaned.split(/\.\s+/).map(s => s.trim()).filter(s => s.length > 10);
                      }
                    }

                    // Merge continuation lines — any line not starting with uppercase is a fragment
                    const mergedSteps: string[] = [];
                    for (const s of steps) {
                      if (mergedSteps.length > 0 && !/^[A-Z]/.test(s.trim())) {
                        mergedSteps[mergedSteps.length - 1] += " " + s;
                      } else {
                        mergedSteps.push(s);
                      }
                    }
                    steps = mergedSteps;

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

                    return deduped.map((step, i) => {
                      const colonIdx = step.indexOf(":");
                      const hasLabel = colonIdx > 0 && colonIdx < 40;
                      const label = hasLabel ? step.slice(0, colonIdx).trim() : "";
                      const body  = hasLabel ? step.slice(colonIdx + 1).trim() : step;
                      return (
                        <div key={i} className={`flex items-start gap-3.5 py-4 ${i < deduped.length - 1 ? "border-b border-[#eff4f4]" : ""}`}>
                          <div className="shrink-0 w-8 h-8 rounded-full bg-brand/8 flex items-center justify-center mt-0.5">
                            <span className="text-body font-bold text-brand">{i + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            {label && <p className="text-body font-bold text-on-dark leading-snug mb-1">{label}</p>}
                            <p className={`leading-relaxed ${label ? "text-label text-gray-500" : "text-body text-on-dark"}`}>{body}</p>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Key Ingredients (pdpContent preferred) ── */}
        {(() => {
          type KICard = { name?: string; description?: string; longDescription?: string | null; icon?: string | null };
          const pdpKi = pdp<{ cards: KICard[] }>("key_ingredients");
          if (pdpKi?.cards?.length) {
            return (
              <div className="mt-8 bg-surface-container-lowest py-6">
                <h2 className="text-xl font-extrabold text-on-surface tracking-tight font-[family-name:var(--font-manrope)] px-5 mb-4">🌿 Key Ingredients</h2>
                <div className="px-5 space-y-2">
                  {pdpKi.cards.map((c, i) => {
                    const bgColors = ["bg-green-50","bg-amber-50","bg-blue-50","bg-purple-50","bg-rose-50"];
                    const isOpen = expandedIngredient === i;
                    const hasMore = !!c.longDescription;
                    return (
                      <div key={i} className="rounded-2xl bg-surface border border-outline-variant/10 overflow-hidden">
                        <button
                          onClick={() => hasMore ? setExpandedIngredient(isOpen ? null : i) : undefined}
                          className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-left ${hasMore ? "cursor-pointer" : ""}`}
                        >
                          <div className={`shrink-0 w-12 h-12 rounded-xl ${bgColors[i % bgColors.length]} flex items-center justify-center overflow-hidden`}>
                            {c.icon
                              ? /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={c.icon} alt={c.name ?? ""} className="w-9 h-9 object-contain" />
                              : <span className="text-2xl">🌿</span>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-on-surface leading-snug">{c.name}</p>
                            {c.description && <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{stripHtml(c.description)}</p>}
                          </div>
                          {hasMore && (isOpen
                            ? <ChevronUp className="w-4 h-4 text-on-surface-variant/50 shrink-0" />
                            : <ChevronDown className="w-4 h-4 text-on-surface-variant/50 shrink-0" />
                          )}
                        </button>
                        {isOpen && c.longDescription && (
                          <div className="px-4 pb-4">
                            <div className="h-px bg-outline-variant/10 mb-3" />
                            <p className="text-xs text-on-surface-variant leading-relaxed">{stripHtml(c.longDescription)}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* ── Safe & Effective badges grid ── */}
        {!hasPdpContent && enriched?.badges && enriched.badges.length > 0 && (
          <div className="mt-6 px-5">
            <h2 className="text-xl font-extrabold text-on-surface tracking-tight font-[family-name:var(--font-manrope)] mb-3">🛡️ Safe &amp; Effective</h2>
            <div className="grid grid-cols-3 gap-3">
              {enriched.badges.map((badge, i) => (
                <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/8 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={badge.icon} alt={badge.label} className="w-10 h-10 object-contain" />
                  <span className="text-label font-medium text-on-surface-variant leading-tight">{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Key ingredients ── */}
        {!hasPdpContent && enriched?.ingredients && enriched.ingredients.length > 0 && (
          <div className="mt-8 bg-surface-container-lowest py-6">
            <h2 className="text-xl font-extrabold text-on-surface tracking-tight font-[family-name:var(--font-manrope)] px-5 mb-4">
              🌿 Key Ingredients
            </h2>
            <div className="px-5 space-y-2">
              {enriched.ingredients.map((ing, i) => {
                const bgColors = ["bg-green-50","bg-amber-50","bg-blue-50","bg-purple-50","bg-rose-50"];
                const bg = bgColors[i % bgColors.length];
                const isOpen = expandedIngredient === i;
                return (
                <div key={i} className="rounded-2xl bg-surface border border-outline-variant/10 overflow-hidden">
                  {(ing.shortDesc || ing.longDesc) ? (
                    <button
                      onClick={() => setExpandedIngredient(isOpen ? null : i)}
                      className="w-full flex items-center gap-3.5 px-4 py-3.5 cursor-pointer text-left"
                    >
                      <div className={`shrink-0 w-12 h-12 rounded-xl ${bg} flex items-center justify-center overflow-hidden`}>
                        {ing.icon
                          ? /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={ing.icon} alt={ing.name} className="w-9 h-9 object-contain" />
                          : <span className="text-2xl">🌿</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-on-surface leading-snug">{ing.name}</p>
                        <p className="text-icon text-on-surface-variant/45 mt-0.5">
                          {isOpen ? "Tap to collapse" : "Tap to learn more"}
                        </p>
                      </div>
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 text-on-surface-variant/40 shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-on-surface-variant/40 shrink-0" />
                      }
                    </button>
                  ) : (
                    <div className="flex items-center gap-3.5 px-4 py-3.5">
                      <div className={`shrink-0 w-12 h-12 rounded-xl ${bg} flex items-center justify-center overflow-hidden`}>
                        {ing.icon
                          ? /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={ing.icon} alt={ing.name} className="w-9 h-9 object-contain" />
                          : <span className="text-2xl">🌿</span>
                        }
                      </div>
                      <p className="text-sm font-bold text-on-surface leading-snug">{ing.name}</p>
                    </div>
                  )}
                  {isOpen && (ing.shortDesc || ing.longDesc) && (
                    <div className="px-4 pb-4">
                      <div className="h-px bg-outline-variant/10 mb-3" />
                      {ing.shortDesc && (
                        <p className="text-body text-on-surface-variant leading-relaxed">
                          {ing.shortDesc.replace(/^Our paediatricians say:\s*/i, "").replace(/^Doctors? say:\s*/i, "")}
                        </p>
                      )}
                      {ing.longDesc && (() => {
                        const bullets = ing.longDesc
                          .split("\n")
                          .map((l: string) => l.trim())
                          .filter((l: string) =>
                            l &&
                            !/^quick facts/i.test(l) &&
                            !/^research(es)? that prove/i.test(l) &&
                            !/^http/i.test(l)
                          );
                        if (!bullets.length) return null;
                        return (
                          <ul className="mt-2 space-y-1">
                            {bullets.map((line: string, li: number) => {
                              const text = line.replace(/^[-–•]\s*/, "");
                              return (
                                <li key={li} className="flex gap-2 text-body text-on-surface-variant leading-relaxed">
                                  <span className="shrink-0 mt-1 text-[10px] text-primary">●</span>
                                  <span>{text}</span>
                                </li>
                              );
                            })}
                          </ul>
                        );
                      })()}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── What to expect (timeline only — week/month progression) ── */}
        {!hasPdpContent && enriched?.timeline && enriched.timeline.length > 0 && (
          <div className="mt-8 bg-surface-container-lowest py-6">
            <h2 className="text-xl font-extrabold text-on-surface tracking-tight font-[family-name:var(--font-manrope)] px-5 mb-4">
              📅 What to expect
            </h2>
            <div className="flex gap-3 px-5 overflow-x-auto scrollbar-hide pb-1">
              {enriched.timeline.map((step, i) => {
                const heading = step.label ?? step.title ?? step.period ?? "";
                const imgSrc  = step.icon  ?? step.image ?? "";
                return (
                  <div key={i} className="shrink-0 w-[200px] rounded-2xl bg-surface border border-outline-variant/10 overflow-hidden">
                    {imgSrc ? (
                      <div className="w-full aspect-video overflow-hidden bg-gray-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imgSrc} alt={heading} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-full aspect-video bg-primary-container/10 flex items-center justify-center">
                        <span className="text-3xl font-extrabold text-primary-container/40">{i + 1}</span>
                      </div>
                    )}
                    <div className="p-3">
                      {heading ? (
                        <span className="inline-block text-icon font-bold text-primary-container bg-primary-container/10 px-2 py-0.5 rounded-full mb-1.5 leading-none">{heading}</span>
                      ) : null}
                      {step.description?.trim() && !/^[-\s]+$/.test(step.description.trim()) && (
                        <p className="text-label text-on-surface-variant leading-relaxed">{stripHtml(step.description.trim())}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* ── Complete your routine ── */}
        {pairedItems.length > 0 && (
          <div className="mt-8 gradient-pdp-dark">
            <div className="px-5 pt-5 pb-6">
              {/* Header */}
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3 h-3 text-amber-300/70" strokeWidth={1.5} />
                <span className="text-icon font-extrabold text-white/40 uppercase tracking-widest">Pairs well with</span>
              </div>
              <h2 className="text-lg font-extrabold text-white font-[family-name:var(--font-manrope)] mb-4">
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
                          <p className="text-xs font-semibold text-on-surface leading-snug line-clamp-2">{enriched?.name ?? product.name}</p>
                          <span className="self-start text-icon font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full leading-snug">
                            Your pick
                          </span>
                          {avg != null && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" strokeWidth={0} />
                              <span className="text-label font-semibold text-on-surface">{avg.toFixed(1)}</span>
                              {cnt != null && (
                                <span className="text-icon text-on-surface-variant/40">
                                  ({cnt >= 1000 ? `${(cnt / 1000).toFixed(1)}k` : cnt})
                                </span>
                              )}
                            </div>
                          )}
                          {price != null && (
                            <p className="text-lead font-extrabold text-on-surface mt-0.5">₹{price}</p>
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
                  const price = pe.price;
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
                            <p className="text-xs font-semibold text-on-surface leading-snug line-clamp-2">{pe.name}</p>
                            <span className="self-start text-icon font-semibold text-primary-container bg-primary-container/10 px-2 py-0.5 rounded-full leading-snug">
                              {reason}
                            </span>
                            {avg != null && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" strokeWidth={0} />
                                <span className="text-label font-semibold text-on-surface">{avg.toFixed(1)}</span>
                                {cnt != null && (
                                  <span className="text-icon text-on-surface-variant/40">
                                    ({cnt >= 1000 ? `${(cnt / 1000).toFixed(1)}k` : cnt})
                                  </span>
                                )}
                              </div>
                            )}
                            {price != null && (
                              <p className="text-lead font-extrabold text-on-surface mt-0.5">₹{price}</p>
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
                className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-body font-bold text-white transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-50"
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
            <h2 className="text-xl font-extrabold text-on-surface tracking-tight font-[family-name:var(--font-manrope)] px-5 mb-4">⭐ What customers say</h2>
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
                  <p className="text-label text-on-surface-variant/40 mt-2">{review.author}{review.verified && " · Verified"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Works Best With (pdpContent only) ── */}
        {(() => {
          type WBWItem = { icon?: string | null; title: string; description: string };
          const pdpWbw = pdp<{ items: WBWItem[] }>("works_best_with");
          if (!pdpWbw?.items?.length) return null;
          return (
            <div className="mt-8 px-5">
              <h2 className="text-base font-extrabold text-on-surface tracking-tight font-[family-name:var(--font-manrope)] mb-3">🤝 What it Works Best With</h2>
              <div className="space-y-3">
                {pdpWbw.items.map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/8">
                    {item.icon && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.icon} alt={item.title} className="w-12 h-12 object-contain shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-on-surface leading-snug">{item.title}</p>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── Things to note ── */}
        {(() => {
          type TTNItem = { icon?: string | null; text?: string };
          const pdpTtn = pdp<{ items: TTNItem[] }>("things_to_note");
          if (pdpTtn?.items?.length) {
            return (
              <div className="mt-8 px-5">
                <h2 className="text-base font-extrabold text-on-surface tracking-tight font-[family-name:var(--font-manrope)] mb-3">⚠️ Good to Know</h2>
                <div className="space-y-3">
                  {pdpTtn.items.map((d, i) => (
                    <div key={i} className="flex gap-3 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/8">
                      {d.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.icon} alt={d.text ?? ""} className="w-10 h-10 object-contain shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-on-surface-variant/40 shrink-0 mt-0.5" strokeWidth={1.5} />
                      )}
                      <p className="text-xs text-on-surface-variant leading-relaxed">{stripHtml(d.text ?? "")}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          if (hasPdpContent || !enriched?.disclaimers?.length) return null;
          return (
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
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{stripHtml(d.description)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── FAQs ── */}
        {(() => {
          type FAQItem = { q: string; a: string };
          const pdpFaqs = pdp<{ list: FAQItem[] }>("faqs");
          const faqList = pdpFaqs?.list?.length
            ? pdpFaqs.list.map(f => ({ question: f.q, answer: f.a }))
            : hasPdpContent ? [] : (enriched?.faqs ?? []).map(f => ({ question: f.question, answer: f.answer }));
          if (!faqList.length) return null;
          return (
            <div className="mt-8 px-5">
              <h2 className="text-xl font-extrabold text-on-surface tracking-tight font-[family-name:var(--font-manrope)] mb-4">💬 Got Questions?</h2>
              <div className="space-y-2">
                {faqList.map((faq, i) => (
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
          );
        })()}

        {/* ── Little Joys: Medical advisory notice ── */}
        {product.brand === "Little Joys" && (enriched?.productType === "kids" || enriched?.ageGroup) && (
          <div className="mt-6 mx-5 flex gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-200/60">
            <span className="text-xl shrink-0 mt-0.5">👨‍⚕️</span>
            <div>
              <p className="text-xs font-bold text-blue-900">Consult before starting</p>
              <p className="text-label text-blue-800/70 mt-0.5 leading-relaxed">
                For children with any medical condition or dietary restriction, consult a paediatrician before use.
              </p>
            </div>
          </div>
        )}

        {/* ── Product Information (pdpContent preferred) ── */}
        {(() => {
          type PIRow = { label: string; value: string };
          const pdpPi = pdp<{ details: PIRow[]; additional: PIRow[] }>("product_info");
          if (pdpPi) {
            const allRows = [...(pdpPi.details ?? []), ...(pdpPi.additional ?? [])].filter(r => r.label && r.value);
            if (!allRows.length) return null;
            return (
              <div className="mt-6 px-5">
                <ExpandableSection title="📋 Product Information">
                  <div className="rounded-2xl border border-outline-variant/10 overflow-hidden bg-surface-container-lowest divide-y divide-outline-variant/8">
                    {allRows.map((row, i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-3">
                        <span className="text-label font-semibold text-on-surface-variant/55 uppercase tracking-wide shrink-0 w-28 leading-relaxed pt-0.5">{row.label}</span>
                        <span className="text-xs text-on-surface leading-relaxed flex-1">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </ExpandableSection>
              </div>
            );
          }
          if (hasPdpContent || !enriched?.additionalInfo?.length) return null;
          return (
            <div className="mt-6 px-5">
              <ExpandableSection title="📋 Additional Information">
                <div className="rounded-2xl border border-outline-variant/10 overflow-hidden bg-surface-container-lowest divide-y divide-outline-variant/8">
                  {enriched.additionalInfo.map((row, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3">
                      <span className="text-label font-semibold text-on-surface-variant/55 uppercase tracking-wide shrink-0 w-28 leading-relaxed pt-0.5">{row.title}</span>
                      <span className="text-xs text-on-surface leading-relaxed flex-1">{row.content}</span>
                    </div>
                  ))}
                </div>
              </ExpandableSection>
            </div>
          );
        })()}


      </div>

      {/* ── Sticky Footer: Add to Cart + Buy Now ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface-container-lowest border-t border-outline-variant/10">
        {/* Trust strip */}
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-3 pt-2 pb-0 px-4">
          <span className="flex items-center gap-1 text-icon font-medium text-on-surface-variant/50">
            <CheckCircle className="w-3 h-3 text-green-500 shrink-0" strokeWidth={2.5} />
            Authentic product
          </span>
          <span className="text-outline-variant/30 text-icon">·</span>
          <span className="text-icon font-medium text-on-surface-variant/50">Free delivery</span>
          <span className="text-outline-variant/30 text-icon">·</span>
          <span className="text-icon font-medium text-on-surface-variant/50">Cash on delivery</span>
        </div>
        <div className="max-w-2xl mx-auto flex items-center gap-2.5 px-4 py-3">
          <div className="min-w-0 shrink-0">
            <p className="text-base font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">&#8377;{displayPrice}</p>
            {displayMrp > displayPrice && (
              <p className="text-icon text-on-surface-variant/40 line-through">&#8377;{displayMrp}</p>
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
          <div className="fixed top-0 left-0 bottom-0 z-[61] w-[280px] max-w-[85vw] flex flex-col shadow-2xl animate-slide-in-left gradient-pdp-dark">
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
                <span className="ml-auto text-2xs font-bold text-white/25 uppercase tracking-widest">Soon</span>
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
              <p className="text-icon text-white/20 uppercase tracking-widest text-center mt-4">Powered by Mosaic Wellness</p>
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
  const { products: catalogProducts, loading: catalogLoading } = useCatalogProducts();
  const catalogProduct = catalogProducts.find((p) => p.id === slug);
  const { enriched, pdpLoading } = useShopifyPDP(slug);

  // Build a synthetic product from enriched Shopify data for sibling pages that were
  // filtered from the catalog (only the primary sibling is kept in catalog).
  const syntheticProduct: Product | null = useMemo(() => {
    if (catalogProduct || !enriched) return null;
    return {
      id:        slug,
      brand:     enriched.brand as "Man Matters" | "Be Bodywise" | "Little Joys",
      name:      enriched.name,
      price:     enriched.price ?? 0,
      mrp:       enriched.mrp ?? 0,
      concern:   [],
      gender:    [],
      segment:   [],
      followUp:  [],
      category:  "",
      baseScore: 0,
      images:    enriched.images,
      siblings:  enriched.siblings,
    };
  }, [catalogProduct, enriched, slug]);

  const product = catalogProduct ?? syntheticProduct;

  // Only redirect to explore if neither catalog nor Shopify has this product
  useEffect(() => {
    if (!catalogLoading && !pdpLoading && !product) {
      router.replace("/explore");
    }
  }, [product, catalogLoading, pdpLoading, router]);

  if (!product) return null;

  const handleBack = () => window.history.length > 1 ? router.back() : router.replace("/explore");
  return <NewProductPDP product={product} enriched={enriched} onBack={handleBack} />;
}
