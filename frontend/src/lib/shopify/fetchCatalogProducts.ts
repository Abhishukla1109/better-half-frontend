// Fetches all active products from Shopify Admin API.
// Using Admin API (not Storefront) so all active products are returned
// regardless of which sales channel they're published to.
// Server-side only — called from /api/catalog route.

import type { Product } from "@/lib/protocolEngine";

const SHOP = (process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "").replace(/\/$/, "").replace("https://", "");
const CLIENT_ID = process.env.SHOPIFY_ADMIN_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.SHOPIFY_ADMIN_CLIENT_SECRET ?? "";
const ADMIN_API = `https://${SHOP}/admin/api/2024-01/graphql.json`;

async function getAdminToken(): Promise<string> {
  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "client_credentials" }),
  });
  const data = await res.json();
  return data.access_token;
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
        priceRangeV2 { minVariantPrice { amount } }
        compareAtPriceRange { maxVariantCompareAtPrice { amount } }
        metafields(first: 10) {
          nodes { namespace key value }
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
  priceRangeV2: { minVariantPrice: { amount: string } };
  compareAtPriceRange: { maxVariantCompareAtPrice: { amount: string } | null } | null;
  metafields: { nodes: Array<{ namespace: string; key: string; value: string }> };
};

type CatalogPage = {
  products: {
    nodes: AdminProduct[];
    pageInfo: { hasNextPage: boolean; endCursor: string };
  };
};

function getMeta(nodes: Array<{ namespace: string; key: string; value: string }>, key: string): string {
  return nodes.find((m) => m.namespace === "custom" && m.key === key)?.value ?? "";
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
  const token = await getAdminToken();
  const results: Product[] = [];
  let cursor: string | null = null;

  do {
    const page: CatalogPage = await adminGql<CatalogPage>(token, CATALOG_QUERY, { first: 250, after: cursor });
    for (const p of page.products.nodes) {
      const nodes = p.metafields.nodes;
      const concern  = splitCSV(getMeta(nodes, "bh_concern"));
      const gender   = splitCSV(getMeta(nodes, "bh_gender"));
      const segment  = splitCSV(getMeta(nodes, "bh_segment"));
      const followUp = splitCSV(getMeta(nodes, "bh_follow_up"));
      const scoreStr = getMeta(nodes, "bh_score");
      const baseScore = scoreStr ? parseInt(scoreStr, 10) : 0;

      if (!concern.length || !gender.length || !baseScore) continue;

      const price     = Math.round(parseFloat(p.priceRangeV2.minVariantPrice.amount));
      const compareAt = Math.round(parseFloat(p.compareAtPriceRange?.maxVariantCompareAtPrice?.amount ?? "0"));

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
        url:      `https://${SHOP}/products/${p.handle}`,
      });
    }
    cursor = page.products.pageInfo.hasNextPage ? page.products.pageInfo.endCursor : null;
  } while (cursor);

  return results;
}
