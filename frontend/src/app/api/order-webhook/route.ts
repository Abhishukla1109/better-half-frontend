import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { clearShopifyCart } from "@/lib/shopify/api";

const MOSAIC_SECRET       = process.env.MOSAIC_SERVICE_SECRET ?? "fce45aff64536ec8ecea7ab6ce80";
const AFFLUENCE_URL       = process.env.AFFLUENCE_EARNINGS_URL ?? "https://stg.api.myaffluence.app/affluence/social/earnings/";
const AFFLUENCE_TOKEN     = process.env.AFFLUENCE_BEARER_TOKEN ?? "Gb6uz7fTFUUi624l";
const WEBHOOK_SECRET      = process.env.SHOPIFY_WEBHOOK_SECRET ?? "";
const BRAND_CODE: Record<string, string> = { "Man Matters": "MM", "Be Bodywise": "BW", "Little Joys": "LJ" };

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
  product_id:           number;
  variant_id:           number;
  quantity:             number;
  price:                string;
  sku:                  string | null;
  title:                string;
  discount_allocations: Array<{ amount: string; discount_application_index: number }>;
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
  customer_id:      number | null;
  email:            string;
  phone:            string | null;
  first_name:       string;
  last_name:        string;
  financial_status: string;
  payment_gateway:  string | null;
  shipping_address: ShopifyAddress;
  line_items:       ShopifyLineItem[];
  note_attributes:  Array<{ name: string; value: string }>;
}

interface AffluenceUTMs {
  utmSource:    string;
  utmMedium:    string;
  utmCampaign:  string;
  ref:          string;
  dmId:         string;
  influencerId: string;
  affCartId:    string;
}

interface ProductInfo {
  handle: string;
  vendor: string;
}

// ── Helpers ──────────────────────────────────────────────────

// Fix 6: Verify Shopify webhook HMAC signature to reject forged requests
async function verifyWebhookSignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!WEBHOOK_SECRET) {
    console.warn("[order-webhook] SHOPIFY_WEBHOOK_SECRET not set — skipping signature check");
    return true;
  }
  if (!signature) return false;
  const hmac = createHmac("sha256", WEBHOOK_SECRET).update(rawBody, "utf8").digest("base64");
  return hmac === signature;
}

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

// Idempotency: check AND set a processing lock in one step to prevent race conditions.
// We write a "processing" marker immediately — before calling Mosaic — so any concurrent
// retry sees it and exits. The marker is overwritten with real data on success.
async function acquireProcessingLock(orderId: number, adminToken: string): Promise<boolean> {
  const gid = `gid://shopify/Order/${orderId}`;
  try {
    // First check if already fully processed or locked
    const checkRes = await fetch(`https://${SHOP}/admin/api/2024-01/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": adminToken },
      body: JSON.stringify({
        query: `query($id: ID!) { order(id: $id) { metafield(namespace: "custom", key: "mosaic_orders") { value } } }`,
        variables: { id: gid },
      }),
    });
    const checkData = await checkRes.json() as { data?: { order?: { metafield?: { value: string } | null } } };
    if (checkData?.data?.order?.metafield?.value) return false; // already processed or locked

    // Write lock marker immediately
    await fetch(`https://${SHOP}/admin/api/2024-01/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": adminToken },
      body: JSON.stringify({
        query: `mutation($mf: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $mf) { metafields { key } userErrors { message } } }`,
        variables: { mf: [{ ownerId: gid, namespace: "custom", key: "mosaic_orders", type: "json", value: JSON.stringify({ processing: true, locked_at: new Date().toISOString() }) }] },
      }),
    });
    return true; // lock acquired
  } catch {
    return false;
  }
}

