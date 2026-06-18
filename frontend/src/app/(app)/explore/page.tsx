"use client";

import { useState, useEffect, useMemo, useCallback, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, ExternalLink, ArrowRight, ShoppingBag, Loader2, Check, AlertCircle, X, ChevronDown, Search } from "lucide-react";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { resolveSegment } from "@/lib/protocolEngine";
import type { Product, MatchedProduct } from "@/lib/protocolEngine";
import { useCatalogProducts } from "@/hooks/useCatalogProducts";
import ProtocolLoader from "@/components/ui/ProtocolLoader";
import { useCart } from "@/context/CartContext";
import { resolveVariantId } from "@/lib/shopify/variant-resolver";
import { getProductRating } from "@/data/ratingsLookup";
import BrandHeroBanners from "@/components/BrandHeroBanners";

/* ── Category definitions ── */
type CategoryDef = {
  key: string;
  label: string;
  abbr: string;
  emoji: string;
  gradient: string;
  concernValues: string[];
  followUpFilter?: string[];  // if set, product.followUp must match at least one term
};

const CATEGORIES: CategoryDef[] = [
  { key: "for-you",    label: "For You",    abbr: "✦",  emoji: "✦",  gradient: "from-violet-500/20 to-indigo-500/20",   concernValues: [] },
  { key: "hair",       label: "Hair",       abbr: "H",  emoji: "💇",  gradient: "from-blue-500/20 to-cyan-500/20",       concernValues: ["hair"] },
  { key: "beard",      label: "Beard",      abbr: "Bd", emoji: "🧔",  gradient: "from-slate-500/20 to-stone-500/20",     concernValues: ["beard"] },
  { key: "skin",       label: "Skin",       abbr: "Sk", emoji: "✨",  gradient: "from-rose-400/20 to-pink-500/20",       concernValues: ["skin"] },
  { key: "weight",     label: "Weight",     abbr: "W",  emoji: "⚖️",  gradient: "from-emerald-500/20 to-teal-500/20",   concernValues: ["weight"] },
  { key: "nutrition",  label: "Nutrition",  abbr: "N",  emoji: "🌿",  gradient: "from-lime-500/20 to-green-500/20",     concernValues: ["energy"] },
  { key: "sleep",      label: "Sleep",      abbr: "Sl", emoji: "😴",  gradient: "from-indigo-500/20 to-purple-500/20",  concernValues: ["sleep"] },
  { key: "hormones",   label: "Hormones",   abbr: "P",  emoji: "🧬",  gradient: "from-fuchsia-500/20 to-violet-500/20", concernValues: ["hormones"] },
];

const CONCERN_LIST = [
  { key: "hair",      emoji: "💇", label: "Hair Fall & Growth",  desc: "Biotin, DHT blockers, scalp health" },
  { key: "skin",      emoji: "✨", label: "Skin & Acne",         desc: "Collagen, glutathione, clear skin" },
  { key: "weight",    emoji: "⚖️", label: "Weight Management",   desc: "Fat loss, muscle, metabolism" },
  { key: "nutrition", emoji: "🌿", label: "Energy & Gut",        desc: "Ashwagandha, vitamins, probiotics" },
  { key: "sleep",     emoji: "😴", label: "Sleep & Stress",      desc: "Melatonin, magnesium, calm" },
  { key: "hormones",  emoji: "🧬", label: "Hormonal Health",     desc: "PCOS, testosterone, balance" },
];

type SubConcern = {
  key: string;
  label: string;
  emoji: string;
  desc: string;
  followUpTerms: string[];
};

const CATEGORY_SUB_CONCERNS: Record<string, SubConcern[]> = {
  hair: [
    { key: "hair-fall",   label: "Hair Fall",          emoji: "💇", desc: "DHT blockers, regrowth serums",      followUpTerms: ["hair fall","thinning","shedding","dht","receding","hairline","redensyl"] },
    { key: "dandruff",    label: "Dandruff & Scalp",   emoji: "❄️", desc: "Anti-dandruff, scalp care",           followUpTerms: ["dandruff","itchy","flaky","scalp","oily scalp","zpto","ketoconazole","fungal","sebum"] },
    { key: "hair-growth", label: "Growth & Density",   emoji: "🌱", desc: "Biotin, keratin, thicker hair",       followUpTerms: ["regrowth","biotin","density","rosemary","keratin","strengthening","circulation"] },
    { key: "postpartum",  label: "Postpartum Hair",    emoji: "🤱", desc: "Post-pregnancy hair recovery",        followUpTerms: ["postpartum","postnatal","breastfeeding"] },
  ],
  skin: [
    { key: "acne",         label: "Acne & Breakouts",    emoji: "🔴", desc: "Salicylic, niacinamide, clear skin",    followUpTerms: ["acne","pimples","breakouts","body acne","bumps","salicylic","niacinamide","benzoyl peroxide","sebum"] },
    { key: "pigmentation", label: "Glow & Pigmentation", emoji: "✨", desc: "Glutathione, brightening serums",        followUpTerms: ["pigmentation","dark spots","brightening","glow","glutathione","tan","sun damage","dullness","dark underarms"] },
    { key: "hydration",    label: "Hydration & Texture", emoji: "💧", desc: "Hyaluronic, ceramide, moisturizers",     followUpTerms: ["dry","rough","texture","hydration","moisturizer","hyaluronic","ceramide","urea","cracked heels"] },
    { key: "suncare",      label: "Sun Protection",      emoji: "☀️", desc: "SPF 50+, mineral, broad spectrum",       followUpTerms: ["spf","sun damage","tan","summer","mineral","sunscreen"] },
  ],
  weight: [
    { key: "fat-loss", label: "Fat Loss",          emoji: "🔥", desc: "Metabolism, body composition",     followUpTerms: ["belly fat","fat","lose","body composition","lean"] },
    { key: "muscle",   label: "Muscle & Strength", emoji: "💪", desc: "Protein, creatine, recovery",      followUpTerms: ["muscle","strength","gain","protein","creatine","recovery","endurance","athlete"] },
  ],
  nutrition: [
    { key: "energy-fatigue", label: "Energy & Fatigue", emoji: "⚡", desc: "B12, ashwagandha, stamina",      followUpTerms: ["energy","fatigue","exhaustion","afternoon crash","motivation","vitamins","multivitamin"] },
    { key: "gut",            label: "Gut & Immunity",   emoji: "🌿", desc: "Probiotics, digestive health",   followUpTerms: ["gut","immunity","digestion","calcium","bone"] },
  ],
  hormones: [
    { key: "testosterone", label: "Testosterone & Drive", emoji: "🧬", desc: "Libido, vitality, performance",  followUpTerms: ["testosterone","libido","drive","performance"] },
    { key: "stress",       label: "Stress & Cortisol",   emoji: "🧘", desc: "Ashwagandha, cortisol balance",  followUpTerms: ["cortisol","stress","anxiety","mood","motivation"] },
  ],
  sleep: [
    { key: "sleep-quality", label: "Better Sleep",  emoji: "😴", desc: "Melatonin, magnesium, rest",   followUpTerms: ["sleep","insomnia","poor sleep","rest","relaxation","glycinate","magnesium"] },
    { key: "stress-calm",   label: "Stress & Calm", emoji: "🧘", desc: "Calm, anxiety, cortisol",      followUpTerms: ["anxiety","calm","cortisol","stress","mood"] },
  ],
};

