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

  const handle = req.nextUrl.searchParams.get("handle");
  if (!handle) return NextResponse.json({ error: "Missing ?handle=" }, { status: 400 });

  try {
    const token = await getAdminToken();
    const res = await fetch(ADMIN_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({
        query: `query($handle: String!) {
          productByHandle(handle: $handle) {
            id title status vendor handle productType descriptionHtml
            options { name values }
            variants(first: 5) {
              nodes {
                id sku price inventoryPolicy title
                selectedOptions { name value }
                inventoryItem { tracked inventoryLevels(first: 3) { nodes { quantities(names: ["available","on_hand","committed"]) { name quantity } } } }
              }
            }
          }
        }`,
        variables: { handle },
      }),
    });
    const data = await res.json();
    return NextResponse.json({ ok: true, product: data?.data?.productByHandle ?? null, raw: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
