"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ExternalLink, ArrowRight, ShoppingBag, Loader2, Check, AlertCircle } from "lucide-react";
import { ALL_PRODUCTS, resolveSegment } from "@/lib/protocolEngine";
import type { Product, MatchedProduct } from "@/lib/protocolEngine";
import { useCart } from "@/context/CartContext";
import { resolveVariantId } from "@/lib/shopify/variant-resolver";

/* ── Category sidebar definitions ── */
type CategoryDef = {
  key: string;
  label: string;
  abbr: string;
  /* Concern values that appear in product.concern[] — used for scoring */
  concernValues: string[];
};

const CATEGORIES: CategoryDef[] = [
  { key: "for-you", label: "For You", abbr: "✦", concernValues: [] },
  { key: "hair", label: "Hair", abbr: "H", concernValues: ["hair"] },
  { key: "beard", label: "Beard", abbr: "Bd", concernValues: ["beard"] },
  { key: "skin", label: "Skin", abbr: "Sk", concernValues: ["skin"] },
  { key: "weight", label: "Weight", abbr: "W", concernValues: ["weight"] },
  { key: "nutrition", label: "Nutrition", abbr: "N", concernValues: ["energy"] },
  { key: "sleep", label: "Sleep", abbr: "Sl", concernValues: ["sleep"] },
  { key: "hormones", label: "Hormones", abbr: "P", concernValues: ["hormones"] },
];

/* Onboarding concern label → product concern values */
const ONBOARDING_CONCERN_MAP: Record<string, string[]> = {
  "Hair / beard": ["hair", "beard"],
  "Skin / acne": ["skin"],
  "Energy / gut": ["energy"],
  "Weight": ["weight"],
  "Hormones": ["hormones"],
  "Sleep / mind": ["sleep"],
};

/* Brand badge colors */
const BRAND_STYLE: Record<string, { bg: string; text: string }> = {
  "Man Matters": { bg: "bg-primary-container/10", text: "text-primary-container" },
  "Be Bodywise": { bg: "bg-rose-500/10", text: "text-rose-500" },
  "Little Joys": { bg: "bg-amber-500/10", text: "text-amber-600" },
};

type StoredProfile = Record<string, string | undefined>;

/* ── Scoring engine (same logic as calculateProtocolMatch, no 3-item cap) ── */
function scoreProducts(
  concernValues: string[],
  profile: StoredProfile,
): MatchedProduct[] {
  const gender = (profile.gender ?? "male").toLowerCase();
  const age = profile.age ?? "25-34";
  const userSegments = resolveSegment(gender, age, profile.shopping_for, profile.kids_age);

  /* Lightweight follow-up string from stored answers */
  const parts: string[] = [];
  const p = profile;
  if (p.hair_primary) parts.push(p.hair_primary.replace(/_/g, " "));
  if (p.skin_primary) parts.push(p.skin_primary.replace(/_/g, " "));
  if (p.weight_goal) parts.push(p.weight_goal.replace(/_/g, " "));
  if (p.energy_pattern) parts.push(p.energy_pattern.replace(/_/g, " "));
  if (p.sleep_quality) parts.push(p.sleep_quality.replace(/_/g, " "));
  if (p.hormone_symptom) parts.push(p.hormone_symptom.replace(/_/g, " "));
  if (p.gut_symptom) parts.push(p.gut_symptom.replace(/_/g, " "));
  const followUpStr = parts.join(" ").toLowerCase();

  return ALL_PRODUCTS.flatMap((product) => {
    const concernMatch = product.concern.some((c) => concernValues.includes(c));
    if (!concernMatch) return [];

    const genderMatch =
      product.gender.includes(gender) || product.gender.includes("all");
    if (!genderMatch) return [];

    let score = product.baseScore;
    const segmentOverlap = product.segment.some((s) => userSegments.includes(s));
    if (segmentOverlap) score += 5;
    else score -= 10;

    if (followUpStr) {
      const followUpMatch = product.followUp.some((f) =>
        followUpStr.includes(f.toLowerCase()),
      );
      if (followUpMatch) score += 8;
    }

    return [{ ...product, matchScore: Math.min(score, 99) }];
  }).sort((a, b) => b.matchScore - a.matchScore);
}

