/* ══════════════════════════════════════════════════════════════
   Treatment Types — maps concern to required supplement types
   Each type has products the user can choose from + filters
   ══════════════════════════════════════════════════════════════ */

export interface TreatmentProduct {
  id: string;
  name: string;
  brand: string;
  size: string;
  price: number;
  slug: string;
  image: string;
  tags: string[];
}

export interface TreatmentFilter {
  label: string;
  value: string;
}

export interface TreatmentType {
  id: string;
  label: string;
  image: string;           // thumbnail image path
  whyNeeded: string;
  timing: string;
  filters: TreatmentFilter[];
  products: TreatmentProduct[];
  defaultProductId: string;
}

// All available treatment types
const allTreatmentTypes: Record<string, TreatmentType> = {
  protein: {
    id: "protein",
    label: "Protein",
    image: "/images/types/protein.jpg",
    whyNeeded: "Your daily protein intake is below target — supplementing closes the gap efficiently",
    timing: "Post-workout / Morning",
    filters: [
      { label: "< 1KG", value: "small" },
      { label: "> 1KG", value: "large" },
      { label: "Flavoured", value: "flavoured" },
      { label: "Unflavoured", value: "unflavoured" },
      { label: "Vegan", value: "vegan" },
    ],
    products: [
      { id: "own-whey-500", name: "OWN Whey Protein 500g", brand: "OWN", size: "500g", price: 1499, slug: "whey-protein-isolate", image: "/images/products/whey.jpg", tags: ["small", "flavoured"] },
      { id: "own-whey-1kg", name: "OWN Whey Protein 1KG", brand: "OWN", size: "1KG", price: 2999, slug: "whey-protein-isolate", image: "/images/products/whey.jpg", tags: ["large", "flavoured"] },
      { id: "mm-plant-1kg", name: "Man Matters Plant Protein 1KG", brand: "Man Matters", size: "1KG", price: 2799, slug: "whey-protein-isolate", image: "/images/products/whey.jpg", tags: ["large", "flavoured", "vegan"] },
      { id: "mm-superblend-1kg", name: "Man Matters Superblend 1KG", brand: "Man Matters", size: "1KG", price: 3999, slug: "whey-protein-isolate", image: "/images/products/whey.jpg", tags: ["large", "flavoured"] },
      { id: "mm-whey-1kg", name: "Man Matters Whey Protein 1KG", brand: "Man Matters", size: "1KG", price: 2599, slug: "whey-protein-isolate", image: "/images/products/whey.jpg", tags: ["large", "flavoured"] },
      { id: "own-unflavoured-1kg", name: "OWN Unflavoured Whey 1KG", brand: "OWN", size: "1KG", price: 2499, slug: "whey-protein-isolate", image: "/images/products/whey.jpg", tags: ["large", "unflavoured"] },
    ],
    defaultProductId: "own-whey-1kg",
  },
  iron: {
    id: "iron",
    label: "Iron",
    image: "/images/types/iron.jpg",
    whyNeeded: "Iron deficiency is the #1 nutrient gap — especially in vegetarian diets",
    timing: "Morning with breakfast",
    filters: [
      { label: "30 days", value: "30day" },
      { label: "90 days", value: "90day" },
      { label: "With Vit C", value: "vitc" },
      { label: "Standalone", value: "standalone" },
    ],
    products: [
      { id: "bb-iron-30", name: "Be Bodywise Iron + Vit C (30 days)", brand: "Be Bodywise", size: "60 caps", price: 449, slug: "iron-vitamin-c", image: "/images/products/iron.jpg", tags: ["30day", "vitc"] },
      { id: "bb-iron-90", name: "Be Bodywise Iron + Vit C (90 days)", brand: "Be Bodywise", size: "180 caps", price: 1199, slug: "iron-vitamin-c", image: "/images/products/iron.jpg", tags: ["90day", "vitc"] },
      { id: "rl-iron-30", name: "Root Labs Iron Bisglycinate (30 days)", brand: "Root Labs", size: "60 caps", price: 399, slug: "iron-vitamin-c", image: "/images/products/iron.jpg", tags: ["30day", "standalone"] },
    ],
    defaultProductId: "bb-iron-30",
  },
  biotin: {
    id: "biotin",
    label: "Biotin",
    image: "/images/types/biotin.jpg",
    whyNeeded: "Biotin supports keratin production — the building block of hair and nails",
    timing: "After lunch",
    filters: [
      { label: "30 days", value: "30day" },
      { label: "90 days", value: "90day" },
      { label: "Hair", value: "hair" },
      { label: "Hair + Beard", value: "beard" },
    ],
    products: [
      { id: "mm-biotin-30", name: "Man Matters Biotin + Zinc (30 days)", brand: "Man Matters", size: "60 tabs", price: 499, slug: "biotin-zinc-hair", image: "/images/products/biotin.jpg", tags: ["30day", "hair"] },
      { id: "mm-biotin-90", name: "Man Matters Biotin + Zinc (90 days)", brand: "Man Matters", size: "180 tabs", price: 1299, slug: "biotin-zinc-hair", image: "/images/products/biotin.jpg", tags: ["90day", "hair"] },
      { id: "mm-biotin-beard", name: "Man Matters Biotin Hair + Beard", brand: "Man Matters", size: "60 tabs", price: 549, slug: "biotin-zinc-hair", image: "/images/products/biotin.jpg", tags: ["30day", "beard"] },
    ],
    defaultProductId: "mm-biotin-30",
  },
  ashwagandha: {
    id: "ashwagandha",
    label: "Ashwagandha",
    image: "/images/types/ashwagandha.jpg",
    whyNeeded: "Clinically proven to reduce cortisol by 28% — your stress and sleep control lever",
    timing: "Evening",
    filters: [
      { label: "30 days", value: "30day" },
      { label: "90 days", value: "90day" },
      { label: "KSM-66", value: "ksm66" },
    ],
    products: [
      { id: "rl-ashwa-30", name: "Root Labs Ashwagandha KSM-66 (30 days)", brand: "Root Labs", size: "60 caps", price: 399, slug: "ashwagandha-ksm66", image: "/images/products/ashwagandha.jpg", tags: ["30day", "ksm66"] },
      { id: "rl-ashwa-90", name: "Root Labs Ashwagandha KSM-66 (90 days)", brand: "Root Labs", size: "180 caps", price: 999, slug: "ashwagandha-ksm66", image: "/images/products/ashwagandha.jpg", tags: ["90day", "ksm66"] },
    ],
    defaultProductId: "rl-ashwa-30",
  },
  magnesium: {
    id: "magnesium",
    label: "Magnesium",
    image: "/images/types/magnesium.jpg",
    whyNeeded: "Activates GABA receptors for sleep and relaxes muscles — most people are deficient",
    timing: "30 min before bed",
    filters: [
      { label: "30 days", value: "30day" },
      { label: "90 days", value: "90day" },
      { label: "With B6", value: "b6" },
    ],
    products: [
      { id: "rl-mag-30", name: "Root Labs Magnesium B6 (30 days)", brand: "Root Labs", size: "60 caps", price: 349, slug: "magnesium-b6", image: "/images/products/magnesium.jpg", tags: ["30day", "b6"] },
      { id: "rl-mag-90", name: "Root Labs Magnesium B6 (90 days)", brand: "Root Labs", size: "180 caps", price: 899, slug: "magnesium-b6", image: "/images/products/magnesium.jpg", tags: ["90day", "b6"] },
    ],
    defaultProductId: "rl-mag-30",
  },
  probiotics: {
    id: "probiotics",
    label: "Probiotics",
    image: "/images/types/probiotics.jpg",
    whyNeeded: "70% of your immune system lives in your gut — probiotics restore the balance",
    timing: "Before breakfast",
    filters: [
      { label: "30 days", value: "30day" },
      { label: "90 days", value: "90day" },
    ],
    products: [
      { id: "bb-prob-30", name: "Be Bodywise Daily Probiotics (30 days)", brand: "Be Bodywise", size: "30 caps", price: 549, slug: "daily-probiotics", image: "/images/products/probiotics.jpg", tags: ["30day"] },
      { id: "bb-prob-90", name: "Be Bodywise Daily Probiotics (90 days)", brand: "Be Bodywise", size: "90 caps", price: 1399, slug: "daily-probiotics", image: "/images/products/probiotics.jpg", tags: ["90day"] },
    ],
    defaultProductId: "bb-prob-30",
  },
  creatine: {
    id: "creatine",
    label: "Creatine",
    image: "/images/types/creatine.jpg",
    whyNeeded: "Fuels high-intensity output and supports cognitive function — not just for gym",
    timing: "Post-workout / Morning",
    filters: [
      { label: "125g", value: "small" },
      { label: "250g", value: "large" },
      { label: "Flavoured", value: "flavoured" },
      { label: "Unflavoured", value: "unflavoured" },
    ],
    products: [
      { id: "mm-creatine-125", name: "Man Matters Creatine 125g (Mixed Fruit)", brand: "Man Matters", size: "125g", price: 549, slug: "creatine-monohydrate", image: "/images/products/creatine.jpg", tags: ["small", "flavoured"] },
      { id: "mm-creatine-125x2", name: "Man Matters Creatine 125g x 2", brand: "Man Matters", size: "250g", price: 899, slug: "creatine-monohydrate", image: "/images/products/creatine.jpg", tags: ["large", "flavoured"] },
      { id: "mm-creatine-unfl", name: "Man Matters Creatine 125g (Unflavoured)", brand: "Man Matters", size: "125g", price: 499, slug: "creatine-monohydrate", image: "/images/products/creatine.jpg", tags: ["small", "unflavoured"] },
    ],
    defaultProductId: "mm-creatine-125",
  },
};

// Map concern → treatment type IDs
const concernToTypes: Record<string, string[]> = {
  "Hair / beard": ["biotin", "iron", "protein"],
  "Skin / acne": ["probiotics", "ashwagandha"],
  "Energy / gut": ["iron", "probiotics"],
  "Weight": ["protein", "creatine", "ashwagandha"],
  "Hormones": ["ashwagandha", "iron"],
  "Sleep / mind": ["magnesium", "ashwagandha"],
};

export function getTreatmentTypesForConcern(concern: string): TreatmentType[] {
  const typeIds = concernToTypes[concern] || ["protein", "iron"];
  return typeIds.map((id) => allTreatmentTypes[id]).filter(Boolean);
}

export function getTreatmentType(id: string): TreatmentType | undefined {
  return allTreatmentTypes[id];
}
