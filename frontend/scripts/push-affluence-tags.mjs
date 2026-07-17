/**
 * Push bh_brand metafield + Affluence category/subcategory Shopify tags to all products.
 * Usage:
 *   node scripts/push-affluence-tags.mjs           # live run
 *   node scripts/push-affluence-tags.mjs --dry-run # preview only
 */

const SHOP      = process.env.SHOPIFY_SHOP        ?? "betterhalf-4.myshopify.com";
const TOKEN     = process.env.SHOPIFY_ADMIN_TOKEN ?? "";
const ADMIN_API = `https://${SHOP}/admin/api/2024-01/graphql.json`;
const DRY_RUN   = process.argv.includes("--dry-run");

const G = "\x1b[32m", Y = "\x1b[33m", R = "\x1b[31m", D = "\x1b[2m", B = "\x1b[1m", X = "\x1b[0m";

async function gql(query, variables = {}) {
  const res = await fetch(ADMIN_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

// ── Fetch all active products ─────────────────────────────────────────────────
async function fetchAllProducts() {
  const products = [];
  let cursor = null;
  while (true) {
    const data = await gql(`
      query($cursor: String) {
        products(first: 50, after: $cursor, query: "status:active") {
          pageInfo { hasNextPage endCursor }
          nodes {
            id title vendor tags
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

// ── Brand from Shopify vendor ─────────────────────────────────────────────────
function normalizeBrand(vendor) {
  if (vendor === "Be Bodywise") return "Be Bodywise";
  if (vendor === "Little Joys") return "Little Joys";
  return "Man Matters";
}

// ── Affluence category + subcategory tags ────────────────────────────────────
function getAffluenceTags(product, mf) {
  const concerns  = (mf.bh_concern ?? "").split(",").map(c => c.trim()).filter(Boolean);
  const gender    = (mf.bh_gender  ?? "").split(",").map(g => g.trim());
  const segments  = (mf.bh_segment ?? "").split(",").map(s => s.trim());
  const title     = product.title.toLowerCase();
  const tags      = new Set();

  const has = (...keys) => keys.some(k => concerns.includes(k));
  const inTitle = (...words) => words.some(w => title.includes(w));

  // ── Hair & Beard ─────────────────────────────────────────────────────────
  if (has("hair", "dandruff", "beard")) {
    tags.add("Hair & Beard");
    if (has("beard") || inTitle("beard", "beardmax"))
      tags.add("Beard growth");
    if (has("dandruff") || inTitle("dandruff", "scalp", "ketoconazole", "zpto"))
      tags.add("Dandruff & scalp care");
    if (inTitle("gummies", "biotin") && has("hair"))
      tags.add("Hair gummies & supplements");
    if (inTitle("regrowth", "minoxidil", "growmax", "folli", "minoxifin", "procapil", "finasteride"))
      tags.add("Hair regrowth");
    if (inTitle("conditioner", "frizz") || (has("hair") && inTitle("dry")))
      tags.add("Dry, damaged & frizzy hair");
    // default hair subcategory if none assigned yet
    if (has("hair") && !["Beard growth","Dandruff & scalp care","Hair gummies & supplements","Hair regrowth","Dry, damaged & frizzy hair"].some(t => tags.has(t)))
      tags.add("Hair fall & thinning");
  }

  // ── Skin & Body ───────────────────────────────────────────────────────────
  if (has("skin", "acne")) {
    tags.add("Skin & Body");
    if (has("acne") || inTitle("acne", "pimple", "salicylic", "benzoyl", "patch"))
      tags.add("Face acne & pimple care");
    if (inTitle("pigmentation", "niacinamide", "aha", "bha", "glow", "mark", "rejuv", "glycolic"))
      tags.add("Marks, pigmentation & glow");
    if (inTitle("sunscreen", "spf", "sun protection", "mineral sunscreen"))
      tags.add("Sun protection");
    if (inTitle("underarm", "roll on", "roll-on", "odour", "deodor"))
      tags.add("Underarms & odour");
    if (inTitle("body acne", "body wash", "body scrub") && (has("acne") || inTitle("salicylic", "aha", "bha")))
      tags.add("Body acne & bumps");
    if (inTitle("urea", "heel", "stretch mark", "lotion", "moistur", "dry skin", "body butter", "hyaluronic", "lactic"))
      tags.add("Dry skin, heels & stretch marks");
  }

  // ── Nutrition & Fitness ───────────────────────────────────────────────────
  if (has("energy", "sleep", "stress", "weight", "nutrition")) {
    tags.add("Nutrition & Fitness");
    if (inTitle("multivitamin", "multi vitamin", "mvg") && !segments.some(s => s.startsWith("kids-")) && !segments.some(s => s.startsWith("female-")))
      tags.add("Multivitamins & daily wellness");
    if (inTitle("protein", "whey", "plant protein", "activemix", "proteinmix"))
      tags.add("Protein & nutrition powders");
    if (inTitle("creatine", "electrolyte", "workout"))
      tags.add("Creatine & workout support");
    if (inTitle("shilajit", "tostero", "testosterone") || has("energy") && inTitle("stamina", "endure"))
      tags.add("Shilajit & stamina");
    if (has("sleep", "stress") || inTitle("magnesium", "ashwagandha", "sleep", "stress"))
      tags.add("Sleep, stress & magnesium");
    if (has("weight") || inTitle("weight", "metabolism", "fat"))
      tags.add("Weight & metabolism");
  }

  // ── Kids & Teens ─────────────────────────────────────────────────────────
  if (segments.some(s => s.startsWith("kids-"))) {
    tags.add("Kids & Teens");
    if (inTitle("nutrimix", "health drink", "millet", "noodles", "super blend", "super protein"))
      tags.add("Nutrimix & health drinks");
    if (inTitle("multivitamin", "immunity", "gummies") && !inTitle("calcium", "brain"))
      tags.add("Multivitamin & immunity gummies");
    if (inTitle("brain", "focus", "memory", "dha"))
      tags.add("Brain & focus");
    if (inTitle("calcium", "bone"))
      tags.add("Bone & calcium");
    if (inTitle("protein", "whey"))
      tags.add("Protein & healthy foods");
    if (inTitle("toothpaste", "body lotion", "lip balm", "mosquito", "personal care"))
      tags.add("Kids personal care");
  }

  // ── Moms & Women ─────────────────────────────────────────────────────────
  if (segments.some(s => s.startsWith("female-"))) {
    tags.add("Moms & Women");
    if (inTitle("multivitamin", "mvg") || (inTitle("energy") && segments.some(s => s.startsWith("female-"))))
      tags.add("Moms' multivitamins & energy");
    if (inTitle("calcium"))
      tags.add("Calcium & bone health");
    if (inTitle("magnesium", "sleep"))
      tags.add("Sleep & magnesium");
    if (inTitle("hair", "biotin", "postpartum"))
      tags.add("Hair health & postpartum hair fall");
    if (inTitle("mamamix", "breastfeed", "pregnancy"))
      tags.add("Pregnancy / breastfeeding-safe picks");
  }

  // ── Kits & Combos ─────────────────────────────────────────────────────────
  if (inTitle("kit") || title.includes("|") || inTitle("combo", "bundle", "1x ", "2x ", "3x ")) {
    tags.add("Kits & Combos");
    if (inTitle("hair") && inTitle("kit", "regime", "regrowth"))   tags.add("Hair regrowth kits");
    if (inTitle("beard") && inTitle("kit"))                         tags.add("Beard growth kits");
    if ((has("skin") || has("acne")) && inTitle("kit"))             tags.add("Skin & body kits");
    if (segments.some(s => s.startsWith("kids-")) && inTitle("kit")) tags.add("Kids health kits");
    if (segments.some(s => s.startsWith("female-")) && inTitle("kit")) tags.add("Moms & family combos");
  }

  return [...tags];
}

// ── Push bh_brand metafield ───────────────────────────────────────────────────
async function pushBrand(productId, brand) {
  await gql(`
    mutation($input: ProductInput!) {
      productUpdate(input: $input) {
        product { id }
        userErrors { field message }
      }
    }
  `, {
    input: {
      id: productId,
      metafields: [{ namespace: "custom", key: "bh_brand", value: brand, type: "single_line_text_field" }],
    },
  });
}

// ── Push Shopify tags (merges with existing) ──────────────────────────────────
async function pushTags(productId, existingTags, newTags) {
  const AFFLUENCE_TAG_VALUES = [
    "Hair & Beard","Hair fall & thinning","Hair regrowth","Dandruff & scalp care",
    "Dry, damaged & frizzy hair","Hair gummies & supplements","Beard growth",
    "Skin & Body","Face acne & pimple care","Marks, pigmentation & glow",
    "Sun protection","Body acne & bumps","Underarms & odour","Dry skin, heels & stretch marks",
    "Nutrition & Fitness","Multivitamins & daily wellness","Protein & nutrition powders",
    "Creatine & workout support","Shilajit & stamina","Sleep, stress & magnesium","Weight & metabolism",
    "Kids & Teens","Nutrimix & health drinks","Multivitamin & immunity gummies","Brain & focus",
    "Bone & calcium","Protein & healthy foods","Kids personal care",
    "Moms & Women","Moms' multivitamins & energy","Calcium & bone health",
    "Sleep & magnesium","Hair health & postpartum hair fall","PCOS, PMS & cycle support","Pregnancy / breastfeeding-safe picks",
    "Kits & Combos","Hair regrowth kits","Beard growth kits","Skin & body kits",
    "Kids health kits","Moms & family combos","Trial packs & best-value packs",
  ];
  // Remove old affluence tags, add new ones
  const cleaned = existingTags.filter(t => !AFFLUENCE_TAG_VALUES.includes(t));
  const merged  = [...new Set([...cleaned, ...newTags])];
  await gql(`
    mutation($input: ProductInput!) {
      productUpdate(input: $input) {
        product { id }
        userErrors { field message }
      }
    }
  `, { input: { id: productId, tags: merged } });
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`\n${B}━━━ Push bh_brand + Affluence Tags ━━━${X}`);
if (DRY_RUN) console.log(`${Y}DRY RUN — nothing will be written${X}\n`);

const products = await fetchAllProducts();
console.log(`${D}${products.length} active products fetched\n${X}`);

let ok = 0, skipped = 0;

for (const product of products) {
  const mf       = Object.fromEntries(product.metafields.nodes.map(m => [m.key, m.value]));
  const brand    = normalizeBrand(product.vendor);
  const affTags  = getAffluenceTags(product, mf);

  if (!mf.bh_concern) {
    console.log(`${Y}⚠  Skipping (no bh_concern): ${product.title}${X}`);
    skipped++;
    continue;
  }

  console.log(`${D}· ${product.title}${X}`);
  console.log(`  brand: ${brand} | tags: ${affTags.join(", ") || "(none)"}`);

  if (!DRY_RUN) {
    await pushBrand(product.id, brand);
    await pushTags(product.id, product.tags, affTags);
  }
  ok++;
}

console.log(`\n${G}${B}Done — ${ok} products updated${skipped ? `, ${skipped} skipped` : ""}${X}\n`);
