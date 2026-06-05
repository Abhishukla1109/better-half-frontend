/**
 * Finds Shopify products that have no enriched JSON registered in enrichedProducts.ts
 * and archives them (sets status = ARCHIVED so they vanish from storefront).
 * Archived products remain in Shopify admin and can be un-archived any time.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const REGISTRY_FILE = path.join(ROOT, "frontend/src/data/enrichedProducts.ts");

const SHOP = "betterhalf-4.myshopify.com";
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET ?? "";

async function getToken() {
  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "client_credentials" }),
  });
  return (await res.json()).access_token;
}

async function gql(token, query, variables) {
  const res = await fetch(`https://${SHOP}/admin/api/2024-01/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function getAllHandles(token) {
  const handles = [];
  let cursor = null;
  do {
    const q = `query($first: Int!, $after: String) {
      products(first: $first, after: $after, query: "status:active") {
        nodes { id handle }
        pageInfo { hasNextPage endCursor }
      }
    }`;
    const r = await gql(token, q, { first: 250, after: cursor });
    for (const p of r.data.products.nodes) handles.push({ id: p.id, handle: p.handle });
    cursor = r.data.products.pageInfo.hasNextPage ? r.data.products.pageInfo.endCursor : null;
  } while (cursor);
  return handles;
}

async function archiveProduct(token, gid) {
  const mutation = `mutation($id: ID!) { productUpdate(input: { id: $id, status: ARCHIVED }) { product { handle status } userErrors { field message } } }`;
  return gql(token, mutation, { id: gid });
}

async function main() {
  // 1. Extract all registered slugs from enrichedProducts.ts
  const registry = fs.readFileSync(REGISTRY_FILE, "utf8");
  const slugMatches = [...registry.matchAll(/"([^"]+)":\s+\w/g)].map(m => m[1]);
  const registeredSlugs = new Set(slugMatches);
  console.log(`Registered slugs in enrichedProducts.ts: ${registeredSlugs.size}`);

  const token = await getToken();
  const allProducts = await getAllHandles(token);
  console.log(`Active products in Shopify: ${allProducts.length}`);

  const ghosts = allProducts.filter(p => !registeredSlugs.has(p.handle));
  console.log(`\nGhost products to archive: ${ghosts.length}`);
  ghosts.forEach(p => console.log(`  - ${p.handle}`));

  if (ghosts.length === 0) { console.log("Nothing to archive."); return; }

  console.log("\nArchiving...");
  for (const p of ghosts) {
    const r = await archiveProduct(token, p.id);
    const ue = r?.data?.productUpdate?.userErrors ?? [];
    if (ue.length) console.error(`  ✗ ${p.handle}: ${ue.map(e => e.message).join(", ")}`);
    else console.log(`  ✓ Archived: ${p.handle}`);
  }
  console.log("\nDone. All ghost products archived. Viewable in Shopify admin → Products → filter by Archived.");
}

main().catch(e => { console.error(e); process.exit(1); });
