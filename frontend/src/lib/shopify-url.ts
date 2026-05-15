import { shopifyHandleMap } from './shopify-handle-map';

const base = () =>
  (process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? '').replace(/\/$/, '');

export const shopifyProductUrl = (handle: string) => {
  const resolved = shopifyHandleMap[handle] ?? handle;
  return `${base()}/products/${resolved}`;
};

export const shopifyStoreUrl = () => base();