async function addOrderTags(orderId: number, tags: string[], adminToken: string): Promise<void> {
  const gid = `gid://shopify/Order/${orderId}`;
  await fetch(`https://${SHOP}/admin/api/2024-01/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": adminToken },
    body: JSON.stringify({
      query: `
        mutation($id: ID!, $tags: [String!]!) {
          tagsAdd(id: $id, tags: $tags) {
            node { id }
            userErrors { field message }
          }
        }
      `,
      variables: { id: gid, tags },
    }),
  });
}

async function writeOrderMetafield(orderId: number, value: string, adminToken: string): Promise<void> {
  const gid = `gid://shopify/Order/${orderId}`;
  const res = await fetch(`https://${SHOP}/admin/api/2024-01/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": adminToken },
    body: JSON.stringify({
      query: `
        mutation($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields { key }
            userErrors { field message }
          }
        }
      `,
      variables: {
        metafields: [{
          ownerId:   gid,
          namespace: "custom",
          key:       "mosaic_orders",
          type:      "json",
          value,
        }],
      },
    }),
  });
  const data = await res.json() as { data?: { metafieldsSet?: { userErrors?: Array<{ message: string }> } } };
  const errs = data?.data?.metafieldsSet?.userErrors ?? [];
  if (errs.length > 0) console.error("[order-webhook] metafield write errors:", errs);
  else console.log("[order-webhook] mosaic_orders metafield written for order", orderId);
}

function normalizePhone(raw: string | null): string {
  if (!raw) return "";
  return raw.replace(/\D/g, "").slice(-10);
}

function normalizeStateCode(provinceCode: string): string {
  return provinceCode.replace(/^IN-/, "");
}

// Fix 1: Derive payment method dynamically from the order instead of hardcoding "juspay"
function derivePaymentMethod(order: ShopifyOrder): string {
  if (order.financial_status === "pending") return "cod";
  // GoKwik/Juspay handles all prepaid — gateway name may vary but intent is prepaid
  const gateway = (order.payment_gateway ?? "").toLowerCase();
  if (gateway.includes("cod") || gateway.includes("cash")) return "cod";
  return "prepaid";
}

function buildOrderPayload(order: ShopifyOrder, items: ShopifyLineItem[], productMap: Record<number, ProductInfo>, source: string) {
  const shipping = order.shipping_address;
  return {
    contact_no:     normalizePhone(shipping.phone ?? order.phone),
    first_name:     shipping.first_name || order.first_name,
    last_name:      shipping.last_name  || order.last_name,
    email:          order.email,
    address_1:      shipping.address1,
    address_2:      shipping.address2 ?? "",
    street:         shipping.address1,
    city:           shipping.city,
    state:          normalizeStateCode(shipping.province_code),
    postcode:       shipping.zip,
    payment_method: derivePaymentMethod(order),
    source,
    order: items.map(item => {
      const lineDiscount = (item.discount_allocations ?? []).reduce((d, a) => d + parseFloat(a.amount), 0);
      const paidPerUnit  = (parseFloat(item.price) * item.quantity - lineDiscount) / item.quantity;
      return {
        product_id: productMap[item.product_id]?.handle ?? item.sku ?? String(item.product_id),
        quantity:   item.quantity,
        price:      Math.round(paidPerUnit * 100) / 100,
      };
    }),
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
  const rawText = await res.text();
  console.log(`[order-webhook] ${brand} raw response (${res.status}):`, rawText);
  if (!res.ok) {
    console.error(`[order-webhook] ${brand} API error:`, res.status, rawText);
    return null;
  }
  let result: { result?: { order_id?: string } } = {};
  try { result = JSON.parse(rawText); } catch { return null; }
  const orderId = result.result?.order_id;
  console.log(`[order-webhook] ${brand} order id:`, orderId);
  return orderId ?? null;
}

// ── Affluence ────────────────────────────────────────────────

function getUTMsFromOrder(order: ShopifyOrder): AffluenceUTMs | null {
  const attrs = order.note_attributes ?? [];
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = attrs.find(a => a.name === k)?.value;
      if (v) return v;
    }
    return "";
  };

  const affCartId   = pick("affCartId");
  const utmSource   = pick("utm_source", "utmSource", "affluence_last_utm_source");
  const influencerId = pick("influencerId");
  const ref         = pick("ref");

  // Detect Affluence orders either by UTM attribution OR by affluence_checkout_started_at
  // (present when user came via Affluence's direct checkout flow)
  const isAffluenceCheckout = !!attrs.find(a => a.name === "affluence_checkout_started_at")?.value;
  const isUTMAttributed = utmSource && utmSource !== "direct" && (influencerId || ref);

  if (!isAffluenceCheckout && !isUTMAttributed) return null;

  return {
    utmSource:    utmSource || "affluence",
    utmMedium:    pick("utm_medium",   "utmMedium",   "affluence_last_utm_medium"),
    utmCampaign:  pick("utm_campaign", "utmCampaign", "affluence_last_utm_campaign"),
    ref,
    dmId:         pick("dmId"),
    influencerId,
    affCartId,
  };
}

// Fix 3: Determine if customer is new or returning via their Shopify order count
async function resolveCustomerType(customerId: number | null, adminToken: string): Promise<"NEW" | "REPEAT"> {
  if (!customerId) return "NEW";
  try {
    const res = await fetch(
      `https://${SHOP}/admin/api/2024-01/customers/${customerId}.json?fields=orders_count`,
      { headers: { "X-Shopify-Access-Token": adminToken } },
    );
    const data = await res.json() as { customer?: { orders_count?: number } };
    const count = data?.customer?.orders_count ?? 0;
    return count <= 1 ? "NEW" : "REPEAT";
  } catch {
    return "NEW";
  }
}

