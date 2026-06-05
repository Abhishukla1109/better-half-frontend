/**
 * Usage:
 *   node scripts/sync-product.mjs <product_id> [brand]
 *
 *   brand defaults to "mwsc" (Man Matters)
 *   other brands: bbw (Be Bodywise), lj (Little Joys) — confirm codes with colleague
 *
 * Examples:
 *   node scripts/sync-product.mjs 2025060
 *   node scripts/sync-product.mjs 2025060 mwsc
 *
 * Requires env vars:
 *   SHOPIFY_CLIENT_ID
 *   SHOPIFY_CLIENT_SECRET
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ENRICHED_DIR = path.join(ROOT, "frontend/src/catalog/enriched");
const REGISTRY_FILE = path.join(ROOT, "frontend/src/data/enrichedProducts.ts");

const SHOP = "betterhalf-4.myshopify.com";
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET ?? "";

// ── Concern mapping from Man Matters category ────────────────────────────────
const CONCERN_MAP = {
  hair: "hair",
  beard: "beard",
  nutrition: "energy",
  performance: "energy",
  skin: "skin",
  weight: "weight",
  sleep: "energy",
  hygiene: "skin",
};

const BRAND_MAP = {
  mwsc: { segment: "man-matters", gender: "male" },
  bbw:  { segment: "be-bodywise", gender: "female" },
  lj:   { segment: "little-joys", gender: "all" },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseRatingCount(str) {
  if (!str) return null;
  const s = String(str).toUpperCase().trim();
  if (s.endsWith("K")) return Math.round(parseFloat(s) * 1000);
  if (s.endsWith("M")) return Math.round(parseFloat(s) * 1000000);
  return parseInt(s, 10) || null;
}

function stripHtml(str) {
  return (str || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// ── Shopify ──────────────────────────────────────────────────────────────────
async function getShopifyToken() {
  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "client_credentials" }),
  });
  return (await res.json()).access_token;
}

async function shopifyGql(token, query, variables) {
  const res = await fetch(`https://${SHOP}/admin/api/2024-01/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function getProductGid(token, handle) {
  // Check active and archived (archived products retain their handle — can't create a new one with same handle)
  const res = await fetch(
    `https://${SHOP}/admin/api/2024-01/products.json?handle=${handle}&fields=id,status`,
    { headers: { "X-Shopify-Access-Token": token } }
  );
  const data = await res.json();
  if (!data.products?.length) return null;
  const p = data.products[0];
  return { gid: `gid://shopify/Product/${p.id}`, id: p.id, status: p.status };
}

async function publishProduct(token, productId) {
  await fetch(`https://${SHOP}/admin/api/2024-01/products/${productId}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ product: { id: productId, published: true, status: "active" } }),
  });
}

async function createShopifyProduct(token, title, handle, vendor, productType) {
  const mutation = `mutation C($input: ProductInput!) { productCreate(input: $input) { product { id handle } userErrors { field message } } }`;
  const r = await shopifyGql(token, mutation, { input: { title, handle, vendor, productType, status: "ACTIVE" } });
  return r?.data?.productCreate;
}

async function pushMetafields(token, productGid, concern, gender, segment, score) {
  const mutation = `mutation M($metafields: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $metafields) { userErrors { field message } } }`;
  const metafields = [
    { ownerId: productGid, namespace: "custom", key: "bh_concern",  type: "single_line_text_field", value: concern },
    { ownerId: productGid, namespace: "custom", key: "bh_gender",   type: "single_line_text_field", value: gender },
    { ownerId: productGid, namespace: "custom", key: "bh_segment",  type: "single_line_text_field", value: segment },
    { ownerId: productGid, namespace: "custom", key: "bh_score",    type: "number_integer",         value: String(score) },
    { ownerId: productGid, namespace: "custom", key: "bh_follow_up",type: "single_line_text_field", value: "false" },
  ];
  return shopifyGql(token, mutation, { metafields });
}

// ── Main transform ────────────────────────────────────────────────────────────
async function main() {
  const productId = process.argv[2];
  const brand = process.argv[3] ?? "mwsc";
  const slugOverride = (process.argv[4] && !process.argv[4].startsWith("--")) ? process.argv[4] : null;
  const force = process.argv.includes("--force");

  if (!productId) {
    console.error("Usage: node scripts/sync-product.mjs <product_id> [brand] [slug-override] [--force]");
    process.exit(1);
  }

  // 1. Fetch from Man Matters API
  console.log(`Fetching product ${productId} from ${brand} API...`);
  const apiUrl = `https://api.manmatters.com/portal/page/${brand}/widgetised/product/${productId}`;
  const apiRes = await fetch(apiUrl);
  if (!apiRes.ok) {
    console.error(`API error: ${apiRes.status} ${apiRes.statusText}`);
    process.exit(1);
  }
  const apiData = await apiRes.json();
  if (apiData.isError) {
    console.error("API returned error:", apiData.message);
    process.exit(1);
  }

  const data = apiData.data;
  const widgetMap = {};
  for (const w of (data.widgets ?? [])) {
    if (w.id) widgetMap[w.id] = w.widgetData ?? {};
  }

  // 2. Extract fields
  const summary = widgetMap["product-summary"]?.productSummary ?? {};
  const name = summary.name ?? data.productInfo?.name ?? "";
  const subtitle = summary.subtitle ?? data.productInfo?.subtitle ?? "";
  const rawApiSlug = data.productInfo?.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  // Sanitize: lowercase, replace non-alphanumeric with hyphens, strip leading/trailing hyphens
  const apiSlug = rawApiSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const slug = slugOverride ?? apiSlug;
  const price = summary.discountedPrice || summary.actualPrice || 0;
  const mrp = summary.actualPrice || price;
  // category can live in several places depending on product
  const category = data.category
    ?? data.productInfo?.category
    ?? summary.category
    ?? summary.rx_category
    ?? summary.diagnosisList?.[0]?.category
    ?? "";
  const concern = CONCERN_MAP[category] ?? (category || "general");
  const { segment, gender } = BRAND_MAP[brand] ?? { segment: "man-matters", gender: "male" };

  // Rating
  const ratingOverview = widgetMap["ratings-and-reviews"]?.ratingOverview ?? {};
  const ratingAvg = parseFloat(summary.rating ?? ratingOverview.overAllRating ?? 0) || null;
  const ratingCountFallback = (ratingOverview.ratingsStats ?? []).reduce((s, r) => s + (r.numberOfReviews ?? 0), 0);
  const ratingCount = parseRatingCount(summary.reviewCount) ?? (ratingCountFallback || null);

  // Images
  const imageItems = widgetMap["pdp-hero-carousel-with-thumbnail"]?.items ?? [];
  const images = imageItems
    .map(i => i.media?.source ?? i.media?.thumbnail ?? "")
    .filter(Boolean);

  // Ingredients
  const ingItems = widgetMap["key-ingredients-cards"]?.items ?? [];
  const ingredients = ingItems
    .filter(i => i.name)
    .map(i => ({
      name: i.name,
      icon: i.icon ?? "",
      shortDesc: stripHtml(i.description ?? ""),
      longDesc: stripHtml(i.largeDescription ?? i.description ?? ""),
    }));

  // Timeline (things-to-note widget — used for treatment journey on serum/kit products)
  const tntItems = widgetMap["things-to-note"]?.items ?? [];
  const timeline = tntItems
    .map(t => {
      const title = t.title ?? t.textContentTitle?.text ?? "";
      const description = stripHtml(t.description ?? t.desc ?? t.textContentDescription?.text ?? "");
      const image = t.media?.source ?? t.media?.thumbnail ?? t.icon ?? t.cardTitleImg ?? "";
      return { period: title, title, description, image };
    })
    .filter(t => t.title && t.description);

  // How to use — prefer dedicated widget, fall back to product-description "How to Use" item
  const htuItems = widgetMap["how-its-used"]?.items ?? [];
  let howToUse = htuItems
    .map(s => stripHtml(s.description ?? s.content ?? ""))
    .filter(Boolean)
    .join(" ");

  // product-description widget — Details bullets + How to Use fallback
  const descItems = widgetMap["product-description"]?.items ?? [];
  const detailItem = descItems.find(i => /detail/i.test(i.title ?? ""));
  const htuDescItem = descItems.find(i => /how\s*to\s*use/i.test(i.title ?? ""));
  if (!howToUse && htuDescItem) {
    howToUse = stripHtml(htuDescItem.text ?? htuDescItem.content ?? "");
  }
  const descriptionBullets = detailItem
    ? stripHtml(detailItem.text ?? "")
        .split(/\n|\.(?=\s)/)
        .map(s => s.replace(/^[•🌟💎🔥✅📦🌿⚡️💡👉🏆]+\s*/, "").trim())
        .filter(s => s.length > 10)
        .slice(0, 6)
    : [];

  // Badges — from why-choose-mm (Safe & Effective trust signals)
  const whyItems = widgetMap["why-choose-mm"]?.items ?? [];
  const badges = whyItems
    .map(i => ({
      label: i.textContentTitle?.text ?? i.title ?? "",
      icon: i.icon ?? "",
    }))
    .filter(b => b.label);

  // Additional information (specs, manufacturer, etc.)
  const additionalInfo = (widgetMap["additional-information"]?.items ?? [])
    .filter(i => i.title && i.content)
    .map(i => ({ title: i.title, content: stripHtml(i.content) }));

  // Reviews — top reviews from ratings widget
  const topReviews = widgetMap["ratings-and-reviews"]?.topReviews ?? [];
  const reviews = topReviews
    .filter(r => r.rating && r.body && r.body.length > 5)
    .slice(0, 5)
    .map(r => ({
      rating: r.rating,
      author: r.author ?? "",
      title: r.title ?? "",
      body: r.body,
      date: r.dateCreated ? r.dateCreated.split("T")[0] : "",
      verified: true,
    }));

  // FAQs
  const faqList = widgetMap["we-got-answers"]?.list ?? [];
  const faqs = faqList
    .filter(f => f.title && f.content)
    .map(f => ({
      question: f.title,
      answer: stripHtml(f.content ?? ""),
    }));

  // Meta description
  const metaDescription = data.meta?.metaDescription ?? data.meta?.description ?? "";

  // 3. Build enriched JSON
  const enriched = {
    slug,
    shopifyHandle: slug,
    sourceId: String(productId),
    brand: brand === "mwsc" ? "Man Matters" : brand === "bbw" ? "Be Bodywise" : "Little Joys",
    name,
    subtitle,
    metaDescription,
    rating: { average: ratingAvg, count: ratingCount },
    price,
    mrp,
    images,
    ingredients,
    timeline,
    howToUse,
    faqs,
    heroVideo: null,
    packs: [],
    badges,
    reviews,
    disclaimers: [],
    worksBestWith: [],
    additionalInfo,
    productDetails: { description: descriptionBullets, details: [] },
  };

  // 4. Write enriched JSON
  const outFile = path.join(ENRICHED_DIR, `${slug}.json`);
  if (fs.existsSync(outFile) && !force) {
    console.warn(`⚠  ${outFile} already exists — skipping file write. Use --force to overwrite.`);
  } else {
    fs.writeFileSync(outFile, JSON.stringify(enriched, null, 2));
    console.log(`✓ Written: src/catalog/enriched/${slug}.json`);
  }

  // 5. Shopify: push metafields (create product if missing)
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.warn("⚠  SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET not set — skipping Shopify step.");
  } else {
    const token = await getShopifyToken();
    let found = await getProductGid(token, slug);
    let gid = found?.gid ?? null;
    let numericId = found?.id ?? null;

    if (!gid) {
      console.log(`Creating Shopify product: ${slug}...`);
      const created = await createShopifyProduct(token, name, slug, "Man Matters", category);
      if (created?.userErrors?.length) {
        console.error("Create errors:", created.userErrors);
      } else {
        gid = created.product.id;
        numericId = gid.split("/").pop();
        console.log(`✓ Created: ${slug}`);
      }
    } else if (found.status === "archived") {
      console.log(`↑ Un-archiving: ${slug}...`);
      await publishProduct(token, numericId);
    } else {
      console.log(`✓ Found existing Shopify product: ${slug}`);
    }

    if (gid) {
      const score = concern === "beard" ? 85 : concern === "hair" ? 80 : 75;
      const mr = await pushMetafields(token, gid, concern, gender, segment, score);
      const ue = mr?.data?.metafieldsSet?.userErrors ?? [];
      if (ue.length) console.error("Metafield errors:", ue);
      else console.log(`✓ Metafields pushed for ${slug}`);

      // Set price on default variant
      if (price > 0 && numericId) {
        const varData = await (await fetch(`https://${SHOP}/admin/api/2024-01/products/${numericId}/variants.json?fields=id,price`, { headers: { "X-Shopify-Access-Token": token } })).json();
        const variantId = varData.variants?.[0]?.id;
        const currentPrice = parseFloat(varData.variants?.[0]?.price || "0");
        if (variantId && currentPrice === 0) {
          await shopifyGql(token,
            `mutation($id:ID!,$in:ProductVariantInput!){productVariantUpdate(id:$id,input:$in){userErrors{message}}}`,
            { id: `gid://shopify/ProductVariant/${variantId}`, in: { id: `gid://shopify/ProductVariant/${variantId}`, price: String(price), compareAtPrice: mrp > price ? String(mrp) : null } }
          );
          console.log(`✓ Price set: ₹${price}${mrp > price ? ` (MRP ₹${mrp})` : ""}`);
        }
      }

      // Ensure published to storefront
      if (numericId) await publishProduct(token, numericId);
      console.log(`✓ Published to storefront: ${slug}`);
    }
  }

  // 6. Auto-register in enrichedProducts.ts
  const rawVarName = slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
  const varName = /^\d/.test(rawVarName) ? `p${rawVarName}` : rawVarName;
  let registry = fs.readFileSync(REGISTRY_FILE, "utf8");

  if (registry.includes(`"${slug}"`)) {
    console.log(`✓ Already registered in enrichedProducts.ts: ${slug}`);
  } else {
    // Add import after the last existing import line
    const lastImportIdx = registry.lastIndexOf("\nimport ");
    const endOfLastImport = registry.indexOf("\n", lastImportIdx + 1);
    const importLine = `\nimport ${varName} from "@/catalog/enriched/${slug}.json";`;
    registry = registry.slice(0, endOfLastImport) + importLine + registry.slice(endOfLastImport);

    // Add entry before the closing }; of the ENRICHED object
    const closingIdx = registry.lastIndexOf("\n};");
    const entryLine = `\n  "${slug}": ${varName} as EnrichedPDP,`;
    registry = registry.slice(0, closingIdx) + entryLine + registry.slice(closingIdx);

    fs.writeFileSync(REGISTRY_FILE, registry);
    console.log(`✓ Registered in enrichedProducts.ts: ${slug}`);
  }

  console.log(`\nDone: ${name} | ₹${price} | ${ratingAvg}★ | concern: ${concern} | gender: ${gender}`);
}

main().catch(err => { console.error(err); process.exit(1); });
