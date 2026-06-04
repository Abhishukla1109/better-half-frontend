import { NextResponse } from "next/server";
import { fetchCatalogProducts } from "@/lib/shopify/fetchCatalogProducts";

// Cache for 1 hour — products don't change by the minute
export const revalidate = 3600;

export async function GET() {
  try {
    const products = await fetchCatalogProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error("[/api/catalog] Failed to fetch products from Shopify:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