async function callAffluenceEarnings(
  order: ShopifyOrder,
  brand: string,
  items: ShopifyLineItem[],
  mosaicOrderId: string,
  utms: AffluenceUTMs,
  customerType: "NEW" | "REPEAT",
): Promise<void> {
  const subTotal = items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
  const grandTotal = items.reduce((sum, item) => {
    const discountOnLine = (item.discount_allocations ?? []).reduce((d, a) => d + parseFloat(a.amount), 0);
    return sum + (parseFloat(item.price) * item.quantity - discountOnLine);
  }, 0);
  const netTotal = grandTotal / 1.18;
  const payload = {
    utmSource:    utms.utmSource,
    utmMedium:    utms.utmMedium,
    utmCampaign:  utms.utmCampaign,
    ref:          utms.ref,
    dmId:         utms.dmId,
    influencerId: utms.influencerId,
    cartId:       utms.affCartId || undefined,
    metaData: { paymentMode: derivePaymentMethod(order) },
    order: {
      status:        "confirmed",
      subTotal:      Math.round(subTotal * 100) / 100,
      grandTotal:    Math.round(grandTotal * 100) / 100,
      netTotal:      Math.round(netTotal * 100) / 100,
      orderId:       mosaicOrderId,
      isSimpleOrder: false,
      coupons:       [],
    },
    user: {
      type:   customerType,
      userId: String(order.customer_id ?? normalizePhone(order.shipping_address?.phone ?? order.phone) ?? order.id),
      brand:  BRAND_CODE[brand] ?? brand,
      phone:  normalizePhone(order.shipping_address?.phone ?? order.phone),
      email:  order.email,
    },
  };
  const res = await fetch(AFFLUENCE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AFFLUENCE_TOKEN}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[order-webhook] Affluence ${brand} error:`, res.status, text);
  } else {
    console.log(`[order-webhook] Affluence notified: ${brand} → ${mosaicOrderId} (${customerType})`);
  }
}

// ── Route ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  console.log("[order-webhook] received POST from", req.headers.get("x-shopify-topic") ?? "unknown");

  // Fix 6: Verify Shopify signature — read raw body first, then parse
  const rawBody = await req.text();
  const signature = req.headers.get("x-shopify-hmac-sha256");
  const isValid = await verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    console.error("[order-webhook] Invalid webhook signature — rejecting");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let order: ShopifyOrder;
  try {
    order = JSON.parse(rawBody) as ShopifyOrder;
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

    // Acquire processing lock before calling Mosaic — prevents duplicate orders on Shopify webhook retries
    const locked = await acquireProcessingLock(order.id, adminToken);
    if (!locked) {
      console.log(`[order-webhook] Order ${order.id} already processing or processed — skipping`);
      return NextResponse.json({ ok: true, skipped: "already_processed" });
    }

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

    // Write Mosaic order IDs back to Shopify as metafield
    const mosaicOrders = results
      .filter(r => r.mosaicOrderId)
      .map(r => ({
        brand:    r.brand,
        code:     BRAND_CODE[r.brand] ?? r.brand,
        order_id: r.mosaicOrderId!,
        items:    (byBrand[r.brand] ?? []).map(i => ({ sku: i.sku ?? null, title: i.title })),
      }));

    if (mosaicOrders.length > 0) {
      // Tag order with mosaic IDs so mosaic-webhook can find it later (e.g. mosaic-MM-050021153)
      const tags = mosaicOrders.map(r => `mosaic-${r.code}-${r.order_id}`);
      await addOrderTags(order.id, tags, adminToken);

      const metafieldValue = {
        mosaicOrders,
        items: order.line_items.map(i => ({
          sku:       i.sku ?? null,
          title:     i.title,
          quantity:  i.quantity,
          unitPrice: { amount: i.price, currencyCode: "INR" },
          total:     { amount: String((parseFloat(i.price) * i.quantity).toFixed(2)), currencyCode: "INR" },
        })),
      };
      await writeOrderMetafield(order.id, JSON.stringify(metafieldValue), adminToken);
    }

    // Notify Affluence for influencer-attributed orders
    const utms = getUTMsFromOrder(order);
    if (utms) {
      // Fix 3: Resolve customer type once, reuse across all brand calls
      const customerType = await resolveCustomerType(order.customer_id, adminToken);
      await Promise.all(
        results
          .filter(r => r.mosaicOrderId)
          .map(r => callAffluenceEarnings(order, r.brand, byBrand[r.brand], r.mosaicOrderId!, utms, customerType))
      );
    }

    // Clear the Shopify cart so any frontend (BetterHalf, Affluence) fetching it
    // on next load sees an empty cart and can clear their UI state automatically.
    const cartIdAttr = (order.note_attributes ?? []).find(a => a.name === "cartId")?.value
      ?? (order.note_attributes ?? []).find(a => a.name === "affCartId")?.value;
    if (cartIdAttr) {
      clearShopifyCart(cartIdAttr).catch(e =>
        console.warn("[order-webhook] cart clear failed:", e instanceof Error ? e.message : e)
      );
    }

    console.log(`[order-webhook] Done for Shopify order ${order.id}:`, results);
    return NextResponse.json({ ok: true, results });

  } catch (err) {
    console.error("[order-webhook] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