/* Onboarding concern label → product concern values */
const ONBOARDING_CONCERN_MAP: Record<string, string[]> = {
  "Hair / beard": ["hair", "beard"],
  "Skin / acne": ["skin"],
  "Energy / gut": ["energy"],
  "Weight": ["weight"],
  "Hormones": ["hormones"],
  "Sleep / mind": ["sleep"],
};

/* ── Kids-specific filters ── */
const KIDS_CATEGORY_FILTERS = [
  { key: "gummies",        label: "Gummies",        emoji: "🍬", gradient: "from-amber-400/20 to-yellow-400/20" },
  { key: "nutrition",      label: "Nutrition",      emoji: "💊", gradient: "from-lime-500/20 to-green-500/20" },
  { key: "personal-care",  label: "Personal Care",  emoji: "🌿", gradient: "from-teal-400/20 to-cyan-400/20" },
  { key: "healthysnacks",  label: "Healthy Snacks", emoji: "🥗", gradient: "from-orange-400/20 to-amber-400/20" },
];

const KIDS_CONCERN_FILTERS = [
  { key: "immunity",   label: "Immunity",          emoji: "🛡️", desc: "Vitamins, probiotics, zinc" },
  { key: "growth",     label: "Growth & Nutrition", emoji: "🌱", desc: "Calcium, protein, multivitamins" },
  { key: "focus",      label: "Focus & Brain",     emoji: "🧠", desc: "DHA, omega-3, memory support" },
  { key: "sleep",      label: "Better Sleep",      emoji: "😴", desc: "Magnesium, calm supplements" },
  { key: "energy",     label: "Energy",            emoji: "⚡", desc: "B vitamins, iron, multivitamins" },
  { key: "nutrition",  label: "Nutrition Gaps",    emoji: "🥗", desc: "Multivitamins, fussy eater support" },
  { key: "skin",       label: "Skin & Hair",       emoji: "✨", desc: "Biotin, collagen, vitamins" },
];

const KIDS_CONCERN_FOLLOWUP: Record<string, string[]> = {
  focus:     ["brain", "dha", "omega3", "focus", "learning"],
  immunity:  ["immunity", "vitamins"],
  growth:    ["growth", "nutrition", "protein", "calcium", "bone"],
  sleep:     [],
  energy:    ["nutrition", "vitamins"],
  skin:      [],
  hair:      ["hair", "biotin"],
  nutrition: ["nutrition", "protein", "vitamins"],
};

const LJ_MOM_CONCERNS = [
  { key: "nutrition",   label: "Nutrition & Energy", emoji: "🌿", desc: "Mamamix, postnatal vitamins" },
  { key: "immunity",    label: "Immunity",            emoji: "🛡️", desc: "Vitamins, immune support" },
  { key: "bone-growth", label: "Bone & Calcium",      emoji: "🦴", desc: "Calcium, joint health" },
  { key: "hair",        label: "Hair Health",         emoji: "💇", desc: "Biotin, postpartum hair" },
  { key: "sleep",       label: "Better Sleep",        emoji: "😴", desc: "Magnesium, calm" },
];

const KIDS_CATEGORY_KEYS = KIDS_CATEGORY_FILTERS.map((c) => c.key);
const KIDS_CONCERN_KEYS  = KIDS_CONCERN_FILTERS.map((c) => c.key);

/* Brand badge colors */
const BRAND_STYLE: Record<string, { bg: string; text: string }> = {
  "Man Matters": { bg: "bg-primary-container/10", text: "text-primary-container" },
  "Be Bodywise": { bg: "bg-rose-500/10", text: "text-rose-500" },
  "Little Joys": { bg: "bg-amber-500/10", text: "text-amber-600" },
};

/* Concern → display chip */
const CONCERN_CHIP: Record<string, string> = {
  hair:      "💇 Hair Health",
  beard:     "🧔 Beard Growth",
  skin:      "✨ Skin & Glow",
  weight:    "⚖️ Weight",
  energy:    "🌿 Energy & Gut",
  sleep:     "😴 Sleep",
  hormones:  "🧬 Hormones",
  immunity:  "🛡️ Immunity",
  growth:    "🌱 Growth",
  nutrition: "🥗 Nutrition",
  focus:     "🧠 Brain & Focus",
};

/* Concern-specific color tokens for the By Concern sheet */
const CONCERN_COLORS: Record<string, { idle: string; active: string; text: string }> = {
  hair:      { idle: "bg-sky-500/10 border-sky-500/20",       active: "bg-sky-500/20 border-sky-500/50",       text: "text-sky-700"      },
  beard:     { idle: "bg-slate-500/10 border-slate-500/20",   active: "bg-slate-500/20 border-slate-500/50",   text: "text-slate-700"    },
  skin:      { idle: "bg-rose-500/10 border-rose-500/20",     active: "bg-rose-500/20 border-rose-500/50",     text: "text-rose-700"     },
  weight:    { idle: "bg-emerald-500/10 border-emerald-500/20", active: "bg-emerald-500/20 border-emerald-500/50", text: "text-emerald-700" },
  nutrition: { idle: "bg-lime-500/10 border-lime-500/20",     active: "bg-lime-500/20 border-lime-500/50",     text: "text-lime-700"     },
  sleep:     { idle: "bg-indigo-500/10 border-indigo-500/20", active: "bg-indigo-500/20 border-indigo-500/50", text: "text-indigo-700"   },
  hormones:  { idle: "bg-fuchsia-500/10 border-fuchsia-500/20", active: "bg-fuchsia-500/20 border-fuchsia-500/50", text: "text-fuchsia-700" },
};

type StoredProfile = Record<string, string | undefined>;

function concernLabel(raw: string): string {
  return raw.split(" / ").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" & ");
}

/* ── Scoring engine ── */
function scoreProducts(
  concernValues: string[],
  profile: StoredProfile,
  allProducts: Product[],
): MatchedProduct[] {
  const gender = (profile.sex ?? "male").toLowerCase();
  const age = profile.age ?? "25-34";
  const userSegments = resolveSegment(gender, age, profile.shopping_for, profile.kids_age);

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

  return allProducts.flatMap((product) => {
    const concernMatch = product.concern.some((c) => concernValues.includes(c));
    if (!concernMatch) return [];
    const genderMatch = product.gender.includes(gender) || product.gender.includes("all");
    if (!genderMatch) return [];

    let score = product.baseScore;
    const segmentOverlap = product.segment.some((s) => userSegments.includes(s));
    if (segmentOverlap) score += 5;
    else score -= 10;

    if (followUpStr) {
      const followUpMatch = product.followUp.some((f) => followUpStr.includes(f.toLowerCase()));
      if (followUpMatch) score += 8;
    }
    return [{ ...product, matchScore: Math.min(score, 99) }];
  }).sort((a, b) => b.matchScore - a.matchScore);
}

