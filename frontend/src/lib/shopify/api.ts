import { shopifyFetch } from './client';
import {
  GET_ALL_PRODUCTS,
  GET_PRODUCTS_BY_COLLECTION,
  GET_PRODUCT_BY_HANDLE,
  GET_COLLECTIONS,
  GET_CART,
  CREATE_CART,
  ADD_TO_CART,
  UPDATE_CART_LINES,
  REMOVE_FROM_CART,
} from './queries';
import type {
  ShopifyProduct,
  ShopifyCart,
  ShopifyCollection,
  Product,
  Cart,
  CartItem,
} from './types';

// ── Normalizers ──────────────────────────────────────────────

export function normalizeProduct(p: ShopifyProduct): Product {
  const firstVariant = p.variants.nodes[0];
  const compareAt = firstVariant?.compareAtPrice ?? p.compareAtPriceRange?.minVariantPrice ?? null;
  const price = firstVariant?.price ?? p.priceRange.minVariantPrice;
  const onSale = compareAt ? parseFloat(compareAt.amount) > parseFloat(price.amount) : false;
  const discountPct = onSale
    ? Math.round(((parseFloat(compareAt!.amount) - parseFloat(price.amount)) / parseFloat(compareAt!.amount)) * 100)
    : 0;

  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    description: p.description,
    descriptionHtml: p.descriptionHtml,
    vendor: p.vendor,
    tags: p.tags,
    featuredImage: p.featuredImage,
    images: p.images?.nodes ?? [],
    variants: p.variants.nodes,
    price,
    compareAtPrice: onSale ? compareAt : null,
    onSale,
    discountPct,
  };
}

export function normalizeCart(c: ShopifyCart): Cart {
  const items: CartItem[] = c.lines.nodes.map(line => ({
    lineId: line.id,
    quantity: line.quantity,
    variantId: line.merchandise.id,
    variantTitle: line.merchandise.title,
    productHandle: line.merchandise.product.handle,
    productTitle: line.merchandise.product.title,
    image: line.merchandise.product.featuredImage,
    price: line.merchandise.price,
    lineTotal: line.cost.totalAmount,
  }));

  return {
    id: c.id,
    checkoutUrl: c.checkoutUrl,
    totalQuantity: c.totalQuantity,
    items,
    subtotal: c.cost.subtotalAmount,
  };
}

// ── Products ─────────────────────────────────────────────────

export async function getAllProducts(first = 24, after?: string): Promise<Product[]> {
  const data = await shopifyFetch<{ products: { nodes: ShopifyProduct[] } }>(
    GET_ALL_PRODUCTS,
    { first, after }
  );
  return data.products.nodes.map(normalizeProduct);
}

export async function getProductsByCollection(
  handle: string,
  first = 24,
  after?: string
): Promise<{ products: Product[]; collection: ShopifyCollection | null }> {
  const data = await shopifyFetch<{ collection: ShopifyCollection | null }>(
    GET_PRODUCTS_BY_COLLECTION,
    { handle, first, after }
  );
  if (!data.collection) return { products: [], collection: null };
  return {
    collection: data.collection,
    products: data.collection.products.nodes.map(normalizeProduct),
  };
}

export async function getProductByHandle(handle: string): Promise<Product | null> {
  const data = await shopifyFetch<{ product: ShopifyProduct | null }>(
    GET_PRODUCT_BY_HANDLE,
    { handle }
  );
  return data.product ? normalizeProduct(data.product) : null;
}

export async function getCollections(first = 20) {
  const data = await shopifyFetch<{
    collections: { nodes: Omit<ShopifyCollection, 'products'>[] };
  }>(GET_COLLECTIONS, { first });
  return data.collections.nodes;
}

// ── Cart ─────────────────────────────────────────────────────

export async function createCart(variantId: string, quantity = 1): Promise<Cart> {
  const data = await shopifyFetch<{
    cartCreate: { cart: ShopifyCart; userErrors: { message: string }[] };
  }>(CREATE_CART, {
    lines: [{ merchandiseId: variantId, quantity }],
  });
  if (data.cartCreate.userErrors.length > 0) {
    throw new Error(data.cartCreate.userErrors[0].message);
  }
  return normalizeCart(data.cartCreate.cart);
}

export async function addToCart(cartId: string, variantId: string, quantity = 1): Promise<Cart> {
  const data = await shopifyFetch<{
    cartLinesAdd: { cart: ShopifyCart; userErrors: { message: string }[] };
  }>(ADD_TO_CART, {
    cartId,
    lines: [{ merchandiseId: variantId, quantity }],
  });
  if (data.cartLinesAdd.userErrors.length > 0) {
    throw new Error(data.cartLinesAdd.userErrors[0].message);
  }
  return normalizeCart(data.cartLinesAdd.cart);
}

export async function updateCartLine(cartId: string, lineId: string, quantity: number): Promise<Cart> {
  const data = await shopifyFetch<{
    cartLinesUpdate: { cart: ShopifyCart; userErrors: { message: string }[] };
  }>(UPDATE_CART_LINES, {
    cartId,
    lines: [{ id: lineId, quantity }],
  });
  if (data.cartLinesUpdate.userErrors.length > 0) {
    throw new Error(data.cartLinesUpdate.userErrors[0].message);
  }
  return normalizeCart(data.cartLinesUpdate.cart);
}

export async function removeCartLine(cartId: string, lineId: string): Promise<Cart> {
  const data = await shopifyFetch<{
    cartLinesRemove: { cart: ShopifyCart; userErrors: { message: string }[] };
  }>(REMOVE_FROM_CART, {
    cartId,
    lineIds: [lineId],
  });
  if (data.cartLinesRemove.userErrors.length > 0) {
    throw new Error(data.cartLinesRemove.userErrors[0].message);
  }
  return normalizeCart(data.cartLinesRemove.cart);
}

export async function getCart(cartId: string): Promise<Cart | null> {
  const data = await shopifyFetch<{ cart: ShopifyCart | null }>(GET_CART, { cartId });
  return data.cart ? normalizeCart(data.cart) : null;
}

// ── Formatting ───────────────────────────────────────────────

export function formatPrice(price: { amount: string; currencyCode: string }): string {
  const amount = parseFloat(price.amount);
  if (price.currencyCode === 'INR') {
    return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currencyCode,
  }).format(amount);
}
