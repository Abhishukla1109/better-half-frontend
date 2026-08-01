import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { clearShopifyCart } from "@/lib/shopify/api";

const MOSAIC_SECRET       = process.env.MOSAIC_SERVICE_SECRET ?? "fce45aff64536ec8ecea7ab6ce80";
const AFFLUENCE_URL       = process.env.AFFLUENCE_EARNINGS_URL ?? "https://stg.api.myaffluence.app/affluence/social/earnings/";
const AFFLUENCE_TOKEN     = process.env.AFFLUENCE_BEARER_TOKEN ?? "Gb6uz7fTFUUi624l";
const WEBHOOK_SECRET      = process.env.SHOPIFY_WEBHOOK_SECRET ?? "";
const SLACK_ORDER_WEBHOOK = process.env.SLACK_ORDER_WEBHOOK_URL ?? "";
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

interface ExistingMosaicOrder {
  brand:    string;
  code:     string;
  order_id: string;
  items:    Array<{ sku: string | null; title: string }>;
}

interface LockResult {
  acquired:              boolean;
  existingMosaicOrders:  ExistingMosaicOrder[];
}

// Idempotency: write a processing lock on first attempt so concurrent Shopify retries skip.
// On subsequent retries (when some brands already succeeded), return existing orders so we
// only call Mosaic for the brands that still failed — preventing partial-failure data loss.
async function acquireProcessingLock(orderId: number, adminToken: string): Promise<LockResult> {
  const gid = `gid://shopify/Order/${orderId}`;
  try {
    const checkRes = await fetch(`https://${SHOP}/admin/api/2024-01/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": adminToken },
      body: JSON.stringify({
        query: `query($id: ID!) { order(id: $id) { metafield(namespace: "custom", key: "mosaic_orders") { value } } }`,
        variables: { id: gid },
      }),
    });
    const checkData = await checkRes.json() as { data?: { order?: { metafield?: { value: string } | null } } };
    const existing = checkData?.data?.order?.metafield?.value;

    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        // Active processing lock from another in-flight request — skip
        if (parsed?.processing === true) return { acquired: false, existingMosaicOrders: [] };
        // Partially or fully processed — return existing orders so we retry only missing brands
        if (parsed?.mosaicOrders) return { acquired: true, existingMosaicOrders: parsed.mosaicOrders as ExistingMosaicOrder[] };
      } catch { return { acquired: false, existingMosaicOrders: [] }; }
    }

    // Nothing yet — write processing lock and proceed
    await fetch(`https://${SHOP}/admin/api/2024-01/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": adminToken },
      body: JSON.stringify({
        query: `mutation($mf: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $mf) { metafields { key } userErrors { message } } }`,
        variables: { mf: [{ ownerId: gid, namespace: "custom", key: "mosaic_orders", type: "json", value: JSON.stringify({ processing: true, locked_at: new Date().toISOString() }) }] },
      }),
    });
    return { acquired: true, existingMosaicOrders: [] };
  } catch {
    return { acquired: false, existingMosaicOrders: [] };
  }
}

