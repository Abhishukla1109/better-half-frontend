/**
 * sync-lj.mjs  —  Little Joys product sync
 *
 * Usage:
 *   SHOPIFY_CLIENT_ID=... SHOPIFY_CLIENT_SECRET=... node scripts/sync-lj.mjs <lj-url-key> [--force] [--as <local-slug>]
 *
 * Examples:
 *   node scripts/sync-lj.mjs nutrimix-nutrition-powder
 *   node scripts/sync-lj.mjs multivitamin-gummies --as lj-multivitamin-gummies
 *
 * What it does:
 *   1. Fetches product data from Little Joys API
 *   2. Transforms to BetterHalf EnrichedPDP format (with age group + allergen fields)
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

const LJ_API = "https://api.ourlittlejoys.com/portal/page/mwsc/widgetised/product";

// ── Product type detection from URL key ────────────────────────────────────────
function detectProductType(urlKey) {
  const momTerms   = ["mamamix", "-moms", "moms-", "mother", "mvg-mom"];
  const foodTerms  = ["spread", "-sauce", "sauce-", "-jam", "jam-", "peanut-butter",
                      "crunch", "choco-fills", "-chips", "noodles", "protein-oats",
                      "snack-time", "mixed-nut", "pancake", "honey", "electrolyte"];
  const careTerms  = ["toothpaste", "shampoo", "body-lotion", "lip-balm", "mosquito"];

  if (momTerms.some(t => urlKey.includes(t)))  return "mom";
  if (careTerms.some(t => urlKey.includes(t))) return "care";
  if (foodTerms.some(t => urlKey.includes(t))) return "food";
  return "kids";
}

// ── Age segment from URL key ────────────────────────────────────────────────────
function detectAgeSegment(urlKey, productType) {
  if (productType === "mom")  return "female-18-25,female-25-35,female-35-plus";
  if (productType === "food") return "child-2-6,child-7-12,child-13-18";
  if (productType === "care") return "child-2-6,child-7-12";
  if (urlKey.includes("-13") || urlKey.includes("13-18") || urlKey.includes("immunity-kit-13") || urlKey.includes("teens")) return "child-13-18";
  if (urlKey.includes("-7") || urlKey.includes("7plus") || urlKey.includes("7-plus") || urlKey.includes("-7-") || urlKey.endsWith("-7")) return "child-7-12";
  return "child-2-6";
}

// ── Human-readable age label ────────────────────────────────────────────────────
function ageLabel(segment) {
  if (segment.includes("child-13-18")) return "13–18 years";
  if (segment.includes("child-7-12"))  return "7–12 years";
  if (segment.includes("child-2-6"))   return "2–6 years";
  if (segment.includes("female"))      return "For Moms";
  return "";
}

// ── Concern detection ───────────────────────────────────────────────────────────
function detectConcern(urlKey, productType) {
  if (productType === "food")                                          return "healthy-snacks";
  if (urlKey.includes("toothpaste"))                                   return "dental";
  if (urlKey.includes("shampoo") || urlKey.includes("lotion") ||
      urlKey.includes("lip-balm") || urlKey.includes("mosquito"))      return "skincare";
  if (urlKey.includes("hair-health"))                                  return "hair";
  if (urlKey.includes("calcium"))                                      return "bone-growth";
  if (urlKey.includes("brain") || urlKey.includes("activemix"))       return "brain-focus";
  if (urlKey.includes("magnesium"))                                    return "sleep";
  if (urlKey.includes("immunity"))                                     return "immunity";
  if (urlKey.includes("multivitamin") || urlKey.includes("mvg"))      return "immunity";
  if (urlKey.includes("nutrimix") || urlKey.includes("proteinmix") ||
      urlKey.includes("mamamix") || urlKey.includes("protein-oats"))  return "nutrition";
  if (urlKey.includes("electrolyte"))                                  return "energy";
  return "nutrition";
}

// ── Score per concern ───────────────────────────────────────────────────────────
const CONCERN_SCORES = {
  immunity:        80,
  nutrition:       80,
  "bone-growth":   78,
  "brain-focus":   80,
  sleep:           78,
  "healthy-snacks":70,
  dental:          72,
  skincare:        72,
  hair:            78,
  energy:          76,
};

// ── FollowUp per concern ────────────────────────────────────────────────────────
const FOLLOW_UP_DEFAULTS = {
  immunity:        "immunity,multivitamin,sick,infections,gut health,vitamins",
  nutrition:       "nutrition,growth,weight,protein,vitamins,powder",
  "bone-growth":   "calcium,bones,height,growth,strength,bone health",
  "brain-focus":   "brain,focus,memory,learning,concentration,development",
  sleep:           "sleep,rest,magnesium,calm,relaxation,insomnia",
  "healthy-snacks":"snacks,healthy eating,food,clean ingredients,no sugar",
  dental:          "teeth,toothpaste,dental,oral health,cavity",
  skincare:        "skin,lotion,moisturizer,body care,rash,sensitive",
  hair:            "hair fall,thinning,postpartum,shedding,hair health",
  energy:          "fatigue,energy,vitamins,multivitamin,tired",
};

// ── HTML stripper ──────────────────────────────────────────────────────────────
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
      vendor: "Little Joys",
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
  const name = slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
  return /^\d/.test(name) ? `lj${name.charAt(0).toUpperCase()}${name.slice(1)}` : name;
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

  const lastImport = src.lastIndexOf("\nimport ");
  const insertImportAt = src.indexOf("\n", lastImport + 1) + 1;
  src = src.slice(0, insertImportAt) + importLine + src.slice(insertImportAt);

  const closingBrace = src.lastIndexOf("};");
  src = src.slice(0, closingBrace) + registryEntry + src.slice(closingBrace);

  writeFileSync(REGISTRY_FILE, src, "utf8");
  console.log(`  Registered: ${slug}`);
}

// ── Little Joys transformer ────────────────────────────────────────────────────
function getWidget(widgets, id) {
  return widgets.find(w => w.id === id) ?? null;
}

function transformLJ(urlKey, effectiveSlug, data, productType, concern, segment) {
  const { productInfo: pi, description, widgets, meta } = data;

  // Images
  const heroWidget = getWidget(widgets, "pdp-hero-carousel-with-thumbnail");
  const images = (heroWidget?.widgetData?.items ?? [])
    .map(item => item?.media?.source ?? item?.thumbnail)
    .filter(Boolean);
  if (!images.length && pi.prod_img) images.push(pi.prod_img);

  // Ingredients — LJ uses ingredients-accordion-background with sectionData
  const ingWidget = getWidget(widgets, "ingredients-accordion-background");
  const ingSections = ingWidget?.widgetData?.sectionData ?? [];
  const ingredients = ingSections.flatMap(section =>
    (section.items ?? []).map(item => ({
      name: item.title ?? "",
      icon: item.icon ?? item.image ?? "",
      shortDesc: stripHtml(item.description ?? ""),
      longDesc: "",
    }))
  ).filter(i => i.name);
  // Full ingredients list for PDP display
  const fullIngredientsList = ingWidget?.widgetData?.footerData?.content ?? "";

  // Benefits / Claims — LJ uses claims-grid (replaces BW's how-it-works timeline)
  const claimsWidget = getWidget(widgets, "claims-grid");
  const benefits = (claimsWidget?.widgetData?.items ?? []).map(item => ({
    title: item.title ?? "",
    description: stripHtml(item.text ?? ""),
    icon: item.media?.source ?? "",
  })).filter(b => b.title);

  // FAQs — LJ uses faq-accordion-show-more
  const faqWidget = getWidget(widgets, "faq-accordion-show-more");
  const faqs = (faqWidget?.widgetData?.items ?? [])
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

  // How to use — LJ uses how-to-use-widget with a content field
  const howWidget = getWidget(widgets, "how-to-use-widget");
  const rawHowTo = howWidget?.widgetData?.content
    ?? description?.usage?.text
    ?? pi.usage_instructions?.join(" ")
    ?? "";
  const howToUse = stripHtml(rawHowTo);

  // Product description
  const descWidget = getWidget(widgets, "product-description");
  const descItems = descWidget?.widgetData?.items ?? [];
  const descriptionLines = descItems
    .map(item => stripHtml(item.text ?? item.content ?? ""))
    .filter(Boolean);

  // Additional info
  const aiWidget = getWidget(widgets, "additional-information");
  const additionalInfo = (aiWidget?.widgetData?.items ?? [])
    .filter(i => i.title && i.content)
    .map(i => ({ title: i.title, content: typeof i.content === "string" ? i.content : String(i.content) }));

  // Allergens
  const allergenRaw = pi.allergen_info ?? pi.allergens ?? "";
  const allergens = allergenRaw
    ? (Array.isArray(allergenRaw) ? allergenRaw : allergenRaw.split(",").map(s => s.trim()).filter(Boolean))
    : [];

  // Age group
  const ageGroup = pi.age_group ?? pi.ageGroup ?? ageLabel(segment);

  // Rating
  const avgRating = parseFloat(pi.rating ?? "0") || null;
  const countRaw = pi.users_reviewed ?? pi.reviews ?? "0";
  const countNum = typeof countRaw === "string"
    ? parseInt(countRaw.replace(/[^0-9]/g, ""), 10)
    : parseInt(String(countRaw), 10);

  // Price
  const price = pi.discountedPrice || pi.discounted_price || pi.actualPrice || pi.price || 0;
  const mrp   = pi.actualPrice || pi.price || price;

  return {
    enriched: {
      slug: effectiveSlug,
      sourceId: String(pi.id ?? ""),
      brand: "Little Joys",
      name: pi.name ?? "",
      subtitle: pi.subtitle ?? "",
      metaDescription: meta?.metaDescription ?? "",
      rating: { average: avgRating, count: isNaN(countNum) ? null : countNum },
      images,
      heroVideo: null,
      ageGroup,
      allergens,
      productType,
      packs: [],
      badges: [],
      timeline: [],
      benefits,
      ingredients,
      fullIngredientsList,
      productDetails: {
        description: descriptionLines,
        details: [
          ageGroup ? { feature: "Age Group", value: ageGroup } : null,
          pi.key_ingredients?.length
            ? { feature: "Key Ingredients", value: pi.key_ingredients.join(", ") }
            : null,
          pi.usage_unit?.length
            ? { feature: "Pack Size", value: pi.usage_unit.join(", ") }
            : null,
        ].filter(Boolean),
      },
      howToUse,
      faqs,
      reviews,
      disclaimers: [],
      worksBestWith: [],
      additionalInfo,
      forWith: pi.card_for_with
        ? { for: pi.card_for_with.For ?? "", with: pi.card_for_with.With ?? "" }
        : undefined,
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
  const asIdx = args.indexOf("--as");
  const localSlug = asIdx !== -1 ? args[asIdx + 1] : null;

  if (!urlKey) {
    console.error("Usage: node scripts/sync-lj.mjs <lj-url-key> [--force] [--as <local-slug>]");
    process.exit(1);
  }

  const effectiveSlug = localSlug ?? urlKey;
  const productType = detectProductType(effectiveSlug);
  const segment = detectAgeSegment(effectiveSlug, productType);
  const concern = detectConcern(effectiveSlug, productType);
  const gender = productType === "mom" ? "female" : "child";

  console.log(`\nSyncing Little Joys product: ${urlKey}`);
  if (localSlug) console.log(`  → stored as: ${effectiveSlug}`);
  console.log(`  type=${productType} | concern=${concern} | segment=${segment}\n`);

  // 1. Fetch from Little Joys API
  console.log("Fetching from Little Joys API...");
  const apiRes = await fetch(`${LJ_API}/${urlKey}`);
  if (!apiRes.ok) throw new Error(`API error: ${apiRes.status} ${apiRes.statusText}`);
  const apiData = await apiRes.json();
  if (!apiData.status) throw new Error("API returned error: " + JSON.stringify(apiData));
  const data = apiData.data;

  // 2. Transform
  const { enriched, price, mrp, image, name } = transformLJ(urlKey, effectiveSlug, data, productType, concern, segment);
  console.log(`  Name: ${name}`);
  console.log(`  Price: ₹${price} | MRP: ₹${mrp}`);
  console.log(`  Images: ${enriched.images.length} | Ingredients: ${enriched.ingredients.length} | FAQs: ${enriched.faqs.length} | Reviews: ${enriched.reviews.length}`);

  // 3. Save JSON
  const jsonPath = join(ENRICHED_DIR, `${effectiveSlug}.json`);
  if (existsSync(jsonPath) && !force) {
    console.log(`\n  JSON exists (use --force to overwrite): ${effectiveSlug}.json`);
  } else {
    writeFileSync(jsonPath, JSON.stringify(enriched, null, 2), "utf8");
    console.log(`  Saved: ${effectiveSlug}.json`);
  }

  // 4. Shopify
  console.log("\nShopify sync...");
  const token = await getToken();

  let found = await getProductGid(token, effectiveSlug);
  let gid = found?.gid ?? null;
  let numericId = found?.id ?? null;

  if (!gid) {
    console.log(`  Creating: ${effectiveSlug}...`);
    const created = await createProduct(token, effectiveSlug, name, price, mrp, image);
    gid = created.gid;
    numericId = created.id;
    console.log(`  Created: ${gid}`);
  } else if (found.status === "archived") {
    console.log(`  Un-archiving: ${effectiveSlug}...`);
    await unarchiveProduct(token, numericId);
    await setVariantPrice(token, numericId, price, mrp);
    await addImageIfMissing(token, numericId, image);
  } else {
    console.log(`  Found existing: ${effectiveSlug}`);
    await setVariantPrice(token, numericId, price, mrp);
    await addImageIfMissing(token, numericId, image);
  }

  // 5. Push metafields
  const score = CONCERN_SCORES[concern] ?? 75;
  const followUp = FOLLOW_UP_DEFAULTS[concern] ?? "health,wellness";

  await pushMetafields(token, gid, [
    { key: "bh_concern",   value: concern },
    { key: "bh_gender",    value: gender },
    { key: "bh_segment",   value: segment },
    { key: "bh_score",     value: score, type: "number_integer" },
    { key: "bh_follow_up", value: followUp },
  ]);
  console.log(`  Metafields: concern=${concern} gender=${gender} score=${score}`);

  // 6. Register in enrichedProducts.ts
  console.log("\nRegistering in enrichedProducts.ts...");
  registerInEnrichedProducts(effectiveSlug);

  console.log(`\n✓ Done: ${effectiveSlug}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
