import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SHOP = "betterhalf-4.myshopify.com";
const CI = process.env.SHOPIFY_CLIENT_ID ?? "";
const CS = process.env.SHOPIFY_CLIENT_SECRET ?? "";

const ZERO_PRICE_HANDLES = [
  "advanced-hair-regrowth-regime","micronised-creatine-monohydrate","creatine-electrolyte",
  "growmax-minoxidil-5","anti-dandruff-pro-kit","beardmax-growth-serum-30-ml",
  "beard-growth-kit-for-low-beard","magnesium-lotion","1-ketoconazole-shampoo-200-ml",
  "biotin-hair-gummies-90n","derma-roller-replaceable-head",
  "clear-skin-starter-pack-1x-anti-acne-face-wash-1x-rejuv-face-serum",
  "charcoal-body-wash-750-ml","complete-cleansing-kit","tostero-capsules-60n",
  "face-body-cleansing-kit","beard-development-kit","charcoal-body-wash-500-ml",
  "whey-protein-powder-500-gm","advance-growmax-60ml","swash-intimate-wash-120ml",
  "charcoal-body-wash-250-ml","oral-minoxidil-for-beard-growth",
  "clear-skin-pack-1x-rejuv-face-serum-1x-derma-roller","minoxidil-10-finasteride-50ml",
  "muscle-nutrients-kit","beard-development-kit-22-28","hair-activator-derma-roller-1mm",
  "biotin-hair-gummies-60n","daily-hygiene-kit","minoxidil-5-procapil-60ml",
  "super-blend-nutrition-powder","advance-daily-use-anti-dandruff-shampoo",
  "advanced-magnesium-gummies","stage-3-hair-regrowth-kit",
];

async function getToken() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CI, client_secret: CS, grant_type: "client_credentials" }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error("No token: " + JSON.stringify(d));
  return d.access_token;
}

async function getProductId(token, handle) {
  const r = await fetch(
    `https://${SHOP}/admin/api/2024-01/products.json?handle=${handle}&fields=id,status`,
    { headers: { "X-Shopify-Access-Token": token } }
  );
  const d = await r.json();
  return d.products?.[0]?.id ?? null;
}

async function getVariants(token, productId) {
  const r = await fetch(
    `https://${SHOP}/admin/api/2024-01/products/${productId}/variants.json?fields=id,price`,
    { headers: { "X-Shopify-Access-Token": token } }
  );
  const d = await r.json();
  return d.variants ?? [];
}

async function updateVariantPrice(token, variantId, price, mrp) {
  const body = {
    variant: {
      id: variantId,
      price: String(price),
      compare_at_price: mrp > price ? String(mrp) : null,
    },
  };
  const r = await fetch(
    `https://${SHOP}/admin/api/2024-01/variants/${variantId}.json`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify(body),
    }
  );
  const d = await r.json();
  if (d.errors) throw new Error(JSON.stringify(d.errors));
  return parseFloat(d.variant?.price ?? "0");
}

async function addImage(token, productId, imageUrl) {
  const r = await fetch(
    `https://${SHOP}/admin/api/2024-01/products/${productId}/images.json`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ image: { src: imageUrl } }),
    }
  );
  const d = await r.json();
  return !d.errors;
}

async function getImageCount(token, productId) {
  const r = await fetch(
    `https://${SHOP}/admin/api/2024-01/products/${productId}/images/count.json`,
    { headers: { "X-Shopify-Access-Token": token } }
  );
  const d = await r.json();
  return d.count ?? 0;
}

async function main() {
  const token = await getToken();
  console.log("Token acquired.\n");

  let updated = 0, failed = 0;

  for (const handle of ZERO_PRICE_HANDLES) {
    const jsonPath = join(__dirname, `../frontend/src/catalog/enriched/${handle}.json`);
    if (!existsSync(jsonPath)) {
      console.log(`  ✗ ${handle} — no enriched JSON, skipping`);
      failed++;
      continue;
    }

    const enriched = JSON.parse(readFileSync(jsonPath, "utf8"));
    const price = enriched.price ?? 0;
    const mrp = enriched.mrp ?? price;
    const image = enriched.images?.[0] ?? null;

    if (!price) {
      console.log(`  ✗ ${handle} — no price in JSON (price=${price}), skipping`);
      failed++;
      continue;
    }

    const productId = await getProductId(token, handle);
    if (!productId) {
      console.log(`  ✗ ${handle} — not found on Shopify`);
      failed++;
      continue;
    }

    const variants = await getVariants(token, productId);
    if (!variants.length) {
      console.log(`  ✗ ${handle} — no variants`);
      failed++;
      continue;
    }

    const variantId = variants[0].id;
    const newPrice = await updateVariantPrice(token, variantId, price, mrp);

    let imageStatus = "";
    if (image) {
      const imgCount = await getImageCount(token, productId);
      if (imgCount === 0) {
        const ok = await addImage(token, productId, image);
        imageStatus = ok ? " + image added" : " + image FAILED";
      } else {
        imageStatus = " (image already exists)";
      }
    }

    console.log(`  ✓ ${handle} — ₹${newPrice}${mrp > price ? ` (MRP ₹${mrp})` : ""}${imageStatus}`);
    updated++;

    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\nDone: ${updated} updated, ${failed} failed`);
}

main().catch(e => { console.error(e); process.exit(1); });
