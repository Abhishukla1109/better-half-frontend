import { NextRequest, NextResponse } from "next/server";

const SHOP          = (process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "").replace(/\/$/, "").replace("https://", "");
const CLIENT_ID     = process.env.SHOPIFY_ADMIN_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.SHOPIFY_ADMIN_CLIENT_SECRET ?? "";

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

// Check if any Shopify order in the last 30 minutes was placed for this cart ID.
// GoKwik creates orders via Admin API and writes cartId to note_attributes.
export async function GET(req: NextRequest) {
  const cartId = req.nextUrl.searchParams.get("cartId");
  if (!cartId) return NextResponse.json({ ordered: false });

  const adminToken = await getAdminToken();
  if (!adminToken) return NextResponse.json({ ordered: false });

  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  try {
    const res = await fetch(
      `https://${SHOP}/admin/api/2024-01/orders.json?status=any&created_at_min=${encodeURIComponent(since)}&fields=id,note_attributes`,
      { headers: { "X-Shopify-Access-Token": adminToken } },
    );
    const data = await res.json() as { orders?: Array<{ note_attributes: Array<{ name: string; value: string }> }> };
    const ordered = (data.orders ?? []).some(order =>
      (order.note_attributes ?? []).some(a => a.name === "cartId" && a.value === cartId)
    );
    return NextResponse.json({ ordered });
  } catch {
    return NextResponse.json({ ordered: false });
  }
}
