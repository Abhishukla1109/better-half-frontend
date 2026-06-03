"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, ExternalLink, ArrowRight, ShoppingBag, Loader2, Check, AlertCircle, X, ChevronDown } from "lucide-react";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { ALL_PRODUCTS, resolveSegment } from "@/lib/protocolEngine";
import type { Product, MatchedProduct } from "@/lib/protocolEngine";
import { useCart } from "@/context/CartContext";
import { resolveVariantId } from "@/lib/shopify/variant-resolver";

/* ── Category definitions ── */
type CategoryDef = {
  key: string;
  label: string;
  abbr: string;
  emoji: string;
  gradient: string;
  concernValues: string[];
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

const KIDS_CATEGORY_KEYS = KIDS_CATEGORY_FILTERS.map((c) => c.key);
const KIDS_CONCERN_KEYS  = KIDS_CONCERN_FILTERS.map((c) => c.key);

/* Brand badge colors */
const BRAND_STYLE: Record<string, { bg: string; text: string }> = {
  "Man Matters": { bg: "bg-primary-container/10", text: "text-primary-container" },
  "Be Bodywise": { bg: "bg-rose-500/10", text: "text-rose-500" },
  "Little Joys": { bg: "bg-amber-500/10", text: "text-amber-600" },
};

type StoredProfile = Record<string, string | undefined>;

function concernLabel(raw: string): string {
  return raw.split(" / ").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" & ");
}

