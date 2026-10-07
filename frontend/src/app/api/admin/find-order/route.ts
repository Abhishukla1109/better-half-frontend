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
  if (!fromCron && !fromManual) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ error: "Missing ?q=" }, { status: 400 });

  try {
    const token = await getAdminToken();
    const res = await fetch(ADMIN_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({
        query: `query($q: String!) {
          orders(first: 10, query: $q) {
            nodes {
              id legacyResourceId name createdAt cancelledAt cancelReason
              displayFinancialStatus displayFulfillmentStatus tags
              metafield(namespace: "custom", key: "mosaic_orders") { value }
              transactions(first: 10) {
                id kind status gateway createdAt
                amountSet { shopMoney { amount currencyCode } }
              }
              refunds {
                id createdAt
                totalRefundedSet { shopMoney { amount currencyCode } }
              }
            }
          }
        }`,
        variables: { q },
      }),
    });
    const data = await res.json();
    return NextResponse.json({ ok: true, orders: data?.data?.orders?.nodes ?? [], raw: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