/* ── Product Card ── */
function ProductCard({
  product,
  isTopPick,
  matchPct,
}: {
  product: Product & { matchScore?: number };
  isTopPick?: boolean;
  matchPct?: number;
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const [cartState, setCartState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [imgIdx, setImgIdx] = useState(0);
  const touchX = useRef(0);
  const touchY = useRef(0);
  const didSwipe = useRef(false);

  const allImages: string[] = product.images?.length
    ? product.images
    : product.image ? [product.image] : [];

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
    touchY.current = e.touches[0].clientY;
    didSwipe.current = false;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchX.current;
    const dy = e.changedTouches[0].clientY - touchY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 28) {
      didSwipe.current = true;
      setImgIdx((prev) =>
        dx < 0 ? Math.min(prev + 1, allImages.length - 1) : Math.max(prev - 1, 0)
      );
    }
  }, [allImages.length]);

  const handleImageClick = useCallback(() => {
    if (didSwipe.current) return;
    saveExploreScroll();
    router.push(`/product/${product.id}`);
  }, [router, product.id]);

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

  // Rating: use catalog value if present, else fall back to enriched lookup
  const ratingData = product.rating
    ? { rating: product.rating, count: product.reviewCount ?? 0 }
    : getProductRating(product.id);

  const reviewLabel = ratingData?.count
    ? ratingData.count >= 1000
      ? `${(ratingData.count / 1000).toFixed(1)}k`
      : `${ratingData.count}`
    : null;

  const brand = BRAND_STYLE[product.brand] ?? {
    bg: "bg-surface-container",
    text: "text-on-surface-variant",
  };

  // Pills: all concern labels + match %
  const concernPills = (product.concern ?? []).map((c) => CONCERN_CHIP[c]).filter(Boolean) as string[];
  const matchPill = matchPct !== undefined && matchPct >= 75 ? `${matchPct}% match` : null;

  return (
    <div className="flex flex-col bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/10 hover:border-primary-container/30 hover:shadow-md transition-all duration-200 group">
      {/* Image — swipeable on mobile */}
      <div
        onClick={handleImageClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative w-full h-[175px] sm:h-[190px] bg-surface-container-low cursor-pointer overflow-hidden"
      >
        {allImages.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={allImages[imgIdx]}
            alt={product.name}
            className="w-full h-full object-contain p-2 transition-opacity duration-200"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl font-extrabold text-primary-container/20 font-[family-name:var(--font-manrope)]">
              {product.name.charAt(0)}
            </span>
          </div>
        )}

        {/* Discount badge */}
        {discountPct >= 5 && (
          <span className="absolute top-2.5 left-2.5 bg-primary-container text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md leading-none shadow-sm">
            {discountPct}% OFF
          </span>
        )}

        {/* Top-pick badge */}
        {isTopPick && matchPct === undefined && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 bg-primary-container/90 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full leading-none shadow-sm">
            <Sparkles className="w-2.5 h-2.5" strokeWidth={2} />
            Top pick
          </div>
        )}

        {/* Image dot indicators — shown when product has multiple images */}
        {allImages.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 pointer-events-none">
            {allImages.slice(0, 6).map((_, i) => (
              <span
                key={i}
                className="rounded-full transition-all duration-200"
                style={{
                  width: i === imgIdx ? 10 : 4,
                  height: 4,
                  background: i === imgIdx ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col flex-1 gap-1.5">
        {/* Brand + rating row */}
        <div className="flex items-center justify-between gap-1">
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md leading-none ${brand.bg} ${brand.text}`}>
            {product.brand}
          </span>
          {ratingData && (
            <div className="flex items-center gap-0.5">
              <span className="text-[11px] leading-none text-amber-400">★</span>
              <span className="text-[10px] font-bold text-on-surface">{ratingData.rating.toFixed(1)}</span>
              {reviewLabel && (
                <span className="text-[9px] text-on-surface-variant/35">({reviewLabel})</span>
              )}
            </div>
          )}
        </div>

        {/* Product name */}
        <p className="text-[12px] font-bold text-on-surface leading-snug line-clamp-2 flex-1">
          {product.name}
        </p>

        {/* Price row */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] leading-none">
            &#8377;{product.price}
          </span>
          {product.mrp > product.price && (
            <span className="text-[10px] text-on-surface-variant/35 line-through">
              &#8377;{product.mrp}
            </span>
          )}
        </div>

        {/* Info pills — concerns + match */}
        {(concernPills.length > 0 || matchPill) && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {concernPills.map((pill) => (
              <span key={pill} className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/15 text-on-surface-variant/70 leading-none">
                {pill}
              </span>
            ))}
            {matchPill && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary-container/10 border border-primary-container/20 text-primary-container leading-none">
                ✦ {matchPill}
              </span>
            )}
          </div>
        )}

        {/* Add to Cart */}
        <button
          onClick={handleAddToCart}
          disabled={cartState !== "idle"}
          className={`mt-1 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold transition-all duration-200 cursor-pointer active:scale-[0.97] disabled:cursor-default ${
            cartState === "done"
              ? "bg-green-500/15 text-green-600"
              : cartState === "error"
              ? "bg-red-500/10 text-red-500"
              : "bg-primary-container text-white hover:bg-primary"
          }`}
        >
          {cartState === "loading" && <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.5} />}
          {cartState === "done"    && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
          {cartState === "error"   && <AlertCircle className="w-3.5 h-3.5" strokeWidth={2} />}
          {cartState === "idle"    && <ShoppingBag className="w-3.5 h-3.5" strokeWidth={2} />}
          {cartState === "loading" ? "Adding…"
            : cartState === "done" ? "Added!"
            : cartState === "error" ? "Not available"
            : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}

/* ── Empty state ── */
function NoProfileState() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 gap-5 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary-container/10 flex items-center justify-center">
        <Sparkles className="w-6 h-6 text-primary-container/60" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-bold text-on-surface mb-1">Your picks aren&apos;t ready yet</p>
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

/* ── Scroll position save — called by ProductCard before navigating away ── */
let _saveScrollPos: (() => void) | null = null;
function saveExploreScroll() { _saveScrollPos?.(); }

/* ── Swipe-down-to-dismiss hook ── */
function useSwipeToDismiss(onDismiss: () => void) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const dragging = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    dragging.current = true;
    if (sheetRef.current) sheetRef.current.style.transition = "none";
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging.current || !sheetRef.current) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) sheetRef.current.style.transform = `translateY(${dy}px)`;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!sheetRef.current || !dragging.current) return;
    dragging.current = false;
    const dy = e.changedTouches[0].clientY - startY.current;
    sheetRef.current.style.transition = "transform 0.25s ease";
    if (dy > 80) {
      sheetRef.current.style.transform = `translateY(100%)`;
      setTimeout(onDismiss, 220);
    } else {
      sheetRef.current.style.transform = "";
    }
  }, [onDismiss]);

  return { sheetRef, onTouchStart, onTouchMove, onTouchEnd };
}

/* ── Explore Page ── */
function ExplorePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState(() => searchParams.get("tab") ?? "for-you");

  const [selectedSubConcern, setSelectedSubConcern] = useState<string | null>(null);
  const [ljMode, setLjMode] = useState<"kids" | "mom">("kids");

  const switchTab = useCallback((key: string) => {
    setActiveCategory(key);
    setSelectedSubConcern(null);
    const p = new URLSearchParams(searchParams.toString());
    p.set("tab", key);
    router.replace(`?${p.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Register scroll saver so ProductCard can call it before navigating
  useEffect(() => {
    _saveScrollPos = () => {
      if (scrollContainerRef.current)
        sessionStorage.setItem("bh_explore_scroll", scrollContainerRef.current.scrollTop.toString());
    };
    return () => { _saveScrollPos = null; };
  }, []);

  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [picksVisible, setPicksVisible] = useState(true);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showConcernSheet, setShowConcernSheet] = useState(false);
  const [showBrandSheet, setShowBrandSheet] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Swipe-to-dismiss for each bottom sheet
  const brandSwipe    = useSwipeToDismiss(useCallback(() => setShowBrandSheet(false),   []));
  const categorySwipe = useSwipeToDismiss(useCallback(() => setShowCategorySheet(false), []));
  const concernSwipe  = useSwipeToDismiss(useCallback(() => setShowConcernSheet(false),  []));

  const { activeMember } = useActiveProfile();
  const { products, loading: productsLoading } = useCatalogProducts();
  const isKid = activeMember?.type === "child";

  const activeBrand: string | null =
    isKid ? "Little Joys"
    : activeMember?.type === "female" ? "Be Bodywise"
    : activeMember ? "Man Matters"
    : null;

  const [selectedBrand, setSelectedBrand] = useState<string | null>(
    searchParams.get("brand") ?? activeBrand,
  );

  // Kids UI triggers when profile is a child OR user explicitly browses Little Joys brand
  const showKidsFilters = isKid || selectedBrand === "Little Joys";

  const switchBrand = useCallback((brand: string | null) => {
    setSelectedBrand(brand);
    setSelectedSubConcern(null);
    const p = new URLSearchParams(searchParams.toString());
    if (brand) p.set("brand", brand); else p.delete("brand");
    if (brand === "Little Joys") {
      setLjMode("kids");
      setActiveCategory("lj-kids");
      p.set("tab", "lj-kids");
    } else if (activeCategory === "lj-kids" || activeCategory === "lj-mom") {
      setActiveCategory("bestsellers");
      p.set("tab", "bestsellers");
    }
    router.replace(`?${p.toString()}`, { scroll: false });
  }, [router, searchParams, activeCategory]);

  const handleBannerTap = useCallback((brand: string) => {
    setSelectedBrand(brand);
    setSelectedSubConcern(null);
    const tab = brand === "Little Joys" ? "lj-kids" : "bestsellers";
    if (brand === "Little Joys") setLjMode("kids");
    setActiveCategory(tab);
    const p = new URLSearchParams(searchParams.toString());
    p.set("brand", brand);
    p.set("tab", tab);
    router.replace(`?${p.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const activeMemberName: string | null =
    activeMember?.name
    ?? (activeMember?.type === "child" ? "Your child"
       : activeMember?.type === "female" ? "Your partner"
       : activeMember ? "You"
       : null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bh_profile");
      if (raw) setProfile(JSON.parse(raw));
    } catch {}
    setProfileLoaded(true);
  }, []);

  useEffect(() => {
    if (!activeMember?.profile) return;
    const p = activeMember.profile as StoredProfile;
    if (Object.keys(p).length > 0) setProfile(p);
  }, [activeMember]);

  // Sync brand from profile only when no explicit URL brand param is set
  useEffect(() => {
    if (!searchParams.get("brand") && activeBrand) setSelectedBrand(activeBrand);
  }, [activeBrand, searchParams]);

  // Restore scroll position after returning from a product PDP
  useEffect(() => {
    if (productsLoading) return;
    const saved = sessionStorage.getItem("bh_explore_scroll");
    if (!saved) return;
    sessionStorage.removeItem("bh_explore_scroll");
    const target = parseInt(saved, 10);
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = target;
    });
  }, [productsLoading]);

  const picksParam = searchParams.get("picks");
  const [storedPicks, setStoredPicks] = useState("");
  useEffect(() => {
    const saved = localStorage.getItem("bh_protocol_picks") ?? "";
    setStoredPicks(saved);
    if ((picksParam || saved) && !searchParams.get("tab")) setActiveCategory("for-you");
  }, [picksParam]);

  // Header search icon dispatches this event when already on /explore
  useEffect(() => {
    const open = () => setSearchOpen(true);
    window.addEventListener("bh-explore-search-open", open);
    return () => window.removeEventListener("bh-explore-search-open", open);
  }, []);

  const effectivePicks = picksParam || storedPicks;

  const forYouConcernValues = useMemo<string[]>(() => {
    if (!profile) return [];
    const raw = (profile.concerns as string | undefined) ?? profile.concern;
    if (!raw) return [];
    const allConcerns = raw.split(",").map((s) => s.trim()).filter(Boolean);
    return [...new Set(allConcerns.flatMap((c) => ONBOARDING_CONCERN_MAP[c] ?? []))];
  }, [profile]);

  const displayedProducts = useMemo<(Product & { matchScore?: number })[]>(() => {
    let result: (Product & { matchScore?: number })[];

    if (showKidsFilters) {
      const ljAll = products.filter((p) => p.brand === "Little Joys");
      const ljMomPool = ljAll
        .filter((p) => p.segment.some((s) => s.startsWith("female")))
        .sort((a, b) => b.baseScore - a.baseScore);

      // Kids pool: if child profile active, filter by child age; else show all child segments
      const kidsPool = (() => {
        if (isKid) {
          const childAge = activeMember?.childAge ?? "6-12";
          const seg = childAge === "2-5" ? "child-2-6" : childAge === "6-12" ? "child-7-12" : "child-13-18";
          return ljAll.filter((p) => p.segment.includes(seg)).sort((a, b) => b.baseScore - a.baseScore);
        }
        return ljAll.filter((p) => p.segment.some((s) => s.startsWith("child"))).sort((a, b) => b.baseScore - a.baseScore);
      })();

      if (ljMode === "mom") {
        if (KIDS_CONCERN_KEYS.includes(activeCategory) || activeCategory === "hair" || LJ_MOM_CONCERNS.some(c => c.key === activeCategory)) {
          result = ljMomPool.filter((p) => p.concern.includes(activeCategory));
        } else if (activeCategory === "bestsellers") {
          result = ljMomPool.slice(0, 20);
        } else if (activeCategory === "all") {
          result = ljAll.sort((a, b) => b.baseScore - a.baseScore);
        } else {
          result = ljMomPool;
        }
      } else {
        // Kids mode
        if (activeCategory === "bestsellers") {
          result = kidsPool.slice(0, 20);
        } else if (activeCategory === "all") {
          result = ljAll.sort((a, b) => b.baseScore - a.baseScore);
        } else if (KIDS_CATEGORY_KEYS.includes(activeCategory)) {
          result = kidsPool.filter((p) => p.category === activeCategory);
        } else if (KIDS_CONCERN_KEYS.includes(activeCategory) && activeCategory !== "lj-kids") {
          result = kidsPool.filter((p) => p.concern.includes(activeCategory));
        } else {
          // Default "lj-kids" tab — smart concern-based sort if child profile exists
          if (isKid) {
            const childConcern = (activeMember?.profile as Record<string, unknown>)?.concern as string | undefined;
            if (!childConcern) {
              result = kidsPool;
            } else {
              const followUps = KIDS_CONCERN_FOLLOWUP[childConcern] ?? [];
              const directConcern = ["sleep", "skin", "hair"].includes(childConcern);
              result = [...kidsPool].sort((a, b) => {
                const aMatch = directConcern
                  ? a.concern.includes(childConcern)
                  : followUps.length > 0
                    ? a.followUp.some((f) => followUps.some((t) => f.toLowerCase().includes(t)))
                    : a.concern.includes("energy");
                const bMatch = directConcern
                  ? b.concern.includes(childConcern)
                  : followUps.length > 0
                    ? b.followUp.some((f) => followUps.some((t) => f.toLowerCase().includes(t)))
                    : b.concern.includes("energy");
                if (aMatch && !bMatch) return -1;
                if (!aMatch && bMatch) return 1;
                return b.baseScore - a.baseScore;
              });
            }
          } else {
            result = kidsPool;
          }
        }
      }
    } else if (activeCategory === "bestsellers") {
      const pool = selectedBrand ? products.filter((p) => p.brand === selectedBrand) : products;
      result = pool.slice().sort((a, b) => b.baseScore - a.baseScore).slice(0, 24);
    } else if (activeCategory === "all") {
      const pool = selectedBrand ? products.filter((p) => p.brand === selectedBrand) : products;
      result = pool.slice().sort((a, b) => b.baseScore - a.baseScore);
    } else if (activeCategory === "for-you") {
      if (!profile || forYouConcernValues.length === 0) { result = []; }
      else {
        const scored = scoreProducts(forYouConcernValues, profile, products);
        result = selectedBrand ? scored.filter((p) => p.brand === selectedBrand) : scored;
      }
    } else {
      const cat = CATEGORIES.find((c) => c.key === activeCategory);
      if (!cat) { result = []; }
      else {
        const pool = selectedBrand ? products.filter((p) => p.brand === selectedBrand) : products;
        let filtered = pool.filter((p) => p.concern.some((c) => cat.concernValues.includes(c)));
        // Disambiguate weight/hormones from the shared energy concern pool
        if (cat.followUpFilter) {
          filtered = filtered.filter((p) =>
            p.followUp.some((f) => cat.followUpFilter!.some((t) => f.toLowerCase().includes(t.toLowerCase())))
          );
        }
        // Apply sub-concern
        if (selectedSubConcern) {
          const subs = CATEGORY_SUB_CONCERNS[activeCategory] ?? [];
          const sub = subs.find((s) => s.key === selectedSubConcern);
          if (sub) {
            filtered = filtered.filter((p) =>
              p.followUp.some((f) => sub.followUpTerms.some((t) => f.toLowerCase().includes(t.toLowerCase())))
            );
          }
        }
        result = filtered.sort((a, b) => b.baseScore - a.baseScore);
      }
    }

    // Apply search filter (brand-scoped — only searches within currently selected brand)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.concern.some((c) => c.toLowerCase().includes(q)) ||
        p.followUp.some((f) => f.toLowerCase().includes(q))
      );
    }

    return result;
  }, [activeCategory, profile, forYouConcernValues, selectedBrand, isKid, activeMember, products, searchQuery, selectedSubConcern, showKidsFilters, ljMode]);

  const visibleCategories = useMemo<CategoryDef[]>(() => {
    return CATEGORIES.filter((c) => {
      if (c.key === "beard") {
        if (profile?.sex === "female" || selectedBrand === "Be Bodywise" || selectedBrand === "Little Joys") return false;
      }
      return true;
    });
  }, [profile?.sex, selectedBrand]);

  const forYouGrouped = useMemo<{ label: string; products: (Product & { matchScore?: number })[] }[] | null>(() => {
    if (activeCategory !== "for-you" || !profile || selectedBrand === "Little Joys") return null;
    const raw = (profile.concerns as string | undefined) ?? profile.concern ?? "";
    const concernLabels = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (concernLabels.length <= 1) return null;
    const groups = concernLabels.map((label) => ({
      label,
      concernValues: ONBOARDING_CONCERN_MAP[label] ?? [],
      products: [] as (Product & { matchScore?: number })[],
    }));
    for (const product of displayedProducts) {
      for (const group of groups) {
        if (product.concern.some((c) => group.concernValues.includes(c))) {
          group.products.push(product);
          break;
        }
      }
    }
    const filled = groups.filter((g) => g.products.length > 0);
    return filled.length > 1 ? filled : null;
  }, [activeCategory, profile, displayedProducts, activeBrand]);

  const pinnedPicks = useMemo<Product[]>(() => {
    if (!picksVisible || showKidsFilters) return [];
    // If navigated from protocol with explicit picks in URL — use those
    if (picksParam) {
      const ids = picksParam.split(",").filter(Boolean);
      return ids.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[];
    }
    // Otherwise derive top 3 from profile — so sidebar nav shows same structure
    if (!profile || forYouConcernValues.length === 0) return [];
    const scored = scoreProducts(forYouConcernValues, profile, products);
    const pool = selectedBrand ? scored.filter((p) => p.brand === selectedBrand) : scored;
    return pool.slice(0, 3);
  }, [picksParam, picksVisible, profile, forYouConcernValues, selectedBrand, showKidsFilters, products]);

  const pinnedPickIds = useMemo(() => new Set(pinnedPicks.map((p) => p.id)), [pinnedPicks]);
  const forYouNonPinned = useMemo(
    () => displayedProducts.filter((p) => !pinnedPickIds.has(p.id)),
    [displayedProducts, pinnedPickIds],
  );

  const isForYou = activeCategory === "for-you";
  const activeCategoryDef = CATEGORIES.find((c) => c.key === activeCategory);
  const showNoProfile = isForYou && profileLoaded && (!profile || (forYouConcernValues.length === 0 && !showKidsFilters));
  const showPinnedPicks = isForYou && pinnedPicks.length > 0;

  const TOP_CHIPS = showKidsFilters ? [
    { key: "lj-kids", label: "For Kids", icon: "👶" },
    { key: "lj-mom",  label: "For Mom",  icon: "🤱" },
    { key: "bestsellers",    label: "Bestsellers", icon: "🏆" },
    ...(ljMode === "kids" ? [{ key: "category-sheet", label: "By Category", icon: "🗂️", isSheet: true }] : []),
    { key: "concern-sheet",  label: "By Concern",  icon: "🎯", isSheet: true },
    { key: "all",            label: "Shop All",    icon: "📦" },
  ] : [
    { key: "for-you",        label: "For You",     icon: "✦"  },
    { key: "bestsellers",    label: "Bestsellers", icon: "🏆" },
    { key: "category-sheet", label: "By Category", icon: "🗂️", isSheet: true },
    { key: "concern-sheet",  label: "By Concern",  icon: "🎯", isSheet: true },
    { key: "all",            label: "Shop All",    icon: "📦" },
  ];

  const CATEGORY_KEYS = showKidsFilters
    ? KIDS_CATEGORY_KEYS
    : ["hair", "beard", "skin", "weight", "nutrition", "sleep", "hormones"];

  const handleChipClick = (key: string) => {
    if (key === "category-sheet") { setShowCategorySheet(true); return; }
    if (key === "concern-sheet")  { setShowConcernSheet(true);  return; }
    if (key === "lj-kids") { setLjMode("kids"); switchTab("lj-kids"); return; }
    if (key === "lj-mom")  { setLjMode("mom");  switchTab("lj-mom");  return; }
    switchTab(key);
  };

  const isChipActive = (key: string) => {
    if (key === "lj-kids") return activeCategory === "lj-kids" || (showKidsFilters && ljMode === "kids" && activeCategory !== "lj-mom");
    if (key === "lj-mom")  return activeCategory === "lj-mom"  || (showKidsFilters && ljMode === "mom"  && activeCategory !== "lj-kids");
    if (key === "category-sheet") return CATEGORY_KEYS.includes(activeCategory);
    if (key === "concern-sheet") {
      if (showKidsFilters) return KIDS_CONCERN_KEYS.includes(activeCategory) || activeCategory === "hair" || LJ_MOM_CONCERNS.some(c => c.key === activeCategory && activeCategory !== "lj-kids" && activeCategory !== "lj-mom");
      return selectedSubConcern !== null || CONCERN_LIST.some((c) => c.key === activeCategory);
    }
    return activeCategory === key;
  };

  const sectionTitle = (() => {
    if (activeCategory === "lj-kids") return "For Kids";
    if (activeCategory === "lj-mom")  return "For Mom";
    if (activeCategory === "for-you") return "For You";
    if (activeCategory === "bestsellers") return "Bestsellers";
    if (activeCategory === "all") return "Shop All";
    if (selectedSubConcern) {
      const sub = (CATEGORY_SUB_CONCERNS[activeCategory] ?? []).find((s) => s.key === selectedSubConcern);
      if (sub) return sub.label;
    }
    if (showKidsFilters) {
      const concern = KIDS_CONCERN_FILTERS.find(c => c.key === activeCategory)
        ?? LJ_MOM_CONCERNS.find(c => c.key === activeCategory);
      if (concern) return concern.label;
    }
    return activeCategoryDef?.label ?? "Products";
  })();

  return (
    <div className="flex flex-col h-[calc(100dvh-68px-48px)] lg:h-[calc(100dvh-48px)]">

      {/* ── Top bar ── */}
      <div className="flex-none border-b border-outline-variant/8 bg-surface">

        {/* Brand selector + search row */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2 gap-3">
          {/* Brand pill — tappable */}
          <button
            onClick={() => setShowBrandSheet(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors cursor-pointer shrink-0 ${
              selectedBrand
                ? `${BRAND_STYLE[selectedBrand]?.bg ?? "bg-surface-container"} border-outline-variant/20`
                : "bg-surface-container border-outline-variant/20 hover:bg-surface-container-high"
            }`}
          >
            <span className={`text-[12px] font-bold ${BRAND_STYLE[selectedBrand ?? ""]?.text ?? "text-on-surface"}`}>
              {selectedBrand ?? "All Brands"}
            </span>
            <ChevronDown className={`w-3 h-3 ${BRAND_STYLE[selectedBrand ?? ""]?.text ?? "text-on-surface-variant/60"}`} />
          </button>

          {/* Search is in the global header — close button shown when search is open */}
          {searchOpen && (
            <button
              onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4 text-on-surface-variant" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Inline search bar — shown when search is open */}
        {searchOpen && (
          <div className="px-4 pb-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" />
              <input
                autoFocus
                type="text"
                placeholder={`Search in ${selectedBrand ?? "all brands"}…`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-2 bg-surface-container border border-outline-variant/20 rounded-xl text-[13px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary-container/40 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  <X size={12} className="text-on-surface-variant/40" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filter chip row */}
        <div className="flex gap-2 px-4 pb-3.5 overflow-x-auto hide-scrollbar">
          {TOP_CHIPS.map((chip) => {
            const active = isChipActive(chip.key);
            return (
              <button
                key={chip.key}
                onClick={() => handleChipClick(chip.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  active
                    ? "bg-primary-container text-white shadow-sm"
                    : "bg-surface-container border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="text-[12px] leading-none">{chip.icon}</span>
                {chip.label}
                {chip.isSheet && <ChevronDown className="w-3 h-3 opacity-60" />}
              </button>
            );
          })}
        </div>

        {/* Sub-concern chips — inline refinement row shown when active category has sub-concerns */}
        {!showKidsFilters && (CATEGORY_SUB_CONCERNS[activeCategory]?.length ?? 0) > 0 && (
          <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setSelectedSubConcern(null)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                selectedSubConcern === null
                  ? "bg-on-surface/90 text-surface border-transparent"
                  : "bg-transparent border-outline-variant/25 text-on-surface-variant/60 hover:border-outline-variant/50"
              }`}
            >
              All
            </button>
            {CATEGORY_SUB_CONCERNS[activeCategory].map((sub) => (
              <button
                key={sub.key}
                onClick={() => setSelectedSubConcern(sub.key === selectedSubConcern ? null : sub.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  selectedSubConcern === sub.key
                    ? "bg-on-surface/90 text-surface border-transparent"
                    : "bg-transparent border-outline-variant/25 text-on-surface-variant/60 hover:border-outline-variant/50"
                }`}
              >
                <span className="text-[10px] leading-none">{sub.emoji}</span>
                {sub.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-clip">

        {productsLoading && <ProtocolLoader />}

        {!productsLoading && <>

        {/* Brand hero carousel */}
        {!showKidsFilters && (
          <BrandHeroBanners onBrandTap={handleBannerTap} />
        )}

        {/* Onboarding nudge */}
        {profileLoaded && !profile && (
          <div className="mx-4 mt-4 mb-1 bg-primary-container/8 border border-primary-container/15 rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-on-surface leading-snug">Not sure what to buy?</p>
              <p className="text-[11px] text-on-surface-variant/55 mt-0.5 leading-relaxed">A 2-min check-in personalises your picks</p>
            </div>
            <button
              onClick={() => router.push("/home")}
              className="shrink-0 text-[11px] font-bold text-white bg-primary-container px-3.5 py-2 rounded-full cursor-pointer hover:bg-primary transition-colors whitespace-nowrap"
            >
              Personalise →
            </button>
          </div>
        )}

        {/* Section header — subtext + badge only (title duplicates the active tab) */}
        {!showNoProfile && (
          <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
            <p className="text-[12px] text-on-surface-variant/50 truncate">
              {isForYou && isKid
                ? (() => {
                    const concern = (activeMember?.profile as Record<string, unknown>)?.concern as string | undefined;
                    const name = activeMember?.name ?? "your child";
                    return concern ? `Matched to ${name}'s ${concern} goal` : `${displayedProducts.length} products`;
                  })()
                : isForYou && forYouConcernValues.length > 0
                  ? (() => {
                      const raw = (profile?.concerns as string | undefined) ?? profile?.concern ?? "";
                      const labels = raw.split(",").map((s) => s.trim()).filter(Boolean);
                      return labels.length > 1
                        ? `Matched across ${labels.length} concerns`
                        : `Matched to your ${labels[0] ?? ""} concern`;
                    })()
                  : `${displayedProducts.length} product${displayedProducts.length !== 1 ? "s" : ""}`}
            </p>
            {isForYou && (
              <div className="flex items-center gap-1 text-[10px] text-primary-container/80 bg-primary-container/8 px-2.5 py-1 rounded-full shrink-0">
                <Sparkles className="w-2.5 h-2.5" strokeWidth={2} />
                <span className="font-semibold">AI-matched</span>
              </div>
            )}
          </div>
        )}

        {showNoProfile && <NoProfileState />}

        {/* Pinned protocol picks */}
        {showPinnedPicks && (
          <div className="px-3 pt-1 pb-2">
            <div className="bg-primary-container/6 border border-primary-container/15 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary-container" strokeWidth={1.5} />
                  <span className="text-[11px] font-bold text-primary-container uppercase tracking-wider">Your protocol picks</span>
                </div>
                <button onClick={() => setPicksVisible(false)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors cursor-pointer">
                  <X className="w-3.5 h-3.5 text-on-surface-variant/40" strokeWidth={2} />
                </button>
              </div>
              <div className="px-3 pb-3 grid grid-cols-2 lg:grid-cols-3 gap-3">
                {pinnedPicks.map((p) => <ProductCard key={p.id} product={p} isTopPick={true} />)}
              </div>
            </div>
          </div>
        )}

        {/* Product grid */}
        {!showNoProfile && (showPinnedPicks ? forYouNonPinned : displayedProducts).length > 0 && (
          (() => {
            const products = showPinnedPicks ? forYouNonPinned : displayedProducts;
            return forYouGrouped && !showPinnedPicks ? (
              <div className="px-3 pb-6 space-y-6">
                {forYouGrouped.map((group) => (
                  <div key={group.label}>
                    <div className="flex items-center gap-2 px-1 mb-3">
                      <span className="text-[11px] font-bold text-primary-container tracking-wide uppercase">For your {concernLabel(group.label)}</span>
                      <div className="flex-1 h-px bg-outline-variant/15" />
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.products.map((p) => <ProductCard key={p.id} product={p} matchPct={(p as MatchedProduct).matchScore} />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-3 pb-6">
                {showPinnedPicks && products.length > 0 && (
                  <div className="flex items-center gap-2 px-1 mb-3 pt-1">
                    <span className="text-[11px] font-bold text-on-surface-variant/50 tracking-wide uppercase">You might also like</span>
                    <div className="flex-1 h-px bg-outline-variant/15" />
                  </div>
                )}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {products.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      isTopPick={!isForYou && (p as MatchedProduct).matchScore >= 85}
                      matchPct={isForYou ? (p as MatchedProduct).matchScore : undefined}
                    />
                  ))}
                </div>
              </div>
            );
          })()
        )}

        {!showNoProfile && displayedProducts.length > 0 && (
          <div className="mx-4 mb-6 px-3 py-2.5 rounded-xl bg-surface-container/60 border border-outline-variant/10">
            <p className="text-[10px] text-on-surface-variant/45 text-center leading-relaxed">
              Tapping a product opens the brand&apos;s store &middot; Free shipping on most orders &middot; Doctor-formulated
            </p>
          </div>
        )}

        </>}
      </div>

      {/* ── Shop by Brand bottom sheet ── */}
      {showBrandSheet && (
        <div className="fixed inset-0 z-[55]" onClick={() => setShowBrandSheet(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            ref={brandSwipe.sheetRef}
            onTouchStart={brandSwipe.onTouchStart}
            onTouchMove={brandSwipe.onTouchMove}
            onTouchEnd={brandSwipe.onTouchEnd}
            className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-3xl pt-5 pb-10 px-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-outline-variant/30 rounded-full mx-auto mb-5" />
            <p className="font-extrabold text-[16px] text-on-surface font-[family-name:var(--font-manrope)] mb-4">Shop by Brand</p>
            <div className="flex flex-col gap-3">
              {[
                { name: "Man Matters", desc: "Men's health & grooming", emoji: "💪" },
                { name: "Be Bodywise", desc: "Women's health & skincare", emoji: "✨" },
                { name: "Little Joys",  desc: "Kids & moms wellness",    emoji: "🌱" },
              ].map((brand) => (
                <button
                  key={brand.name}
                  onClick={() => {
                    switchBrand(brand.name);
                    setShowBrandSheet(false);
                    if (activeCategory === "for-you") switchTab("bestsellers");
                  }}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                    selectedBrand === brand.name
                      ? "bg-primary-container/10 border-primary-container/35"
                      : "border-outline-variant/10 bg-surface-container-low hover:bg-surface-container"
                  }`}
                >
                  <span className="text-2xl leading-none shrink-0">{brand.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[13px] font-bold ${selectedBrand === brand.name ? "text-primary-container" : "text-on-surface"}`}>
                      {brand.name}
                    </p>
                    <p className="text-[11px] text-on-surface-variant/50 mt-0.5">{brand.desc}</p>
                  </div>
                  {selectedBrand === brand.name && (
                    <Check className="w-4 h-4 text-primary-container shrink-0" strokeWidth={2.5} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── By Category bottom sheet ── */}
      {showCategorySheet && (
        <div className="fixed inset-0 z-[55]" onClick={() => setShowCategorySheet(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            ref={categorySwipe.sheetRef}
            onTouchStart={categorySwipe.onTouchStart}
            onTouchMove={categorySwipe.onTouchMove}
            onTouchEnd={categorySwipe.onTouchEnd}
            className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-3xl pt-5 pb-10 px-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-outline-variant/30 rounded-full mx-auto mb-5" />
            <p className="font-extrabold text-[16px] text-on-surface font-[family-name:var(--font-manrope)] mb-4">Shop by Category</p>

            {showKidsFilters ? (
              <div className="grid grid-cols-2 gap-3">
                {KIDS_CATEGORY_FILTERS.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => { switchTab(cat.key); setShowCategorySheet(false); }}
                    className={`relative flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
                      activeCategory === cat.key
                        ? "border-amber-400/60 bg-amber-500/10"
                        : "border-outline-variant/12 bg-surface-container-low hover:bg-surface-container"
                    }`}
                  >
                    <span className="text-3xl leading-none">{cat.emoji}</span>
                    <span className={`text-[13px] font-bold ${activeCategory === cat.key ? "text-amber-700" : "text-on-surface"}`}>{cat.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {visibleCategories.filter((c) => c.key !== "for-you").map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => { switchTab(cat.key); setShowCategorySheet(false); }}
                    className={`relative flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
                      activeCategory === cat.key
                        ? "border-primary-container/50 bg-primary-container/10"
                        : "border-outline-variant/10 bg-surface-container-low hover:bg-surface-container"
                    }`}
                  >
                    {/* Gradient background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-60`} />
                    <span className="relative text-3xl leading-none">{cat.emoji}</span>
                    <span className={`relative text-[13px] font-bold ${activeCategory === cat.key ? "text-primary-container" : "text-on-surface"}`}>
                      {cat.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── By Concern bottom sheet ── */}
      {showConcernSheet && (
        <div className="fixed inset-0 z-[55]" onClick={() => setShowConcernSheet(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            ref={concernSwipe.sheetRef}
            onTouchStart={concernSwipe.onTouchStart}
            onTouchMove={concernSwipe.onTouchMove}
            onTouchEnd={concernSwipe.onTouchEnd}
            className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-3xl pt-5 pb-10 px-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-outline-variant/30 rounded-full mx-auto mb-5" />
            <p className="font-extrabold text-[16px] text-on-surface font-[family-name:var(--font-manrope)] mb-4">
              {showKidsFilters
                ? (ljMode === "mom" ? "Shop by Concern" : "Shop by Concern")
                : (CATEGORY_SUB_CONCERNS[activeCategory]?.length ?? 0) > 0 ? "Refine by Concern" : "Shop by Concern"}
            </p>
            <div className="flex flex-col gap-2.5">
              {showKidsFilters ? (
                ljMode === "mom" ? (
                  LJ_MOM_CONCERNS.map((concern) => (
                    <button
                      key={concern.key}
                      onClick={() => { switchTab(concern.key); setShowConcernSheet(false); }}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                        activeCategory === concern.key
                          ? "bg-amber-500/10 border-amber-400/40"
                          : "border-outline-variant/10 bg-surface-container-low hover:bg-surface-container"
                      }`}
                    >
                      <span className="text-2xl leading-none shrink-0">{concern.emoji}</span>
                      <div className="min-w-0">
                        <p className={`text-[13px] font-bold ${activeCategory === concern.key ? "text-amber-700" : "text-on-surface"}`}>{concern.label}</p>
                        <p className="text-[11px] text-on-surface-variant/50 mt-0.5">{concern.desc}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  KIDS_CONCERN_FILTERS.map((concern) => (
                    <button
                      key={concern.key}
                      onClick={() => { switchTab(concern.key); setShowConcernSheet(false); }}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                        activeCategory === concern.key
                          ? "bg-amber-500/10 border-amber-400/40"
                          : "border-outline-variant/10 bg-surface-container-low hover:bg-surface-container"
                      }`}
                    >
                      <span className="text-2xl leading-none shrink-0">{concern.emoji}</span>
                      <div className="min-w-0">
                        <p className={`text-[13px] font-bold ${activeCategory === concern.key ? "text-amber-700" : "text-on-surface"}`}>{concern.label}</p>
                        <p className="text-[11px] text-on-surface-variant/50 mt-0.5">{concern.desc}</p>
                      </div>
                    </button>
                  ))
                )
              ) : (CATEGORY_SUB_CONCERNS[activeCategory]?.length ?? 0) > 0 ? (
                // Sub-concerns for the active category
                <>
                  <p className="text-[11px] text-on-surface-variant/50 mb-3">
                    Filtering within <span className="font-bold text-primary-container">{activeCategoryDef?.label}</span>
                  </p>
                  {/* "All" option */}
                  <button
                    onClick={() => { setSelectedSubConcern(null); setShowConcernSheet(false); }}
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl border-2 transition-all cursor-pointer text-left mb-1 ${
                      !selectedSubConcern
                        ? "bg-primary-container/10 border-primary-container/35"
                        : "border-outline-variant/10 bg-surface-container-low hover:bg-surface-container"
                    }`}
                  >
                    <span className="text-2xl leading-none shrink-0">✦</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[13px] font-bold ${!selectedSubConcern ? "text-primary-container" : "text-on-surface"}`}>
                        All {activeCategoryDef?.label} products
                      </p>
                      <p className="text-[11px] text-on-surface-variant/50 mt-0.5">Show everything in this category</p>
                    </div>
                    {!selectedSubConcern && <Check className="w-4 h-4 text-primary-container shrink-0" strokeWidth={2.5} />}
                  </button>
                  {(CATEGORY_SUB_CONCERNS[activeCategory] ?? []).map((sub) => (
                    <button
                      key={sub.key}
                      onClick={() => { setSelectedSubConcern(sub.key); setShowConcernSheet(false); }}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                        selectedSubConcern === sub.key
                          ? "bg-primary-container/10 border-primary-container/35"
                          : "border-outline-variant/10 bg-surface-container-low hover:bg-surface-container"
                      }`}
                    >
                      <span className="text-2xl leading-none shrink-0">{sub.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[13px] font-bold ${selectedSubConcern === sub.key ? "text-primary-container" : "text-on-surface"}`}>{sub.label}</p>
                        <p className="text-[11px] text-on-surface-variant/50 mt-0.5">{sub.desc}</p>
                      </div>
                      {selectedSubConcern === sub.key && <Check className="w-4 h-4 text-primary-container shrink-0" strokeWidth={2.5} />}
                    </button>
                  ))}
                </>
              ) : (
                // No category selected or category has no sub-concerns → top-level concern selector
                CONCERN_LIST
                  .filter((c) => !(c.key === "beard" && (profile?.sex === "female" || selectedBrand === "Be Bodywise")))
                  .map((concern) => {
                    const cc = CONCERN_COLORS[concern.key];
                    const isActive = activeCategory === concern.key;
                    return (
                      <button
                        key={concern.key}
                        onClick={() => { switchTab(concern.key); setShowConcernSheet(false); }}
                        className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                          isActive
                            ? cc ? cc.active : "bg-primary-container/10 border-primary-container/35"
                            : cc ? cc.idle : "border-outline-variant/10 bg-surface-container-low hover:opacity-80"
                        }`}
                      >
                        <span className="text-2xl leading-none shrink-0">{concern.emoji}</span>
                        <div className="min-w-0">
                          <p className={`text-[13px] font-bold ${isActive ? (cc?.text ?? "text-primary-container") : "text-on-surface"}`}>{concern.label}</p>
                          <p className="text-[11px] text-on-surface-variant/50 mt-0.5">{concern.desc}</p>
                        </div>
                        {isActive && <Check className="w-4 h-4 shrink-0 ml-auto" strokeWidth={2.5} style={{ color: "currentColor" }} />}
                      </button>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExplorePageContent />
    </Suspense>
  );
}
