import { createStorefrontApiClient } from '@shopify/storefront-api-client';

// Credentials validated at runtime, not at module load, so build doesn't fail with placeholders
const storeDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ?? 'placeholder.myshopify.com';
const accessToken = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN ?? 'placeholder';

export const shopifyClient = createStorefrontApiClient({
  storeDomain,
  apiVersion: '2025-07',
  publicAccessToken: accessToken,
});

export async function shopifyFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const { data, errors } = await shopifyClient.request(query, { variables });
  if (errors) {
    throw new Error(errors.message || 'Shopify API error');
  }
  return data as T;
}
