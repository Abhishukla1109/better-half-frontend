/**
 * push-metafields.mjs
 *
 * Gets an Admin API token using client credentials, then writes
 * BetterHalf metafields to all products in Shopify.
 *
 * Usage:
 *   node scripts/push-metafields.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const SHOP = process.env.SHOPIFY_SHOP ?? "betterhalf-4.myshopify.com";
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET ?? "";

// ── Get access token ──────────────────────────────────────────────────────────
async function getAccessToken() {
  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    console.error("Failed to get token:", JSON.stringify(data));
    process.exit(1);
  }
  console.log("✓ Got access token");
  console.log("  Scopes:", data.scope);
  return data.access_token;
}

// ── GraphQL helper ────────────────────────────────────────────────────────────
async function graphql(token, query, variables = {}) {
  const res = await fetch(`https://${SHOP}/admin/api/2024-10/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

// ── Read catalog.ts ───────────────────────────────────────────────────────────
const catalogRaw = readFileSync(resolve(root, "frontend/src/lib/ai/catalog.ts"), "utf8");
const productBlocks = catalogRaw.match(/\{\s*id:\s*["'][^"']+["'][\s\S]*?(?=\n  \},|\n\];)/g) ?? [];

function extractField(block, field) {
  if (["concern", "gender", "segment", "followUp"].includes(field)) {
    const match = block.match(new RegExp(`${field}:\\s*\\[([^\\]]+)\\]`));
    if (!match) return "";
    return match[1].split(",").map((s) => s.trim().replace(/['"]/g, "")).filter(Boolean).join(",");
  }
  const match = block.match(new RegExp(`${field}:\\s*["']?([^"',\\n]+)["']?`));
  return match ? match[1].trim().replace(/['"]/g, "") : "";
}

const catalog = {};
for (const block of productBlocks) {
  const id = extractField(block, "id");
  if (!id || catalog[id]) continue;
  catalog[id] = {
    concern:   extractField(block, "concern"),
    gender:    extractField(block, "gender"),
    segment:   extractField(block, "segment"),
    baseScore: extractField(block, "baseScore"),
    followUp:  extractField(block, "followUp"),
  };
}
console.log(`✓ Loaded ${Object.keys(catalog).length} products from catalog.ts`);

// ── Fetch all Shopify products ────────────────────────────────────────────────
async function fetchAllProducts(token) {
  const products = [];
  let cursor = null;

  while (true) {
    const query = `
      query($cursor: String) {
        products(first: 50, after: $cursor) {
          edges {
            node { id handle }
            cursor
          }
          pageInfo { hasNextPage }
        }
      }
    `;
    const data = await graphql(token, query, { cursor });
    const edges = data.data?.products?.edges ?? [];
    for (const edge of edges) products.push(edge.node);
    cursor = edges[edges.length - 1]?.cursor ?? null;
    if (!data.data?.products?.pageInfo?.hasNextPage) break;
  }

  console.log(`✓ Fetched ${products.length} products from Shopify`);
  return products;
}

// ── Set metafields on a product ───────────────────────────────────────────────
async function setMetafields(token, productId, data) {
  const metafields = [
    { namespace: "custom", key: "bh_concern",   value: data.concern,   type: "single_line_text_field" },
    { namespace: "custom", key: "bh_gender",    value: data.gender,    type: "single_line_text_field" },
    { namespace: "custom", key: "bh_segment",   value: data.segment,   type: "single_line_text_field" },
    { namespace: "custom", key: "bh_score",     value: data.baseScore, type: "number_integer" },
    { namespace: "custom", key: "bh_follow_up", value: data.followUp,  type: "single_line_text_field" },
  ].filter((m) => m.value);

  if (!metafields.length) return;

  const mutation = `
    mutation($input: ProductInput!) {
      productUpdate(input: $input) {
        product { id handle }
        userErrors { field message }
      }
    }
  `;
  const result = await graphql(token, mutation, {
    input: { id: productId, metafields },
  });

  const errors = result.data?.productUpdate?.userErrors ?? [];
  if (errors.length) {
    console.error(`  ✗ Errors for ${productId}:`, errors.map((e) => e.message).join(", "));
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
const token = await getAccessToken();
const shopifyProducts = await fetchAllProducts(token);

let matched = 0, skipped = 0;

for (const product of shopifyProducts) {
  const data = catalog[product.handle];
  if (!data) { skipped++; continue; }

  process.stdout.write(`  → ${product.handle} ... `);
  await setMetafields(token, product.id, data);
  process.stdout.write("done\n");
  matched++;

  // Small delay to avoid rate limiting
  await new Promise((r) => setTimeout(r, 150));
}

console.log(`\n✓ Done!`);
console.log(`  Updated:  ${matched} products`);
console.log(`  Skipped:  ${skipped} products (not in catalog)`);
