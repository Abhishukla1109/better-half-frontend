/* ──────────────────────────────────────────────────────────────
   Maps protocolEngine product IDs → real Shopify handles
   from the imported CSV (betterhalf-4.myshopify.com)
   ────────────────────────────────────────────────────────────── */

const base = () =>
  (process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "").replace(/\/$/, "");

export const knownHandles: Record<string, string> = {
  // Be Bodywise — confirmed from CSV import
  "bb-biotin": "hair-health-gummies-bb",
  "bb-hair-serum": "hair-health-gummies-bb",
  "bb-keratin-shampoo": "hair-health-gummies-bb",
  "bb-postpreg-hair": "hair-health-gummies-bb",
  "bb-magnesium": "magnesium-gummies-moms-bb",
  "bb-multivitamin": "multivitamin-gummies-mothers",
  "bb-collagen": "multivitamin-gummies-mothers",

  // Little Joys — confirmed from CSV import
  "lj-mom-multivitamin": "multivitamin-gummies-mothers",
  "lj-mom-magnesium": "magnesium-gummies-moms-bb",
  "lj-mom-hair": "hair-health-gummies-bb",
  "lj-mom-calcium": "multivitamin-gummies-mothers",
  "lj-mom-kit": "magnesium-gummies-moms-bb",
  "lj-kids-multivitamin": "multivitamin-gummies",
  "lj-nutrimix": "nutrimix-nutrition-powder",

  // Man Matters — best-effort estimates (no confirmed handle from CSV)
  // Falls through to store URL if not matched
};

/**
 * Returns the full Shopify product URL for a product ID.
 * Falls back to the store homepage for Man Matters or unknown products.
 */
export function getProductShopifyUrl(productId: string): string {
  const handle = knownHandles[productId];
  if (handle) return `${base()}/products/${handle}`;
  return base(); // store homepage — better than a 404
}
