import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

const SHOP           = (process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "").replace(/\/$/, "").replace("https://", "");
const CLIENT_ID      = process.env.SHOPIFY_ADMIN_CLIENT_ID ?? "";
const CLIENT_SECRET  = process.env.SHOPIFY_ADMIN_CLIENT_SECRET ?? "";
const ADMIN_API      = `https://${SHOP}/admin/api/2024-01/graphql.json`;
const CRON_SECRET    = process.env.CRON_SECRET ?? "";
const SERVICE_SECRET = process.env.MOSAIC_SERVICE_SECRET ?? "";
const LOCATION_ID    = "gid://shopify/Location/75947245664";

const BRAND_API: Record<string, string> = {
  "Man Matters": "https://api.manmatters.com/portal/page/mwsc/widgetised/product",
  "Be Bodywise":  "https://api.bebodywise.com/portal/page/mwsc/widgetised/product",
  "Little Joys":  "https://api.ourlittlejoys.com/portal/page/mwsc/widgetised/product",
};

const PRICE_LOCKED_HANDLES = new Set(["2024397"]);
const BATCH_SIZE = 20;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

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

interface ShopifyProduct {
  id:               string;
  handle:           string;
  vendor:           string;
  urlKey:           string;
  variantId:        string;
  inventoryItemId:  string;
  currentPrice:     number;
  currentCompareAt: number;
  inventoryPolicy:  string;
  inventoryTracked: boolean;
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
              variants(first: 1) {
                nodes {
                  id price compareAtPrice inventoryPolicy
                  inventoryItem { id tracked }
                }
              }
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
            variants: { nodes: Array<{ id: string; price: string; compareAtPrice: string | null; inventoryPolicy: string; inventoryItem: { id: string; tracked: boolean } }> };
            metafields: { nodes: Array<{ key: string; value: string }> };
          }>;
          pageInfo: { hasNextPage: boolean; endCursor: string };
        };
      };
    };

    for (const p of data.data.products.nodes) {
      const urlKey  = p.metafields.nodes.find(m => m.key === "bh_mm_url_key")?.value ?? p.handle;
      const variant = p.variants.nodes[0];
      if (!variant) continue;
      products.push({
        id:               p.id,
        handle:           p.handle,
        vendor:           p.vendor,
        urlKey,
        variantId:        variant.id,
        inventoryItemId:  variant.inventoryItem.id,
        currentPrice:     parseFloat(variant.price ?? "0"),
        currentCompareAt: parseFloat(variant.compareAtPrice ?? "0"),
        inventoryPolicy:  variant.inventoryPolicy,
        inventoryTracked: variant.inventoryItem.tracked,
      });
    }

    cursor = data.data.products.pageInfo.hasNextPage ? data.data.products.pageInfo.endCursor : null;
  } while (cursor);

  return products;
}

async function fetchBrandData(urlKey: string, vendor: string): Promise<{ mrp: number; sp: number; outOfStock: boolean } | null> {
  const base = BRAND_API[vendor];
  if (!base) return null;
  try {
    const res = await fetch(`${base}/${urlKey}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const pi = (await res.json() as { data?: { productInfo?: Record<string, unknown> } })?.data?.productInfo;
    if (!pi) return null;
    const mrp        = Number(pi.price ?? pi.actualPrice ?? 0);
    const sp         = Number(pi.discountedPrice ?? pi.filterPrice ?? 0) || mrp;
    const outOfStock = !!(pi.out_of_stock ?? pi.outOfStock ?? false);
    return { mrp, sp, outOfStock };
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
          userErrors { field message }
        }
      }`,
      variables: { pid: productId, v: [{ id: variantId, price: String(sp), compareAtPrice: String(mrp) }] },
    }),
  });
  const data = await res.json() as { data?: { productVariantsBulkUpdate?: { userErrors?: Array<{ message: string }> } } };
  const errors = data?.data?.productVariantsBulkUpdate?.userErrors ?? [];
  return errors.length ? errors[0].message : null;
}

