// Fetches all products from Shopify with BH metafields and returns them
// in the same shape as catalog.ts Product[] — so protocolEngine works unchanged.
// Server-side only — called from /api/catalog route.

import { shopifyFetch } from "./client";
import type { Product } from "@/lib/protocolEngine";

const CATALOG_QUERY = `
  query GetCatalogProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      nodes {
        handle
        title
        vendor
        featuredImage { url }
        priceRange { minVariantPrice { amount } }
        compareAtPriceRange { minVariantPrice { amount } }
        metafields(identifiers: [
          { namespace: "custom", key: "bh_concern" }
          { namespace: "custom", key: "bh_gender" }
          { namespace: "custom", key: "bh_segment" }
          { namespace: "custom", key: "bh_score" }
          { namespace: "custom", key: "bh_follow_up" }
        ]) {
          key
          value
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

type MetafieldEntry = { key: string; value: string } | null;

type RawProduct = {
  handle: string;
  title: string;
  vendor: string;
  featuredImage: { url: string } | null;
  priceRange: { minVariantPrice: { amount: string } };
  compareAtPriceRange: { minVariantPrice: { amount: string } };
  metafields: MetafieldEntry[];
};

type CatalogPage = {
  products: {
    nodes: RawProduct[];
    pageInfo: { hasNextPage: boolean; endCursor: string };
  };
};

function getMeta(fields: MetafieldEntry[], key: string): string {
  return fields?.find((m) => m?.key === key)?.value ?? "";
}

function splitCSV(val: string): string[] {
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}

function normalizeBrand(vendor: string): "Man Matters" | "Be Bodywise" | "Little Joys" {
  if (vendor === "Be Bodywise") return "Be Bodywise";
  if (vendor === "Little Joys") return "Little Joys";
  return "Man Matters";
}

export async function fetchCatalogProducts(): Promise<Product[]> {
  const results: Product[] = [];
  let cursor: string | null = null;

  do {
    const page: CatalogPage = await shopifyFetch<CatalogPage>(CATALOG_QUERY, {
      first: 50,
      after: cursor,
    });

    for (const p of page.products.nodes) {
      const concern  = splitCSV(getMeta(p.metafields, "bh_concern"));
      const gender   = splitCSV(getMeta(p.metafields, "bh_gender"));
      const segment  = splitCSV(getMeta(p.metafields, "bh_segment"));
      const followUp = splitCSV(getMeta(p.metafields, "bh_follow_up"));
      const scoreStr = getMeta(p.metafields, "bh_score");
      const baseScore = scoreStr ? parseInt(scoreStr, 10) : 0;

      if (!concern.length || !gender.length || !baseScore) continue;

      const price     = Math.round(parseFloat(p.priceRange.minVariantPrice.amount));
      const compareAt = Math.round(parseFloat(p.compareAtPriceRange.minVariantPrice.amount));

      results.push({
        id:       p.handle,
        brand:    normalizeBrand(p.vendor),
        name:     p.title,
        price,
        mrp:      compareAt > price ? compareAt : price,
        concern,
        gender,
        segment,
        followUp,
        category: concern[0] ?? "",
        baseScore,
        image:    p.featuredImage?.url,
        url:      `https://betterhalf-4.myshopify.com/products/${p.handle}`,
      });
    }

    cursor = page.products.pageInfo.hasNextPage
      ? page.products.pageInfo.endCursor
      : null;
  } while (cursor);

  return results;
}