async function cancelShopifyOrder(orderId: number, adminToken: string): Promise<void> {
  const res = await fetch(`https://${SHOP}/admin/api/2024-01/orders/${orderId}/cancel.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": adminToken },
    body: JSON.stringify({ reason: "other", email: true }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[order-webhook] Failed to cancel Shopify order ${orderId}:`, res.status, text);
  } else {
    console.log(`[order-webhook] Shopify order ${orderId} auto-cancelled — Mosaic rejected`);
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

// Shopify uses ISO 3166-2 codes; Mosaic's pincode DB uses different codes for 2 states
const STATE_CODE_MAP: Record<string, string> = { "UK": "UT", "TS": "TG" };

function normalizeStateCode(provinceCode: string): string {
  const code = provinceCode.replace(/^IN-/, "");
  return STATE_CODE_MAP[code] ?? code;
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
  console.log(`[order-webhook] ${brand} request payload:`, JSON.stringify(payload));
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

// ── Slack ────────────────────────────────────────────────────

async function notifySlack(order: ShopifyOrder, mosaicOrders: ExistingMosaicOrder[]): Promise<void> {
  if (!SLACK_ORDER_WEBHOOK) return;
  const name = `${order.shipping_address?.first_name || order.first_name || ""} ${order.shipping_address?.last_name || order.last_name || ""}`.trim();
  const phone = normalizePhone(order.shipping_address?.phone ?? order.phone);
  const paymentMethod = derivePaymentMethod(order);
  const total = order.line_items.reduce((sum, i) => {
    const disc = (i.discount_allocations ?? []).reduce((d, a) => d + parseFloat(a.amount), 0);
    return sum + parseFloat(i.price) * i.quantity - disc;
  }, 0);

  const itemLines = order.line_items
    .map(i => `• ${i.title} × ${i.quantity} — ₹${(parseFloat(i.price) * i.quantity).toFixed(0)}`)
    .join("\n");

  const mosaicLines = mosaicOrders
    .map(o => `${o.brand}: ${o.order_id}`)
    .join(" | ");

  const text = [
    `*New Order* 🛍️`,
    `*Customer:* ${name} | +91 ${phone}`,
    `*Payment:* ${paymentMethod.toUpperCase()} | *Total:* ₹${total.toFixed(0)}`,
    `*Items:*\n${itemLines}`,
    `*Mosaic:* ${mosaicLines}`,
    `*Shopify #:* ${order.id}`,
  ].join("\n");

  try {
    await fetch(SLACK_ORDER_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (e) {
    console.warn("[order-webhook] Slack notify failed:", e instanceof Error ? e.message : e);
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

    // Acquire processing lock — prevents duplicate Mosaic orders on Shopify webhook retries.
    // Returns any brands already successfully placed so we only retry the ones that failed.
    const { acquired, existingMosaicOrders } = await acquireProcessingLock(order.id, adminToken);
    if (!acquired) {
      console.log(`[order-webhook] Order ${order.id} already processing — skipping`);
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

    const alreadyPlaced = new Set(existingMosaicOrders.map(o => o.brand));
    const brandsToCall  = Object.keys(byBrand).filter(b => !alreadyPlaced.has(b));
    console.log(`[order-webhook] Shopify order ${order.id} — brands: ${Object.keys(byBrand).join(", ")} | retrying: ${brandsToCall.join(", ") || "none"}`);

    // Call Mosaic only for brands not yet placed
    const newResults = await Promise.all(
      brandsToCall.map(async brand => {
        const payload = buildOrderPayload(order, byBrand[brand], productMap, source);
        const mosaicOrderId = await callMosaicBrand(brand, payload);
        return { brand, mosaicOrderId };
      })
    );

    const newlyPlaced = newResults
      .filter(r => r.mosaicOrderId)
      .map(r => ({
        brand:    r.brand,
        code:     BRAND_CODE[r.brand] ?? r.brand,
        order_id: r.mosaicOrderId!,
        items:    (byBrand[r.brand] ?? []).map(i => ({ sku: i.sku ?? null, title: i.title })),
      }));

    const allMosaicOrders = [...existingMosaicOrders, ...newlyPlaced];

    if (allMosaicOrders.length > 0) {
      // Tag only newly placed brands (existing tags are already on the order)
      if (newlyPlaced.length > 0) {
        const newTags = newlyPlaced.map(r => `mosaic-${r.code}-${r.order_id}`);
        await addOrderTags(order.id, newTags, adminToken);
      }

      const metafieldValue = {
        mosaicOrders: allMosaicOrders,
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

    // If any brand failed to place with Mosaic, log the failure to the metafield, cancel the order
    const failedBrands = brandsToCall.filter(b => !newlyPlaced.find(r => r.brand === b));
    if (failedBrands.length > 0) {
      console.error(`[order-webhook] Mosaic rejected brands: ${failedBrands.join(", ")} — cancelling Shopify order ${order.id}`);
      await writeOrderMetafield(order.id, JSON.stringify({
        failed: true,
        failedBrands,
        failedAt: new Date().toISOString(),
        mosaicOrders: newlyPlaced,
      }), adminToken);
      await cancelShopifyOrder(order.id, adminToken);
      return NextResponse.json({ ok: true, cancelled: true, failedBrands });
    }

    // Notify Slack on every successful order
    notifySlack(order, allMosaicOrders).catch(() => {});

    // Notify Affluence only for newly placed brands (don't double-notify on retry)
    const utms = getUTMsFromOrder(order);
    if (utms && newlyPlaced.length > 0) {
      const customerType = await resolveCustomerType(order.customer_id, adminToken);
      await Promise.all(
        newlyPlaced.map(r => callAffluenceEarnings(order, r.brand, byBrand[r.brand], r.order_id, utms, customerType))
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

    console.log(`[order-webhook] Done for Shopify order ${order.id}:`, newResults);
    return NextResponse.json({ ok: true, results: newResults });

  } catch (err) {
    console.error("[order-webhook] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
