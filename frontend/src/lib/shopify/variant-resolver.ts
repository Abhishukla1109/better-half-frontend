/**
 * Resolves a local product slug to a live Shopify variant GID.
 * Calls the /api/shopify/variant route so the private Storefront token
 * stays server-side and never reaches the browser.
 */
export async function resolveVariantId(slug: string): Promise<string | null> {
  try {
    const res = await fetch(
      `/api/shopify/variant?slug=${encodeURIComponent(slug)}`,
    );
    if (!res.ok) return null;
    const { variantId } = await res.json() as { variantId: string | null };
    return variantId ?? null;
  } catch {
    return null;
  }
}
