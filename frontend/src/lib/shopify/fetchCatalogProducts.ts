// Fetches all active products from Shopify Admin API.
// Using Admin API (not Storefront) so all active products are returned
// regardless of which sales channel they're published to.
// Server-side only — called from /api/catalog route.

import type { Product } from "@/lib/protocolEngine";

const SHOP = (process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "").replace(/\/$/, "").replace("https://", "");
const CLIENT_ID = process.env.SHOPIFY_ADMIN_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.SHOPIFY_ADMIN_CLIENT_SECRET ?? "";
const ADMIN_API = `https://${SHOP}/admin/api/2024-01/graphql.json`;

// Cache the token for 23 hours — avoids exchanging on every catalog fetch
let _cachedToken: string | null = null;
let _tokenExpiry = 0;

async function getAdminToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;
  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "client_credentials" }),
  });
  const data = await res.json();
  _cachedToken = data.access_token;
  _tokenExpiry = Date.now() + 23 * 60 * 60 * 1000; // 23 hours
  return _cachedToken!;
}

async function adminGql<T>(token: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ADMIN_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}

const CATALOG_QUERY = `
  query GetCatalogProducts($first: Int!, $after: String) {
    products(first: $first, after: $after, query: "status:active") {
      nodes {
        handle
        title
        vendor
        featuredImage { url }
        images(first: 6) { nodes { url } }
        priceRangeV2 { minVariantPrice { amount } }
        compareAtPriceRange { maxVariantCompareAtPrice { amount } }
        metafields(first: 30, namespace: "custom") {
          nodes { key value }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

type AdminProduct = {
  handle: string;
  title: string;
  vendor: string;
  featuredImage: { url: string } | null;
  images: { nodes: Array<{ url: string }> } | null;
  priceRangeV2: { minVariantPrice: { amount: string } };
  compareAtPriceRange: { maxVariantCompareAtPrice: { amount: string } | null } | null;
  metafields: { nodes: Array<{ key: string; value: string }> };
};

type CatalogPage = {
  products: {
    nodes: AdminProduct[];
    pageInfo: { hasNextPage: boolean; endCursor: string };
  };
};

function getMeta(nodes: Array<{ key: string; value: string }>, key: string): string {
  return nodes.find((m) => m.key === key)?.value ?? "";
}

function getMetaJson<T>(nodes: Array<{ key: string; value: string }>, key: string): T | null {
  const v = nodes.find((m) => m.key === key)?.value;
  if (!v) return null;
  try { return JSON.parse(v) as T; } catch { return null; }
}

function splitCSV(val: string, lowercase = false): string[] {
  return val.split(",").map((s) => lowercase ? s.trim().toLowerCase() : s.trim()).filter(Boolean);
}

function normalizeBrand(vendor: string): "Man Matters" | "Be Bodywise" | "Little Joys" {
  if (vendor === "Be Bodywise") return "Be Bodywise";
  if (vendor === "Little Joys") return "Little Joys";
  return "Man Matters";
}

// Shopify metafields for these products are wrong or incomplete.
// First concern in each array becomes the primary category shown on PDPs.
const CONCERN_OVERRIDES: Record<string, string[]> = {
  // Hormones products — Shopify has them as 'energy' or single-concern
  "endure-long-last-spray-20ml":                                    ["hormones"],
  "tostero-120-capsules":                                           ["energy", "hormones"],
  "tostero-capsules-60n":                                           ["energy", "hormones"],
  "shilajit-gummies":                                               ["hormones", "energy", "weight"],
  "shilajit-gummies-60n":                                           ["hormones", "energy", "weight", "hair"],
  "complete-endurance-kit-1x-endure-spray-1x-tostero-capsules":    ["energy", "hormones"],

  // Ashwagandha is an adaptogen — relevant for energy, sleep AND hormones (cortisol/testosterone)
  "ashwagandha-gummies":                                            ["energy", "sleep", "hormones"],

  // Weight products — Shopify only tags them 'energy'
  "creatine-powder":                                                ["weight"],
  "creatine-electrolyte":                                           ["energy", "weight"],
  "micronised-creatine-monohydrate":                                ["energy", "weight"],
  "ultimate-strength-kit":                                          ["energy", "weight"],
  "superblend":                                                     ["energy", "weight"],
  "plant-protein-powder-500-gm":                                    ["energy", "weight"],
  "super-blend-nutrition-powder":                                   ["energy", "weight"],
  "whey-protein-powder-500-gm":                                     ["energy", "weight"],
  "muscle-nutrients-kit":                                           ["energy", "weight"],

  // Magnesium products — sleep primary, also relevant for energy
  "magnesium-glycinate-gummies-60n":                                ["sleep", "energy"],
  "magnesium-gummies-and-lotion-kit":                               ["sleep", "energy"],
  "10-magnesium-lotion-300ml":                                      ["sleep", "energy"],  // wrongly tagged 'skin' in Shopify
};

// Little Joys display categories for the kids protocol page card styling.
// Derived from the product handle — this is pure UI/display logic, not data.
function getLJCategory(handle: string): string {
  if (/gummies|magnesium|electrolyte|immunity-kit/.test(handle)) return "gummies";
  if (/nutrimix|proteinmix|activemix|nutrition|brain-development|oats/.test(handle)) return "nutrition";
  if (/shampoo|toothpaste|lotion|lip-balm|mosquito/.test(handle)) return "personal-care";
  return "healthysnacks";
}

// Campaign/deal/influencer duplicate handles — same product under a different URL for marketing.
// These should not appear in catalog browse/search; they're only used for landing pages.
const CAMPAIGN_RE = /-(deal|xp\d*|x\d+|free|b2g|new|offer|sale|promo|influencer)(-|$)/i;

export async function fetchCatalogProducts(): Promise<Product[]> {
  const token = await getAdminToken();
  const results: Product[] = [];
  let cursor: string | null = null;

  do {
    const page: CatalogPage = await adminGql<CatalogPage>(token, CATALOG_QUERY, { first: 250, after: cursor });
    for (const p of page.products.nodes) {
      if (CAMPAIGN_RE.test(p.handle)) continue;
      const nodes = p.metafields.nodes;
      const rawConcern = splitCSV(getMeta(nodes, "bh_concern"), true);
      const concern    = CONCERN_OVERRIDES[p.handle] ?? rawConcern;
      const gender   = splitCSV(getMeta(nodes, "bh_gender"), true);
      const segment  = splitCSV(getMeta(nodes, "bh_segment"));
      const followUp = splitCSV(getMeta(nodes, "bh_follow_up"));
      const scoreStr = getMeta(nodes, "bh_score");
      const baseScore = scoreStr ? parseInt(scoreStr, 10) : 0;

      if (!concern.length || !gender.length || !baseScore) continue;

      const isLJ     = p.vendor === "Little Joys";
      const price     = Math.round(parseFloat(p.priceRangeV2.minVariantPrice.amount));
      const compareAt = Math.round(parseFloat(p.compareAtPriceRange?.maxVariantCompareAtPrice?.amount ?? "0"));
      const siblings  = getMetaJson<Array<{ slug: string; label: string }>>(nodes, "bh_siblings") ?? undefined;

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
        category: isLJ ? getLJCategory(p.handle) : (concern[0] ?? ""),
        baseScore,
        image:    p.featuredImage?.url,
        images:   (p.images?.nodes ?? []).map((i) => i.url).filter(Boolean),
        url:      `https://${SHOP}/products/${p.handle}`,
        siblings,
      });
    }
    cursor = page.products.pageInfo.hasNextPage ? page.products.pageInfo.endCursor : null;
  } while (cursor);

  // Deduplicate sibling products — only keep the primary variant (first in siblings array).
  // Size switching is handled by pills on the card; no need to show 30N, 60N, 90N separately.
  return results.filter((p) => {
    if (!p.siblings || p.siblings.length <= 1) return true;
    return p.siblings[0].slug === p.id;
  });
}
