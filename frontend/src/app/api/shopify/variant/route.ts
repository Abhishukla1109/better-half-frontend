import { NextRequest, NextResponse } from "next/server";
import { shopifyHandleMap } from "@/lib/shopify-handle-map";
import { knownHandles } from "@/lib/ai/product-handles";
import { getProductByHandle } from "@/lib/shopify/api";

const SHOP = (process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "").replace(/\/$/, "").replace("https://", "");
const CLIENT_ID = process.env.SHOPIFY_ADMIN_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.SHOPIFY_ADMIN_CLIENT_SECRET ?? "";

async function getAdminVariantId(handle: string): Promise<string | null> {
  try {
    const tokenRes = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "client_credentials" }),
    });
    const { access_token } = await tokenRes.json() as { access_token?: string };
    if (!access_token) return null;

    const res = await fetch(
      `https://${SHOP}/admin/api/2024-01/products.json?handle=${handle}&fields=id`,
      { headers: { "X-Shopify-Access-Token": access_token } },
    );
    const data = await res.json() as { products?: Array<{ id: number }> };
    const productId = data.products?.[0]?.id;
    if (!productId) return null;

    const varRes = await fetch(
      `https://${SHOP}/admin/api/2024-01/products/${productId}/variants.json?fields=id`,
      { headers: { "X-Shopify-Access-Token": access_token } },
    );
    const varData = await varRes.json() as { variants?: Array<{ id: number }> };
    const variantId = varData.variants?.[0]?.id;
    return variantId ? `gid://shopify/ProductVariant/${variantId}` : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ variantId: null });

  const handle = shopifyHandleMap[slug] ?? knownHandles[slug] ?? slug;

  try {
    const product = await getProductByHandle(handle);
    if (product && product.variants.length > 0) {
      const variant = product.variants.find((v) => v.availableForSale) ?? product.variants[0];
      if (variant?.id) return NextResponse.json({ variantId: variant.id });
    }
  } catch { /* fall through to Admin API */ }

  // Storefront API returned nothing — product not published to headless channel.
  // Fall back to Admin API which sees all active products regardless of channel.
  const variantId = await getAdminVariantId(handle);
  return NextResponse.json({ variantId });
}
