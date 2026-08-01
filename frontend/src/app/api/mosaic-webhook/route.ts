import { NextRequest, NextResponse } from "next/server";

const MOSAIC_WEBHOOK_SECRET = process.env.MOSAIC_WEBHOOK_SECRET ?? "";
const SHOP          = (process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "").replace(/\/$/, "").replace("https://", "");
const CLIENT_ID     = process.env.SHOPIFY_ADMIN_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.SHOPIFY_ADMIN_CLIENT_SECRET ?? "";

const BRAND_CODE: Record<string, string> = { "Man Matters": "MM", "Be Bodywise": "BW", "Little Joys": "LJ" };

type OrderStatus = "shipped" | "delivered" | "cancelled" | "refunded" | "order_rto";

interface MosaicWebhookPayload {
  brand:            string;
  mosaic_order_id:  string;
  status:           OrderStatus;
  tracking_number?: string;
  tracking_url?:    string;
  reason?:          string;
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

async function adminGql<T>(adminToken: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://${SHOP}/admin/api/2024-01/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": adminToken },
    body: JSON.stringify({ query, variables }),
  });
  return res.json() as Promise<T>;
}

interface FoundOrder {
  id:   number;
  gid:  string;
  metafieldValue: Record<string, unknown> | null;
}

async function findOrderByTag(tag: string, adminToken: string): Promise<FoundOrder | null> {
  const data = await adminGql<{
    data?: {
      orders?: {
        edges?: Array<{
          node: {
            id: string;
            legacyResourceId: string;
            metafield?: { value: string } | null;
          }
        }>
      }
    }
  }>(adminToken, `
    query($query: String!) {
      orders(first: 1, query: $query) {
        edges {
          node {
            id
            legacyResourceId
            metafield(namespace: "custom", key: "mosaic_orders") { value }
          }
        }
      }
    }
  `, { query: `tag:${tag}` });

  const node = data?.data?.orders?.edges?.[0]?.node;
  if (!node) return null;

  let metafieldValue: Record<string, unknown> | null = null;
  try { metafieldValue = node.metafield?.value ? JSON.parse(node.metafield.value) : null; } catch {}

  return { id: parseInt(node.legacyResourceId), gid: node.id, metafieldValue };
}

async function fetchFulfillmentOrders(orderGid: string, adminToken: string): Promise<Array<{ id: string; status: string }>> {
  const data = await adminGql<{
    data?: { order?: { fulfillmentOrders: { nodes: Array<{ id: string; status: string }> } } }
  }>(adminToken, `
    query($id: ID!) {
      order(id: $id) {
        fulfillmentOrders(first: 5) {
          nodes { id status }
        }
      }
    }
  `, { id: orderGid });
  return data?.data?.order?.fulfillmentOrders?.nodes ?? [];
}

async function fetchFulfillments(orderGid: string, adminToken: string): Promise<Array<{ id: string; status: string }>> {
  const data = await adminGql<{
    data?: { order?: { fulfillments: Array<{ id: string; status: string }> } }
  }>(adminToken, `
    query($id: ID!) {
      order(id: $id) {
        fulfillments { id status }
      }
    }
  `, { id: orderGid });
  return data?.data?.order?.fulfillments ?? [];
}

async function writeOrderMetafield(orderId: number, value: string, adminToken: string): Promise<void> {
  const data = await adminGql<{
    data?: { metafieldsSet?: { userErrors?: Array<{ message: string }> } }
  }>(adminToken, `
    mutation($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { key }
        userErrors { field message }
      }
    }
  `, {
    metafields: [{
      ownerId:   `gid://shopify/Order/${orderId}`,
      namespace: "custom",
      key:       "mosaic_orders",
      type:      "json",
      value,
    }],
  });
  const errs = data?.data?.metafieldsSet?.userErrors ?? [];
  if (errs.length > 0) console.error("[mosaic-webhook] metafield write errors:", errs);
}

async function createFulfillment(
  fulfillmentOrderId: string,
  tracking_number: string | undefined,
  tracking_url: string | undefined,
  adminToken: string,
): Promise<void> {
  const trackingInfo = tracking_number
    ? { number: tracking_number, ...(tracking_url ? { url: tracking_url } : {}) }
    : undefined;

  const data = await adminGql<{
    data?: { fulfillmentCreate?: { userErrors?: Array<{ message: string }>; fulfillment?: { id: string; status: string } } }
  }>(adminToken, `
    mutation fulfillmentCreate($fulfillment: FulfillmentInput!) {
      fulfillmentCreate(fulfillment: $fulfillment) {
        fulfillment { id status }
        userErrors { field message }
      }
    }
  `, {
    fulfillment: {
      lineItemsByFulfillmentOrder: [{ fulfillmentOrderId }],
      ...(trackingInfo ? { trackingInfo } : {}),
      notifyCustomer: false,
    },
  });

  const errs = data?.data?.fulfillmentCreate?.userErrors ?? [];
  if (errs.length > 0) console.error("[mosaic-webhook] fulfillmentCreate errors:", errs);
  else console.log("[mosaic-webhook] fulfillment created:", data?.data?.fulfillmentCreate?.fulfillment?.id);
}

