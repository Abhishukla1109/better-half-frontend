export type UserSegment = {
  gender: string;
  age: string;
  diet: string;
  concern: string;
  followUp?: string;
  shoppingFor?: string;
  kidsAge?: string;
};

export type Product = {
  id: string;
  brand: "Man Matters" | "Be Bodywise" | "Little Joys";
  name: string;
  price: number;
  mrp: number;
  concern: string[];
  gender: string[];
  segment: string[];
  followUp: string[];
  category: string;
  baseScore: number;
};

export type MatchedProduct = Product & { matchScore: number };

export const ALL_PRODUCTS: Product[] = [
  // ── MAN MATTERS — HAIR ──
  {
    id: "mm-biotin-30",
    brand: "Man Matters",
    name: "Biotin Hair Gummies (30N)",
    price: 499,
    mrp: 599,
    concern: ["hair"],
    gender: ["male"],
    segment: ["male-18-25", "male-25-35"],
    followUp: ["hair fall", "thinning", "all of these"],
    category: "hair",
    baseScore: 92,
  },
  {
    id: "mm-hair-serum",
    brand: "Man Matters",
    name: "Advanced Hair Growth Serum",
    price: 569,
    mrp: 699,
    concern: ["hair"],
    gender: ["male"],
    segment: ["male-18-25", "male-25-35", "male-35-plus"],
    followUp: ["hair fall", "thinning"],
    category: "hair",
    baseScore: 90,
  },
  {
    id: "mm-dht-shampoo",
    brand: "Man Matters",
    name: "DHT Blocking Shampoo",
    price: 429,
    mrp: 499,
    concern: ["hair"],
    gender: ["male"],
    segment: ["male-25-35", "male-35-plus"],
    followUp: ["hair fall", "thinning"],
    category: "hair",
    baseScore: 88,
  },
  {
    id: "mm-dandruff-shampoo",
    brand: "Man Matters",
    name: "Anti-Dandruff Pro Kit",
    price: 711,
    mrp: 849,
    concern: ["hair"],
    gender: ["male"],
    segment: ["male-18-25", "male-25-35"],
    followUp: ["dandruff"],
    category: "hair",
    baseScore: 91,
  },
  {
    id: "mm-stage1-kit",
    brand: "Man Matters",
    name: "Stage 1 Hair Kit",
    price: 730,
    mrp: 899,
    concern: ["hair"],
    gender: ["male"],
    segment: ["male-25-35", "male-35-plus"],
    followUp: ["hair fall", "thinning", "all of these"],
    category: "hair",
    baseScore: 94,
  },

  // ── MAN MATTERS — BEARD ──
  {
    id: "mm-beardmax",
    brand: "Man Matters",
    name: "Beardmax Growth Serum",
    price: 449,
    mrp: 549,
    concern: ["beard"],
    gender: ["male"],
    segment: ["male-18-25", "male-25-35"],
    followUp: ["patchy beard", "slow growth"],
    category: "beard",
    baseScore: 91,
  },
  {
    id: "mm-beard-kit",
    brand: "Man Matters",
    name: "Complete Beard Activator Kit",
    price: 898,
    mrp: 1099,
    concern: ["beard"],
    gender: ["male"],
    segment: ["male-18-25", "male-25-35"],
    followUp: ["patchy beard", "slow growth", "no beard"],
    category: "beard",
    baseScore: 93,
  },

  // ── MAN MATTERS — SKIN ──
  {
    id: "mm-niacinamide",
    brand: "Man Matters",
    name: "REJUV Niacinamide Serum",
    price: 289,
    mrp: 349,
    concern: ["skin"],
    gender: ["male"],
    segment: ["male-18-25", "male-25-35"],
    followUp: ["acne", "oily skin", "face"],
    category: "skin",
    baseScore: 89,
  },
  {
    id: "mm-facewash",
    brand: "Man Matters",
    name: "Men's Face Wash for Oily Skin",
    price: 328,
    mrp: 399,
    concern: ["skin"],
    gender: ["male"],
    segment: ["male-18-25"],
    followUp: ["acne", "oily skin"],
    category: "skin",
    baseScore: 87,
  },
  {
    id: "mm-clear-skin",
    brand: "Man Matters",
    name: "Clear Skin Starter Pack",
    price: 617,
    mrp: 749,
    concern: ["skin"],
    gender: ["male"],
    segment: ["male-18-25", "male-25-35"],
    followUp: ["acne", "face", "back"],
    category: "skin",
    baseScore: 91,
  },

  // ── MAN MATTERS — ENERGY/STRESS ──
  {
    id: "mm-ashwagandha",
    brand: "Man Matters",
    name: "Ashwagandha Gummies for Stress",
    price: 609,
    mrp: 749,
    concern: ["energy", "sleep", "stress"],
    gender: ["male"],
    segment: ["male-25-35", "male-35-plus"],
    followUp: ["stress", "anxiety", "low energy", "falling asleep"],
    category: "energy",
    baseScore: 92,
  },
  {
    id: "mm-shilajit",
    brand: "Man Matters",
    name: "Shilajit Gummies",
    price: 799,
    mrp: 999,
    concern: ["energy", "performance"],
    gender: ["male"],
    segment: ["male-25-35", "male-35-plus"],
    followUp: ["low energy", "fatigue"],
    category: "energy",
    baseScore: 90,
  },
  {
    id: "mm-tostero",
    brand: "Man Matters",
    name: "TOSTERO Capsules",
    price: 449,
    mrp: 549,
    concern: ["energy", "hormones"],
    gender: ["male"],
    segment: ["male-35-plus"],
    followUp: ["low energy", "fatigue", "hormonal issues"],
    category: "energy",
    baseScore: 88,
  },

  // ── MAN MATTERS — FITNESS ──
  {
    id: "mm-whey",
    brand: "Man Matters",
    name: "Whey Protein Powder",
    price: 999,
    mrp: 1299,
    concern: ["weight", "fitness"],
    gender: ["male"],
    segment: ["male-18-25", "male-25-35"],
    followUp: ["build muscle", "both"],
    category: "fitness",
    baseScore: 91,
  },
  {
    id: "mm-creatine",
    brand: "Man Matters",
    name: "Micronised Creatine Monohydrate",
    price: 549,
    mrp: 699,
    concern: ["weight", "fitness"],
    gender: ["male"],
    segment: ["male-18-25", "male-25-35"],
    followUp: ["build muscle"],
    category: "fitness",
    baseScore: 89,
  },

  // ── BE BODYWISE — HAIR ──
  {
    id: "bb-biotin",
    brand: "Be Bodywise",
    name: "Biotin Hair Gummies (30N)",
    price: 499,
    mrp: 599,
    concern: ["hair"],
    gender: ["female"],
    segment: ["female-18-25", "female-25-35"],
    followUp: ["hair fall", "thinning", "all of these"],
    category: "hair",
    baseScore: 93,
  },
  {
    id: "bb-hair-serum",
    brand: "Be Bodywise",
    name: "Advanced Hair Growth Serum",
    price: 569,
    mrp: 699,
    concern: ["hair"],
    gender: ["female"],
    segment: ["female-18-25", "female-25-35", "female-35-plus"],
    followUp: ["hair fall", "thinning"],
    category: "hair",
    baseScore: 91,
  },
  {
    id: "bb-keratin-shampoo",
    brand: "Be Bodywise",
    name: "Keratin Shampoo for Hair Fall",
    price: 449,
    mrp: 549,
    concern: ["hair"],
    gender: ["female"],
    segment: ["female-25-35", "female-35-plus"],
    followUp: ["hair fall"],
    category: "hair",
    baseScore: 88,
  },
  {
    id: "bb-postpreg-hair",
    brand: "Be Bodywise",
    name: "Post-Pregnancy Hair Gummies",
    price: 549,
    mrp: 649,
    concern: ["hair"],
    gender: ["female"],
    segment: ["female-35-plus", "mom"],
    followUp: ["hair fall", "postpartum"],
    category: "hair",
    baseScore: 95,
  },

  // ── BE BODYWISE — SKIN ──
  {
    id: "bb-salicylic-fw",
    brand: "Be Bodywise",
    name: "2% Salicylic Acid Face Wash",
    price: 232,
    mrp: 299,
    concern: ["skin"],
    gender: ["female"],
    segment: ["female-18-25", "female-25-35"],
    followUp: ["acne", "face", "oily"],
    category: "skin",
    baseScore: 90,
  },
  {
    id: "bb-glutathione",
    brand: "Be Bodywise",
    name: "Glutathione Gummies (60N)",
    price: 689,
    mrp: 849,
    concern: ["skin"],
    gender: ["female"],
    segment: ["female-18-25", "female-25-35", "female-35-plus"],
    followUp: ["pigmentation", "glow", "acne", "face"],
    category: "skin",
    baseScore: 92,
  },
  {
    id: "bb-acne-pack",
    brand: "Be Bodywise",
    name: "Body Acne Pack",
    price: 719,
    mrp: 899,
    concern: ["skin"],
    gender: ["female"],
    segment: ["female-18-25", "female-25-35"],
    followUp: ["back", "body acne"],
    category: "skin",
    baseScore: 89,
  },
  {
    id: "bb-pimple-patch",
    brand: "Be Bodywise",
    name: "Hydrocolloid Acne Pimple Patch",
    price: 299,
    mrp: 349,
    concern: ["skin"],
    gender: ["female"],
    segment: ["female-18-25"],
    followUp: ["acne", "face"],
    category: "skin",
    baseScore: 86,
  },

  // ── BE BODYWISE — HORMONES/ENERGY ──
  {
    id: "bb-shilajit-women",
    brand: "Be Bodywise",
    name: "Shilajit Gummies for Women",
    price: 769,
    mrp: 949,
    concern: ["hormones", "energy"],
    gender: ["female"],
    segment: ["female-25-35", "female-35-plus"],
    followUp: ["irregular cycles", "mood changes", "fatigue"],
    category: "hormones",
    baseScore: 93,
  },
  {
    id: "bb-multivitamin",
    brand: "Be Bodywise",
    name: "Multivitamin Gummies",
    price: 699,
    mrp: 849,
    concern: ["energy", "hormones", "immunity"],
    gender: ["female"],
    segment: ["female-25-35", "female-35-plus", "mom"],
    followUp: ["low energy", "fatigue", "general health"],
    category: "energy",
    baseScore: 89,
  },
  {
    id: "bb-magnesium",
    brand: "Be Bodywise",
    name: "5-in-1 Magnesium Gummies",
    price: 899,
    mrp: 1099,
    concern: ["sleep", "stress", "hormones"],
    gender: ["female"],
    segment: ["female-25-35", "female-35-plus"],
    followUp: ["falling asleep", "staying asleep", "mood changes", "anxiety"],
    category: "sleep",
    baseScore: 91,
  },
  {
    id: "bb-collagen",
    brand: "Be Bodywise",
    name: "Collagen Builder Gummies",
    price: 499,
    mrp: 599,
    concern: ["skin", "hormones"],
    gender: ["female"],
    segment: ["female-35-plus"],
    followUp: ["skin aging", "glow", "pigmentation"],
    category: "skin",
    baseScore: 88,
  },

  // ── LITTLE JOYS — MOMS ──
  {
    id: "lj-mom-multivitamin",
    brand: "Little Joys",
    name: "Multivitamin Gummies for Moms",
    price: 499,
    mrp: 549,
    concern: ["energy", "immunity"],
    gender: ["female"],
    segment: ["mom"],
    followUp: ["low energy", "fatigue", "general health"],
    category: "energy",
    baseScore: 92,
  },
  {
    id: "lj-mom-magnesium",
    brand: "Little Joys",
    name: "Magnesium Gummies for Moms",
    price: 400,
    mrp: 549,
    concern: ["sleep"],
    gender: ["female"],
    segment: ["mom"],
    followUp: ["falling asleep", "staying asleep"],
    category: "sleep",
    baseScore: 91,
  },
  {
    id: "lj-mom-hair",
    brand: "Little Joys",
    name: "Hair Gummies for Moms",
    price: 400,
    mrp: 549,
    concern: ["hair"],
    gender: ["female"],
    segment: ["mom"],
    followUp: ["hair fall", "thinning", "postpartum"],
    category: "hair",
    baseScore: 93,
  },
  {
    id: "lj-mom-calcium",
    brand: "Little Joys",
    name: "Calcium Gummies for Moms",
    price: 400,
    mrp: 549,
    concern: ["bone health", "general"],
    gender: ["female"],
    segment: ["mom"],
    followUp: ["bone health", "joint pain"],
    category: "bone",
    baseScore: 90,
  },
  {
    id: "lj-mom-kit",
    brand: "Little Joys",
    name: "Mom's Calcium & Magnesium Kit",
    price: 998,
    mrp: 1098,
    concern: ["bone health", "sleep"],
    gender: ["female"],
    segment: ["mom"],
    followUp: ["bone health", "sleep", "general health"],
    category: "bundle",
    baseScore: 94,
  },

  // ── LITTLE JOYS — KIDS ──
  {
    id: "lj-kids-immunity",
    brand: "Little Joys",
    name: "Immunity Kit (Kids)",
    price: 1198,
    mrp: 1298,
    concern: ["immunity"],
    gender: ["all"],
    segment: ["kids-13-plus"],
    followUp: ["immunity", "general health"],
    category: "immunity",
    baseScore: 93,
  },
  {
    id: "lj-kids-brain",
    brand: "Little Joys",
    name: "Brain Gummies",
    price: 499,
    mrp: 549,
    concern: ["focus", "brain"],
    gender: ["all"],
    segment: ["kids-6-12", "kids-13-plus"],
    followUp: ["focus", "memory", "brain health"],
    category: "brain",
    baseScore: 91,
  },
  {
    id: "lj-kids-calcium",
    brand: "Little Joys",
    name: "Calcium Gummies (Kids)",
    price: 499,
    mrp: 549,
    concern: ["growth", "bone"],
    gender: ["all"],
    segment: ["kids-2-5", "kids-6-12"],
    followUp: ["growth", "bone health", "general health"],
    category: "bone",
    baseScore: 90,
  },
  {
    id: "lj-kids-multivitamin",
    brand: "Little Joys",
    name: "Multivitamin Gummies (Kids)",
    price: 499,
    mrp: 549,
    concern: ["immunity", "general"],
    gender: ["all"],
    segment: ["kids-2-5", "kids-6-12", "kids-13-plus"],
    followUp: ["general health", "immunity", "energy"],
    category: "immunity",
    baseScore: 89,
  },
  {
    id: "lj-nutrimix",
    brand: "Little Joys",
    name: "Nutrimix Powder",
    price: 400,
    mrp: 549,
    concern: ["nutrition", "growth"],
    gender: ["all"],
    segment: ["kids-2-5", "kids-6-12"],
    followUp: ["growth", "nutrition", "picky eater"],
    category: "nutrition",
    baseScore: 88,
  },
  {
    id: "lj-electrolyte",
    brand: "Little Joys",
    name: "Electrolyte Pack",
    price: 449,
    mrp: 599,
    concern: ["hydration", "energy"],
    gender: ["all"],
    segment: ["kids-6-12", "kids-13-plus"],
    followUp: ["sports", "active kids", "hydration"],
    category: "hydration",
    baseScore: 87,
  },
];

