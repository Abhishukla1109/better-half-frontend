/**
 * push-lj-metafields.mjs
 *
 * Pushes BH metafields for all Little Joys products to Shopify.
 * Run once to fix the kids section showing no products.
 *
 * Usage:
 *   SHOPIFY_CLIENT_ID=... SHOPIFY_CLIENT_SECRET=... node scripts/push-lj-metafields.mjs
 */

const SHOP = process.env.SHOPIFY_SHOP ?? "betterhalf-4.myshopify.com";
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET ?? "";

// All 23 Little Joys products with their BH metafield data
const LJ_CATALOG = [
  { id: "multivitamin-gummies",           concern: "energy", gender: "all", segment: "kids-2-5,kids-6-12",              baseScore: 90, followUp: "nutrition,vitamins,immunity" },
  { id: "multivitamin-gummies-7plus-30",  concern: "energy", gender: "all", segment: "kids-6-12,kids-13-plus",          baseScore: 90, followUp: "nutrition,vitamins,immunity" },
  { id: "multivitamin-gummies-13-18",     concern: "energy", gender: "all", segment: "kids-13-plus",                    baseScore: 89, followUp: "nutrition,vitamins,immunity,teen" },
  { id: "brain-booster-gummies",          concern: "energy", gender: "all", segment: "kids-2-5,kids-6-12",              baseScore: 88, followUp: "brain,dha,omega3,focus,learning" },
  { id: "brain-gummies-7-packof60",       concern: "energy", gender: "all", segment: "kids-6-12,kids-13-plus",          baseScore: 87, followUp: "brain,dha,omega3,focus,learning" },
  { id: "calcium-gummies",                concern: "energy", gender: "all", segment: "kids-2-5,kids-6-12,kids-13-plus", baseScore: 86, followUp: "calcium,bone,growth,teeth" },
  { id: "magnesium-gummies-30-2",         concern: "sleep",  gender: "all", segment: "kids-2-5,kids-6-12",              baseScore: 84, followUp: "sleep,calm,magnesium,relaxation" },
  { id: "magnesium-gummies-30-7",         concern: "sleep",  gender: "all", segment: "kids-13-plus",                    baseScore: 84, followUp: "sleep,calm,magnesium,stress,teen" },
  { id: "hair-gummies",                   concern: "hair",   gender: "all", segment: "kids-13-plus",                    baseScore: 82, followUp: "hair,biotin,hair fall,teen" },
  { id: "nutrimix-nutrition-powder-min",       concern: "energy", gender: "all", segment: "kids-2-5,kids-6-12",         baseScore: 85, followUp: "nutrition,protein,growth,milk" },
  { id: "nutrimix-nutrition-powder-vanilla",   concern: "energy", gender: "all", segment: "kids-2-5,kids-6-12",         baseScore: 83, followUp: "nutrition,protein,growth,milk" },
  { id: "nutrimix-nutrition-powder-strawberry",concern: "energy", gender: "all", segment: "kids-2-5,kids-6-12",         baseScore: 82, followUp: "nutrition,protein,growth,milk" },
  { id: "nutrimix-nutrition-powder-7",         concern: "energy", gender: "all", segment: "kids-6-12,kids-13-plus",     baseScore: 83, followUp: "nutrition,protein,growth,school" },
  { id: "neem-bodywash-new",              concern: "skin",   gender: "all", segment: "kids-2-5,kids-6-12,kids-13-plus", baseScore: 75, followUp: "skin,bodywash,neem,natural" },
  { id: "aloe-shampoo-new",              concern: "hair",   gender: "all", segment: "kids-2-5,kids-6-12,kids-13-plus", baseScore: 74, followUp: "hair,shampoo,aloe,gentle" },
  { id: "amla-shampoo",                  concern: "hair",   gender: "all", segment: "kids-6-12,kids-13-plus",          baseScore: 73, followUp: "hair,shampoo,amla,natural" },
  { id: "multivitamin-toothpaste",       concern: "energy", gender: "all", segment: "kids-6-12,kids-13-plus",          baseScore: 72, followUp: "teeth,oral,toothpaste,fluoride" },
  { id: "peppa-body-lotion-for-kids",    concern: "skin",   gender: "all", segment: "kids-2-5,kids-6-12",              baseScore: 71, followUp: "skin,lotion,moisturiser,dry skin" },
  { id: "millet-chocos",                 concern: "energy", gender: "all", segment: "kids-2-5,kids-6-12",              baseScore: 70, followUp: "snack,millet,healthy snack" },
  { id: "chocolate-spread",              concern: "energy", gender: "all", segment: "kids-2-5,kids-6-12,kids-13-plus", baseScore: 69, followUp: "snack,spread,chocolate,healthy" },
  { id: "peanut-butter-chocolate",       concern: "energy", gender: "all", segment: "kids-6-12,kids-13-plus",          baseScore: 68, followUp: "snack,peanut butter,protein,healthy" },
  { id: "millet-pancake",                concern: "energy", gender: "all", segment: "kids-2-5,kids-6-12",              baseScore: 67, followUp: "snack,millet,breakfast,healthy" },
  { id: "fruit-jam",                     concern: "energy", gender: "all", segment: "kids-2-5,kids-6-12,kids-13-plus", baseScore: 66, followUp: "snack,jam,no sugar,natural" },
];

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
  return data.access_token;
}

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

async function fetchAllProducts(token) {
  const products = [];
  let cursor = null;
  while (true) {
    const query = `
      query($cursor: String) {
        products(first: 50, after: $cursor) {
          edges { node { id handle } cursor }
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

async function setMetafields(token, productId, data) {
  const metafields = [
    { namespace: "custom", key: "bh_concern",   value: data.concern,           type: "single_line_text_field" },
    { namespace: "custom", key: "bh_gender",    value: data.gender,            type: "single_line_text_field" },
    { namespace: "custom", key: "bh_segment",   value: data.segment,           type: "single_line_text_field" },
    { namespace: "custom", key: "bh_score",     value: String(data.baseScore), type: "number_integer" },
    { namespace: "custom", key: "bh_follow_up", value: data.followUp,          type: "single_line_text_field" },
  ].filter((m) => m.value);

  const mutation = `
    mutation($input: ProductInput!) {
      productUpdate(input: $input) {
        product { id handle }
        userErrors { field message }
      }
    }
  `;
  const result = await graphql(token, mutation, { input: { id: productId, metafields } });
  const errors = result.data?.productUpdate?.userErrors ?? [];
  if (errors.length) {
    console.error(`  ✗ Errors for ${productId}:`, errors.map((e) => e.message).join(", "));
  }
}

const token = await getAccessToken();
const shopifyProducts = await fetchAllProducts(token);
const byHandle = Object.fromEntries(shopifyProducts.map((p) => [p.handle, p]));

let matched = 0, skipped = 0;

for (const item of LJ_CATALOG) {
  const shopifyProduct = byHandle[item.id];
  if (!shopifyProduct) {
    console.log(`  ⚠ Not found in Shopify: ${item.id}`);
    skipped++;
    continue;
  }
  process.stdout.write(`  → ${item.id} ... `);
  await setMetafields(token, shopifyProduct.id, item);
  process.stdout.write("done\n");
  matched++;
  await new Promise((r) => setTimeout(r, 150));
}

console.log(`\n✓ Done!`);
console.log(`  Updated: ${matched} products`);
console.log(`  Skipped: ${skipped} products (not found in Shopify)`);
