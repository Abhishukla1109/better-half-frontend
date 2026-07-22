import { NextRequest, NextResponse } from "next/server";

const MOSAIC_WEBHOOK_SECRET = process.env.MOSAIC_WEBHOOK_SECRET ?? "";
const SHOP          = (process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "").replace(/\/$/, "").replace("https://", "");
const CLIENT_ID     = process.env.SHOPIFY_ADMIN_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.SHOPIFY_ADMIN_CLIENT_SECRET ?? "";

const BRAND_CODE: Record<string, string> = { "Man Matters": "MM", "Be Bodywise": "BW", "Little Joys": "LJ" };

type OrderStatus = "shipped" | "delivered" | "cancelled" | "refunded";

interface MosaicWebhookPayload {
  brand:           string;
  mosaic_order_id: string;
  status:          OrderStatus;
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

async function findOrderByTag(
  tag: string,
  adminToken: string,
): Promise<{ id: number; metafieldValue: Record<string, unknown> | null } | null> {
  const res = await fetch(`https://${SHOP}/admin/api/2024-01/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": adminToken },
    body: JSON.stringify({
      query: `
        query($query: String!) {
          orders(first: 1, query: $query) {
            edges {
              node {
                legacyResourceId
                metafield(namespace: "custom", key: "mosaic_orders") { value }
              }
            }
          }
        }
      `,
      variables: { query: `tag:${tag}` },
    }),
  });
  const data = await res.json() as {
    data?: {
      orders?: {
        edges?: Array<{
          node: { legacyResourceId: string; metafield?: { value: string } | null }
        }>
      }
    }
  };
  const node = data?.data?.orders?.edges?.[0]?.node;
  if (!node) return null;
  let metafieldValue: Record<string, unknown> | null = null;
  try { metafieldValue = node.metafield?.value ? JSON.parse(node.metafield.value) : null; } catch {}
  return { id: parseInt(node.legacyResourceId), metafieldValue };
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
  if (errs.length > 0) console.error("[mosaic-webhook] metafield write errors:", errs);
  else console.log("[mosaic-webhook] metafield updated for order", orderId);
}

// ── Route ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  console.log("[mosaic-webhook] received POST");

  // Verify secret
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

    // Update the matching brand entry in the metafield
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

    // TODO: notify Affluence on cancellation/refund once Affluence shares their update API

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[mosaic-webhook] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
