import { NextRequest, NextResponse } from "next/server";

const MOSAIC_SECRET = process.env.MOSAIC_SERVICE_SECRET ?? "fce45aff64536ec8ecea7ab6ce80";

const BRAND_ORDER_URL: Record<string, string> = {
  "Man Matters": process.env.MOSAIC_MM_ORDER_URL ?? "https://stg.api.manmatters.com/portal/utility/create-simple-order",
  "Be Bodywise": process.env.MOSAIC_BB_ORDER_URL ?? "https://stg.api.bebodywise.com/portal/utility/create-simple-order",
  "Little Joys": process.env.MOSAIC_LJ_ORDER_URL ?? "https://stg.api.ourlittlejoys.com/portal/utility/create-simple-order",
};

const SHOP          = (process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "").replace(/\/$/, "").replace("https://", "");
const CLIENT_ID     = process.env.SHOPIFY_ADMIN_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.SHOPIFY_ADMIN_CLIENT_SECRET ?? "";

// ── Types ────────────────────────────────────────────────────

interface ShopifyLineItem {
  product_id: number;
  variant_id: number;
  quantity:   number;
  price:      string;
  sku:        string | null;
  title:      string;
}

interface ShopifyAddress {
  first_name:    string;
  last_name:     string;
  address1:      string;
  address2:      string | null;
  city:          string;
  province_code: string;
  zip:           string;
  phone:         string | null;
}

interface ShopifyOrder {
  id:               number;
  email:            string;
  phone:            string | null;
  first_name:       string;
  last_name:        string;
  financial_status: string;
  shipping_address: ShopifyAddress;
  line_items:       ShopifyLineItem[];
  note_attributes:  Array<{ name: string; value: string }>;
}

interface ProductInfo {
  handle: string;
  vendor: string;
}

// ── Helpers ──────────────────────────────────────────────────

async function getAdminToken(): Promise<string | null> {
  try {
    const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "client_credentials" }),
    });
    const { access_token } = await res.json() as { access_token?: string };
    return access_token ?? null;
  } catch {
    return null;
  }
}

async function getProductInfo(productIds: number[], adminToken: string): Promise<Record<number, ProductInfo>> {
  const ids = productIds.join(",");
  const res = await fetch(
    `https://${SHOP}/admin/api/2024-01/products.json?ids=${ids}&fields=id,handle,vendor`,
    { headers: { "X-Shopify-Access-Token": adminToken } },
  );
  const data = await res.json() as { products?: Array<{ id: number; handle: string; vendor: string }> };
  const map: Record<number, ProductInfo> = {};
  for (const p of data.products ?? []) map[p.id] = { handle: p.handle, vendor: p.vendor };
  return map;
}

async function writeOrderMetafield(orderId: number, key: string, value: string, adminToken: string): Promise<void> {
  await fetch(`https://${SHOP}/admin/api/2024-01/orders/${orderId}/metafields.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": adminToken },
    body: JSON.stringify({ metafield: { namespace: "mosaic", key, value, type: "single_line_text_field" } }),
  });
}

function normalizePhone(raw: string | null): string {
  if (!raw) return "";
  return raw.replace(/\D/g, "").slice(-10);
}

function normalizeStateCode(provinceCode: string): string {
  return provinceCode.replace(/^IN-/, "");
}

function buildOrderPayload(order: ShopifyOrder, items: ShopifyLineItem[], productMap: Record<number, ProductInfo>, source: string) {
  const shipping = order.shipping_address;
  return {
    contact_no:     normalizePhone(shipping.phone ?? order.phone),
    first_name:     shipping.first_name || order.first_name,
    last_name:      shipping.last_name  || order.last_name,
    email:          order.email,
    address_1:      shipping.address1,
    address_2:      shipping.address2 ?? shipping.address1,
    street:         shipping.address1,
    city:           shipping.city,
    state:          normalizeStateCode(shipping.province_code),
    postcode:       shipping.zip,
    payment_method: "juspay",
    source,
    order: items.map(item => ({
      product_id: productMap[item.product_id]?.handle ?? item.sku ?? String(item.product_id),
      quantity:   item.quantity,
      price:      parseFloat(item.price),
    })),
  };
}

async function callMosaicBrand(brand: string, payload: object): Promise<string | null> {
  const url = BRAND_ORDER_URL[brand];
  if (!url) {
    console.warn(`[order-webhook] No API URL configured for brand: ${brand}`);
    return null;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "servicesecret": MOSAIC_SECRET },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[order-webhook] ${brand} API error:`, res.status, text);
    return null;
  }
  const result = await res.json() as { order_id?: string };
  console.log(`[order-webhook] ${brand} order created:`, result.order_id);
  return result.order_id ?? null;
}

// ── Route ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  console.log("[order-webhook] received POST from", req.headers.get("x-shopify-topic") ?? "unknown");

  let order: ShopifyOrder;
  try {
    order = await req.json() as ShopifyOrder;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validStatuses = ["paid", "pending", "partially_paid"];
  if (!validStatuses.includes(order.financial_status)) {
    return NextResponse.json({ ok: true, skipped: `status=${order.financial_status}` });
  }

  try {
    const adminToken = await getAdminToken();
    if (!adminToken) throw new Error("Could not get Shopify admin token");

    const productIds = [...new Set(order.line_items.map(i => i.product_id))];
    const productMap = await getProductInfo(productIds, adminToken);

    const sourceAttr = (order.note_attributes ?? []).find(a => a.name === "source");
    const source = sourceAttr?.value ?? "betterhalf";

    // Group line items by brand
    const byBrand: Record<string, ShopifyLineItem[]> = {};
    for (const item of order.line_items) {
      const vendor = productMap[item.product_id]?.vendor ?? "Unknown";
      if (!byBrand[vendor]) byBrand[vendor] = [];
      byBrand[vendor].push(item);
    }

    console.log(`[order-webhook] Shopify order ${order.id} — brands: ${Object.keys(byBrand).join(", ")}`);

    // Call each brand API in parallel
    const brandCalls = Object.entries(byBrand).map(async ([brand, items]) => {
      const payload = buildOrderPayload(order, items, productMap, source);
      const mosaicOrderId = await callMosaicBrand(brand, payload);
      return { brand, mosaicOrderId };
    });

    const results = await Promise.all(brandCalls);

    // Write Mosaic order IDs back to Shopify order as metafields
    const metafieldKey: Record<string, string> = {
      "Man Matters": "mm_order_id",
      "Be Bodywise": "bb_order_id",
      "Little Joys": "lj_order_id",
    };

    await Promise.all(
      results
        .filter(r => r.mosaicOrderId && metafieldKey[r.brand])
        .map(r => writeOrderMetafield(order.id, metafieldKey[r.brand], r.mosaicOrderId!, adminToken))
    );

    console.log(`[order-webhook] Done for Shopify order ${order.id}:`, results);
    return NextResponse.json({ ok: true, results });

  } catch (err) {
    console.error("[order-webhook] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
