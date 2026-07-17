/**
 * Shopify Product Quality Check
 * Fetches all active products from Shopify and reports which are missing
 * required metafields: bh_concern, bh_gender, bh_base_score, bh_segment
 *
 * Usage: node scripts/shopify-quality-check.mjs
 */

const SHOP      = process.env.SHOPIFY_SHOP    ?? "betterhalf-4.myshopify.com";
const TOKEN     = process.env.SHOPIFY_ADMIN_TOKEN ?? "";
const ADMIN_API = `https://${SHOP}/admin/api/2024-01/graphql.json`;

const R = "\x1b[31m", Y = "\x1b[33m", G = "\x1b[32m";
const B = "\x1b[1m",  D = "\x1b[2m",  X = "\x1b[0m";

async function gql(query, variables = {}) {
  const res = await fetch(ADMIN_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

async function fetchAllProducts() {
  const products = [];
  let cursor = null;

  while (true) {
    const data = await gql(`
      query($cursor: String) {
        products(first: 50, after: $cursor, query: "status:active") {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            title
            handle
            metafields(first: 30, namespace: "custom") {
              nodes { key value }
            }
          }
        }
      }
    `, { cursor });

    const page = data.products;
    products.push(...page.nodes);
    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor;
  }

  return products;
}

const REQUIRED = ["bh_concern", "bh_gender", "bh_score"];
const RECOMMENDED = ["bh_segment", "bh_brand"];

const data = await fetchAllProducts();

const missing_required = [];
const missing_recommended = [];
const ok = [];

for (const p of data) {
  const mf = Object.fromEntries(p.metafields.nodes.map(m => [m.key, m.value]));
  const missingReq = REQUIRED.filter(k => !mf[k]);
  const missingRec = RECOMMENDED.filter(k => !mf[k]);

  if (missingReq.length) {
    missing_required.push({ title: p.title, handle: p.handle, missing: missingReq, mf });
  } else if (missingRec.length) {
    missing_recommended.push({ title: p.title, handle: p.handle, missing: missingRec, mf });
  } else {
    ok.push(p.title);
  }
}

console.log(`\n${B}━━━ Shopify Product Metafield Quality Check ━━━${X}`);
console.log(`${D}    ${data.length} active products checked\n${X}`);

if (missing_required.length === 0) {
  console.log(`${G}${B}✅  All products have required metafields (bh_concern, bh_gender, bh_base_score)${X}\n`);
} else {
  console.log(`${R}${B}❌  ${missing_required.length} products missing REQUIRED metafields — invisible in BetterHalf & won't get Affluence tags${X}`);
  for (const p of missing_required) {
    console.log(`\n    ${R}${B}${p.title}${X}`);
    console.log(`    ${D}handle: ${p.handle}${X}`);
    console.log(`    ${R}missing: ${p.missing.join(", ")}${X}`);
    if (p.mf.bh_concern)    console.log(`    ${D}bh_concern:    ${p.mf.bh_concern}${X}`);
    if (p.mf.bh_gender)     console.log(`    ${D}bh_gender:     ${p.mf.bh_gender}${X}`);
    if (p.mf.bh_base_score) console.log(`    ${D}bh_base_score: ${p.mf.bh_base_score}${X}`);
  }
  console.log();
}

if (missing_recommended.length === 0) {
  console.log(`${G}✅  All products have recommended metafields (bh_segment, bh_brand)${X}\n`);
} else {
  console.log(`${Y}${B}⚠️   ${missing_recommended.length} products missing RECOMMENDED metafields${X}`);
  for (const p of missing_recommended) {
    console.log(`    ${Y}· ${p.title} ${D}(${p.handle})${X} — missing: ${p.missing.join(", ")}`);
  }
  console.log();
}

console.log(`${G}✅  ${ok.length} products fully tagged${X}\n`);
