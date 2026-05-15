import { NextResponse } from "next/server";
import { getProductByHandle } from "@/lib/shopify/api";
import { isShopifyConfigured } from "@/lib/shopify/client";

// The 8 catalog products — handles now match slugs directly after CSV import
const CATALOG_HANDLES = [
  "biotin-zinc-hair",
  "iron-vitamin-c",
  "ashwagandha-ksm66",
  "magnesium-b6",
  "daily-probiotics",
  "whey-protein-isolate",
  "creatine-monohydrate",
  "kids-multivitamin-gummies",
];

export async function GET() {
  if (!isShopifyConfigured()) {
    return NextResponse.json(
      { error: "Shopify not configured. Add NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN to .env.local." },
      { status: 503 },
    );
  }

  const results = await Promise.all(
    CATALOG_HANDLES.map(async (handle) => {
      try {
        const product = await getProductByHandle(handle);
        if (!product) {
          return { handle, status: "not_found" as const, fix: `No product with handle "${handle}" — re-import the CSV or create it manually in Shopify` };
        }

        const availableVariant = product.variants.find((v) => v.availableForSale);
        if (!availableVariant) {
          return {
            handle, status: "out_of_stock" as const,
            productTitle: product.title,
            note: "Product exists but no variants are available for sale",
          };
        }

        return {
          handle, status: "ok" as const,
          productTitle: product.title,
          variantCount: product.variants.length,
          firstVariantId: availableVariant.id,
          price: availableVariant.price,
        };
      } catch (err) {
        return {
          handle, status: "error" as const,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );

  const ok = results.filter((r) => r.status === "ok");
  const broken = results.filter((r) => r.status !== "ok");

  return NextResponse.json({
    summary: { total: results.length, working: ok.length, broken: broken.length },
    results,
  });
}