async function createFulfillmentEvent(fulfillmentId: string, status: string, adminToken: string): Promise<void> {
  const data = await adminGql<{
    data?: { fulfillmentEventCreate?: { fulfillmentEvent?: { status: string }; userErrors?: Array<{ message: string }> } }
  }>(adminToken, `
    mutation fulfillmentEventCreate($fulfillmentId: ID!, $status: FulfillmentEventStatus!) {
      fulfillmentEventCreate(fulfillmentEvent: {
        fulfillmentId: $fulfillmentId
        status: $status
      }) {
        fulfillmentEvent { status }
        userErrors { field message }
      }
    }
  `, { fulfillmentId, status });

  const errs = data?.data?.fulfillmentEventCreate?.userErrors ?? [];
  if (errs.length > 0) console.error("[mosaic-webhook] fulfillmentEventCreate errors:", errs);
  else console.log("[mosaic-webhook] fulfillment event created:", status, "for", fulfillmentId);
}

async function cancelFulfillment(fulfillmentId: string, adminToken: string): Promise<void> {
  const data = await adminGql<{
    data?: { fulfillmentCancel?: { userErrors?: Array<{ message: string }> } }
  }>(adminToken, `
    mutation fulfillmentCancel($id: ID!) {
      fulfillmentCancel(id: $id) {
        fulfillment { id status }
        userErrors { field message }
      }
    }
  `, { id: fulfillmentId });

  const errs = data?.data?.fulfillmentCancel?.userErrors ?? [];
  if (errs.length > 0) console.error("[mosaic-webhook] fulfillmentCancel errors:", errs);
  else console.log("[mosaic-webhook] fulfillment cancelled:", fulfillmentId);
}

