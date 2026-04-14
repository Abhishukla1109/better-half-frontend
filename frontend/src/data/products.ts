/* ══════════════════════════════════════════════════════════════
   Product Catalog — types & helpers
   Each product lives in its own file: src/catalog/{slug}.json
   ══════════════════════════════════════════════════════════════ */

import creatineMonohydrate from "@/catalog/creatine-monohydrate.json";
import ironVitaminC from "@/catalog/iron-vitamin-c.json";
import biotinZincHair from "@/catalog/biotin-zinc-hair.json";
import ashwagandhaKsm66 from "@/catalog/ashwagandha-ksm66.json";
import dailyProbiotics from "@/catalog/daily-probiotics.json";
import wheyProteinIsolate from "@/catalog/whey-protein-isolate.json";
import magnesiumB6 from "@/catalog/magnesium-b6.json";
import kidsMultivitaminGummies from "@/catalog/kids-multivitamin-gummies.json";

/* ─── Types ─── */

export interface ProductBenefit {
  icon: string;
  title: string;
  desc: string;
}

export interface ProductVariant {
  label: string;
  value: string;
  active?: boolean;
}

export interface ProductPack {
  label: string;
  price: number;
  active?: boolean;
  badge?: string;
}

export interface ProductReview {
  rating: number;
  text: string;
  author: string;
  age: number;
  verified: boolean;
}

export interface ProductConfig {
  slug: string;
  name: string;
  subtitle: string;
  brand: string;
  brandCode: string;
  brandColor: string;
  price: number;
  originalPrice: number;
  discount: number;
  rating: number;
  reviewCount: number;
  unitsSold: string;
  heroImages: string[];
  variants?: {
    label: string;
    options: ProductVariant[];
  };
  packs: ProductPack[];
  benefits: ProductBenefit[];
  badges: string[];
  ingredients: string;
  howToUse: string;
  aiContext: {
    title: string;
    points: string[];
  };
  cohort: {
    percentage: number;
    days: number;
    users: string;
  };
  protocolFit: string;
  reviews: ProductReview[];
  category: string;
  tags: string[];
  forGender: "male" | "female" | "unisex";
  dietCompatible: string[];
}

/* ─── Catalog ─── */

export const products: ProductConfig[] = [
  creatineMonohydrate,
  ironVitaminC,
  biotinZincHair,
  ashwagandhaKsm66,
  dailyProbiotics,
  wheyProteinIsolate,
  magnesiumB6,
  kidsMultivitaminGummies,
] as ProductConfig[];

/* ─── Slug set for quick existence checks ─── */

const slugSet = new Set(products.map((p) => p.slug));

export function isValidSlug(slug: string): boolean {
  return slugSet.has(slug);
}

/* ─── Helpers ─── */

export function getProductBySlug(slug: string): ProductConfig | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(category: string): ProductConfig[] {
  return products.filter((p) => p.category === category);
}

export function getProductsByBrand(brandCode: string): ProductConfig[] {
  return products.filter((p) => p.brandCode === brandCode);
}

export function getCategories(): string[] {
  return [...new Set(products.map((p) => p.category))];
}

export function getBrands(): { code: string; name: string; color: string }[] {
  const seen = new Map<string, { code: string; name: string; color: string }>();
  for (const p of products) {
    if (!seen.has(p.brandCode)) {
      seen.set(p.brandCode, { code: p.brandCode, name: p.brand, color: p.brandColor });
    }
  }
  return [...seen.values()];
}
