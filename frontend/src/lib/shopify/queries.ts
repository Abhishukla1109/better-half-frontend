// ── Fragments ───────────────────────────────────────────────

const IMAGE_FRAGMENT = `
  fragment Image on Image {
    url
    altText
    width
    height
  }
`;

const PRICE_FRAGMENT = `
  fragment Price on MoneyV2 {
    amount
    currencyCode
  }
`;

const VARIANT_FRAGMENT = `
  fragment Variant on ProductVariant {
    id
    title
    availableForSale
    price { ...Price }
    compareAtPrice { ...Price }
    selectedOptions { name value }
    image { ...Image }
  }
`;

const PRODUCT_CARD_FRAGMENT = `
  fragment ProductCard on Product {
    id
    handle
    title
    vendor
    tags
    featuredImage { ...Image }
    priceRange {
      minVariantPrice { ...Price }
    }
    compareAtPriceRange {
      minVariantPrice { ...Price }
    }
    variants(first: 1) {
      nodes { ...Variant }
    }
  }
`;

const PRODUCT_FULL_FRAGMENT = `
  fragment ProductFull on Product {
    id
    handle
    title
    description
    descriptionHtml
    vendor
    tags
    featuredImage { ...Image }
    images(first: 10) {
      nodes { ...Image }
    }
    priceRange {
      minVariantPrice { ...Price }
      maxVariantPrice { ...Price }
    }
    compareAtPriceRange {
      minVariantPrice { ...Price }
    }
    variants(first: 50) {
      nodes { ...Variant }
    }
    metafields(identifiers: [
      { namespace: "custom", key: "ai_insight" }
      { namespace: "custom", key: "key_ingredients" }
      { namespace: "custom", key: "usage_instructions" }
    ]) {
      key
      value
      type
    }
  }
`;

// ── Queries ──────────────────────────────────────────────────

export const GET_ALL_PRODUCTS = `
  ${IMAGE_FRAGMENT}
  ${PRICE_FRAGMENT}
  ${VARIANT_FRAGMENT}
  ${PRODUCT_CARD_FRAGMENT}
  query GetAllProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      nodes { ...ProductCard }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export const GET_PRODUCTS_BY_COLLECTION = `
  ${IMAGE_FRAGMENT}
  ${PRICE_FRAGMENT}
  ${VARIANT_FRAGMENT}
  ${PRODUCT_CARD_FRAGMENT}
  query GetProductsByCollection($handle: String!, $first: Int!, $after: String) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      image { ...Image }
      products(first: $first, after: $after) {
        nodes { ...ProductCard }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

export const GET_PRODUCT_BY_HANDLE = `
  ${IMAGE_FRAGMENT}
  ${PRICE_FRAGMENT}
  ${VARIANT_FRAGMENT}
  ${PRODUCT_FULL_FRAGMENT}
  query GetProductByHandle($handle: String!) {
    product(handle: $handle) {
      ...ProductFull
    }
  }
`;

export const GET_COLLECTIONS = `
  ${IMAGE_FRAGMENT}
  query GetCollections($first: Int!) {
    collections(first: $first) {
      nodes {
        id
        handle
        title
        description
        image { ...Image }
      }
    }
  }
`;

// ── Cart Mutations ───────────────────────────────────────────

const CART_FRAGMENT = `
  fragment CartFragment on Cart {
    id
    checkoutUrl
    totalQuantity
    lines(first: 100) {
      nodes {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
            title
            price { amount currencyCode }
            compareAtPrice { amount currencyCode }
            product {
              id
              handle
              title
              featuredImage { url altText width height }
            }
          }
        }
        cost {
          totalAmount { amount currencyCode }
        }
      }
    }
    cost {
      subtotalAmount { amount currencyCode }
      totalAmount { amount currencyCode }
    }
  }
`;

export const CREATE_CART = `
  ${CART_FRAGMENT}
  mutation CreateCart($lines: [CartLineInput!], $attributes: [AttributeInput!]) {
    cartCreate(input: { lines: $lines, attributes: $attributes }) {
      cart { ...CartFragment }
      userErrors { field message }
    }
  }
`;

export const ADD_TO_CART = `
  ${CART_FRAGMENT}
  mutation AddToCart($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ...CartFragment }
      userErrors { field message }
    }
  }
`;

export const UPDATE_CART_LINES = `
  ${CART_FRAGMENT}
  mutation UpdateCartLines($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ...CartFragment }
      userErrors { field message }
    }
  }
`;

export const REMOVE_FROM_CART = `
  ${CART_FRAGMENT}
  mutation RemoveFromCart($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ...CartFragment }
      userErrors { field message }
    }
  }
`;

export const GET_CART = `
  ${CART_FRAGMENT}
  query GetCart($cartId: ID!) {
    cart(id: $cartId) { ...CartFragment }
  }
`;

export const UPDATE_CART_ATTRIBUTES = `
  ${CART_FRAGMENT}
  mutation UpdateCartAttributes($cartId: ID!, $attributes: [AttributeInput!]!) {
    cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
      cart { ...CartFragment }
      userErrors { field message }
    }
  }
`;

export const SEARCH_PRODUCTS = `
  ${IMAGE_FRAGMENT}
  ${PRICE_FRAGMENT}
  ${VARIANT_FRAGMENT}
  ${PRODUCT_CARD_FRAGMENT}
  query SearchProducts($query: String!, $first: Int!) {
    search(query: $query, first: $first, types: [PRODUCT]) {
      nodes {
        ... on Product { ...ProductCard }
      }
    }
  }
`;
