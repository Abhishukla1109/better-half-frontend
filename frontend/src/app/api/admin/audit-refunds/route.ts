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
  displayFinancialStatus: string;
  metafield: { value: string } | null;
  transactions: Array<{ kind: string; status: string }>;
  refunds: Array<{ id: string; totalRefundedSet: { shopMoney: { amount: string } } }>;
}

interface MosaicOrderEntry { brand: string; code: string; order_id: string; status?: string; }

const REFUND_TRIGGER_STATUSES = new Set(["cancelled", "order_rto", "refunded"]);

export async function GET(req: NextRequest) {
  const auth          = req.headers.get("authorization") ?? "";
  const serviceHeader = req.headers.get("x-service-secret") ?? "";
  const fromCron      = CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
  const fromManual    = SERVICE_SECRET && serviceHeader === SERVICE_SECRET;
  if (!fromCron && !fromManual) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const token = await getAdminToken();
    const problems: Array<{
      shopifyOrder: string; createdAt: string; brand: string; order_id: string; mosaicStatus: string;
      shopifyCancelled: boolean; financialStatus: string; wasPrepaid: boolean; hasRefund: boolean; issue: string;
    }> = [];
    let flaggedCount = 0;
    let totalChecked = 0;

    let cursor: string | null = null;
    do {
      const res = await fetch(ADMIN_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
        body: JSON.stringify({
          query: `query($after: String) {
            orders(first: 250, after: $after, query: "status:any", sortKey: CREATED_AT, reverse: true) {
              nodes {
                name createdAt cancelledAt displayFinancialStatus
                metafield(namespace: "custom", key: "mosaic_orders") { value }
                transactions(first: 10) { kind status }
                refunds { id totalRefundedSet { shopMoney { amount } } }
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
        if (!o.metafield?.value) continue;
        let parsed: { mosaicOrders?: MosaicOrderEntry[] };
        try { parsed = JSON.parse(o.metafield.value); } catch { continue; }

        for (const entry of parsed.mosaicOrders ?? []) {
          if (!entry.status || !REFUND_TRIGGER_STATUSES.has(entry.status)) continue;
          totalChecked++;

          const wasPrepaid = o.transactions.some(t => t.kind === "CAPTURE" && t.status === "SUCCESS");
          const hasRefund  = o.refunds.length > 0;
          const shopifyCancelled = !!o.cancelledAt;

          let issue = "";
          if (!shopifyCancelled) issue = "Mosaic says cancelled/RTO/refunded but Shopify order is NOT cancelled";
          else if (wasPrepaid && !hasRefund) issue = "Prepaid order cancelled but NO refund issued on Shopify";

          if (issue) {
            flaggedCount++;
            problems.push({
              shopifyOrder: o.name, createdAt: o.createdAt, brand: entry.brand, order_id: entry.order_id,
              mosaicStatus: entry.status, shopifyCancelled, financialStatus: o.displayFinancialStatus,
              wasPrepaid, hasRefund, issue,
            });
          }
        }
      }

      cursor = data.data.orders.pageInfo.hasNextPage ? data.data.orders.pageInfo.endCursor : null;
    } while (cursor);

    return NextResponse.json({ ok: true, totalChecked, flaggedCount, problems });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
