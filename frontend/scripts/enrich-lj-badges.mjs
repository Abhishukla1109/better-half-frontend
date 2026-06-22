#!/usr/bin/env node
/**
 * Fetches badge data from Little Joys API for all LJ products
 * and writes it into their enriched JSON files.
 *
 * LJ uses MEDIA_GRID widget (id: product-description-media-grid)
 * instead of TILE_GRID (safe-and-effective-grid) that MM/BW use.
 *
 * Usage: node scripts/enrich-lj-badges.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG = join(__dirname, "../src/catalog/enriched");
const DRY_RUN = process.argv.includes("--dry-run");

const G = "\x1b[32m", R = "\x1b[31m", Y = "\x1b[33m", D = "\x1b[2m", X = "\x1b[0m";

// Load all LJ products
const ljProducts = readdirSync(CATALOG)
  .filter(f => f.endsWith(".json"))
  .map(f => ({ file: f, data: JSON.parse(readFileSync(join(CATALOG, f), "utf8")) }))
  .filter(({ data }) => data.brand === "Little Joys");

console.log(`\nEnriching badges for ${ljProducts.length} Little Joys products${DRY_RUN ? " (DRY RUN)" : ""}...\n`);

// Extract badges from widgets — handles both LJ (MEDIA_GRID) and MM/BW (TILE_GRID) structures
function extractBadgesFromWidgets(widgets) {
  if (!Array.isArray(widgets)) return [];

  for (const w of widgets) {
    // LJ: MEDIA_GRID (id: product-description-media-grid)
    // items[].media.altText = label, items[].media.source = icon URL
    if (w.type === "MEDIA_GRID" && w.id?.includes("product-description")) {
      const items = w.widgetData?.items ?? [];
      const badges = items
        .map(item => ({
          label: (item.media?.altText ?? "").trim(),
          icon:  item.media?.source ?? "",
        }))
        .filter(b => b.label);
      if (badges.length) return badges;
    }

    // MM/BW: TILE_GRID (id: safe-and-effective-grid)
    // widgetData.usage[].desc = label, .icon = icon
    if (w.type === "TILE_GRID" && w.id?.includes("safe-and-effective")) {
      const items = w.widgetData?.usage ?? w.widgetData?.items ?? [];
      const badges = items
        .map(item => ({
          label: (item.desc ?? item.title ?? item.label ?? "").trim(),
          icon:  item.icon ?? "",
        }))
        .filter(b => b.label);
      if (badges.length) return badges;
    }
  }

  return [];
}

let updated = 0, skipped = 0, failed = 0;
const results = [];

// Process all LJ products
for (const { file, data } of ljProducts) {
  const slug = data.slug;
  const url = `https://api.ourlittlejoys.com/portal/page/mwsc/widgetised/product/${slug}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      results.push({ slug, status: "error", msg: `HTTP ${res.status}` });
      failed++;
      continue;
    }

    const json = await res.json();
    const widgets = json?.data?.widgets ?? [];
    const badges = extractBadgesFromWidgets(widgets);

    if (badges.length === 0) {
      results.push({ slug, status: "no-badges", msg: `${widgets.length} widgets, no badge widget found` });
      skipped++;
      continue;
    }

    if (!DRY_RUN) {
      data.badges = badges;
      writeFileSync(join(CATALOG, file), JSON.stringify(data, null, 2));
    }

    results.push({ slug, status: "ok", badges });
    updated++;
  } catch (err) {
    results.push({ slug, status: "error", msg: err.message });
    failed++;
  }
}

// Print results
console.log("Results:\n");
for (const r of results) {
  if (r.status === "ok") {
    console.log(`${G}✅ ${r.slug}${X}`);
    r.badges.forEach(b => console.log(`   ${D}· ${b.label}${X}`));
  } else if (r.status === "no-badges") {
    console.log(`${Y}⚠️  ${r.slug} — ${r.msg}${X}`);
  } else {
    console.log(`${R}❌ ${r.slug} — ${r.msg}${X}`);
  }
}

console.log(`\n${"─".repeat(50)}`);
console.log(`${G}Updated: ${updated}${X}  ${Y}No badges found: ${skipped}${X}  ${R}Errors: ${failed}${X}\n`);
if (DRY_RUN) console.log(`${Y}Dry run — no files written.${X}\n`);