/* ── Scoring engine ── */
function scoreProducts(
  concernValues: string[],
  profile: StoredProfile,
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

  return ALL_PRODUCTS.flatMap((product) => {
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
    <div className="flex flex-col bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/10 hover:border-primary-container/30 hover:shadow-md transition-all duration-200 group">
      {/* Image */}
      <div
        onClick={() => router.push(`/product/${product.id}`)}
        className="relative w-full h-[175px] sm:h-[190px] bg-surface-container-low cursor-pointer overflow-hidden"
      >
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
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

        {/* Match / top-pick badge */}
        {matchPct !== undefined && matchPct >= 80 ? (
          <div className="absolute top-2.5 right-2.5 bg-primary-container/90 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full leading-none shadow-sm tabular-nums">
            {matchPct}% match
          </div>
        ) : isTopPick ? (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 bg-primary-container/90 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full leading-none shadow-sm">
            <Sparkles className="w-2.5 h-2.5" strokeWidth={2} />
            Top pick
          </div>
        ) : null}

        {/* External link hint on hover */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="w-3.5 h-3.5 text-white drop-shadow" strokeWidth={2} />
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col flex-1 gap-1.5">
        {/* Brand + rating row */}
        <div className="flex items-center justify-between gap-1">
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md leading-none ${brand.bg} ${brand.text}`}>
            {product.brand}
          </span>
          {product.rating && (
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] leading-none text-amber-400">★</span>
              <span className="text-[10px] font-bold text-on-surface">{product.rating}</span>
              {reviewLabel && (
                <span className="text-[9px] text-on-surface-variant/40">({reviewLabel})</span>
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

/* ── Explore Page ── */
function ExplorePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("for-you");
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [picksVisible, setPicksVisible] = useState(true);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showConcernSheet, setShowConcernSheet] = useState(false);

  const { activeMember } = useActiveProfile();
  const isKid = activeMember?.type === "child";

  const activeBrand: string | null =
    isKid ? "Little Joys"
    : activeMember?.type === "female" ? "Be Bodywise"
    : activeMember ? "Man Matters"
    : null;

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

  const picksParam = searchParams.get("picks");
  const [storedPicks, setStoredPicks] = useState("");
  useEffect(() => {
    const saved = localStorage.getItem("bh_protocol_picks") ?? "";
    setStoredPicks(saved);
    if (picksParam || saved) setActiveCategory("for-you");
  }, [picksParam]);

  const effectivePicks = picksParam || storedPicks;

  const forYouConcernValues = useMemo<string[]>(() => {
    if (!profile) return [];
    const raw = (profile.concerns as string | undefined) ?? profile.concern;
    if (!raw) return [];
    const allConcerns = raw.split(",").map((s) => s.trim()).filter(Boolean);
    return [...new Set(allConcerns.flatMap((c) => ONBOARDING_CONCERN_MAP[c] ?? []))];
  }, [profile]);

  const displayedProducts = useMemo<(Product & { matchScore?: number })[]>(() => {
    if (isKid) {
      const childAge = activeMember?.childAge ?? "6-12";
      const seg = childAge === "2-5" ? "kids-2-5" : childAge === "6-12" ? "kids-6-12" : "kids-13-plus";
      const lj = ALL_PRODUCTS
        .filter((p) => p.brand === "Little Joys" && p.segment.includes(seg))
        .sort((a, b) => b.baseScore - a.baseScore);

      if (activeCategory === "bestsellers") return lj.slice(0, 20);
      if (activeCategory === "all") return lj;
      if (KIDS_CATEGORY_KEYS.includes(activeCategory)) return lj.filter((p) => p.category === activeCategory);
      if (KIDS_CONCERN_KEYS.includes(activeCategory) && activeCategory !== "for-you") return lj.filter((p) => p.concern.includes(activeCategory));

      const childConcern = (activeMember?.profile as Record<string, unknown>)?.concern as string | undefined;
      if (!childConcern) return lj;
      const followUps = KIDS_CONCERN_FOLLOWUP[childConcern] ?? [];
      const directConcern = ["sleep", "skin", "hair"].includes(childConcern);
      return [...lj].sort((a, b) => {
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

    if (activeCategory === "bestsellers") {
      const pool = activeBrand ? ALL_PRODUCTS.filter((p) => p.brand === activeBrand) : ALL_PRODUCTS;
      return pool.slice().sort((a, b) => b.baseScore - a.baseScore).slice(0, 24);
    }
    if (activeCategory === "all") {
      const pool = activeBrand ? ALL_PRODUCTS.filter((p) => p.brand === activeBrand) : ALL_PRODUCTS;
      return pool.slice().sort((a, b) => b.baseScore - a.baseScore);
    }
    if (activeCategory === "for-you") {
      if (!profile || forYouConcernValues.length === 0) return [];
      const scored = scoreProducts(forYouConcernValues, profile);
      return activeBrand ? scored.filter((p) => p.brand === activeBrand) : scored;
    }

    const cat = CATEGORIES.find((c) => c.key === activeCategory);
    if (!cat) return [];
    const pool = activeBrand ? ALL_PRODUCTS.filter((p) => p.brand === activeBrand) : ALL_PRODUCTS;
    return pool
      .filter((p) => p.concern.some((c) => cat.concernValues.includes(c)))
      .sort((a, b) => b.baseScore - a.baseScore);
  }, [activeCategory, profile, forYouConcernValues, activeBrand, isKid, activeMember]);

  const visibleCategories = useMemo<CategoryDef[]>(() => {
    return CATEGORIES.filter((c) => {
      if (c.key === "beard" && profile?.sex === "female") return false;
      return true;
    });
  }, [profile?.sex]);

  const forYouGrouped = useMemo<{ label: string; products: (Product & { matchScore?: number })[] }[] | null>(() => {
    if (activeCategory !== "for-you" || !profile || activeBrand === "Little Joys") return null;
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
    if (!picksVisible || isKid) return [];
    // If navigated from protocol with explicit picks in URL — use those
    if (picksParam) {
      const ids = picksParam.split(",").filter(Boolean);
      return ids.map((id) => ALL_PRODUCTS.find((p) => p.id === id)).filter(Boolean) as Product[];
    }
    // Otherwise derive top 3 from profile — so sidebar nav shows same structure
    if (!profile || forYouConcernValues.length === 0) return [];
    const scored = scoreProducts(forYouConcernValues, profile);
    const pool = activeBrand ? scored.filter((p) => p.brand === activeBrand) : scored;
    return pool.slice(0, 3);
  }, [picksParam, picksVisible, profile, forYouConcernValues, activeBrand, isKid]);

  const pinnedPickIds = useMemo(() => new Set(pinnedPicks.map((p) => p.id)), [pinnedPicks]);
  const forYouNonPinned = useMemo(
    () => displayedProducts.filter((p) => !pinnedPickIds.has(p.id)),
    [displayedProducts, pinnedPickIds],
  );

  const isForYou = activeCategory === "for-you";
  const activeCategoryDef = CATEGORIES.find((c) => c.key === activeCategory);
  const showNoProfile = isForYou && profileLoaded && (!profile || (forYouConcernValues.length === 0 && activeBrand !== "Little Joys"));
  const showPinnedPicks = isForYou && pinnedPicks.length > 0;

  const TOP_CHIPS = [
    { key: "for-you",        label: "For You",     icon: "✦"  },
    { key: "bestsellers",    label: "Bestsellers", icon: "🏆" },
    { key: "category-sheet", label: "By Category", icon: "🗂", isSheet: true },
    { key: "concern-sheet",  label: "By Concern",  icon: "🎯", isSheet: true },
    { key: "all",            label: "Shop All",    icon: "📦" },
  ];

  const CATEGORY_KEYS = isKid
    ? KIDS_CATEGORY_KEYS
    : ["hair", "beard", "skin", "weight", "nutrition", "sleep", "hormones"];

  const handleChipClick = (key: string) => {
    if (key === "category-sheet") { setShowCategorySheet(true); return; }
    if (key === "concern-sheet")  { setShowConcernSheet(true);  return; }
    setActiveCategory(key);
  };

  const isChipActive = (key: string) => {
    if (key === "category-sheet") return CATEGORY_KEYS.includes(activeCategory);
    if (key === "concern-sheet")  return isKid ? KIDS_CONCERN_KEYS.includes(activeCategory) : false;
    return activeCategory === key;
  };

  const sectionTitle =
    activeCategory === "for-you"      ? "For You"
    : activeCategory === "bestsellers" ? "Bestsellers"
    : activeCategory === "all"         ? "Shop All"
    : activeCategoryDef?.label         ?? "Products";

  return (
    <div className="flex flex-col h-[calc(100dvh-68px-48px)] lg:h-[calc(100dvh-48px)]">

      {/* ── Top bar ── */}
      <div className="flex-none border-b border-outline-variant/8 bg-surface">

        {/* Profile context row */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
          {activeMemberName ? (
            <button
              onClick={() => window.dispatchEvent(new Event("bh-profile-sidebar-open"))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-container/8 border border-primary-container/15 cursor-pointer hover:bg-primary-container/12 transition-colors"
            >
              <span className="text-sm leading-none">
                {activeMember?.type === "child" ? "🧒" : activeMember?.type === "female" ? "👩" : "👤"}
              </span>
              <span className="text-[12px] font-semibold text-primary-container">
                Shopping for {activeMemberName}
              </span>
              <ChevronDown className="w-3 h-3 text-primary-container/60" />
            </button>
          ) : (
            <span className="text-base font-extrabold text-on-surface font-[family-name:var(--font-manrope)]">Shop</span>
          )}
          {activeBrand && (
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${BRAND_STYLE[activeBrand]?.bg ?? "bg-surface-container"} ${BRAND_STYLE[activeBrand]?.text ?? "text-on-surface-variant"}`}>
              {activeBrand}
            </span>
          )}
        </div>

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
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto overflow-x-clip">

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

        {/* Section header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-[18px] font-extrabold text-on-surface tracking-tight font-[family-name:var(--font-manrope)]">
                {sectionTitle}
              </h1>
              {!showNoProfile && (
                <p className="text-[12px] text-on-surface-variant/50 mt-0.5 truncate">
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
              )}
            </div>
            {isForYou && !showNoProfile && (
              <div className="flex items-center gap-1 text-[10px] text-primary-container/80 bg-primary-container/8 px-2.5 py-1 rounded-full shrink-0">
                <Sparkles className="w-2.5 h-2.5" strokeWidth={2} />
                <span className="font-semibold">AI-matched</span>
              </div>
            )}
          </div>
        </div>

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

        {!showNoProfile && displayedProducts.length === 0 && !profileLoaded && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-primary-container/30 border-t-primary-container animate-spin" />
          </div>
        )}

        {!showNoProfile && displayedProducts.length > 0 && (
          <div className="mx-4 mb-6 px-3 py-2.5 rounded-xl bg-surface-container/60 border border-outline-variant/10">
            <p className="text-[10px] text-on-surface-variant/45 text-center leading-relaxed">
              Tapping a product opens the brand&apos;s store &middot; Free shipping on most orders &middot; Doctor-formulated
            </p>
          </div>
        )}
      </div>

      {/* ── By Category bottom sheet ── */}
      {showCategorySheet && (
        <div className="fixed inset-0 z-[55]" onClick={() => setShowCategorySheet(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-3xl pt-5 pb-10 px-5" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-outline-variant/30 rounded-full mx-auto mb-5" />
            <p className="font-extrabold text-[16px] text-on-surface font-[family-name:var(--font-manrope)] mb-4">Shop by Category</p>

            {isKid ? (
              <div className="grid grid-cols-2 gap-3">
                {KIDS_CATEGORY_FILTERS.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => { setActiveCategory(cat.key); setShowCategorySheet(false); }}
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
                    onClick={() => { setActiveCategory(cat.key); setShowCategorySheet(false); }}
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
          <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-3xl pt-5 pb-10 px-5" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-outline-variant/30 rounded-full mx-auto mb-5" />
            <p className="font-extrabold text-[16px] text-on-surface font-[family-name:var(--font-manrope)] mb-4">Shop by Concern</p>
            <div className="flex flex-col gap-2.5">
              {isKid ? (
                KIDS_CONCERN_FILTERS.map((concern) => (
                  <button
                    key={concern.key}
                    onClick={() => { setActiveCategory(concern.key); setShowConcernSheet(false); }}
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
                CONCERN_LIST
                  .filter((c) => !(c.key === "beard" && profile?.sex === "female"))
                  .map((concern) => (
                    <button
                      key={concern.key}
                      onClick={() => { setActiveCategory(concern.key); setShowConcernSheet(false); }}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                        activeCategory === concern.key
                          ? "bg-primary-container/10 border-primary-container/35"
                          : "border-outline-variant/10 bg-surface-container-low hover:bg-surface-container"
                      }`}
                    >
                      <span className="text-2xl leading-none shrink-0">{concern.emoji}</span>
                      <div className="min-w-0">
                        <p className={`text-[13px] font-bold ${activeCategory === concern.key ? "text-primary-container" : "text-on-surface"}`}>{concern.label}</p>
                        <p className="text-[11px] text-on-surface-variant/50 mt-0.5">{concern.desc}</p>
                      </div>
                    </button>
                  ))
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
