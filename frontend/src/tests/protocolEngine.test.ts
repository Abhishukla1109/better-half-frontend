import { describe, it, expect } from "vitest";
import {
  calculateProtocolMatch,
  resolveSegment,
  ALL_PRODUCTS,
} from "@/lib/protocolEngine";

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
      gender: "male",
      age: "25-34",
      diet: "vegetarian",
      concern: "hair",
    });
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("only returns products matching the user's concern", () => {
    const results = calculateProtocolMatch({
      gender: "male",
      age: "25-34",
      diet: "vegetarian",
      concern: "sleep",
    });
    results.forEach((p) => {
      expect(p.concern).toContain("sleep");
    });
  });

  it("never returns Little Joys products for an adult male", () => {
    const results = calculateProtocolMatch({
      gender: "male",
      age: "25-34",
      diet: "vegetarian",
      concern: "hair",
    });
    results.forEach((p) => {
      expect(p.brand).not.toBe("Little Joys");
    });
  });

  it("only returns products with matchScore >= 70", () => {
    const results = calculateProtocolMatch({
      gender: "female",
      age: "25-34",
      diet: "vegetarian",
      concern: "skin",
    });
    results.forEach((p) => {
      expect(p.matchScore).toBeGreaterThanOrEqual(70);
    });
  });

  it("returns no duplicates", () => {
    const results = calculateProtocolMatch({
      gender: "male",
      age: "25-34",
      diet: "vegetarian",
      concern: "energy",
    });
    const ids = results.map((p) => p.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids.length).toBe(uniqueIds.length);
  });

  it("returns results sorted by matchScore descending", () => {
    const results = calculateProtocolMatch({
      gender: "female",
      age: "18-24",
      diet: "vegetarian",
      concern: "hormones",
    });
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].matchScore).toBeGreaterThanOrEqual(results[i + 1].matchScore);
    }
  });
});

// ── ALL_PRODUCTS data integrity ─────────────────────────────────────────────

describe("ALL_PRODUCTS data integrity", () => {
  it("every product has an id", () => {
    ALL_PRODUCTS.forEach((p) => {
      expect(p.id, `Product missing id: ${p.name}`).toBeTruthy();
    });
  });

  it("every product has a name", () => {
    ALL_PRODUCTS.forEach((p) => {
      expect(p.name, `Product missing name: ${p.id}`).toBeTruthy();
    });
  });

  it("every product has a valid brand", () => {
    const validBrands = ["Man Matters", "Be Bodywise", "Little Joys"];
    ALL_PRODUCTS.forEach((p) => {
      expect(validBrands, `Invalid brand on ${p.id}: ${p.brand}`).toContain(p.brand);
    });
  });

  it("every product has a price greater than 0", () => {
    ALL_PRODUCTS.forEach((p) => {
      expect(p.price, `${p.id} has invalid price`).toBeGreaterThan(0);
    });
  });

  it("every product has at least one concern", () => {
    ALL_PRODUCTS.forEach((p) => {
      expect(p.concern.length, `${p.id} has no concerns`).toBeGreaterThan(0);
    });
  });

  it("every product has at least one gender tag", () => {
    ALL_PRODUCTS.forEach((p) => {
      expect(p.gender.length, `${p.id} has no gender tags`).toBeGreaterThan(0);
    });
  });

  it("no duplicate product ids", () => {
    const ids = ALL_PRODUCTS.map((p) => p.id);
    const unique = [...new Set(ids)];
    expect(ids.length).toBe(unique.length);
  });
});
