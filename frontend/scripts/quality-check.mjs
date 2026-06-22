#!/usr/bin/env node
/**
 * BetterHalf Product Data Quality Check
 * Usage: node scripts/quality-check.mjs
 *        node scripts/quality-check.mjs --slug anti-hair-fall-shampoo-300ml
 */

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG      = join(__dirname, "../src/catalog/enriched");
const PAIRINGS_PATH = join(__dirname, "../src/data/productPairings.ts");

// ── Terminal colours ──────────────────────────────────────────────────────────
const R = "\x1b[31m", Y = "\x1b[33m", G = "\x1b[32m";
const C = "\x1b[36m", B = "\x1b[1m",  D = "\x1b[2m",  X = "\x1b[0m";

// ── CLI args ──────────────────────────────────────────────────────────────────
const filterSlug = process.argv.includes("--slug")
  ? process.argv[process.argv.indexOf("--slug") + 1]
  : null;

// ── Load all products ─────────────────────────────────────────────────────────
const allProducts = readdirSync(CATALOG)
  .filter(f => f.endsWith(".json"))
  .map(f => JSON.parse(readFileSync(join(CATALOG, f), "utf8")));

const products = filterSlug
  ? allProducts.filter(p => p.slug === filterSlug)
  : allProducts;

const bySlug = Object.fromEntries(allProducts.map(p => [p.slug, p]));
const VALID_BRANDS = ["Man Matters", "Be Bodywise", "Little Joys"];

// ── Bad timeline patterns (mirrors useShopifyPDP.ts filter) ──────────────────
const BAD_TIMELINE_TERMS = [
  "app will be a partner", "reminders & rewards", "save upto 30%", "wallet on our app",
  "fast results", "solve the problem equally", "won't completely stop", "wont completely stop",
  "transform you overnight", "transform your skin overnight", "replace your diet",
  "help you avoid the treadmill", "doesn't replace your expert", "treat blemish overnight",
  "won't stop blemish", "wont stop blemish", "find true love", "make hair look better in a day",
  "give results overnight", "replace your hair care regimen", "won't make you powerful",
  "wont make you powerful", "become a one time solution", "replace your laundary",
  "stop aging", "replace a healthy meal",
];

function hasBadTimeline(timeline) {
  return (timeline ?? []).some(s => {
    const text = ((s.title ?? "") + " " + (s.period ?? "")).toLowerCase();
    if (BAD_TIMELINE_TERMS.some(t => text.includes(t))) return true;
    if (/^[a-z][a-z\s]+,\s*\d{2}/.test(text.trim())) return true;
    return false;
  });
}

// ── Parse pairings from TS source ─────────────────────────────────────────────
function parsePairings(src) {
  const result = {};
  const keyRe = /^\s{2}"([^"]+)":\s*\[/gm;
  let m;
  while ((m = keyRe.exec(src)) !== null) {
    const key = m[1];
    const blockStart = m.index + m[0].length;
    let depth = 1, i = blockStart;
    while (i < src.length && depth > 0) {
      if (src[i] === "[") depth++;
      if (src[i] === "]") depth--;
      i++;
    }
    const block = src.slice(blockStart, i - 1);
    result[key] = [...block.matchAll(/slug:\s*["']([^"']+)["']/g)].map(x => x[1]);
  }
  return result;
}

const pairings = parsePairings(readFileSync(PAIRINGS_PATH, "utf8"));

// ── Run checks ────────────────────────────────────────────────────────────────
const errors        = [];
const warnings      = [];
const pairingErrors = [];
const coverage      = { price: 0, images: 0, subtitle: 0, howToUse: 0,
                         ingredients: 0, faqs: 0, reviews: 0, timeline: 0, badges: 0 };

for (const p of products) {
  const s = p.slug;

  // Errors — these break the page or mislead users
  if (!p.images?.length)
    errors.push(`No images                      → ${s}`);
  if (!p.name?.trim())
    errors.push(`Missing name                   → ${s}`);
  if (!VALID_BRANDS.includes(p.brand))
    errors.push(`Invalid brand "${p.brand}"     → ${s}`);
  if (hasBadTimeline(p.timeline))
    errors.push(`Bad timeline content           → ${s}`);

  // Warnings — content gaps that hurt quality
  if (!p.subtitle?.trim())
    warnings.push(`No subtitle                    → ${s}`);
  if (!p.howToUse?.trim())
    warnings.push(`No how-to-use                  → ${s}`);
  if (!p.ingredients?.length)
    warnings.push(`No ingredients                 → ${s}`);
  if (!p.price || p.price <= 0)
    warnings.push(`No local price (Shopify only)  → ${s}`);

  // Coverage counters
  if (p.price > 0)            coverage.price++;
  if (p.images?.length)       coverage.images++;
  if (p.subtitle?.trim())     coverage.subtitle++;
  if (p.howToUse?.trim())     coverage.howToUse++;
  if (p.ingredients?.length)  coverage.ingredients++;
  if (p.faqs?.length)         coverage.faqs++;
  if (p.reviews?.length)      coverage.reviews++;
  if (p.timeline?.length)     coverage.timeline++;
  if (p.badges?.length)       coverage.badges++;
}

