/**
 * Fixes Shopify product handles to match Mosaic's canonical product keys.
 *
 * Usage:
 *   node scripts/fix-handles.mjs           ← dry run (shows what would change)
 *   node scripts/fix-handles.mjs --apply   ← actually makes changes
 *
 * Requires env vars: SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET
 *
 * What it does per product:
 *   Man Matters → handle = sourceId (numeric, e.g. "1605")
 *   Be Bodywise → handle = productInfo.slug from Mosaic API (authoritative text slug)
 *   Little Joys → handle = productInfo.slug from Mosaic API (authoritative text slug)
 *
 * Keeps old ENRICHED key alongside new one in enrichedProducts.ts so nothing breaks mid-deploy.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ENRICHED_DIR = path.join(ROOT, "frontend/src/catalog/enriched");
const REGISTRY_FILE = path.join(ROOT, "frontend/src/data/enrichedProducts.ts");

const APPLY = process.argv.includes("--apply");
const SHOP = "betterhalf-4.myshopify.com";
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET ?? "";

const BRAND_API = {
  "Man Matters": "https://api.manmatters.com/portal/page/mwsc/widgetised/product",
  "Be Bodywise": "https://api.bebodywise.com/portal/page/mwsc/widgetised/product",
  "Little Joys": "https://api.ourlittlejoys.com/portal/page/mwsc/widgetised/product",
};

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function sanitizeSlug(raw) {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// ── Shopify ──────────────────────────────────────────────────────────────────

async function getShopifyToken() {
  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "client_credentials" }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get Shopify token");
  return data.access_token;
}

async function getProductByHandle(token, handle) {
  const res = await fetch(
    `https://${SHOP}/admin/api/2024-01/products.json?handle=${encodeURIComponent(handle)}&fields=id,handle,title,status`,
    { headers: { "X-Shopify-Access-Token": token } }
  );
  const data = await res.json();
  return data.products?.[0] ?? null;
}

async function updateShopifyHandle(token, productId, newHandle) {
  const res = await fetch(
    `https://${SHOP}/admin/api/2024-01/products/${productId}.json`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ product: { id: productId, handle: newHandle } }),
    }
  );
  if (res.status === 422) {
    const err = await res.json();
    throw new Error(`Handle "${newHandle}" rejected: ${JSON.stringify(err.errors)}`);
  }
  const data = await res.json();
  return data.product?.handle ?? null;
}

// ── Mosaic API ───────────────────────────────────────────────────────────────

// Slugs we know were incorrectly prefixed/suffixed when building enriched JSONs
const SLUG_OVERRIDES = {
  "lj-multivitamin-gummies": "multivitamin-gummies",
};

function getCorrectHandle(brand, sourceId, currentSlug) {
  // Manual overrides for known bad slugs
  if (SLUG_OVERRIDES[currentSlug]) return SLUG_OVERRIDES[currentSlug];
  // MM uses numeric IDs — the sourceId IS the canonical handle
  if (brand === "Man Matters") return String(sourceId);
  // BB and LJ use text slugs — the slug already in the enriched JSON
  // came from the Mosaic API when the enriched files were originally built,
  // so it IS the authoritative slug. No API call needed.
  return currentSlug;
}

// ── enrichedProducts.ts ──────────────────────────────────────────────────────

function addRegistryKey(oldKey, newKey) {
  let registry = fs.readFileSync(REGISTRY_FILE, "utf8");

  // Already has the new key — nothing to do
  if (registry.includes(`"${newKey}":`)) return false;

  // Find the old key line and insert new key after it
  const oldLine = `"${oldKey}":`;
  const idx = registry.indexOf(oldLine);
  if (idx === -1) return false;

  const lineEnd = registry.indexOf("\n", idx);
  const oldLineContent = registry.slice(idx, lineEnd);

  // New key line: same import variable, new key
  const varMatch = oldLineContent.match(/:\s*(\S+)\s+as\s+EnrichedPDP/);
  if (!varMatch) return false;
  const varName = varMatch[1];

  const newLine = `\n  "${newKey}": ${varName} as EnrichedPDP,`;
  registry = registry.slice(0, lineEnd) + newLine + registry.slice(lineEnd);

  if (APPLY) fs.writeFileSync(REGISTRY_FILE, registry);
  return true;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("Missing SHOPIFY_CLIENT_ID or SHOPIFY_CLIENT_SECRET");
    process.exit(1);
  }

  if (!APPLY) {
    console.log("DRY RUN — run with --apply to make changes\n");
  } else {
    console.log("APPLY MODE — making real changes\n");
  }

  const token = await getShopifyToken();
  // Process MM first so they free their text-slug handles before BB/LJ claim them
  const allFiles = fs.readdirSync(ENRICHED_DIR).filter(f => f.endsWith(".json"));
  const mmFiles = allFiles.filter(f => {
    try { return JSON.parse(fs.readFileSync(path.join(ENRICHED_DIR, f), "utf8")).brand === "Man Matters"; } catch { return false; }
  });
  const otherFiles = allFiles.filter(f => !mmFiles.includes(f));
  const files = [...mmFiles.sort(), ...otherFiles.sort()];

  const results = { updated: 0, alreadyCorrect: 0, notInShopify: 0, apiError: 0, shopifyError: 0 };

  for (const file of files) {
    const filePath = path.join(ENRICHED_DIR, file);
    let product;
    try {
      product = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
      console.log(`⚠  Skipping ${file}: JSON parse error`);
      continue;
    }

    const { brand, sourceId, slug: currentSlug } = product;
    if (!sourceId || !brand || !currentSlug) {
      console.log(`⚠  Skipping ${file}: missing brand/sourceId/slug`);
      continue;
    }

    // 1. Determine correct handle
    const correctHandle = getCorrectHandle(brand, sourceId, currentSlug);
    if (!correctHandle) {
      console.log(`✗ Cannot determine handle for ${currentSlug} (${brand} #${sourceId})`);
      results.apiError++;
      continue;
    }

    // 2. Already correct — skip
    if (correctHandle === currentSlug) {
      console.log(`✓ OK: ${currentSlug}`);
      results.alreadyCorrect++;
      continue;
    }

    console.log(`→ ${currentSlug} → ${correctHandle} (${brand} #${sourceId})`);

    if (!APPLY) {
      results.updated++;
      continue;
    }

    // 3. Find product in Shopify by current handle
    const shopifyProduct = await getProductByHandle(token, currentSlug);
    await sleep(250);

    if (!shopifyProduct) {
      console.log(`  ⚠  Not found in Shopify: ${currentSlug}`);
      results.notInShopify++;
      continue;
    }

    // 4. Update Shopify handle
    try {
      const applied = await updateShopifyHandle(token, shopifyProduct.id, correctHandle);
      if (!applied) throw new Error("No handle returned");
      console.log(`  ✓ Shopify updated → ${applied}`);
    } catch (err) {
      console.log(`  ✗ Shopify error: ${err.message}`);
      results.shopifyError++;
      await sleep(300);
      continue;
    }
    await sleep(300);

    // 5. Update shopifyHandle in enriched JSON
    product.shopifyHandle = correctHandle;
    fs.writeFileSync(filePath, JSON.stringify(product, null, 2));
    console.log(`  ✓ JSON updated`);

    // 6. Add new key in enrichedProducts.ts (keep old key too)
    const keyAdded = addRegistryKey(currentSlug, correctHandle);
    if (keyAdded) console.log(`  ✓ enrichedProducts.ts: added "${correctHandle}" key`);

    results.updated++;
    await sleep(300);
  }

  console.log(`\n── Summary ──────────────────────────────────`);
  console.log(`  Would update / updated:  ${results.updated}`);
  console.log(`  Already correct:         ${results.alreadyCorrect}`);
  console.log(`  Not in Shopify:          ${results.notInShopify}`);
  console.log(`  Mosaic API errors:       ${results.apiError}`);
  console.log(`  Shopify update errors:   ${results.shopifyError}`);
  if (!APPLY && results.updated > 0) {
    console.log(`\nRun with --apply to apply these ${results.updated} changes.`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
