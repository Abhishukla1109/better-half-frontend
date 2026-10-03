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
  cancelledAt: string | null;
  cancelReason: string | null;
  tags: string[];
  metafield: { value: string } | null;
  lineItems: { nodes: Array<{ title: string; sku: string | null; product: { vendor: string } | null }> };
  shippingAddress: { provinceCode: string; zip: string; phone: string | null } | null;
}

export async function GET(req: NextRequest) {
  const auth          = req.headers.get("authorization") ?? "";
  const serviceHeader = req.headers.get("x-service-secret") ?? "";
  const fromCron      = CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
  const fromManual    = SERVICE_SECRET && serviceHeader === SERVICE_SECRET;

  if (!fromCron && !fromManual) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const daysBack = Number(req.nextUrl.searchParams.get("days") ?? "10");
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

  try {
    const token = await getAdminToken();
    const results: Array<{
      order: string; id: string; createdAt: string; cancelledAt: string | null;
      failedBrands: unknown; failedAt: unknown;
      items: Array<{ title: string; sku: string | null; vendor: string | null }>;
      shippingAddress: unknown;
    }> = [];

    let cursor: string | null = null;
    do {
      const res = await fetch(ADMIN_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
        body: JSON.stringify({
          query: `query($after: String, $q: String!) {
            orders(first: 100, after: $after, query: $q, sortKey: CREATED_AT, reverse: true) {
              nodes {
                id legacyResourceId name createdAt cancelledAt cancelReason
                tags
                metafield(namespace: "custom", key: "mosaic_orders") { value }
                lineItems(first: 10) { nodes { title sku product { vendor } } }
                shippingAddress { provinceCode zip phone }
              }
              pageInfo { hasNextPage endCursor }
            }
          }`,
          variables: { after: cursor, q: `status:cancelled created_at:>=${since}` },
        }),
      });
      const data = await res.json() as {
        data: { orders: { nodes: RawOrder[]; pageInfo: { hasNextPage: boolean; endCursor: string } } };
        errors?: unknown;
      };
      if (!data.data) throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);

      for (const o of data.data.orders.nodes) {
        if (!o.metafield?.value) continue;
        let parsed: { failed?: boolean; failedBrands?: unknown; failedAt?: unknown };
        try { parsed = JSON.parse(o.metafield.value); } catch { continue; }
        if (!parsed.failed) continue;

        results.push({
          order: o.name,
          id: o.legacyResourceId,
          createdAt: o.createdAt,
          cancelledAt: o.cancelledAt,
          failedBrands: parsed.failedBrands,
          failedAt: parsed.failedAt,
          items: o.lineItems.nodes.map(li => ({ title: li.title, sku: li.sku, vendor: li.product?.vendor ?? null })),
          shippingAddress: o.shippingAddress,
        });
      }

      cursor = data.data.orders.pageInfo.hasNextPage ? data.data.orders.pageInfo.endCursor : null;
    } while (cursor);

    return NextResponse.json({ ok: true, since, count: results.length, orders: results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
