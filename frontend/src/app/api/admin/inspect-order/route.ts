import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const SHOP           = (process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "").replace(/\/$/, "").replace("https://", "");
const CLIENT_ID      = process.env.SHOPIFY_ADMIN_CLIENT_ID ?? "";
const CLIENT_SECRET  = process.env.SHOPIFY_ADMIN_CLIENT_SECRET ?? "";
const ADMIN_API      = `https://${SHOP}/admin/api/2024-01/graphql.json`;
const CRON_SECRET    = process.env.CRON_SECRET ?? "";
const SERVICE_SECRET = process.env.MOSAIC_SERVICE_SECRET ?? "";

async function getAdminToken(): Promise<string> {
  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "client_credentials" }),
  });
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export async function GET(req: NextRequest) {
  const auth          = req.headers.get("authorization") ?? "";
  const serviceHeader = req.headers.get("x-service-secret") ?? "";
  const fromCron      = CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
  const fromManual    = SERVICE_SECRET && serviceHeader === SERVICE_SECRET;

  if (!fromCron && !fromManual) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing ?id=" }, { status: 400 });

  try {
    const token = await getAdminToken();
    const gid = `gid://shopify/Order/${id}`;

    const res = await fetch(ADMIN_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({
        query: `query($id: ID!) {
          order(id: $id) {
            id legacyResourceId name createdAt cancelledAt cancelReason
            displayFinancialStatus displayFulfillmentStatus
            tags
            note
            customAttributes { key value }
            metafield(namespace: "custom", key: "mosaic_orders") { value }
            lineItems(first: 20) {
              nodes {
                title sku quantity
                originalUnitPriceSet { shopMoney { amount } }
                product { id handle vendor }
              }
            }
            shippingAddress { address1 city provinceCode zip phone }
            customer { id numberOfOrders }
          }
        }`,
        variables: { id: gid },
      }),
    });
    const data = await res.json() as { data?: { order?: unknown }; errors?: unknown };
    if (!data.data?.order) {
      return NextResponse.json({ ok: false, error: "Order not found", raw: data }, { status: 404 });
    }

    return NextResponse.json({ ok: true, order: data.data.order });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
