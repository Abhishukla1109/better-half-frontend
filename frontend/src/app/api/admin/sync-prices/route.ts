import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

const SHOP          = (process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "").replace(/\/$/, "").replace("https://", "");
const CLIENT_ID     = process.env.SHOPIFY_ADMIN_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.SHOPIFY_ADMIN_CLIENT_SECRET ?? "";
const ADMIN_API     = `https://${SHOP}/admin/api/2024-01/graphql.json`;
const CRON_SECRET   = process.env.CRON_SECRET ?? "";
const SERVICE_SECRET = process.env.MOSAIC_SERVICE_SECRET ?? "";

const BRAND_API: Record<string, string> = {
  "Man Matters": "https://api.manmatters.com/portal/page/mwsc/widgetised/product",
  "Be Bodywise":  "https://api.bebodywise.com/portal/page/mwsc/widgetised/product",
  "Little Joys":  "https://api.ourlittlejoys.com/portal/page/mwsc/widgetised/product",
};

// Products whose prices are manually fixed — cron will never touch these
const PRICE_LOCKED_HANDLES = new Set(["2024397"]);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function getAdminToken(): Promise<string> {
  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "client_credentials" }),
  });
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

interface ShopifyProduct {
  id: string;
  handle: string;
  vendor: string;
  urlKey: string;
  variantId: string;
  currentPrice: number;
  currentCompareAt: number;
}

async function getAllActiveProducts(token: string): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = [];
  let cursor: string | null = null;

  do {
    const res = await fetch(ADMIN_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({
        query: `query($after: String) {
          products(first: 250, after: $after, query: "status:active") {
            nodes {
              id handle vendor
              variants(first: 1) { nodes { id price compareAtPrice } }
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
            id: string; handle: string; vendor: string;
            variants: { nodes: Array<{ id: string; price: string; compareAtPrice: string | null }> };
            metafields: { nodes: Array<{ key: string; value: string }> };
          }>;
          pageInfo: { hasNextPage: boolean; endCursor: string };
        };
      };
    };

    for (const p of data.data.products.nodes) {
      const urlKey = p.metafields.nodes.find(m => m.key === "bh_mm_url_key")?.value ?? p.handle;
      products.push({
        id:               p.id,
        handle:           p.handle,
        vendor:           p.vendor,
        urlKey,
        variantId:        p.variants.nodes[0]?.id ?? "",
        currentPrice:     parseFloat(p.variants.nodes[0]?.price ?? "0"),
        currentCompareAt: parseFloat(p.variants.nodes[0]?.compareAtPrice ?? "0"),
      });
    }

    cursor = data.data.products.pageInfo.hasNextPage ? data.data.products.pageInfo.endCursor : null;
  } while (cursor);

  return products;
}

async function fetchBrandPrices(urlKey: string, vendor: string): Promise<{ mrp: number; sp: number } | null> {
  const base = BRAND_API[vendor];
  if (!base) return null;
  try {
    const res = await fetch(`${base}/${urlKey}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const pi = (await res.json() as { data?: { productInfo?: Record<string, unknown> } })?.data?.productInfo;
    if (!pi) return null;
    const mrp = Number(pi.price ?? pi.actualPrice ?? 0);
    const sp  = Number(pi.discountedPrice ?? pi.filterPrice ?? 0) || mrp;
    return { mrp, sp };
  } catch {
    return null;
  }
}

async function updateVariantPrices(token: string, productId: string, variantId: string, sp: number, mrp: number): Promise<string | null> {
  const res = await fetch(ADMIN_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({
      query: `mutation($pid: ID!, $v: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $pid, variants: $v) {
          productVariants { price compareAtPrice }
          userErrors { field message }
        }
      }`,
      variables: { pid: productId, v: [{ id: variantId, price: String(sp), compareAtPrice: String(mrp) }] },
    }),
  });
  const data = await res.json() as { data?: { productVariantsBulkUpdate?: { userErrors?: Array<{ message: string }> } } };
  const errors = data?.data?.productVariantsBulkUpdate?.userErrors ?? [];
  if (errors.length) return errors[0].message;
  return null;
}

export async function GET(req: NextRequest) {
  // Accept either Vercel's CRON_SECRET (automated) or service secret (manual)
  const auth = req.headers.get("authorization") ?? "";
  const serviceHeader = req.headers.get("x-service-secret") ?? "";
  const fromCron    = CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
  const fromManual  = SERVICE_SECRET && serviceHeader === SERVICE_SECRET;

  if (!fromCron && !fromManual) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token    = await getAdminToken();
    const products = await getAllActiveProducts(token);
    console.log(`[sync-prices] ${products.length} active products`);

    const results = {
      updated: [] as Array<{ handle: string; sp: number; mrp: number }>,
      skipped: [] as Array<{ handle: string; reason: string }>,
      failed:  [] as Array<{ handle: string; reason: string }>,
    };

    for (const p of products) {
      await sleep(250);

      if (PRICE_LOCKED_HANDLES.has(p.handle) || PRICE_LOCKED_HANDLES.has(p.urlKey)) {
        results.skipped.push({ handle: p.handle, reason: "price locked" });
        continue;
      }

      const prices = await fetchBrandPrices(p.urlKey, p.vendor);
      if (!prices) {
        results.failed.push({ handle: p.handle, reason: "no brand API data" });
        continue;
      }

      const { mrp, sp } = prices;

      if (!mrp || mrp <= 0 || !sp || sp <= 0) {
        results.failed.push({ handle: p.handle, reason: `invalid prices SP:${sp} MRP:${mrp}` });
        continue;
      }
      if (sp > mrp) {
        results.skipped.push({ handle: p.handle, reason: `SP ${sp} > MRP ${mrp}` });
        continue;
      }
      if (p.currentPrice === sp && p.currentCompareAt === mrp) {
        results.skipped.push({ handle: p.handle, reason: "already correct" });
        continue;
      }

      const err = await updateVariantPrices(token, p.id, p.variantId, sp, mrp);
      if (err) {
        results.failed.push({ handle: p.handle, reason: err });
      } else {
        console.log(`[sync-prices] ✓ ${p.handle} SP:₹${sp} MRP:₹${mrp}`);
        results.updated.push({ handle: p.handle, sp, mrp });
      }
    }

    console.log(`[sync-prices] Done — updated:${results.updated.length} skipped:${results.skipped.length} failed:${results.failed.length}`);
    return NextResponse.json({
      ok: true,
      total: products.length,
      updated: results.updated.length,
      skipped: results.skipped.length,
      failed:  results.failed.length,
      failedItems: results.failed,
    });

  } catch (err) {
    console.error("[sync-prices]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
