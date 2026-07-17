import { type NextRequest, NextResponse } from "next/server";
import type { EnrichedPDP } from "@/data/enrichedProducts";

export const revalidate = 3600;

const SHOP = (process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "").replace(/\/$/, "").replace("https://", "");
const SF_TOKEN = process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN ?? "";
const SF_ENDPOINT = `https://${SHOP}/api/2024-01/graphql.json`;

const BRAND_API: Record<string, string> = {
  "Man Matters":  "https://api.manmatters.com/portal/page/mwsc/widgetised/product",
  "Be Bodywise":  "https://api.bebodywise.com/portal/page/mwsc/widgetised/product",
  "Little Joys":  "https://api.ourlittlejoys.com/portal/page/mwsc/widgetised/product",
};

const QUERY = `
  query GetPDP($handle: String!) {
    productByHandle(handle: $handle) {
      handle
      title
      vendor
      variants(first: 20) { edges { node { title priceV2 { amount } } } }
      images(first: 10) { nodes { url } }
      metafields(identifiers: [
        { namespace: "custom", key: "bh_subtitle" }
        { namespace: "custom", key: "bh_how_to_use" }
        { namespace: "custom", key: "bh_faqs" }
        { namespace: "custom", key: "bh_ingredients" }
        { namespace: "custom", key: "bh_timeline" }
        { namespace: "custom", key: "bh_for_with" }
        { namespace: "custom", key: "bh_badges" }
        { namespace: "custom", key: "bh_reviews" }
        { namespace: "custom", key: "bh_product_details" }
        { namespace: "custom", key: "bh_packs" }
        { namespace: "custom", key: "bh_disclaimers" }
        { namespace: "custom", key: "bh_additional_info" }
        { namespace: "custom", key: "bh_age_group" }
        { namespace: "custom", key: "bh_allergens" }
        { namespace: "custom", key: "bh_product_type" }
        { namespace: "custom", key: "bh_benefits" }
        { namespace: "custom", key: "bh_full_ingredients" }
        { namespace: "custom", key: "bh_siblings" }
        { namespace: "custom", key: "bh_recommendation" }
      ]) { key value }
    }
  }
`;

type MFNode = { key: string; value: string | null };

function json<T>(nodes: MFNode[], key: string): T | null {
  const v = nodes.find((n) => n.key === key)?.value;
  if (!v) return null;
  try { return JSON.parse(v) as T; } catch { return null; }
}

function text(nodes: MFNode[], key: string): string | null {
  return nodes.find((n) => n.key === key)?.value ?? null;
}

async function fetchBrandRating(vendor: string, handle: string): Promise<{ average: number | null; count: number | null }> {
  const base = BRAND_API[vendor];
  if (!base) return { average: null, count: null };
  try {
    const res = await fetch(`${base}/${handle}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { average: null, count: null };
    const data = await res.json() as { data?: { productInfo?: { rating?: string; reviews?: string } } };
    const pi = data?.data?.productInfo;
    const average = pi?.rating ? parseFloat(pi.rating) : null;
    // reviews come as "1K", "3K" etc — convert to number
    const rawCount = pi?.reviews ?? "";
    const count = rawCount.endsWith("K")
      ? Math.round(parseFloat(rawCount) * 1000)
      : rawCount ? parseInt(rawCount, 10) : null;
    return { average: isNaN(average ?? NaN) ? null : average, count: isNaN(count ?? NaN) ? null : count };
  } catch {
    return { average: null, count: null };
  }
}

export async function GET(req: NextRequest) {
  const handle       = req.nextUrl.searchParams.get("handle");
  const variantTitle = req.nextUrl.searchParams.get("variant");
  if (!handle) return NextResponse.json(null, { status: 400 });

  try {
    const [shopifyRes, ] = await Promise.all([
      fetch(SF_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Shopify-Storefront-Private-Token": SF_TOKEN,
        },
        body: JSON.stringify({ query: QUERY, variables: { handle } }),
      }),
    ]);

    const data = await shopifyRes.json();
    const p = data?.data?.productByHandle;
    if (!p) return NextResponse.json(null);

    const mf: MFNode[] = (p.metafields ?? []).filter(Boolean);

    const allVariants = p.variants?.edges ?? [];
    const matchedVariant = variantTitle
      ? allVariants.find((e: { node: { title: string } }) => e.node.title === variantTitle)
      : allVariants[0];
    const rawPrice = matchedVariant?.node?.priceV2?.amount ?? allVariants[0]?.node?.priceV2?.amount;
    const price = rawPrice ? Math.round(parseFloat(rawPrice)) : undefined;

    // Fetch live rating from brand API in parallel with Shopify
    const rating = await fetchBrandRating(p.vendor ?? "", handle);

    const enriched: EnrichedPDP = {
      slug:            handle,
      sourceId:        "",
      brand:           p.vendor ?? "",
      name:            p.title ?? "",
      price,
      subtitle:        text(mf, "bh_subtitle") ?? "",
      metaDescription: "",
      rating,
      images:          (p.images?.nodes ?? []).map((i: { url: string }) => i.url),
      heroVideo:       null,
      packs:           json(mf, "bh_packs")           ?? [],
      badges:          json(mf, "bh_badges")          ?? [],
      ingredients:     json(mf, "bh_ingredients")     ?? [],
      productDetails:  json(mf, "bh_product_details") ?? { description: [], details: [] },
      howToUse:        text(mf, "bh_how_to_use")      ?? "",
      timeline:        json(mf, "bh_timeline")        ?? [],
      faqs:            json(mf, "bh_faqs")            ?? [],
      reviews:         json(mf, "bh_reviews")         ?? [],
      disclaimers:     json(mf, "bh_disclaimers")     ?? [],
      worksBestWith:   [],
      additionalInfo:  json(mf, "bh_additional_info") ?? [],
      forWith:         json(mf, "bh_for_with")        ?? undefined,
      ageGroup:        text(mf, "bh_age_group")       ?? undefined,
      allergens:       json(mf, "bh_allergens")       ?? undefined,
      productType:     text(mf, "bh_product_type")    ?? undefined,
      benefits:        json(mf, "bh_benefits")        ?? undefined,
      fullIngredientsList: text(mf, "bh_full_ingredients") ?? undefined,
      siblings:        json(mf, "bh_siblings")        ?? undefined,
      recommendation:  text(mf, "bh_recommendation") ?? undefined,
    };

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("[pdp] error:", err);
    return NextResponse.json(null, { status: 500 });
  }
}
