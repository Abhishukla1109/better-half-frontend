/**
 * Bulk-pushes enriched content from src/catalog/enriched/*.json
 * into Shopify metafields for each matching product.
 *
 * Fields written: bh_ingredients, bh_timeline, bh_faqs, bh_how_to_use
 *
 * Run: node scripts/push-enriched-metafields.mjs
 * Add --dry-run to preview without writing anything.
 */

import { readdir, readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ENRICHED_DIR = join(__dir, "../src/catalog/enriched");

const SHOP = process.env.SHOPIFY_SHOP ?? "betterhalf-4.myshopify.com";
const CLIENT_ID = process.env.SHOPIFY_ADMIN_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.SHOPIFY_ADMIN_CLIENT_SECRET ?? "";
const ADMIN_API = `https://${SHOP}/admin/api/2024-01/graphql.json`;

const DRY_RUN = process.argv.includes("--dry-run");

async function getToken() {
  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "client_credentials" }),
  });
  const { access_token } = await res.json();
  return access_token;
}

async function gql(token, query, variables) {
  const res = await fetch(ADMIN_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

const GET_ID = `query($handle: String!) {
  productByHandle(handle: $handle) { id }
}`;

const SET_METAFIELDS = `mutation($input: ProductInput!) {
  productUpdate(input: $input) {
    product { handle }
    userErrors { field message }
  }
}`;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (DRY_RUN) console.log("DRY RUN — no writes will happen\n");

  const token = await getToken();
  const files = (await readdir(ENRICHED_DIR)).filter((f) => f.endsWith(".json")).sort();

  let ok = 0, skipped = 0, failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const raw = await readFile(join(ENRICHED_DIR, file), "utf-8");
    let product;
    try { product = JSON.parse(raw); } catch { console.log(`PARSE_ERR: ${file}`); failed++; continue; }

    const handle = product.shopifyHandle || product.slug;
    if (!handle) { console.log(`NO_HANDLE: ${file}`); skipped++; continue; }

    // Resolve Shopify product GID
    const idData = await gql(token, GET_ID, { handle });
    if (!idData.productByHandle) {
      console.log(`NOT_FOUND: ${handle}`);
      skipped++;
      await sleep(300);
      continue;
    }

    const productId = idData.productByHandle.id;

    // Build metafields — only include fields that have content
    const metafields = [];

    const pushJson = (key, val) => {
      if (val !== null && val !== undefined && !(Array.isArray(val) && val.length === 0))
        metafields.push({ namespace: "custom", key, type: "json", value: JSON.stringify(val) });
    };
    const pushText = (key, type, val) => {
      if (typeof val === "string" && val.trim())
        metafields.push({ namespace: "custom", key, type, value: val.trim() });
    };

    // --- Original 4 ---
    pushJson("bh_ingredients",      product.ingredients);
    pushJson("bh_timeline",         product.timeline);
    pushJson("bh_faqs",             product.faqs);
    pushText("bh_how_to_use",       "multi_line_text_field", product.howToUse);

    // --- New fields ---
    pushText("bh_subtitle",         "single_line_text_field", product.subtitle);
    pushJson("bh_for_with",         product.forWith);
    pushJson("bh_badges",           product.badges);
    pushJson("bh_reviews",          product.reviews);
    pushJson("bh_product_details",  product.productDetails);
    pushJson("bh_packs",            product.packs);
    pushJson("bh_disclaimers",      product.disclaimers);
    pushJson("bh_additional_info",  product.additionalInfo);
    pushText("bh_age_group",        "single_line_text_field", product.ageGroup);
    pushJson("bh_allergens",        product.allergens);
    pushText("bh_product_type",     "single_line_text_field", product.productType);
    pushJson("bh_benefits",         product.benefits);
    pushText("bh_full_ingredients", "multi_line_text_field",  product.fullIngredientsList);
    pushJson("bh_siblings",         product.siblings);
    pushText("bh_recommendation",   "single_line_text_field", product.recommendation);

    if (metafields.length === 0) {
      console.log(`NO_CONTENT: ${handle}`);
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`WOULD_WRITE [${i + 1}/${files.length}]: ${handle} — ${metafields.map((m) => m.key).join(", ")}`);
      ok++;
      continue;
    }

    let result;
    try {
      result = await gql(token, SET_METAFIELDS, { input: { id: productId, metafields } });
    } catch (err) {
      console.log(`SHOPIFY_ERR [${i + 1}/${files.length}]: ${handle} — ${err.message}`);
      failed++;
      await sleep(1000);
      continue;
    }
    const errors = result.productUpdate.userErrors;

    if (errors?.length) {
      console.log(`FAIL [${i + 1}/${files.length}]: ${handle} — ${errors[0].message}`);
      failed++;
    } else {
      console.log(`OK [${i + 1}/${files.length}]: ${handle} — ${metafields.map((m) => m.key).join(", ")}`);
      ok++;
    }

    // Stay well within Shopify's rate limit
    await sleep(400);
  }

  console.log(`\n────────────────────────────`);
  console.log(`Done: ${ok} written, ${skipped} skipped, ${failed} failed`);
  console.log(`Total products in enriched dir: ${files.length}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
