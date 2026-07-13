// Shopify Storefront API — server-side only.
// All calls go through Next.js API routes — this file never runs in the browser.

const storeUrl = (process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "").replace(/\/$/, "");
const storefrontToken = process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN ?? "";
const API_VERSION = "2025-01";

/** True when both the store URL and private Storefront token are set. */
export function isShopifyConfigured(): boolean {
  return Boolean(storeUrl && storefrontToken);
}

export class ShopifyNotConfiguredError extends Error {
  constructor() {
    super(
      "Shopify Storefront API not configured. " +
        "Add SHOPIFY_STOREFRONT_PRIVATE_TOKEN to .env.local.",
    );
    this.name = "ShopifyNotConfiguredError";
  }
}

export async function shopifyFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  if (!isShopifyConfigured()) {
    throw new ShopifyNotConfiguredError();
  }

  const endpoint = `${storeUrl}/api/${API_VERSION}/graphql.json`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": storefrontToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Shopify API ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();

  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }

  return json.data as T;
}
