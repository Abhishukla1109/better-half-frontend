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

interface Product {
  handle: string;
  title: string;
  vendor: string;
  urlKey: string;
  sku: string | null;
}

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
      products.push({
        handle: p.handle,
        title:  p.title,
        vendor: p.vendor,
        urlKey,
        sku:    p.variants.nodes[0]?.sku ?? null,
      });
    }

    cursor = data.data.products.pageInfo.hasNextPage ? data.data.products.pageInfo.endCursor : null;
  } while (cursor);

  return products;
}

async function fetchBrandProduct(urlKey: string, vendor: string): Promise<{ name: string; sku: string | null; outOfStock: boolean } | null> {
  const base = BRAND_API[vendor];
  if (!base) return null;
  try {
    const res = await fetch(`${base}/${urlKey}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const pi = (await res.json() as { data?: { productInfo?: Record<string, unknown> } })?.data?.productInfo;
    if (!pi) return null;
    return {
      name:       String(pi.name ?? ""),
      sku:        (pi.sku as string | undefined) ?? null,
      outOfStock: !!(pi.out_of_stock ?? pi.outOfStock ?? false),
    };
  } catch {
    return null;
  }
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
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

    const skuMismatches: Array<{ handle: string; vendor: string; shopifySku: string | null; brandSku: string | null }> = [];
    const nameMismatches: Array<{ handle: string; vendor: string; shopifyTitle: string; brandName: string }> = [];
    const noBrandData: Array<{ handle: string; vendor: string; urlKey: string }> = [];
    let checked = 0;

    for (const batch of chunk(products, BATCH_SIZE)) {
      await Promise.all(batch.map(async (p) => {
        const brand = await fetchBrandProduct(p.urlKey, p.vendor);
        if (!brand) {
          noBrandData.push({ handle: p.handle, vendor: p.vendor, urlKey: p.urlKey });
          return;
        }
        checked++;
        if (brand.sku && p.sku && brand.sku !== p.sku) {
          skuMismatches.push({ handle: p.handle, vendor: p.vendor, shopifySku: p.sku, brandSku: brand.sku });
        }
        if (brand.name && normalize(brand.name) !== normalize(p.title)) {
          nameMismatches.push({ handle: p.handle, vendor: p.vendor, shopifyTitle: p.title, brandName: brand.name });
        }
      }));
      await new Promise(r => setTimeout(r, 150));
    }

    return NextResponse.json({
      ok: true,
      totalActive: products.length,
      checked,
      skuMismatchCount: skuMismatches.length,
      nameMismatchCount: nameMismatches.length,
      noBrandDataCount: noBrandData.length,
      skuMismatches,
      nameMismatches,
      noBrandData,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
