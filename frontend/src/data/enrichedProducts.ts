// Type definitions for enriched PDP data fetched from Shopify metafields.
// All data lives in Shopify — see /api/shopify/pdp for the fetcher.

export type EnrichedIngredient = {
  name: string;
  icon: string;
  shortDesc: string;
  longDesc: string;
};

export type EnrichedTimelineStep = {
  period?: string;
  title?: string;
  label?: string;
  description: string;
  image?: string;
  icon?: string;
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
  price?: number;
  mrp?: number;
  forWith?: { for: string; with: string };
  recommendation?: string;
  ageGroup?: string;
  allergens?: string[];
  productType?: string;
  benefits?: Array<{ title: string; description: string; icon: string }>;
  fullIngredientsList?: string;
  shopifyHandle?: string;
  variantTitle?: string;
  variantId?: number;
  siblings?: Array<{ slug: string; label: string }>;
  pairings?: Array<{ slug: string; reason: string }>;
};
