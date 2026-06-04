/**
 * generate-metafields-csv.mjs
 *
 * Takes the original Shopify product CSV and adds BetterHalf metafield columns.
 * Keeps ALL original columns so Shopify's importer doesn't complain about
 * missing required fields.
 *
 * Usage:
 *   node scripts/generate-metafields-csv.mjs
 *
 * Output:
 *   shopify-metafields-import.csv  (in project root)
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ── Read catalog.ts ──────────────────────────────────────────────────────────
const catalogRaw = readFileSync(resolve(root, "frontend/src/lib/ai/catalog.ts"), "utf8");

const productBlocks = catalogRaw.match(/\{\s*id:\s*["'][^"']+["'][\s\S]*?(?=\n  \},|\n\];)/g) ?? [];

function extractField(block, field) {
  if (["concern", "gender", "segment", "followUp"].includes(field)) {
    const match = block.match(new RegExp(`${field}:\\s*\\[([^\\]]+)\\]`));
    if (!match) return "";
    return match[1].split(",").map((s) => s.trim().replace(/['"]/g, "")).filter(Boolean).join(",");
  }
  const match = block.match(new RegExp(`${field}:\\s*["']?([^"',\\n]+)["']?`));
  return match ? match[1].trim().replace(/['"]/g, "") : "";
}

const catalog = {};
for (const block of productBlocks) {
  const id = extractField(block, "id");
  if (!id || catalog[id]) continue;
  catalog[id] = {
    concern:   extractField(block, "concern"),
    gender:    extractField(block, "gender"),
    segment:   extractField(block, "segment"),
    baseScore: extractField(block, "baseScore"),
    followUp:  extractField(block, "followUp"),
  };
}
console.log(`✓ Parsed catalog.ts: ${Object.keys(catalog).length} products`);

// ── Read & parse Shopify CSV ──────────────────────────────────────────────────
const shopifyRaw = readFileSync(resolve(root, "shopify-products-full.csv"), "utf8");

function parseCSV(text) {
  const lines = text.split("\n").filter(Boolean);
  const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim());
  return { headers, rows: lines.slice(1).map((line) => {
    const values = [];
    let cur = "", inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { values.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    values.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ""; });
    return obj;
  })};
}

const { headers: originalHeaders, rows: allRows } = parseCSV(shopifyRaw);
console.log(`✓ Parsed Shopify CSV: ${allRows.length} rows`);

// ── Build output ──────────────────────────────────────────────────────────────
const metafieldHeaders = [
  "Metafield: custom.bh_concern [string]",
  "Metafield: custom.bh_gender [string]",
  "Metafield: custom.bh_segment [string]",
  "Metafield: custom.bh_score [integer]",
  "Metafield: custom.bh_follow_up [string]",
];

function escapeCSV(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const allHeaders = [...originalHeaders, ...metafieldHeaders];
const outputLines = [allHeaders.map(escapeCSV).join(",")];

let matched = 0, unmatched = 0;
const seen = new Set();

for (const row of allRows) {
  const handle = row.Handle;
  const data = catalog[handle];
  const isFirst = handle && !seen.has(handle);
  if (handle) seen.add(handle);

  const originalCols = originalHeaders.map((h) => escapeCSV(row[h] ?? ""));

  let meta;
  if (isFirst && data) {
    matched++;
    meta = [data.concern, data.gender, data.segment, data.baseScore, data.followUp].map(escapeCSV);
  } else {
    if (isFirst) unmatched++;
    meta = ["", "", "", "", ""];
  }

  outputLines.push([...originalCols, ...meta].join(","));
}

// ── Write output ──────────────────────────────────────────────────────────────
const outPath = resolve(root, "shopify-metafields-import.csv");
writeFileSync(outPath, outputLines.join("\n"), "utf8");

console.log(`\n✓ Done!`);
console.log(`  Matched (data filled):   ${matched} products`);
console.log(`  Unmatched (empty rows):  ${unmatched} products`);
console.log(`→ Output: ${outPath}`);
