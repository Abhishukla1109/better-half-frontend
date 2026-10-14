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
  legacyResourceId: string;
  createdAt: string;
  displayFinancialStatus: string;
  customAttributes: Array<{ key: string; value: string }>;
}

function csvEscape(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export async function GET(req: NextRequest) {
  const auth          = req.headers.get("authorization") ?? "";
  const serviceHeader = req.headers.get("x-service-secret") ?? "";
  const fromCron      = CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
  const fromManual    = SERVICE_SECRET && serviceHeader === SERVICE_SECRET;
  if (!fromCron && !fromManual) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const token = await getAdminToken();
    const rows: string[][] = [];

    let cursor: string | null = null;
    do {
      const res = await fetch(ADMIN_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
        body: JSON.stringify({
          query: `query($after: String) {
            orders(first: 250, after: $after, query: "status:any", sortKey: CREATED_AT, reverse: false) {
              nodes {
                name legacyResourceId createdAt displayFinancialStatus
                customAttributes { key value }
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
        const pick = (k: string) => o.customAttributes.find(a => a.key === k)?.value ?? "";
        rows.push([
          o.name,
          o.legacyResourceId,
          o.createdAt,
          o.displayFinancialStatus,
          pick("Payment_Provider_Name"),
          pick("Payment_Provider_Payment_ID"),
          pick("Payment_Reference_ID"),
          pick("GoKwik_Payment_ID"),
        ]);
      }

      cursor = data.data.orders.pageInfo.hasNextPage ? data.data.orders.pageInfo.endCursor : null;
    } while (cursor);

    const header = [
      "shopify_order", "shopify_order_id", "created_at", "financial_status",
      "payment_provider_name", "payment_provider_payment_id", "payment_reference_id", "gokwik_payment_id",
    ];
    const csvLines = [header, ...rows].map(r => r.map(csvEscape).join(",")).join("\n");

    return new NextResponse(csvLines, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=order_payments.csv",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
