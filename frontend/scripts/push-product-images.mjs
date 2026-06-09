/**
 * Migrates product images from src/catalog/enriched/*.json into Shopify.
 * For each product: if Shopify already has >= images than the enriched JSON, skip.
 * Otherwise uploads all images from the enriched JSON via productCreateMedia.
 *
 * Run:  node scripts/push-product-images.mjs
 * Dry:  node scripts/push-product-images.mjs --dry-run
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
  if (!access_token) throw new Error("Failed to get admin token — check SHOPIFY_ADMIN_CLIENT_ID and SHOPIFY_ADMIN_CLIENT_SECRET");
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

const GET_PRODUCT = `
  query($handle: String!) {
    productByHandle(handle: $handle) {
      id
      images(first: 30) { nodes { url } }
    }
  }
`;

const CREATE_MEDIA = `
  mutation($productId: ID!, $media: [CreateMediaInput!]!) {
    productCreateMedia(productId: $productId, media: $media) {
      media {
        ... on MediaImage { image { url } }
        status
      }
      mediaUserErrors { field message }
    }
  }
`;

function normalizeUrl(url) {
  // Strip low-res ImageKit transforms — let Shopify host the source image
  // e.g. https://i.mscwlns.co/...jpg?tr=w-600  →  https://i.mscwlns.co/...jpg
  try {
    const u = new URL(url);
    u.search = "";
    return u.toString();
  } catch {
    return url;
  }
}

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
    let product;
    try {
      product = JSON.parse(await readFile(join(ENRICHED_DIR, file), "utf-8"));
    } catch {
      console.log(`PARSE_ERR: ${file}`);
      failed++;
      continue;
    }

    const handle = product.shopifyHandle || product.slug;
    if (!handle) { console.log(`NO_HANDLE: ${file}`); skipped++; continue; }

    const enrichedImages = (product.images ?? []).filter(Boolean);
    if (enrichedImages.length === 0) {
      console.log(`NO_IMAGES [${i + 1}/${files.length}]: ${handle}`);
      skipped++;
      continue;
    }

    // Fetch current Shopify product
    const data = await gql(token, GET_PRODUCT, { handle });
    if (!data.productByHandle) {
      console.log(`NOT_FOUND [${i + 1}/${files.length}]: ${handle}`);
      skipped++;
      await sleep(300);
      continue;
    }

    const productId = data.productByHandle.id;
    const shopifyImageCount = data.productByHandle.images?.nodes?.length ?? 0;

    if (shopifyImageCount >= enrichedImages.length) {
      console.log(`SKIP [${i + 1}/${files.length}]: ${handle} — Shopify has ${shopifyImageCount}, enriched has ${enrichedImages.length}`);
      skipped++;
      await sleep(200);
      continue;
    }

    const mediaInputs = enrichedImages.map((url) => ({
      originalSource: normalizeUrl(url),
      mediaContentType: "IMAGE",
      alt: product.name ?? handle,
    }));

    if (DRY_RUN) {
      console.log(`WOULD_UPLOAD [${i + 1}/${files.length}]: ${handle} — ${mediaInputs.length} images (Shopify has ${shopifyImageCount})`);
      ok++;
      continue;
    }

    const result = await gql(token, CREATE_MEDIA, { productId, media: mediaInputs });
    const errors = result.productCreateMedia?.mediaUserErrors ?? [];

    if (errors.length) {
      console.log(`FAIL [${i + 1}/${files.length}]: ${handle} — ${errors[0].message}`);
      failed++;
    } else {
      const uploaded = result.productCreateMedia?.media?.length ?? 0;
      console.log(`OK [${i + 1}/${files.length}]: ${handle} — ${uploaded} images uploaded`);
      ok++;
    }

    // Stay within Shopify's rate limit
    await sleep(500);
  }

  console.log(`\n────────────────────────────`);
  console.log(`Done: ${ok} uploaded, ${skipped} skipped, ${failed} failed`);
  console.log(`Total enriched files: ${files.length}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
