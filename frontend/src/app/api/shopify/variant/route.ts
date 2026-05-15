import { NextRequest, NextResponse } from "next/server";
import { shopifyHandleMap } from "@/lib/shopify-handle-map";
import { knownHandles } from "@/lib/ai/product-handles";
import { getProductByHandle } from "@/lib/shopify/api";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ variantId: null });

  const handle = shopifyHandleMap[slug] ?? knownHandles[slug] ?? slug;

  try {
    const product = await getProductByHandle(handle);
    if (!product || product.variants.length === 0) {
      return NextResponse.json({ variantId: null });
    }
    const variant =
      product.variants.find((v) => v.availableForSale) ?? product.variants[0];
    return NextResponse.json({ variantId: variant?.id ?? null });
  } catch {
    return NextResponse.json({ variantId: null });
  }
}