async function updateInventory(
  token: string,
  productId: string,
  variantId: string,
  inventoryItemId: string,
  outOfStock: boolean
): Promise<string | null> {
  const policy   = outOfStock ? "DENY"    : "CONTINUE";
  const quantity = outOfStock ? 0         : 999;

  // Update inventory policy on the variant
  const policyRes = await fetch(ADMIN_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({
      query: `mutation($pid: ID!, $v: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $pid, variants: $v) {
          userErrors { field message }
        }
      }`,
      variables: { pid: productId, v: [{ id: variantId, inventoryPolicy: policy }] },
    }),
  });
  const policyData = await policyRes.json() as { data?: { productVariantsBulkUpdate?: { userErrors?: Array<{ message: string }> } } };
  const policyErrors = policyData?.data?.productVariantsBulkUpdate?.userErrors ?? [];
  if (policyErrors.length) return policyErrors[0].message;

  // Set inventory quantity at our warehouse location
  const qtyRes = await fetch(ADMIN_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({
      query: `mutation($input: InventorySetQuantitiesInput!) {
        inventorySetQuantities(input: $input) {
          userErrors { field message }
        }
      }`,
      variables: {
        input: {
          reason: "correction",
          name: "available",
          quantities: [{ inventoryItemId, locationId: LOCATION_ID, quantity }],
        },
      },
    }),
  });
  const qtyData = await qtyRes.json() as { data?: { inventorySetQuantities?: { userErrors?: Array<{ message: string }> } } };
  const qtyErrors = qtyData?.data?.inventorySetQuantities?.userErrors ?? [];
  return qtyErrors.length ? qtyErrors[0].message : null;
}

export async function GET(req: NextRequest) {
  const auth          = req.headers.get("authorization") ?? "";
  const serviceHeader = req.headers.get("x-service-secret") ?? "";
  const fromCron      = CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
  const fromManual    = SERVICE_SECRET && serviceHeader === SERVICE_SECRET;

  if (!fromCron && !fromManual) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token    = await getAdminToken();
    const products = await getAllActiveProducts(token);
    console.log(`[sync] ${products.length} active products`);

    const results = {
      prices:    { updated: 0, skipped: 0, failed: 0 },
      inventory: { markedOos: 0, markedAvailable: 0, skipped: 0, failed: 0 },
      failedItems: [] as Array<{ handle: string; reason: string }>,
    };

    async function syncOne(p: ShopifyProduct): Promise<void> {
      const brandData = await fetchBrandData(p.urlKey, p.vendor);
      if (!brandData) {
        results.prices.failed++;
        results.inventory.failed++;
        results.failedItems.push({ handle: p.handle, reason: "no brand API data" });
        return;
      }

      const { mrp, sp, outOfStock } = brandData;

      // --- Price sync (skip price-locked products) ---
      if (PRICE_LOCKED_HANDLES.has(p.handle) || PRICE_LOCKED_HANDLES.has(p.urlKey)) {
        results.prices.skipped++;
      } else if (!mrp || mrp <= 0 || !sp || sp <= 0) {
        results.prices.failed++;
        results.failedItems.push({ handle: p.handle, reason: `invalid prices SP:${sp} MRP:${mrp}` });
      } else if (sp > mrp) {
        results.prices.skipped++;
      } else if (p.currentPrice === sp && p.currentCompareAt === mrp) {
        results.prices.skipped++;
      } else {
        const err = await updateVariantPrices(token, p.id, p.variantId, sp, mrp);
        if (err) {
          results.prices.failed++;
          results.failedItems.push({ handle: p.handle, reason: `price: ${err}` });
        } else {
          console.log(`[sync] ✓ price ${p.handle} SP:₹${sp} MRP:₹${mrp}`);
          results.prices.updated++;
        }
      }

      // --- Inventory sync ---
      const desiredPolicy = outOfStock ? "DENY" : "CONTINUE";
      if (!p.inventoryTracked || p.inventoryPolicy === desiredPolicy) {
        results.inventory.skipped++;
      } else {
        const err = await updateInventory(token, p.id, p.variantId, p.inventoryItemId, outOfStock);
        if (err) {
          results.inventory.failed++;
          results.failedItems.push({ handle: p.handle, reason: `inventory: ${err}` });
        } else {
          if (outOfStock) {
            console.log(`[sync] ✓ OOS ${p.handle}`);
            results.inventory.markedOos++;
          } else {
            console.log(`[sync] ✓ back-in-stock ${p.handle}`);
            results.inventory.markedAvailable++;
          }
        }
      }
    }

    for (const batch of chunk(products, BATCH_SIZE)) {
      await Promise.all(batch.map(syncOne));
      await sleep(200);
    }

    console.log(`[sync] Done — prices:${results.prices.updated} updated | OOS:${results.inventory.markedOos} back-in-stock:${results.inventory.markedAvailable}`);
    return NextResponse.json({ ok: true, total: products.length, ...results });

  } catch (err) {
    console.error("[sync]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
