import { describe, it, expect } from "vitest";
import { calculateProtocolMatch, resolveSegment } from "@/lib/protocolEngine";
import type { Product } from "@/lib/protocolEngine";

const FIXTURE: Product[] = [
  { id: "hair-m-1",    brand: "Man Matters",  name: "Hair Product A",    price: 499, mrp: 599, concern: ["hair"],     gender: ["male"],           segment: ["male-25-35"],              followUp: ["hair fall","thinning"], category: "hair",     baseScore: 88 },
  { id: "hair-m-2",    brand: "Man Matters",  name: "Hair Product B",    price: 599, mrp: 699, concern: ["hair"],     gender: ["male"],           segment: ["male-18-25","male-25-35"], followUp: ["hair fall"],            category: "hair",     baseScore: 85 },
  { id: "hair-m-3",    brand: "Man Matters",  name: "Hair Product C",    price: 399, mrp: 499, concern: ["hair"],     gender: ["male"],           segment: ["male-25-35"],              followUp: ["dandruff"],             category: "hair",     baseScore: 82 },
  { id: "sleep-f-1",   brand: "Be Bodywise",  name: "Sleep Product",     price: 599, mrp: 599, concern: ["sleep"],    gender: ["female"],         segment: ["female-25-35"],            followUp: ["insomnia"],             category: "sleep",    baseScore: 84 },
  { id: "energy-all",  brand: "Man Matters",  name: "Energy Product",    price: 699, mrp: 799, concern: ["energy"],   gender: ["male","female"],  segment: ["male-25-35"],              followUp: ["fatigue"],              category: "energy",   baseScore: 82 },
  { id: "skin-f-1",    brand: "Be Bodywise",  name: "Skin Product",      price: 499, mrp: 599, concern: ["skin"],     gender: ["female"],         segment: ["female-25-35"],            followUp: ["acne"],                 category: "skin",     baseScore: 78 },
  { id: "hormones-f",  brand: "Be Bodywise",  name: "Hormones Product",  price: 799, mrp: 999, concern: ["hormones"], gender: ["female"],         segment: ["female-18-25","female-25-35"], followUp: ["pcos"],             category: "hormones", baseScore: 88 },
  { id: "lj-kids-1",   brand: "Little Joys",  name: "Kids Product",      price: 399, mrp: 399, concern: ["energy"],   gender: ["male","female"],  segment: ["kids-6-12"],               followUp: ["nutrition"],            category: "nutrition",baseScore: 80 },
];

// ── resolveSegment ──────────────────────────────────────────────────────────

describe("resolveSegment", () => {
  it("returns male-25-35 for a 25-34 male", () => {
    expect(resolveSegment("male", "25-34")).toContain("male-25-35");
  });

  it("returns female-18-25 for an 18-24 female", () => {
    expect(resolveSegment("female", "18-24")).toContain("female-18-25");
  });

  it("includes mom and kids segment when shopping for family", () => {
    const segments = resolveSegment("female", "25-34", "family", "6-12");
    expect(segments).toContain("mom");
    expect(segments).toContain("kids-6-12");
  });

  it("returns empty array for unknown gender/age combo", () => {
    expect(resolveSegment("other", "unknown")).toEqual([]);
  });
});

// ── calculateProtocolMatch ──────────────────────────────────────────────────

describe("calculateProtocolMatch", () => {
  it("never returns more than 3 products", () => {
    const results = calculateProtocolMatch({
      gender: "male", age: "25-34", diet: "vegetarian", concern: "hair",
    }, FIXTURE);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("only returns products matching the user's concern", () => {
    const results = calculateProtocolMatch({
      gender: "female", age: "25-34", diet: "vegetarian", concern: "sleep",
    }, FIXTURE);
    results.forEach((p) => expect(p.concern).toContain("sleep"));
  });

  it("never returns Little Joys products for an adult male", () => {
    const results = calculateProtocolMatch({
      gender: "male", age: "25-34", diet: "vegetarian", concern: "hair",
    }, FIXTURE);
    results.forEach((p) => expect(p.brand).not.toBe("Little Joys"));
  });

  it("only returns products with matchScore >= 70", () => {
    const results = calculateProtocolMatch({
      gender: "female", age: "25-34", diet: "vegetarian", concern: "skin",
    }, FIXTURE);
    results.forEach((p) => expect(p.matchScore).toBeGreaterThanOrEqual(70));
  });

  it("returns no duplicates", () => {
    const results = calculateProtocolMatch({
      gender: "male", age: "25-34", diet: "vegetarian", concern: "energy",
    }, FIXTURE);
    const ids = results.map((p) => p.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("returns results sorted by matchScore descending", () => {
    const results = calculateProtocolMatch({
      gender: "female", age: "18-24", diet: "vegetarian", concern: "hormones",
    }, FIXTURE);
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].matchScore).toBeGreaterThanOrEqual(results[i + 1].matchScore);
    }
  });
});
