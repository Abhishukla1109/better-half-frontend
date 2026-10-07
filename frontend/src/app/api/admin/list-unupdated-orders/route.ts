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
  name: string;
  createdAt: string;
  cancelledAt: string | null;
  metafield: { value: string } | null;
}

interface MosaicOrderEntry {
  brand: string;
  code: string;
  order_id: string;
  status?: string;
}

export async function GET(req: NextRequest) {
  const auth          = req.headers.get("authorization") ?? "";
  const serviceHeader = req.headers.get("x-service-secret") ?? "";
  const fromCron      = CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
  const fromManual    = SERVICE_SECRET && serviceHeader === SERVICE_SECRET;
  if (!fromCron && !fromManual) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const token = await getAdminToken();
    const byBrand: Record<string, Array<{ order_id: string; shopifyOrder: string; createdAt: string; cancelled: boolean }>> = {};

    let cursor: string | null = null;
    let totalOrders = 0;
    do {
      const res = await fetch(ADMIN_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
        body: JSON.stringify({
          query: `query($after: String) {
            orders(first: 250, after: $after, query: "status:any", sortKey: CREATED_AT, reverse: true) {
              nodes {
                name createdAt cancelledAt
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
      if (!data.data) throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);

      for (const o of data.data.orders.nodes) {
        totalOrders++;
        if (!o.metafield?.value) continue;
        let parsed: { mosaicOrders?: MosaicOrderEntry[] };
        try { parsed = JSON.parse(o.metafield.value); } catch { continue; }
        for (const entry of parsed.mosaicOrders ?? []) {
          if (entry.status) continue; // already has a status update — not stuck
          if (!entry.brand || !entry.order_id) continue;
          if (!byBrand[entry.brand]) byBrand[entry.brand] = [];
          byBrand[entry.brand].push({
            order_id: entry.order_id,
            shopifyOrder: o.name,
            createdAt: o.createdAt,
            cancelled: !!o.cancelledAt,
          });
        }
      }

      cursor = data.data.orders.pageInfo.hasNextPage ? data.data.orders.pageInfo.endCursor : null;
    } while (cursor);

    const summary: Record<string, number> = {};
    for (const brand of Object.keys(byBrand)) summary[brand] = byBrand[brand].length;

    return NextResponse.json({
      ok: true,
      totalOrdersScanned: totalOrders,
      summary,
      byBrand,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
