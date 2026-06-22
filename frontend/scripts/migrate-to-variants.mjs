#!/usr/bin/env node
/**
 * Migrates sibling Shopify products into unified products with proper variants.
 *
 * For each group (e.g. Biotin Gummies 30N / 60N / 90N):
 *  1. Fetches each existing Shopify product to get its price + images
 *  2. Creates ONE new Shopify product with multiple variants
 *  3. Copies metafields from the base (first) product
 *  4. Updates all enriched JSONs with shopifyHandle + variantTitle + siblings
 *
 * Usage:
 *   node scripts/migrate-to-variants.mjs --dry-run   (preview only)
 *   node scripts/migrate-to-variants.mjs              (runs for real)
 *
 * Token refresh (expires every 24h):
 *   node scripts/shopify-auth.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG   = join(__dirname, "../src/catalog/enriched");
const ENV_PATH  = join(__dirname, "../.env.local");
const DRY_RUN   = process.argv.includes("--dry-run");

// ── Load env ──────────────────────────────────────────────────────────────────
function loadEnv() {
  const env = {};
  readFileSync(ENV_PATH, "utf8").split("\n").forEach(line => {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) env[m[1]] = m[2].trim();
  });
  return env;
}
const ENV   = loadEnv();
const SHOP  = "betterhalf-4.myshopify.com";
const TOKEN = ENV.SHOPIFY_ADMIN_TOKEN;

if (!TOKEN) {
  console.error("❌  SHOPIFY_ADMIN_TOKEN missing from .env.local — run: node scripts/shopify-auth.mjs");
  process.exit(1);
}

// ── Colours ───────────────────────────────────────────────────────────────────
const G = "\x1b[32m", R = "\x1b[31m", Y = "\x1b[33m", D = "\x1b[2m", B = "\x1b[1m", X = "\x1b[0m";

// ── Sibling group definitions ─────────────────────────────────────────────────
// newHandle    : the handle for the new merged Shopify product
// optionName   : label shown in the picker ("Size", "Pack", "Flavour", "Age")
// baseTitle    : clean product name for the new Shopify product
// variants     : [ { slug, label, price (fetched at runtime) } ]
const GROUPS = [
  {
    newHandle:  "charcoal-body-wash",
    baseTitle:  "Charcoal Body Wash",
    optionName: "Size",
    variants: [
      { slug: "charcoal-body-wash-250-ml",  label: "250 ml" },
      { slug: "charcoal-body-wash-500-ml",  label: "500 ml" },
      { slug: "charcoal-body-wash-750-ml",  label: "750 ml" },
    ],
  },
  {
    newHandle:  "biotin-hair-gummies",
    baseTitle:  "Biotin Hair Gummies",
    optionName: "Pack",
    variants: [
      { slug: "biotin-hair-gummies-30n", label: "30N" },
      { slug: "biotin-hair-gummies-60n", label: "60N" },
      { slug: "biotin-hair-gummies-90n", label: "90N" },
    ],
  },
  {
    newHandle:  "anti-hair-fall-shampoo",
    baseTitle:  "DHT Blocking Anti Hair Fall Shampoo",
    optionName: "Size",
    variants: [
      { slug: "anti-hair-fall-shampoo-200ml", label: "200 ml" },
      { slug: "anti-hair-fall-shampoo-300ml", label: "300 ml" },
    ],
  },
  {
    newHandle:  "tostero-capsules",
    baseTitle:  "TOSTERO Capsules",
    optionName: "Pack",
    variants: [
      { slug: "tostero-capsules-60n",   label: "60N"  },
      { slug: "tostero-120-capsules",   label: "120N" },
    ],
  },
  {
    newHandle:  "salicylic-acid-body-wash-bw",
    baseTitle:  "1% Salicylic Acid Body Wash",
    optionName: "Size",
    variants: [
      { slug: "1-salicylic-acid-body-wash-100ml", label: "100 ml" },
      { slug: "1-salicylic-acid-body-wash",       label: "250 ml" },
    ],
  },
  {
    newHandle:  "niacinamide-body-wash-bw",
    baseTitle:  "5% Niacinamide Body Wash",
    optionName: "Pack",
    variants: [
      { slug: "5-niacinamide-body-wash",          label: "1 Month"  },
      { slug: "5-niacinamide-body-wash-pack-of-2", label: "2 Months" },
    ],
  },
  {
    newHandle:  "hair-growth-serum-roll-on-bw",
    baseTitle:  "Advanced Hair Growth Serum Roll-On",
    optionName: "Pack",
    variants: [
      { slug: "hair-growth-serum-roll-on",            label: "1 Month"  },
      { slug: "hair-growth-serum-roll-on-2-months-xp", label: "2 Months" },
    ],
  },
  {
    newHandle:  "nutrimix-nutrition-powder-lj",
    baseTitle:  "Nutrimix Nutrition Powder",
    optionName: "Flavour",
    variants: [
      { slug: "nutrimix-nutrition-powder",                  label: "Chocolate"        },
      { slug: "nutrimix-nutrition-powder-vanilla",           label: "Vanilla"          },
      { slug: "nutrimix-nutrition-powder-strawberry",        label: "Strawberry"       },
      { slug: "nutrimix-nutrition-powder-belgian-chocolate", label: "Belgian Chocolate" },
    ],
  },
  {
    newHandle:  "mamamix-nutrition-powder-lj",
    baseTitle:  "Mom's Nutrimix Nutrition Powder",
    optionName: "Flavour",
    variants: [
      { slug: "mamamix-nutrition-powder",         label: "Chocolate" },
      { slug: "mamamix-nutrition-powder-vanilla", label: "Vanilla"   },
    ],
  },
  {
    newHandle:  "calcium-gummies-strawberry-lj",
    baseTitle:  "Calcium Gummies Strawberry",
    optionName: "Age",
    variants: [
      { slug: "calcium-gummies-strawberry",     label: "3-7 Years"  },
      { slug: "calcium-gummies-strawberry-7",   label: "7-13 Years" },
      { slug: "calcium-gummies-strawberry-13",  label: "13+ Years"  },
    ],
  },
  {
    newHandle:  "lj-multivitamin-gummies-all",
    baseTitle:  "Multivitamin Gummies",
    optionName: "Age",
    variants: [
      { slug: "lj-multivitamin-gummies",      label: "2+ Years"   },
      { slug: "multivitamin-gummies-13-18",   label: "13-18 Years" },
    ],
  },
  {
    newHandle:  "aha-bha-underarm-roll-on-bw",
    baseTitle:  "4% AHA BHA Underarm Roll-On",
    optionName: "Variant",
    variants: [
      { slug: "4-aha-bha-underarm-roll-on",                label: "Flora 50ml"           },
      { slug: "4-aha-bha-underarm-roll-on-no-fragrance",   label: "No Fragrance 50ml"    },
      { slug: "4-aha-bha-underarm-roll-on-watermelon",     label: "Watermelon 50ml"      },
      { slug: "4-aha-bha-underarm-rollon-frag-free-75",    label: "Fragrance Free 75ml"  },
    ],
  },
  {
    newHandle:  "nutrimix-7-nutrition-powder-lj",
    baseTitle:  "Nutrimix 7+ Nutrition Powder",
    optionName: "Type",
    variants: [
      { slug: "nutrimix-nutrition-powder-7",              label: "Original"    },
      { slug: "unsweetened-nutrimix-nutrition-powder-7",  label: "Unsweetened" },
    ],
  },
  {
    newHandle:  "hair-activator-derma-roller-mm",
    baseTitle:  "Hair Activator Derma Roller",
    optionName: "Size",
    variants: [
      { slug: "hair-activator-derma-roller",      label: "0.5 mm" },
      { slug: "hair-activator-derma-roller-1mm",  label: "1 mm"   },
    ],
  },
];

// ── Shopify Admin API helpers ─────────────────────────────────────────────────
async function adminGet(path) {
  const res = await fetch(`https://${SHOP}/admin/api/2024-01${path}`, {
    headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
  });
  return res.json();
}

async function adminPost(path, body) {
  const res = await fetch(`https://${SHOP}/admin/api/2024-01${path}`, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function getProductByHandle(handle) {
  const d = await adminGet(`/products.json?handle=${handle}&fields=id,title,handle,variants,images,vendor`);
  return d.products?.[0] ?? null;
}

async function getMetafields(productId) {
  const d = await adminGet(`/products/${productId}/metafields.json`);
  return d.metafields ?? [];
}

async function createProduct(payload) {
  return adminPost("/products.json", { product: payload });
}

async function setMetafields(productId, metafields) {
  for (const mf of metafields) {
    await adminPost(`/products/${productId}/metafields.json`, {
      metafield: { namespace: mf.namespace, key: mf.key, value: mf.value, type: mf.type },
    });
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`\n${B}Shopify Variant Migration${X}${DRY_RUN ? ` ${Y}(DRY RUN — no changes)${X}` : ""}\n`);
console.log(`${D}${GROUPS.length} groups to process${X}\n`);

const results = [];

for (const group of GROUPS) {
  console.log(`${B}▶ ${group.baseTitle}${X}`);

  // 1. Fetch each existing Shopify product to get price + images
  const existing = [];
  for (const v of group.variants) {
    const p = await getProductByHandle(v.slug);
    if (!p) {
      console.log(`  ${Y}⚠ Not found on Shopify: ${v.slug}${X}`);
      existing.push({ ...v, price: "0.00", shopifyId: null, images: [] });
    } else {
      const price = p.variants?.[0]?.price ?? "0.00";
      existing.push({ ...v, price, shopifyId: p.id, images: p.images ?? [], vendor: p.vendor });
      console.log(`  ${D}· ${v.label.padEnd(20)} ₹${price}${X}`);
    }
  }

  // 2. Fetch metafields from the base (first found) product
  const base = existing.find(e => e.shopifyId);
  const metafields = base ? await getMetafields(base.shopifyId) : [];
  const bhMetafields = metafields.filter(mf => mf.namespace === "custom");
  console.log(`  ${D}· ${bhMetafields.length} metafields to copy${X}`);

  // 3. Build new product payload
  const newProduct = {
    title:  group.baseTitle,
    handle: group.newHandle,
    vendor: base?.vendor ?? "",
    status: "active",
    options: [{ name: group.optionName }],
    variants: existing.map(v => ({
      option1: v.label,
      price:   v.price,
    })),
    images: base?.images?.slice(0, 5).map(img => ({ src: img.src })) ?? [],
  };

  if (DRY_RUN) {
    console.log(`  ${G}✓ Would create: ${group.newHandle} with ${existing.length} variants${X}`);
    results.push({ group, existing, newProductId: null, newVariantIds: {} });
    continue;
  }

  // 4. Create the new product on Shopify
  const created = await createProduct(newProduct);
  if (!created.product?.id) {
    console.log(`  ${R}✗ Failed to create product: ${JSON.stringify(created).slice(0, 200)}${X}`);
    results.push({ group, existing, error: true });
    continue;
  }

  const newId = created.product.id;
  const newVariants = created.product.variants ?? [];

  // Map label → new variant ID
  const newVariantIds = {};
  for (const nv of newVariants) {
    newVariantIds[nv.option1] = nv.id;
  }

  // 5. Copy bh_ metafields to new product
  await setMetafields(newId, bhMetafields);

  console.log(`  ${G}✓ Created: ${group.newHandle} (id: ${newId})${X}`);
  newVariants.forEach(nv => console.log(`    ${D}· ${nv.option1.padEnd(20)} id:${nv.id}${X}`));

  results.push({ group, existing, newProductId: newId, newVariantIds });
}

// ── Update enriched JSONs ─────────────────────────────────────────────────────
if (!DRY_RUN) {
  console.log(`\n${B}Updating enriched JSONs...${X}\n`);

  for (const { group, existing, newVariantIds, error } of results) {
    if (error) continue;

    // Build siblings array (all variants in this group)
    const siblings = existing.map(v => ({ slug: v.slug, label: v.label }));

    for (const v of existing) {
      const filePath = join(CATALOG, `${v.slug}.json`);
      let data;
      try {
        data = JSON.parse(readFileSync(filePath, "utf8"));
      } catch {
        console.log(`  ${Y}⚠ JSON not found: ${v.slug}.json${X}`);
        continue;
      }

      data.shopifyHandle = group.newHandle;
      data.variantTitle  = v.label;
      data.variantId     = newVariantIds?.[v.label] ?? null;
      data.siblings      = siblings;

      writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`  ${G}✓ ${v.slug}.json${X}`);
    }
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
const ok      = results.filter(r => !r.error).length;
const errored = results.filter(r => r.error).length;

console.log(`\n${"─".repeat(50)}`);
if (DRY_RUN) {
  console.log(`${Y}${B}Dry run complete — ${GROUPS.length} groups previewed, nothing written.${X}`);
} else {
  console.log(`${G}${B}Done: ${ok} groups migrated${X}${errored ? `  ${R}${errored} errors${X}` : ""}`);
}
console.log();
