import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

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

interface RawOrder {
  id: string;
  legacyResourceId: string;
  name: string;
  createdAt: string;
  displayFulfillmentStatus: string;
  metafield: { value: string } | null;
}

async function findStuckOrders(token: string): Promise<Array<{
  order: string; id: string; createdAt: string; fulfillmentStatus: string;
  deliveredBrandOrders: Array<{ brand: string; order_id: string; status: string }>;
}>> {
  const stuck: Array<{
    order: string; id: string; createdAt: string; fulfillmentStatus: string;
    deliveredBrandOrders: Array<{ brand: string; order_id: string; status: string }>;
  }> = [];

  let cursor: string | null = null;
  do {
    const res = await fetch(ADMIN_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({
        query: `query($after: String) {
          orders(first: 100, after: $after, query: "status:any fulfillment_status:unfulfilled") {
            nodes {
              id
              legacyResourceId
              name
              createdAt
              displayFulfillmentStatus
              metafield(namespace: "custom", key: "mosaic_orders") { value }
            }
            pageInfo { hasNextPage endCursor }
          }
        }`,
        variables: { after: cursor },
      }),
    });
    const data = await res.json() as {
      data: { orders: { nodes: RawOrder[]; pageInfo: { hasNextPage: boolean; endCursor: string } } };
      errors?: unknown;
    };

    if (!data.data) {
      throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
    }

    for (const o of data.data.orders.nodes) {
      if (!o.metafield?.value) continue;
      let parsed: { mosaicOrders?: Array<{ brand: string; order_id: string; status: string }> };
      try {
        parsed = JSON.parse(o.metafield.value);
      } catch {
        continue;
      }
      const deliveredEntries = (parsed.mosaicOrders ?? []).filter(e => e.status === "delivered");
      if (deliveredEntries.length > 0) {
        stuck.push({
          order: o.name,
          id: o.legacyResourceId,
          createdAt: o.createdAt,
          fulfillmentStatus: o.displayFulfillmentStatus,
          deliveredBrandOrders: deliveredEntries,
        });
      }
    }

    cursor = data.data.orders.pageInfo.hasNextPage ? data.data.orders.pageInfo.endCursor : null;
  } while (cursor);

  return stuck;
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
    const token = await getAdminToken();
    const stuck = await findStuckOrders(token);
    return NextResponse.json({ ok: true, count: stuck.length, orders: stuck });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
