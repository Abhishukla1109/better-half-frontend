/* ──────────────────────────────────────────────────────────────
   Fallback URL resolver for any product ID that doesn't carry
   its own `url` field (MM products now carry url directly).
   ────────────────────────────────────────────────────────────── */

const base = () =>
  (process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "").replace(/\/$/, "");

// Empty map kept for API route compatibility — BB/LJ handles removed with the old catalog
export const knownHandles: Record<string, string> = {};

export function getProductShopifyUrl(productId: string): string {
  // MM products carry url directly — this only fires for legacy IDs
  return base() || `https://manmatters.com/${productId}`;
}
