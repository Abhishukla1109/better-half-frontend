import { NextRequest, NextResponse } from "next/server";

const MOSAIC_ORDER_URL = process.env.MOSAIC_ORDER_API_URL
  ?? "https://stg.api.ourlittlejoys.com/portal/utility/create-simple-order";
const MOSAIC_SECRET   = process.env.MOSAIC_SERVICE_SECRET ?? "fce45aff64536ec8ecea7ab6ce80";

const SHOP         = (process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "").replace(/\/$/, "").replace("https://", "");
const CLIENT_ID    = process.env.SHOPIFY_ADMIN_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.SHOPIFY_ADMIN_CLIENT_SECRET ?? "";

// ── Types ────────────────────────────────────────────────────

interface ShopifyLineItem {
  product_id: number;
  variant_id: number;
  quantity: number;
  price: string;
  sku: string | null;
  title: string;
}

interface ShopifyAddress {
  first_name: string;
  last_name:  string;
  address1:   string;
  address2:   string | null;
  city:       string;
  province_code: string;
  zip:        string;
  phone:      string | null;
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

async function getProductHandles(productIds: number[], adminToken: string): Promise<Record<number, string>> {
  const ids = productIds.join(",");
  const res = await fetch(
    `https://${SHOP}/admin/api/2024-01/products.json?ids=${ids}&fields=id,handle`,
    { headers: { "X-Shopify-Access-Token": adminToken } },
  );
  const data = await res.json() as { products?: Array<{ id: number; handle: string }> };
  const map: Record<number, string> = {};
  for (const p of data.products ?? []) map[p.id] = p.handle;
  return map;
}

function normalizePhone(raw: string | null): string {
  if (!raw) return "";
  return raw.replace(/\D/g, "").slice(-10);
}

function normalizeStateCode(provinceCode: string): string {
  return provinceCode.replace(/^IN-/, "");
}

// ── Route ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let order: ShopifyOrder;
  try {
    order = await req.json() as ShopifyOrder;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only process paid orders
  if (order.financial_status !== "paid") {
    return NextResponse.json({ ok: true, skipped: `status=${order.financial_status}` });
  }

  try {
    // Look up product handles from Shopify Admin API
    const adminToken = await getAdminToken();
    const productIds = [...new Set(order.line_items.map(i => i.product_id))];
    const handleMap  = adminToken ? await getProductHandles(productIds, adminToken) : {};

    const shipping = order.shipping_address;

    const body = {
      contact_no:   normalizePhone(shipping.phone ?? order.phone),
      first_name:   shipping.first_name || order.first_name,
      last_name:    shipping.last_name  || order.last_name,
      email:        order.email,
      address_1:    shipping.address1,
      address_2:    shipping.address2 ?? shipping.address1,
      street:       shipping.address1,
      city:         shipping.city,
      state:        normalizeStateCode(shipping.province_code),
      postcode:     shipping.zip,
      payment_method: "juspay",
      source:       "betterhalf",
      order: order.line_items.map(item => ({
        product_id: handleMap[item.product_id] ?? item.sku ?? String(item.product_id),
        quantity:   item.quantity,
        price:      parseFloat(item.price),
      })),
    };

    const res = await fetch(MOSAIC_ORDER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "servicesecret": MOSAIC_SECRET,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[order-webhook] Mosaic error:", res.status, text);
      return NextResponse.json({ error: "Mosaic API failed" }, { status: 500 });
    }

    const result = await res.json();
    console.log("[order-webhook] Order created in Mosaic:", order.id, result);
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("[order-webhook] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