async function cancelShopifyOrder(orderId: number, reason: string | undefined, adminToken: string): Promise<void> {
  const res = await fetch(`https://${SHOP}/admin/api/2024-01/orders/${orderId}/cancel.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": adminToken },
    body: JSON.stringify({ reason: reason ?? "other", email: false }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[mosaic-webhook] order cancel failed:", res.status, text);
  } else {
    console.log("[mosaic-webhook] Shopify order cancelled:", orderId);
  }
}

async function refundShopifyOrder(
  orderId: number,
  brandItems: Array<{ sku: string | null; title: string }>,
  adminToken: string,
): Promise<void> {
  const orderRes = await fetch(
    `https://${SHOP}/admin/api/2024-01/orders/${orderId}.json?fields=id,financial_status,line_items,transactions`,
    { headers: { "X-Shopify-Access-Token": adminToken } },
  );
  const { order: shopifyOrder } = await orderRes.json() as {
    order: {
      financial_status: string;
      line_items: Array<{ id: number; sku: string | null; title: string; price: string; quantity: number; discount_allocations: Array<{ amount: string }> }>;
      transactions: Array<{ id: number; kind: string; status: string; gateway: string }>;
    }
  };

  if (!["paid", "partially_paid"].includes(shopifyOrder?.financial_status ?? "")) {
    console.log(`[mosaic-webhook] Order ${orderId} is ${shopifyOrder?.financial_status} (COD/unpaid) — no Shopify refund needed`);
    return;
  }

  const brandSkus    = new Set(brandItems.map(i => i.sku).filter(Boolean));
  const brandTitles  = new Set(brandItems.map(i => i.title));
  const matchingItems = (shopifyOrder.line_items ?? []).filter(
    item => (item.sku && brandSkus.has(item.sku)) || brandTitles.has(item.title),
  );

  if (matchingItems.length === 0) {
    console.log(`[mosaic-webhook] No matching line items to refund on order ${orderId}`);
    return;
  }

  const refundLineItems = matchingItems.map(item => ({
    line_item_id: item.id,
    quantity:     item.quantity,
    restock_type: "no_restock",
  }));

  const refundAmount = matchingItems.reduce((sum, item) => {
    const discount = (item.discount_allocations ?? []).reduce((d, a) => d + parseFloat(a.amount), 0);
    return sum + parseFloat(item.price) * item.quantity - discount;
  }, 0);

  const paymentTx = (shopifyOrder.transactions ?? []).find(t => t.kind === "sale" && t.status === "success");

  const refundPayload = {
    refund: {
      note:               "Refunded by Mosaic",
      notify:             false,
      refund_line_items:  refundLineItems,
      ...(paymentTx ? {
        transactions: [{
          parent_id: paymentTx.id,
          amount:    (Math.round(refundAmount * 100) / 100).toFixed(2),
          kind:      "refund",
          gateway:   paymentTx.gateway,
        }],
      } : {}),
    },
  };

  const refundRes = await fetch(`https://${SHOP}/admin/api/2024-01/orders/${orderId}/refunds.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": adminToken },
    body: JSON.stringify(refundPayload),
  });

  if (!refundRes.ok) {
    const text = await refundRes.text();
    console.error(`[mosaic-webhook] refund create failed for order ${orderId}:`, refundRes.status, text);
  } else {
    console.log(`[mosaic-webhook] Shopify refund created for order ${orderId}, amount: ₹${refundAmount.toFixed(2)}`);
  }
}

// ── Route ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  console.log("[mosaic-webhook] received POST");

  const secret = req.headers.get("x-mosaic-secret");
  if (!MOSAIC_WEBHOOK_SECRET || secret !== MOSAIC_WEBHOOK_SECRET) {
    console.error("[mosaic-webhook] Invalid or missing secret");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: MosaicWebhookPayload;
  try {
    payload = await req.json() as MosaicWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { brand, mosaic_order_id, status, tracking_number, tracking_url, reason } = payload;

  if (!brand || !mosaic_order_id || !status) {
    return NextResponse.json({ error: "Missing required fields: brand, mosaic_order_id, status" }, { status: 400 });
  }

  const code = BRAND_CODE[brand] ?? brand;
  const tag  = `mosaic-${code}-${mosaic_order_id}`;

  try {
    const adminToken = await getAdminToken();
    if (!adminToken) throw new Error("Could not get Shopify admin token");

    const order = await findOrderByTag(tag, adminToken);
    if (!order) {
      console.error(`[mosaic-webhook] No Shopify order found for tag: ${tag}`);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // ── Update Shopify fulfillment status ──────────────────

    if (status === "shipped") {
      const fulfillmentOrders = await fetchFulfillmentOrders(order.gid, adminToken);
      const openFO = fulfillmentOrders.find(fo => fo.status === "OPEN" || fo.status === "IN_PROGRESS");
      if (openFO) {
        await createFulfillment(openFO.id, tracking_number, tracking_url, adminToken);
      } else {
        console.log("[mosaic-webhook] No open fulfillment order — already fulfilled or nothing to fulfil");
      }
    }

    if (status === "delivered") {
      const fulfillments = await fetchFulfillments(order.gid, adminToken);
      const activeFulfillment = fulfillments.find(f => f.status === "SUCCESS");
      if (activeFulfillment) {
        await createFulfillmentEvent(activeFulfillment.id, "DELIVERED", adminToken);
      } else {
        console.log("[mosaic-webhook] No active fulfillment found to mark delivered");
      }
    }

    if (status === "cancelled" || status === "order_rto") {
      // Cancel any in-progress fulfillments first, then cancel the order itself
      const fulfillmentOrders = await fetchFulfillmentOrders(order.gid, adminToken);
      for (const fo of fulfillmentOrders) {
        if (fo.status === "IN_PROGRESS") {
          await cancelFulfillment(fo.id, adminToken);
        }
      }
      await cancelShopifyOrder(order.id, reason ?? (status === "order_rto" ? "customer" : undefined), adminToken);
    }

    if (status === "refunded") {
      const mosaicOrders = (order.metafieldValue?.mosaicOrders ?? []) as Array<{ brand: string; order_id: string; items: Array<{ sku: string | null; title: string }> }>;
      const brandEntry   = mosaicOrders.find(o => o.order_id === mosaic_order_id);
      await refundShopifyOrder(order.id, brandEntry?.items ?? [], adminToken);
    }

    // refunded also updates metafield below — Shopify refund handles the financial status

    // ── Update metafield ───────────────────────────────────

    const metafield = order.metafieldValue ?? { mosaicOrders: [], items: [] };
    const mosaicOrders = (metafield.mosaicOrders as Array<Record<string, unknown>>) ?? [];

    const brandEntry = mosaicOrders.find(o => o.order_id === mosaic_order_id);
    if (brandEntry) {
      brandEntry.status = status;
      if (tracking_number) brandEntry.tracking_number = tracking_number;
      if (tracking_url)    brandEntry.tracking_url    = tracking_url;
      if (reason)          brandEntry.reason          = reason;
    }

    await writeOrderMetafield(order.id, JSON.stringify(metafield), adminToken);

    console.log(`[mosaic-webhook] Order ${order.id} — ${brand} ${mosaic_order_id} → ${status}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[mosaic-webhook] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
