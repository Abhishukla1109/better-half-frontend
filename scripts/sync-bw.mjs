/**
 * sync-bw.mjs  —  Be Bodywise product sync
 *
 * Usage:
 *   node scripts/sync-bw.mjs <bw-url-key> [--force]
 *
 * Example:
 *   node scripts/sync-bw.mjs hair-health-gummies
 *
 * What it does:
 *   1. Fetches product data from Be Bodywise API
 *   2. Transforms to BetterHalf EnrichedPDP format
 *   3. Saves to frontend/src/catalog/enriched/<slug>.json
 *   4. Creates or un-archives the product on Shopify
 *   5. Sets price, image, and all bh_* metafields
 *   6. Registers the slug in enrichedProducts.ts
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ENRICHED_DIR = join(ROOT, "frontend/src/catalog/enriched");
const REGISTRY_FILE = join(ROOT, "frontend/src/data/enrichedProducts.ts");

const SHOP = "betterhalf-4.myshopify.com";
const CI = process.env.SHOPIFY_CLIENT_ID ?? "";
const CS = process.env.SHOPIFY_CLIENT_SECRET ?? "";

const BW_API = "https://api.bebodywise.com/portal/page/mwsc/widgetised/product";

// ── Concern mapping from Be Bodywise category → our concern tags ──────────────
const CONCERN_MAP = {
  hair:       "hair",
  skin:       "skin",
  body:       "skin",
  nutrition:  "energy",
  energy:     "energy",
  hormones:   "hormones",
  weight:     "weight",
  sleep:      "sleep",
  pcos:       "hormones",
  "body-care": "skin",
};

// ── followUp tags per concern (female, maps to mock-generator followUp strings)─
const FOLLOW_UP_DEFAULTS = {
  hair:     "hair fall,thinning,shedding,density,postpartum",
  skin:     "acne,pimples,oily,breakouts,dullness,pigmentation",
  hormones: "pms cramps,irregular periods hormonal,hormonal acne,low energy",
  energy:   "fatigue,energy,consistently low,afternoon crash",
  weight:   "fat,lose,body composition,metabolism",
  sleep:    "sleep,poor sleep,insomnia,fatigue,recovery",
};

// ── HTML stripper ─────────────────────────────────────────────────────────────
function stripHtml(html) {
  return (html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Shopify helpers ────────────────────────────────────────────────────────────
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

async function shopifyGql(token, query, variables) {
  const r = await fetch(`https://${SHOP}/admin/api/2024-01/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  return r.json();
}

async function getProductGid(token, handle) {
  const r = await fetch(
    `https://${SHOP}/admin/api/2024-01/products.json?handle=${handle}&fields=id,status`,
    { headers: { "X-Shopify-Access-Token": token } }
  );
  const d = await r.json();
  if (!d.products?.length) return null;
  const p = d.products[0];
  return { gid: `gid://shopify/Product/${p.id}`, id: p.id, status: p.status };
}

async function createProduct(token, handle, title, price, mrp, imageUrl) {
  const body = {
    product: {
      title,
      handle,
      vendor: "Be Bodywise",
      product_type: "Supplement",
      status: "active",
      published: true,
      variants: [{ price: String(price), compare_at_price: mrp > price ? String(mrp) : null }],
      ...(imageUrl ? { images: [{ src: imageUrl }] } : {}),
    },
  };
  const r = await fetch(`https://${SHOP}/admin/api/2024-01/products.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (d.errors) throw new Error(JSON.stringify(d.errors));
  const p = d.product;
  return { gid: `gid://shopify/Product/${p.id}`, id: p.id };
}

async function unarchiveProduct(token, id) {
  await fetch(`https://${SHOP}/admin/api/2024-01/products/${id}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ product: { id, status: "active", published: true } }),
  });
}

async function setVariantPrice(token, productId, price, mrp) {
  const r = await fetch(`https://${SHOP}/admin/api/2024-01/products/${productId}/variants.json?fields=id,price`, {
    headers: { "X-Shopify-Access-Token": token },
  });
  const d = await r.json();
  const variant = d.variants?.[0];
  if (!variant) return;
  const currentPrice = parseFloat(variant.price || "0");
  if (currentPrice === 0 || currentPrice !== price) {
    await fetch(`https://${SHOP}/admin/api/2024-01/variants/${variant.id}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ variant: { id: variant.id, price: String(price), compare_at_price: mrp > price ? String(mrp) : null } }),
    });
  }
}

async function addImageIfMissing(token, productId, imageUrl) {
  if (!imageUrl) return;
  const r = await fetch(`https://${SHOP}/admin/api/2024-01/products/${productId}/images/count.json`, {
    headers: { "X-Shopify-Access-Token": token },
  });
  const d = await r.json();
  if ((d.count ?? 0) === 0) {
    await fetch(`https://${SHOP}/admin/api/2024-01/products/${productId}/images.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ image: { src: imageUrl } }),
    });
  }
}

async function pushMetafields(token, gid, fields) {
  const mf = fields.map(({ key, value, type }) => ({
    ownerId: gid,
    namespace: "custom",
    key,
    type: type ?? "single_line_text_field",
    value: String(value),
  }));
  const res = await shopifyGql(token, `
    mutation($mf: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $mf) { userErrors { field message } }
    }
  `, { mf });
  const errors = res?.data?.metafieldsSet?.userErrors ?? [];
  if (errors.length) throw new Error(errors.map(e => e.message).join(", "));
}

// ── Registry helpers ───────────────────────────────────────────────────────────
function slugToVarName(slug) {
  return slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function registerInEnrichedProducts(slug) {
  let src = readFileSync(REGISTRY_FILE, "utf8");
  const varName = slugToVarName(slug);
  const importLine = `import ${varName} from "@/catalog/enriched/${slug}.json";\n`;
  const registryEntry = `  "${slug}": ${varName} as EnrichedPDP,\n`;

  if (src.includes(`"${slug}"`)) {
    console.log(`  Already registered: ${slug}`);
    return;
  }

  // Add import after last import line
  const lastImport = src.lastIndexOf("\nimport ");
  const insertImportAt = src.indexOf("\n", lastImport + 1) + 1;
  src = src.slice(0, insertImportAt) + importLine + src.slice(insertImportAt);

  // Add to ENRICHED object before closing }
  const closingBrace = src.lastIndexOf("};");
  src = src.slice(0, closingBrace) + registryEntry + src.slice(closingBrace);

  writeFileSync(REGISTRY_FILE, src, "utf8");
  console.log(`  Registered: ${slug}`);
}

// ── Be Bodywise transformer ────────────────────────────────────────────────────
function getWidget(widgets, id) {
  return widgets.find(w => w.id === id) ?? null;
}

function transformBW(urlKey, data) {
  const { productInfo: pi, description, widgets, meta } = data;

  // Images
  const heroWidget = getWidget(widgets, "pdp-hero-carousel-with-thumbnail");
  const images = (heroWidget?.widgetData?.items ?? [])
    .map(item => item?.media?.source ?? item?.thumbnail)
    .filter(Boolean);
  if (!images.length && pi.prod_img) images.push(pi.prod_img);

  // Ingredients
  const ingWidget = getWidget(widgets, "key-ingredients-cards");
  const ingredients = (ingWidget?.widgetData?.items ?? []).map(item => ({
    name: item.name ?? "",
    icon: item.icon ?? "",
    shortDesc: (item.description ?? "").replace(/<[^>]+>/g, "").trim(),
    longDesc: stripHtml(item.largeDescription ?? item.description ?? ""),
  })).filter(i => i.name);

  // Timeline (how-it-works)
  const hiwWidget = getWidget(widgets, "how-it-works");
  const timeline = (hiwWidget?.widgetData?.items ?? []).map(item => ({
    period: item.imgBottomLabel ?? "",
    title: item.header ?? "",
    description: stripHtml(item.description ?? ""),
    image: item?.media?.source ?? "",
  })).filter(t => t.image);

  // FAQs
  const faqWidget = getWidget(widgets, "we-got-answers");
  const faqs = (faqWidget?.widgetData?.list ?? [])
    .filter(f => f.title && f.content)
    .map(f => ({ question: f.title, answer: stripHtml(f.content) }));

  // Reviews
  const revWidget = getWidget(widgets, "ratings-and-reviews");
  const reviews = (revWidget?.widgetData?.topReviews ?? []).map(r => ({
    rating: parseFloat(r.rating ?? "5"),
    author: r.author ?? "",
    title: r.title ?? "",
    body: r.body ?? "",
    date: r.dateCreated ?? "",
    verified: true,
  }));

  // Badges
  const badgeWidget = getWidget(widgets, "safe-and-effective-grid");
  const badges = (badgeWidget?.widgetData?.items ?? []).map(item => {
    const labelRaw = item.textContentTitle;
    const label = typeof labelRaw === "string"
      ? labelRaw
      : (labelRaw?.text ?? "");
    return { label, icon: item.icon ?? "" };
  }).filter(b => b.label);

  // Product description / details
  const descWidget = getWidget(widgets, "product-description");
  const descItems = descWidget?.widgetData?.items ?? [];
  const descriptionLines = descItems
    .map(item => stripHtml(item.text ?? item.content ?? ""))
    .filter(Boolean);

  // How to use
  const rawHowTo = description?.usage?.text ?? pi.usage_instructions?.join(" ") ?? "";
  const howToUse = stripHtml(rawHowTo);

  // Additional info
  const aiWidget = getWidget(widgets, "additional-information");
  const additionalInfo = (aiWidget?.widgetData?.items ?? [])
    .filter(i => i.title && i.content)
    .map(i => ({ title: i.title, content: typeof i.content === "string" ? i.content : String(i.content) }));

  // Rating
  const avgRating = parseFloat(pi.rating ?? "0") || null;
  const countRaw = pi.users_reviewed ?? pi.reviews ?? "0";
  const countNum = typeof countRaw === "string"
    ? parseInt(countRaw.replace(/[^0-9]/g, ""), 10)
    : parseInt(String(countRaw), 10);

  // Packs from variants
  const packs = (pi.variantSkus ?? []).map((sku, i) => ({
    label: sku,
    type: "sku",
    sku,
    urlKey: pi.url_key ?? urlKey,
  })).slice(0, 3);

  // Concern
  const rawCat = (pi.category ?? "hair").toLowerCase();
  const concern = CONCERN_MAP[rawCat] ?? "energy";

  // Price
  const price = pi.discountedPrice ?? pi.discounted_price ?? pi.actualPrice ?? 0;
  const mrp   = pi.actualPrice ?? pi.price ?? price;

  return {
    enriched: {
      slug: urlKey,
      sourceId: String(pi.id ?? ""),
      brand: "Be Bodywise",
      name: pi.name ?? "",
      subtitle: pi.subtitle ?? "",
      metaDescription: meta?.metaDescription ?? "",
      rating: { average: avgRating, count: isNaN(countNum) ? null : countNum },
      images,
      heroVideo: null,
      packs,
      badges,
      ingredients,
      productDetails: {
        description: descriptionLines,
        details: [
          pi.key_ingredients?.length
            ? { feature: "Key Ingredients", value: pi.key_ingredients.join(", ") }
            : null,
          pi.doc_expectation_setting?.length
            ? { feature: "Expected Results", value: pi.doc_expectation_setting.join(", ") }
            : null,
          pi.usage_unit?.length
            ? { feature: "Pack Size", value: pi.usage_unit.join(", ") }
            : null,
        ].filter(Boolean),
      },
      howToUse,
      timeline,
      faqs,
      reviews,
      disclaimers: [],
      worksBestWith: [],
      additionalInfo,
      forWith: pi.card_for_with
        ? { for: pi.card_for_with.For ?? "", with: pi.card_for_with.With ?? "" }
        : undefined,
      recommendation: pi.recommendation ?? undefined,
    },
    concern,
    price: Math.round(price),
    mrp: Math.round(mrp),
    image: images[0] ?? null,
    name: pi.name ?? "",
  };
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const urlKey = args.find(a => !a.startsWith("--"));
  const force = args.includes("--force");

  if (!urlKey) {
    console.error("Usage: node scripts/sync-bw.mjs <bw-url-key> [--force]");
    process.exit(1);
  }

  console.log(`\nSyncing Be Bodywise product: ${urlKey}\n`);

  // 1. Fetch from Be Bodywise API
  console.log("Fetching from Be Bodywise API...");
  const apiRes = await fetch(`${BW_API}/${urlKey}`);
  if (!apiRes.ok) throw new Error(`API error: ${apiRes.status} ${apiRes.statusText}`);
  const apiData = await apiRes.json();
  if (!apiData.status) throw new Error("API returned error: " + JSON.stringify(apiData));
  const data = apiData.data;

  // 2. Transform
  const { enriched, concern, price, mrp, image, name } = transformBW(urlKey, data);
  console.log(`  Name: ${name}`);
  console.log(`  Concern: ${concern} | Price: ₹${price} | MRP: ₹${mrp}`);
  console.log(`  Images: ${enriched.images.length} | Ingredients: ${enriched.ingredients.length} | FAQs: ${enriched.faqs.length} | Reviews: ${enriched.reviews.length}`);

  // 3. Save JSON
  const jsonPath = join(ENRICHED_DIR, `${urlKey}.json`);
  if (existsSync(jsonPath) && !force) {
    console.log(`\n  JSON already exists (use --force to overwrite): ${urlKey}.json`);
  } else {
    writeFileSync(jsonPath, JSON.stringify(enriched, null, 2), "utf8");
    console.log(`  Saved: ${urlKey}.json`);
  }

  // 4. Shopify
  console.log("\nShopify sync...");
  const token = await getToken();

  let found = await getProductGid(token, urlKey);
  let gid = found?.gid ?? null;
  let numericId = found?.id ?? null;

  if (!gid) {
    console.log(`  Creating new product: ${urlKey}...`);
    const created = await createProduct(token, urlKey, name, price, mrp, image);
    gid = created.gid;
    numericId = created.id;
    console.log(`  Created: ${gid}`);
  } else if (found.status === "archived") {
    console.log(`  Un-archiving: ${urlKey}...`);
    await unarchiveProduct(token, numericId);
    console.log(`  Un-archived`);
    await setVariantPrice(token, numericId, price, mrp);
    await addImageIfMissing(token, numericId, image);
  } else {
    console.log(`  Found existing product: ${urlKey}`);
    await setVariantPrice(token, numericId, price, mrp);
    await addImageIfMissing(token, numericId, image);
  }

  // 5. Push metafields
  const segment = "female-18-25,female-25-35,female-35-plus";
  const followUp = FOLLOW_UP_DEFAULTS[concern] ?? "energy,health";

  await pushMetafields(token, gid, [
    { key: "bh_concern",   value: concern },
    { key: "bh_gender",    value: "female" },
    { key: "bh_segment",   value: segment },
    { key: "bh_score",     value: 75, type: "number_integer" },
    { key: "bh_follow_up", value: followUp },
  ]);
  console.log(`  Metafields pushed: concern=${concern} gender=female`);

  // 6. Register in enrichedProducts.ts
  console.log("\nRegistering in enrichedProducts.ts...");
  registerInEnrichedProducts(urlKey);

  console.log(`\n✓ Done: ${urlKey}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
