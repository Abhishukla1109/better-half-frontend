import { type NextRequest, NextResponse } from "next/server";
import type { EnrichedPDP } from "@/data/enrichedProducts";

const SHOP = (process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "").replace(/\/$/, "").replace("https://", "");
const SF_TOKEN = process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN ?? "";
const SF_ENDPOINT = `https://${SHOP}/api/2024-01/graphql.json`;

const QUERY = `
  query GetPDP($handle: String!) {
    productByHandle(handle: $handle) {
      handle
      title
      vendor
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

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  if (!handle) return NextResponse.json(null, { status: 400 });

  try {
    const res = await fetch(SF_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Shopify-Storefront-Private-Token": SF_TOKEN,
      },
      body: JSON.stringify({ query: QUERY, variables: { handle } }),
      next: { revalidate: 3600 },
    });

    const data = await res.json();
    const p = data?.data?.productByHandle;
    if (!p) return NextResponse.json(null);

    const mf: MFNode[] = p.metafields ?? [];

    const enriched: EnrichedPDP = {
      slug:            handle,
      sourceId:        "",
      brand:           p.vendor ?? "",
      name:            p.title ?? "",
      subtitle:        text(mf, "bh_subtitle") ?? "",
      metaDescription: "",
      rating:          { average: null, count: null },
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
    };

    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json(null, { status: 500 });
  }
}
