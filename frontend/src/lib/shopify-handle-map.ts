/**
 * Maps internal product slugs to their exact Shopify product handles.
 * After the CSV import, all 8 catalog products have handles that match
 * their frontend slugs exactly — no remapping needed.
 * The resolveVariantId fallback (slug as handle) handles all of them.
 *
 * Add entries here only if a slug differs from its Shopify handle.
 */
export const shopifyHandleMap: Record<string, string> = {};
