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
  mrp: number;
  usp: string;
  slug: string;
  image: string;
  tags: string[];
}

export interface TreatmentType {
  id: string;
  label: string;
  image: string;
  whyNeeded: string;
  timing: string;
  products: TreatmentProduct[];  // max 4
  defaultProductId: string;
}

// All available treatment types
const allTreatmentTypes: Record<string, TreatmentType> = {
  protein: {
    id: "protein", label: "Protein", image: "/images/types/protein.jpg",
    whyNeeded: "Your daily protein intake is below target — supplementing closes the gap efficiently",
    timing: "Post-workout / Morning",
    products: [
      { id: "own-whey-500", name: "OWN Whey Protein 500g", brand: "OWN", size: "500g", price: 1499, mrp: 1799, usp: "26g protein per scoop, zero amino spiking", slug: "whey-protein-isolate", image: "/images/products/whey.jpg", tags: [] },
      { id: "own-whey-1kg", name: "OWN Whey Protein 1KG", brand: "OWN", size: "1KG", price: 2999, mrp: 3499, usp: "Best value — 30 servings of clean isolate", slug: "whey-protein-isolate", image: "/images/products/whey.jpg", tags: [] },
      { id: "mm-plant-1kg", name: "Man Matters Plant Protein 1KG", brand: "Man Matters", size: "1KG", price: 2799, mrp: 3299, usp: "100% plant-based, vegan friendly", slug: "whey-protein-isolate", image: "/images/products/whey.jpg", tags: [] },
      { id: "mm-whey-1kg", name: "Man Matters Whey Protein 1KG", brand: "Man Matters", size: "1KG", price: 2599, mrp: 2999, usp: "Lab tested, smooth mixing formula", slug: "whey-protein-isolate", image: "/images/products/whey.jpg", tags: [] },
    ],
    defaultProductId: "own-whey-1kg",
  },
  iron: {
    id: "iron", label: "Iron", image: "/images/types/iron.jpg",
    whyNeeded: "Iron deficiency is the #1 nutrient gap — especially in vegetarian diets",
    timing: "Morning with breakfast",
    products: [
      { id: "bb-iron-30", name: "Be Bodywise Iron + Vit C (30 days)", brand: "Be Bodywise", size: "60 caps", price: 449, mrp: 499, usp: "Vit C boosts iron absorption by 67%", slug: "iron-vitamin-c", image: "/images/products/iron.jpg", tags: [] },
      { id: "bb-iron-90", name: "Be Bodywise Iron + Vit C (90 days)", brand: "Be Bodywise", size: "180 caps", price: 1199, mrp: 1497, usp: "Save 20% — full treatment course", slug: "iron-vitamin-c", image: "/images/products/iron.jpg", tags: [] },
      { id: "rl-iron-30", name: "Root Labs Iron Bisglycinate (30 days)", brand: "Root Labs", size: "60 caps", price: 399, mrp: 499, usp: "Gentle on stomach, no constipation", slug: "iron-vitamin-c", image: "/images/products/iron.jpg", tags: [] },
    ],
    defaultProductId: "bb-iron-30",
  },
  biotin: {
    id: "biotin", label: "Biotin", image: "/images/types/biotin.jpg",
    whyNeeded: "Biotin supports keratin production — the building block of hair and nails",
    timing: "After lunch",
    products: [
      { id: "mm-biotin-30", name: "Man Matters Biotin + Zinc (30 days)", brand: "Man Matters", size: "60 tabs", price: 499, mrp: 599, usp: "10,000mcg biotin + zinc for hair density", slug: "biotin-zinc-hair", image: "/images/products/biotin.jpg", tags: [] },
      { id: "mm-biotin-90", name: "Man Matters Biotin + Zinc (90 days)", brand: "Man Matters", size: "180 tabs", price: 1299, mrp: 1797, usp: "Full 90-day course — best results", slug: "biotin-zinc-hair", image: "/images/products/biotin.jpg", tags: [] },
      { id: "mm-biotin-beard", name: "Man Matters Biotin Hair + Beard", brand: "Man Matters", size: "60 tabs", price: 549, mrp: 699, usp: "Dual action — scalp + facial hair", slug: "biotin-zinc-hair", image: "/images/products/biotin.jpg", tags: [] },
    ],
    defaultProductId: "mm-biotin-30",
  },
  ashwagandha: {
    id: "ashwagandha", label: "Ashwagandha", image: "/images/types/ashwagandha.jpg",
    whyNeeded: "Clinically proven to reduce cortisol by 28% — your stress and sleep control lever",
    timing: "Evening",
    products: [
      { id: "rl-ashwa-30", name: "Root Labs Ashwagandha KSM-66 (30 days)", brand: "Root Labs", size: "60 caps", price: 399, mrp: 499, usp: "Gold standard KSM-66 extract, 5% withanolides", slug: "ashwagandha-ksm66", image: "/images/products/ashwagandha.jpg", tags: [] },
      { id: "rl-ashwa-90", name: "Root Labs Ashwagandha KSM-66 (90 days)", brand: "Root Labs", size: "180 caps", price: 999, mrp: 1497, usp: "Save 33% — full cortisol reset course", slug: "ashwagandha-ksm66", image: "/images/products/ashwagandha.jpg", tags: [] },
    ],
    defaultProductId: "rl-ashwa-30",
  },
  magnesium: {
    id: "magnesium", label: "Magnesium", image: "/images/types/magnesium.jpg",
    whyNeeded: "Activates GABA receptors for sleep and relaxes muscles — most people are deficient",
    timing: "30 min before bed",
    products: [
      { id: "rl-mag-30", name: "Root Labs Magnesium B6 (30 days)", brand: "Root Labs", size: "60 caps", price: 349, mrp: 449, usp: "Bisglycinate form — 4x better absorption, no GI issues", slug: "magnesium-b6", image: "/images/products/magnesium.jpg", tags: [] },
      { id: "rl-mag-90", name: "Root Labs Magnesium B6 (90 days)", brand: "Root Labs", size: "180 caps", price: 899, mrp: 1347, usp: "Save 33% — sleep reset course", slug: "magnesium-b6", image: "/images/products/magnesium.jpg", tags: [] },
    ],
    defaultProductId: "rl-mag-30",
  },
  probiotics: {
    id: "probiotics", label: "Probiotics", image: "/images/types/probiotics.jpg",
    whyNeeded: "70% of your immune system lives in your gut — probiotics restore the balance",
    timing: "Before breakfast",
    products: [
      { id: "bb-prob-30", name: "Be Bodywise Daily Probiotics (30 days)", brand: "Be Bodywise", size: "30 caps", price: 549, mrp: 649, usp: "50B CFU, 16 strains, shelf-stable", slug: "daily-probiotics", image: "/images/products/probiotics.jpg", tags: [] },
      { id: "bb-prob-90", name: "Be Bodywise Daily Probiotics (90 days)", brand: "Be Bodywise", size: "90 caps", price: 1399, mrp: 1947, usp: "Save 28% — microbiome establishment course", slug: "daily-probiotics", image: "/images/products/probiotics.jpg", tags: [] },
    ],
    defaultProductId: "bb-prob-30",
  },
  creatine: {
    id: "creatine", label: "Creatine", image: "/images/types/creatine.jpg",
    whyNeeded: "Fuels high-intensity output and supports cognitive function — not just for gym",
    timing: "Post-workout / Morning",
    products: [
      { id: "mm-creatine-125", name: "Man Matters Creatine 125g", brand: "Man Matters", size: "125g", price: 549, mrp: 599, usp: "Micronised for 66% higher absorption", slug: "creatine-monohydrate", image: "/images/products/creatine.jpg", tags: [] },
      { id: "mm-creatine-250", name: "Man Matters Creatine 250g", brand: "Man Matters", size: "250g", price: 899, mrp: 1099, usp: "Double pack — save 18%", slug: "creatine-monohydrate", image: "/images/products/creatine.jpg", tags: [] },
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
