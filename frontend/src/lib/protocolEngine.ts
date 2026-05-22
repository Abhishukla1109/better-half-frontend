import { CATALOG_PRODUCTS } from "@/lib/ai/catalog";

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
  image?: string;
  url?: string;
  rating?: number;
  reviewCount?: number;
};

export type MatchedProduct = Product & { matchScore: number };

export const ALL_PRODUCTS: Product[] = CATALOG_PRODUCTS;

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

    const concernMatch = product.concern.includes(user.concern.toLowerCase());
    if (!concernMatch) return null;

    const genderMatch =
      product.gender.includes(user.gender.toLowerCase()) ||
      product.gender.includes("all");
    if (!genderMatch) return null;

    const segmentOverlap = product.segment.some((s) => userSegments.includes(s));
    if (segmentOverlap) score += 5;
    else score -= 10;

    if (user.followUp) {
      const followUpLower = user.followUp.toLowerCase();
      const followUpMatch = product.followUp.some((f) =>
        followUpLower.includes(f.toLowerCase()),
      );
      if (followUpMatch) score += 8;
    }

    score = Math.min(score, 99);
    if (score < 70) return null;

    return { ...product, matchScore: score };
  })
    .filter((item): item is MatchedProduct => item !== null)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);
}
