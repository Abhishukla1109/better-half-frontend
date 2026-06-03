import biotinHairGummies30n from "@/catalog/enriched/biotin-hair-gummies-30n.json";

export type EnrichedIngredient = {
  name: string;
  icon: string;
  shortDesc: string;
  longDesc: string;
};

export type EnrichedTimelineStep = {
  period: string;
  title: string;
  description: string;
  image: string;
};

export type EnrichedFaq = {
  question: string;
  answer: string;
};

export type EnrichedReview = {
  rating: number;
  author: string;
  title: string;
  body: string;
  date: string;
  verified?: boolean;
};

export type EnrichedPDP = {
  slug: string;
  sourceId: string;
  brand: string;
  name: string;
  subtitle: string;
  metaDescription: string;
  rating: { average: number | null; count: number | null };
  images: string[];
  heroVideo: string | null;
  packs: Array<{ label: string; type: string; sku: string; urlKey: string }>;
  badges: Array<{ label: string; icon: string }>;
  ingredients: EnrichedIngredient[];
  productDetails: {
    description: string[];
    details: Array<{ feature: string; value: string }>;
  };
  howToUse: string;
  timeline: EnrichedTimelineStep[];
  faqs: EnrichedFaq[];
  reviews: EnrichedReview[];
  disclaimers: Array<{ title: string; description: string; image?: string }>;
  worksBestWith: Array<{ title: string; description: string; image?: string }>;
  additionalInfo: Array<{ title: string; content: string }>;
};

const ENRICHED: Record<string, EnrichedPDP> = {
  "biotin-hair-gummies-30n": biotinHairGummies30n as EnrichedPDP,
};

export function getEnrichedPDP(slug: string): EnrichedPDP | null {
  return ENRICHED[slug] ?? null;
}
