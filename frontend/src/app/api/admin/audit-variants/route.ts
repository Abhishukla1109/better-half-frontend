import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

const SHOP           = (process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "").replace(/\/$/, "").replace("https://", "");
const CLIENT_ID      = process.env.SHOPIFY_ADMIN_CLIENT_ID ?? "";
const CLIENT_SECRET  = process.env.SHOPIFY_ADMIN_CLIENT_SECRET ?? "";
const ADMIN_API      = `https://${SHOP}/admin/api/2024-01/graphql.json`;
const CRON_SECRET    = process.env.CRON_SECRET ?? "";
const SERVICE_SECRET = process.env.MOSAIC_SERVICE_SECRET ?? "";
const BATCH_SIZE      = 20;

const BRAND_API: Record<string, string> = {
  "Man Matters": "https://api.manmatters.com/portal/page/mwsc/widgetised/product",
  "Be Bodywise":  "https://api.bebodywise.com/portal/page/mwsc/widgetised/product",
  "Little Joys":  "https://api.ourlittlejoys.com/portal/page/mwsc/widgetised/product",
};

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

async function getAdminToken(): Promise<string> {
  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "client_credentials" }),
  });
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

interface Product { handle: string; title: string; vendor: string; urlKey: string; sku: string | null; }

async function getAllActiveProducts(token: string): Promise<Product[]> {
  const products: Product[] = [];
  let cursor: string | null = null;

  do {
    const res = await fetch(ADMIN_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({
        query: `query($after: String) {
          products(first: 250, after: $after, query: "status:active") {
            nodes {
              handle title vendor
              variants(first: 1) { nodes { sku } }
              metafields(first: 3, namespace: "custom") { nodes { key value } }
            }
            pageInfo { hasNextPage endCursor }
          }
        }`,
        variables: { after: cursor },
      }),
    });
    const data = await res.json() as {
      data: {
        products: {
          nodes: Array<{
            handle: string; title: string; vendor: string;
            variants: { nodes: Array<{ sku: string | null }> };
            metafields: { nodes: Array<{ key: string; value: string }> };
          }>;
          pageInfo: { hasNextPage: boolean; endCursor: string };
        };
      };
    };

    for (const p of data.data.products.nodes) {
      const urlKey = p.metafields.nodes.find(m => m.key === "bh_mm_url_key")?.value ?? p.handle;
      products.push({ handle: p.handle, title: p.title, vendor: p.vendor, urlKey, sku: p.variants.nodes[0]?.sku ?? null });
    }
    cursor = data.data.products.pageInfo.hasNextPage ? data.data.products.pageInfo.endCursor : null;
  } while (cursor);

  return products;
}

async function fetchBrandVariants(urlKey: string, vendor: string): Promise<{ variantSkus: string[]; name: string } | null> {
  const base = BRAND_API[vendor];
  if (!base) return null;
  try {
    const res = await fetch(`${base}/${urlKey}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const pi = (await res.json() as { data?: { productInfo?: Record<string, unknown> } })?.data?.productInfo;
    if (!pi) return null;
    const variantSkus = Array.isArray(pi.variantSkus) ? (pi.variantSkus as string[]) : [];
    return { variantSkus, name: String(pi.name ?? "") };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const auth          = req.headers.get("authorization") ?? "";
  const serviceHeader = req.headers.get("x-service-secret") ?? "";
  const fromCron      = CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
  const fromManual    = SERVICE_SECRET && serviceHeader === SERVICE_SECRET;
  if (!fromCron && !fromManual) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const token = await getAdminToken();
    const products = await getAllActiveProducts(token);

    const results: Array<{
      handle: string; title: string; vendor: string; sku: string | null;
      variantCount: number; variantSkus: string[];
    }> = [];
    const noBrandData: string[] = [];

    for (const batch of chunk(products, BATCH_SIZE)) {
      await Promise.all(batch.map(async (p) => {
        const brand = await fetchBrandVariants(p.urlKey, p.vendor);
        if (!brand) { noBrandData.push(p.handle); return; }
        results.push({
          handle: p.handle, title: p.title, vendor: p.vendor, sku: p.sku,
          variantCount: brand.variantSkus.length, variantSkus: brand.variantSkus,
        });
      }));
      await new Promise(r => setTimeout(r, 150));
    }

    // Group by shared variantSkus signature to find true sibling families
    // (products whose SKU appears inside another product's variantSkus list)
    const skuToHandles = new Map<string, string[]>();
    for (const r of results) {
      if (!r.sku) continue;
      if (!skuToHandles.has(r.sku)) skuToHandles.set(r.sku, []);
    }
    for (const r of results) {
      for (const vsku of r.variantSkus) {
        if (skuToHandles.has(vsku)) skuToHandles.get(vsku)!.push(r.handle);
      }
    }
    const families: Array<{ sku: string; referencedByHandles: string[] }> = [];
    for (const [sku, handles] of skuToHandles) {
      const uniq = [...new Set(handles)];
      if (uniq.length > 1) families.push({ sku, referencedByHandles: uniq });
    }

    const distribution: Record<string, number> = {};
    for (const r of results) {
      const key = String(r.variantCount);
      distribution[key] = (distribution[key] ?? 0) + 1;
    }

    return NextResponse.json({
      ok: true,
      totalActive: products.length,
      checked: results.length,
      noBrandDataCount: noBrandData.length,
      noBrandData,
      variantCountDistribution: distribution,
      multiVariantProducts: results.filter(r => r.variantCount > 1).sort((a, b) => b.variantCount - a.variantCount),
      siblingFamiliesAcrossShopifyProducts: families,
      allResults: results,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