// Pairing checks — only run on full catalog
if (!filterSlug) {
  for (const [source, targets] of Object.entries(pairings)) {
    if (!bySlug[source]) {
      pairingErrors.push(`Source not in catalog          → ${source}`);
      continue;
    }
    const sourceBrand = bySlug[source].brand;
    for (const target of targets) {
      if (!bySlug[target]) {
        pairingErrors.push(`Target not in catalog          → ${target}  (from ${source})`);
        continue;
      }
      const targetBrand = bySlug[target].brand;
      if (sourceBrand !== targetBrand) {
        pairingErrors.push(`Cross-brand pairing            → ${source} (${sourceBrand}) → ${target} (${targetBrand})`);
      }
    }
  }
}

// ── Print report ──────────────────────────────────────────────────────────────
const total = products.length;

console.log(`\n${B}${C}━━━ BetterHalf Product Quality Report ━━━${X}`);
if (filterSlug) console.log(`${D}    Checking: ${filterSlug}${X}`);
console.log(`${D}    ${total} product${total !== 1 ? "s" : ""} checked\n${X}`);

// Errors
if (errors.length === 0) {
  console.log(`${G}${B}✅  No errors${X}`);
} else {
  console.log(`${R}${B}❌  ERRORS  (${errors.length}) — fix before deploy${X}`);
  errors.forEach(e => console.log(`    ${R}· ${e}${X}`));
}

console.log();

// Warnings
if (warnings.length === 0) {
  console.log(`${G}✅  No warnings${X}`);
} else {
  console.log(`${Y}${B}⚠️   WARNINGS  (${warnings.length}) — content gaps${X}`);
  const shown = warnings.slice(0, 25);
  shown.forEach(w => console.log(`    ${Y}· ${w}${X}`));
  if (warnings.length > 25) console.log(`    ${D}… and ${warnings.length - 25} more${X}`);
}

console.log();

// Pairings
if (!filterSlug) {
  if (pairingErrors.length === 0) {
    console.log(`${G}✅  All pairings valid & brand-pure${X}`);
  } else {
    console.log(`${R}${B}🔗  PAIRING ISSUES  (${pairingErrors.length})${X}`);
    pairingErrors.forEach(e => console.log(`    ${R}· ${e}${X}`));
  }
  console.log();
}

// Coverage bar chart
if (!filterSlug) {
  console.log(`${B}📊  Coverage${X} ${D}(optional sections — info only)${X}`);
  console.log(`    ${"─".repeat(48)}`);
  const rows = [
    ["price",       "Price"],
    ["images",      "Images"],
    ["subtitle",    "Subtitle"],
    ["howToUse",    "How to use"],
    ["ingredients", "Ingredients"],
    ["faqs",        "FAQs"],
    ["reviews",     "Reviews"],
    ["timeline",    "Timeline"],
    ["badges",      "Badges"],
  ];
  for (const [key, label] of rows) {
    const n    = coverage[key];
    const pct  = Math.round((n / total) * 100);
    const fill = Math.round(pct / 5);
    const bar  = "█".repeat(fill) + "░".repeat(20 - fill);
    const col  = pct >= 80 ? G : pct >= 50 ? Y : R;
    console.log(`    ${label.padEnd(14)} ${col}${bar}${X}  ${String(n).padStart(3)}/${total}  ${D}${pct}%${X}`);
  }
}

console.log();

// Final verdict
const totalIssues = errors.length + pairingErrors.length;
if (totalIssues === 0) {
  console.log(`${G}${B}All clear — safe to deploy.${X}\n`);
} else {
  console.log(`${R}${B}${totalIssues} issue${totalIssues !== 1 ? "s" : ""} must be fixed before deploy.${X}\n`);
}
