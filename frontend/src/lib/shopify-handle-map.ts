// Maps catalog product IDs → Shopify handles when they don't match exactly.
// After the June 2026 full-catalog Shopify reimport, every catalog product ID
// is now its own Shopify handle — no overrides needed.
// Add entries here only for genuinely mismatched IDs in future imports.
export const shopifyHandleMap: Record<string, string> = {};
