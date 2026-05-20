/**
 * Generates a Shopify-compatible product import CSV from the real BetterHalf catalog.
 * Source: /Users/mosaic/Documents/response.json
 * Run: node scripts/generate-shopify-csv.mjs
 * Output: shopify-products.csv (project root, one level up)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, '../../shopify-products.csv');

// Load the real catalog
const raw = JSON.parse(readFileSync('/Users/mosaic/Documents/response.json', 'utf8'));
const allProducts = Object.values(raw.data);

// Publishable filter
const NUMERIC_SLUG = /^\d+$/;
const SKIP_CATEGORIES = new Set(['freemerch', 'Freemerch']);
const SKIP_SLUGS = new Set(['sampler-note', 'all-sampler-kit']);

const publishable = allProducts.filter(p =>
  p.visibility &&
  !p.out_of_stock &&
  Number(p.price) > 0 &&
  !p.is_rx &&
  p.url_key &&
  !NUMERIC_SLUG.test(p.url_key) &&
  !SKIP_CATEGORIES.has(p.category) &&
  !SKIP_SLUGS.has(p.url_key)
);

// Deduplicate by url_key (keep first occurrence)
const seen = new Set();
const products = publishable.filter(p => {
  if (seen.has(p.url_key)) return false;
  seen.add(p.url_key);
  return true;
});

// Brand from SKU prefix
function getBrand(sku) {
  if (!sku) return 'BetterHalf';
  if (sku.startsWith('MWLJ')) return 'Little Joys';
  if (sku.startsWith('MWMM')) return 'Man Matters';
  if (sku.startsWith('MWBB')) return 'Be Bodywise';
  return 'BetterHalf';
}

// Human-readable category
function getType(category) {
  const map = {
    milkmix: 'NutriMix',
    gummies: 'Gummies',
    'personal-care': 'Personal Care',
    healthysnacks: 'Healthy Snacks',
    nutrition: 'Nutrition',
    others: 'Wellness',
  };
  return map[category] || 'Wellness';
}

// Selling price: discounted_price if > 0, else price
function getPrice(p) {
  const disc = Number(p.discounted_price);
  return disc > 0 ? disc : Number(p.price);
}

// Compare-at price: only set when there's an actual discount
function getCompareAt(p) {
  const disc = Number(p.discounted_price);
  if (disc > 0 && disc < Number(p.price)) return Number(p.price);
  return '';
}

// CSV cell: quote if contains comma, quote, or newline
function cell(value) {
  const s = value == null ? '' : String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// Build tags: combine product tags + category + concern
function buildTags(p) {
  const parts = [];
  if (Array.isArray(p.tags)) parts.push(...p.tags);
  if (p.category) parts.push(p.category);
  if (p.diagnosisConcern) parts.push(p.diagnosisConcern);
  // Deduplicate
  return [...new Set(parts.filter(Boolean))].join(', ');
}

// Body HTML: prefer soDesc (rich), fall back to pdp_desc, then generic_name
function buildBody(p) {
  if (p.soDesc && p.soDesc.trim().length > 0) return p.soDesc.trim();
  if (p.pdp_desc && p.pdp_desc.trim().length > 0) return `<p>${p.pdp_desc.trim()}</p>`;
  if (p.generic_name) return `<p>${p.generic_name}</p>`;
  return '';
}

const HEADERS = [
  'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Type', 'Tags', 'Published',
  'Option1 Name', 'Option1 Value',
  'Variant SKU', 'Variant Price', 'Variant Compare At Price',
  'Variant Requires Shipping', 'Variant Taxable',
  'Image Src',
  'Gift Card', 'Status',
];

const rows = [HEADERS.map(cell).join(',')];

for (const p of products) {
  const brand = getBrand(p.sku);
  const type = getType(p.category);
  const tags = buildTags(p);
  const body = buildBody(p);
  const price = getPrice(p);
  const compareAt = getCompareAt(p);
  const imgSrc = p.prod_img || '';

  // Single variant per product (no pack matrix in response.json)
  const row = [
    cell(p.url_key),         // Handle
    cell(p.name),            // Title
    cell(body),              // Body (HTML)
    cell(brand),             // Vendor
    cell(type),              // Type
    cell(tags),              // Tags
    'TRUE',                  // Published
    'Title',                 // Option1 Name
    'Default Title',         // Option1 Value
    cell(p.sku || ''),       // Variant SKU
    cell(price),             // Variant Price
    cell(compareAt),         // Variant Compare At Price
    'TRUE',                  // Variant Requires Shipping
    'TRUE',                  // Variant Taxable
    cell(imgSrc),            // Image Src
    'FALSE',                 // Gift Card
    'active',                // Status
  ];

  rows.push(row.join(','));
}

writeFileSync(outputPath, rows.join('\n'), 'utf8');
console.log(`✓ ${rows.length - 1} products written to ${outputPath}`);