// ── SEGMENT RESOLVER ──
export function resolveSegment(
  gender: string,
  age: string,
  shoppingFor?: string,
  kidsAge?: string,
): string[] {
  const segments: string[] = [];

  if (shoppingFor === "family" || shoppingFor === "both") {
    segments.push("mom");
    if (kidsAge === "under-2") segments.push("kids-under-2");
    if (kidsAge === "2-5") segments.push("kids-2-5");
    if (kidsAge === "6-12") segments.push("kids-6-12");
    if (kidsAge === "13-plus") segments.push("kids-13-plus");
  }

  if (gender === "male") {
    if (age === "18-24") segments.push("male-18-25");
    if (age === "25-34") segments.push("male-25-35");
    if (age === "35-44" || age === "45+") segments.push("male-35-plus");
  }

  if (gender === "female") {
    if (age === "18-24") segments.push("female-18-25");
    if (age === "25-34") segments.push("female-25-35");
    if (age === "35-44" || age === "45+") segments.push("female-35-plus");
  }

  return segments;
}

// ── MAIN MATCHING FUNCTION ──
export function calculateProtocolMatch(user: UserSegment): MatchedProduct[] {
  const userSegments = resolveSegment(
    user.gender,
    user.age,
    user.shoppingFor,
    user.kidsAge,
  );

  return ALL_PRODUCTS.map((product) => {
    let score = product.baseScore;

    // Concern must match
    const concernMatch = product.concern.includes(user.concern.toLowerCase());
    if (!concernMatch) return null;

    // Gender must match
    const genderMatch =
      product.gender.includes(user.gender.toLowerCase()) ||
      product.gender.includes("all");
    if (!genderMatch) return null;

    // Segment overlap bonus
    const segmentOverlap = product.segment.some((s) => userSegments.includes(s));
    if (segmentOverlap) score += 5;
    else score -= 10;

    // Follow-up match bonus
    if (user.followUp) {
      const followUpLower = user.followUp.toLowerCase();
      const followUpMatch = product.followUp.some((f) =>
        followUpLower.includes(f.toLowerCase()),
      );
      if (followUpMatch) score += 8;
    }

    // Cap score
    score = Math.min(score, 99);
    if (score < 70) return null;

    return {
      ...product,
      matchScore: score,
    };
  })
    .filter((item): item is MatchedProduct => item !== null)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);
}
