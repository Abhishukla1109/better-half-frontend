import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/shopify/api";
import { isShopifyConfigured } from "@/lib/shopify/client";

/**
 * GET /api/shopify/products
 *
 * Dev utility — lists every product in the Shopify store with its handle,
 * price, and availability. Use this to verify what handles actually exist
 * so you can update shopify-handle-map.ts accordingly.
 *
 * Usage:
 *   curl http://localhost:3000/api/shopify/products
 *   fetch('/api/shopify/products').then(r => r.json()).then(console.log)
 */
export async function GET() {
  if (!isShopifyConfigured()) {
    return NextResponse.json(
      { error: "Shopify not configured. Add NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN to .env.local." },
      { status: 503 },
    );
  }

  try {
    const products = await getAllProducts(50);
    const summary = products.map((p) => ({
      handle: p.handle,
      title: p.title,
      vendor: p.vendor,
      price: p.price,
      availableVariants: p.variants.filter((v) => v.availableForSale).length,
      totalVariants: p.variants.length,
      firstVariantId: p.variants[0]?.id ?? null,
    }));

    return NextResponse.json({ count: summary.length, products: summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