/* ── Product Card ── */
function ProductCard({
  product,
  isTopPick,
}: {
  product: Product & { matchScore?: number };
  isTopPick?: boolean;
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const [cartState, setCartState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handleAddToCart = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (cartState !== "idle") return;
      setCartState("loading");
      try {
        const variantId = await resolveVariantId(product.id);
        if (!variantId) throw new Error("not found");
        await addItem(variantId, 1);
        setCartState("done");
      } catch {
        setCartState("error");
      } finally {
        setTimeout(() => setCartState("idle"), 2500);
      }
    },
    [addItem, cartState, product.id],
  );

  const discountPct =
    product.mrp > product.price
      ? Math.round((1 - product.price / product.mrp) * 100)
      : 0;

  const reviewLabel = product.reviewCount
    ? product.reviewCount >= 1000
      ? `${(product.reviewCount / 1000).toFixed(1)}k`
      : `${product.reviewCount}`
    : null;

  const brand = BRAND_STYLE[product.brand] ?? {
    bg: "bg-surface-container",
    text: "text-on-surface-variant",
  };

  return (
    <div className="flex flex-col bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/8 hover:border-primary-container/25 transition-all duration-200 group">
      {/* Image — tapping opens in-app PDP */}
      <div
        onClick={() => router.push(`/product/${product.id}`)}
        className="relative w-full h-[130px] bg-surface-container-low cursor-pointer"
      >
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl font-extrabold text-primary-container/20 font-[family-name:var(--font-manrope)]">
              {product.name.charAt(0)}
            </span>
          </div>
        )}

        {discountPct >= 5 && (
          <span className="absolute top-2 left-2 bg-primary-container text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md leading-none">
            {discountPct}% OFF
          </span>
        )}

        {isTopPick && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-primary-container/90 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full leading-none shadow-sm">
            <Sparkles className="w-2 h-2" strokeWidth={2} />
            Top pick
          </div>
        )}

        {/* External link hint */}
        <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="w-3 h-3 text-white drop-shadow" strokeWidth={2} />
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        <span
          className={`self-start text-[9px] font-semibold px-1.5 py-0.5 rounded-md mb-1.5 leading-none ${brand.bg} ${brand.text}`}
        >
          {product.brand}
        </span>

        {product.rating && (
          <div className="flex items-center gap-0.5 mb-1">
            <span className="text-[10px] leading-none text-amber-400">★</span>
            <span className="text-[10px] font-bold text-on-surface">{product.rating}</span>
            {reviewLabel && (
              <span className="text-[9px] text-on-surface-variant/40">({reviewLabel})</span>
            )}
          </div>
        )}

        <p className="text-[11px] font-bold text-on-surface leading-snug line-clamp-2 flex-1 mb-2.5">
          {product.name}
        </p>

        {/* Price row */}
        <div className="flex items-baseline gap-1.5 mb-2.5">
          <span className="text-sm font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-none">
            &#8377;{product.price}
          </span>
          {product.mrp > product.price && (
            <span className="text-[9px] text-on-surface-variant/35 line-through">
              &#8377;{product.mrp}
            </span>
          )}
        </div>

        {/* Add to Cart button */}
        <button
          onClick={handleAddToCart}
          disabled={cartState !== "idle"}
          className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold transition-all duration-200 cursor-pointer active:scale-[0.97] disabled:cursor-default ${
            cartState === "done"
              ? "bg-green-500/15 text-green-600"
              : cartState === "error"
              ? "bg-red-500/10 text-red-500"
              : "bg-primary-container text-white hover:bg-primary"
          }`}
        >
          {cartState === "loading" && <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2.5} />}
          {cartState === "done" && <Check className="w-3 h-3" strokeWidth={2.5} />}
          {cartState === "error" && <AlertCircle className="w-3 h-3" strokeWidth={2} />}
          {cartState === "idle" && <ShoppingBag className="w-3 h-3" strokeWidth={2} />}
          {cartState === "loading" ? "Adding…"
            : cartState === "done" ? "Added!"
            : cartState === "error" ? "Not available"
            : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}

/* ── Empty state: no profile yet ── */
function NoProfileState() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 gap-5 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary-container/10 flex items-center justify-center">
        <Sparkles className="w-6 h-6 text-primary-container/60" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-bold text-on-surface mb-1">
          Your picks aren&apos;t ready yet
        </p>
        <p className="text-[12px] text-on-surface-variant/60 leading-relaxed max-w-[220px] mx-auto">
          Answer 3 quick questions and we&apos;ll show you products matched to your health goals.
        </p>
      </div>
      <button
        onClick={() => router.push("/protocol")}
        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary-container text-white text-xs font-bold cursor-pointer hover:bg-primary transition-colors duration-200"
      >
        Build my protocol
        <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

/* ── Explore Page ── */
export default function ExplorePage() {
  const [activeCategory, setActiveCategory] = useState("for-you");
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bh_profile");
      if (raw) setProfile(JSON.parse(raw));
    } catch {
      // no profile
    }
    setProfileLoaded(true);
  }, []);

  /* Concern values for "For You" based on the user's onboarding concern */
  const forYouConcernValues = useMemo<string[]>(() => {
    if (!profile?.concern) return [];
    return ONBOARDING_CONCERN_MAP[profile.concern] ?? [];
  }, [profile]);

  /* Products to display */
  const displayedProducts = useMemo<(Product & { matchScore?: number })[]>(() => {
    if (activeCategory === "for-you") {
      if (!profile || forYouConcernValues.length === 0) return [];
      return scoreProducts(forYouConcernValues, profile);
    }

    const cat = CATEGORIES.find((c) => c.key === activeCategory);
    if (!cat) return [];

    /* For non-"For You" tabs, show all matching products sorted by baseScore */
    return ALL_PRODUCTS
      .filter((p) => p.concern.some((c) => cat.concernValues.includes(c)))
      .sort((a, b) => b.baseScore - a.baseScore);
  }, [activeCategory, profile, forYouConcernValues]);

  /* Hide Beard for female users */
  const visibleCategories = useMemo<CategoryDef[]>(() => {
    return CATEGORIES.filter((c) => {
      if (c.key === "beard" && profile?.gender === "female") return false;
      return true;
    });
  }, [profile?.gender]);

  const isForYou = activeCategory === "for-you";
  const activeCategoryDef = CATEGORIES.find((c) => c.key === activeCategory);
  const showNoProfile = isForYou && profileLoaded && (!profile || forYouConcernValues.length === 0);

  return (
    <div className="flex h-[calc(100dvh-68px-48px)] lg:h-[calc(100dvh-48px)]">
      {/* ── Left sidebar ── */}
      <nav className="w-[72px] shrink-0 bg-surface-container-low/50 border-r border-outline-variant/8 overflow-y-auto hide-scrollbar py-2">
        {visibleCategories.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`w-full flex flex-col items-center gap-1 py-3 px-1 text-center cursor-pointer transition-colors relative ${
                isActive
                  ? "bg-surface-container-lowest"
                  : "hover:bg-surface-container-lowest/50"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary-container rounded-r-full" />
              )}

              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isActive
                    ? "bg-primary-container/15"
                    : "bg-surface-container-high/50"
                }`}
              >
                {cat.key === "for-you" ? (
                  <Sparkles
                    className={`w-4 h-4 ${
                      isActive ? "text-primary-container" : "text-on-surface-variant/50"
                    }`}
                    strokeWidth={1.5}
                  />
                ) : (
                  <span
                    className={`text-[11px] font-extrabold ${
                      isActive ? "text-primary-container" : "text-on-surface-variant/40"
                    }`}
                  >
                    {cat.abbr}
                  </span>
                )}
              </div>

              <span
                className={`text-[9px] leading-tight font-medium ${
                  isActive ? "text-primary-container" : "text-on-surface-variant/60"
                }`}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── Right: content ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <div className="px-3 pt-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold text-on-surface tracking-tight font-[family-name:var(--font-manrope)]">
                {isForYou ? "For You" : activeCategoryDef?.label ?? "Products"}
              </h1>
              {!showNoProfile && (
                <p className="text-[11px] text-on-surface-variant/50 mt-0.5 truncate">
                  {isForYou && profile?.concern
                    ? `Matched to your ${profile.concern} concern`
                    : `${displayedProducts.length} product${displayedProducts.length !== 1 ? "s" : ""}`}
                </p>
              )}
            </div>

            {isForYou && !showNoProfile && (
              <div className="flex items-center gap-1 text-[10px] text-primary-container/80 bg-primary-container/8 px-2 py-1 rounded-full shrink-0">
                <Sparkles className="w-2.5 h-2.5" strokeWidth={2} />
                <span className="font-semibold">AI-matched</span>
              </div>
            )}
          </div>
        </div>

        {/* No profile state */}
        {showNoProfile && <NoProfileState />}

        {/* Product grid */}
        {!showNoProfile && displayedProducts.length > 0 && (
          <div className="px-2 pb-4 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {displayedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                isTopPick={isForYou && (p as MatchedProduct).matchScore >= 85}
              />
            ))}
          </div>
        )}

        {!showNoProfile && displayedProducts.length === 0 && !profileLoaded && (
          <div className="flex flex-col items-center justify-center py-16 px-4 gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-primary-container/30 border-t-primary-container animate-spin" />
          </div>
        )}

        {/* Footer note */}
        {!showNoProfile && displayedProducts.length > 0 && (
          <div className="mx-3 mb-6 px-3 py-2.5 rounded-xl bg-surface-container/60 border border-outline-variant/10">
            <p className="text-[10px] text-on-surface-variant/45 text-center leading-relaxed">
              Tapping &ldquo;Buy&rdquo; opens the brand&apos;s store &middot; Free
              shipping on most orders &middot; Doctor-formulated
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
