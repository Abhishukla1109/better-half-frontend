/**
 * Generates a Shopify product import CSV from the curated BetterHalf catalog.
 * Source: src/lib/ai/mm-products.ts + bw-products.ts + lj-mom-products.ts
 * Run:   cd frontend && npx tsx scripts/generate-shopify-csv-v2.mts
 * Output: ../shopify-products.csv
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { MM_PRODUCTS } from "../src/lib/ai/mm-products.js";
import { BW_PRODUCTS } from "../src/lib/ai/bw-products.js";
import { LJ_MOM_PRODUCTS } from "../src/lib/ai/lj-mom-products.js";
import type { Product } from "../src/lib/protocolEngine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, "../../shopify-products.csv");

const ALL_PRODUCTS: Product[] = [...MM_PRODUCTS, ...BW_PRODUCTS, ...LJ_MOM_PRODUCTS];

/* CSV cell — quote if needed */
function cell(value: string | number | undefined | null): string {
  const s = value == null ? "" : String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const HEADERS = [
  "Handle",
  "Title",
  "Body (HTML)",
  "Vendor",
  "Type",
  "Tags",
  "Published",
  "Option1 Name",
  "Option1 Value",
  "Variant SKU",
  "Variant Price",
  "Variant Compare At Price",
  "Variant Requires Shipping",
  "Variant Taxable",
  "Image Src",
  "Image Alt Text",
  "Gift Card",
  "Status",
];

const rows: string[] = [HEADERS.map(cell).join(",")];

for (const p of ALL_PRODUCTS) {
  const tags = [
    ...p.concern,
    ...p.gender,
    p.category,
    p.brand.toLowerCase().replace(/ /g, "-"),
  ]
    .filter(Boolean)
    .join(", ");

  const compareAt = p.mrp > p.price ? p.mrp : "";

  const row = [
    cell(p.id),              // Handle  — matches our slug used in resolveVariantId
    cell(p.name),            // Title
    "",                      // Body (HTML) — empty, fine for now
    cell(p.brand),           // Vendor
    cell(p.category),        // Type
    cell(tags),              // Tags
    "TRUE",                  // Published
    "Title",                 // Option1 Name
    "Default Title",         // Option1 Value
    cell(p.id),              // Variant SKU
    cell(p.price),           // Variant Price
    cell(compareAt),         // Variant Compare At Price
    "TRUE",                  // Variant Requires Shipping
    "TRUE",                  // Variant Taxable
    cell(p.image ?? ""),     // Image Src
    cell(p.name),            // Image Alt Text
    "FALSE",                 // Gift Card
    "active",                // Status
  ];

  rows.push(row.join(","));
}

writeFileSync(outputPath, rows.join("\n"), "utf8");
console.log(`Done: ${rows.length - 1} products → ${outputPath}`);
