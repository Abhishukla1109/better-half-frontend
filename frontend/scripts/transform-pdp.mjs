/**
 * PDP Transformer: converts MM / BB / LJ product JSONs into BetterHalf enriched PDP format.
 *
 * Usage:
 *   node scripts/transform-pdp.mjs <input.json> [--slug <betterhalf-slug>] [--brand "Man Matters"]
 *
 * Output:
 *   src/catalog/enriched/<slug>.json
 *
 * Example:
 *   node scripts/transform-pdp.mjs ~/Downloads/2026-06-03-1605.json --slug biotin-hair-gummies-30n --brand "Man Matters"
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(__dirname, "../src/catalog/enriched");
mkdirSync(outputDir, { recursive: true });

// ── Parse CLI args ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (!args[0]) {
  console.error("Usage: node scripts/transform-pdp.mjs <input.json> [--slug <slug>] [--brand <brand>]");
  process.exit(1);
}

const inputPath = resolve(args[0]);
let overrideSlug = null;
let overrideBrand = null;
for (let i = 1; i < args.length; i++) {
  if (args[i] === "--slug" && args[i + 1]) overrideSlug = args[++i];
  if (args[i] === "--brand" && args[i + 1]) overrideBrand = args[++i];
}

const raw = JSON.parse(readFileSync(inputPath, "utf8"));
const s = raw.sections ?? {};

// ── Helpers ─────────────────────────────────────────────────────────────────
function clean(str) {
  return (str ?? "").trim();
}

function firstNonEmpty(...vals) {
  for (const v of vals) if (clean(v)) return clean(v);
  return "";
}

// Keep first N complete sentences — never cuts mid-sentence
function trimToSentences(str, max = 2) {
  const text = clean(str);
  const sentences = text.match(/[^.!?]*(?:[.!?]+|$)/g)
    ?.map(s => s.trim()).filter(Boolean) ?? [];
  if (sentences.length <= max) return text;
  return sentences.slice(0, max).join(" ").trim();
}

// ── Brand detection ──────────────────────────────────────────────────────────
function detectBrand(raw) {
  if (overrideBrand) return overrideBrand;
  const url = JSON.stringify(raw).toLowerCase();
  if (url.includes("bebodywise") || url.includes("be bodywise")) return "Be Bodywise";
  if (url.includes("littlejoys") || url.includes("little joys")) return "Little Joys";
  return "Man Matters"; // default
}

// ── Slug ─────────────────────────────────────────────────────────────────────
function deriveSlug(raw) {
  if (overrideSlug) return overrideSlug;
  // Try to get from meta title or productInfo name
  const name = clean(raw.productInfo?.name ?? raw.meta?.title ?? "");
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

// ── Source ID (MM product ID from URL key) ───────────────────────────────────
function deriveSourceId(raw) {
  const variants = raw.variationData?.configOptons?.[0]?.variants ?? [];
  const base = variants.find((v) => v.label?.value === "30N") ?? variants[0];
  return base?.urlKey ?? basename(inputPath, ".json");
}

// ── Images ───────────────────────────────────────────────────────────────────
function extractImages(raw) {
  const gallery = raw.imageGallery ?? [];
  const images = [];
  const videos = [];

  for (const item of gallery) {
    // Always collect the image URL
    if (item.original) images.push(item.original);
    // Collect the first video separately
    const videoSrc = item.customVideo?.mobileSource;
    if (videoSrc && !videos.includes(videoSrc)) videos.push(videoSrc);
  }
  return { images, videos };
}

// ── Packs / variants ─────────────────────────────────────────────────────────
function extractPacks(raw) {
  const configs = raw.variationData?.configOptons ?? [];
  const packs = [];
  for (const config of configs) {
    for (const v of config.variants ?? []) {
      packs.push({
        label: clean(v.label?.value ?? v.name),
        type: clean(config.title),
        sku: clean(v.sku),
        urlKey: clean(v.urlKey),
      });
    }
  }
  return packs;
}

// ── Trust badges ─────────────────────────────────────────────────────────────
function extractBadges(s) {
  return (s.safeAndEffective?.usage ?? [])
    .filter((b) => clean(b.desc))
    .map((b) => ({ label: clean(b.desc), icon: clean(b.icon) }));
}

// ── Ingredients ──────────────────────────────────────────────────────────────
function extractIngredients(s) {
  return (s.keyIngredients?.cards ?? [])
    .filter((c) => clean(c.name))
    .map((c) => ({
      name: clean(c.name),
      icon: clean(c.icon),
      shortDesc: clean(c.description),
      longDesc: clean(c.largeDescription),
    }));
}

// ── Product details (supplement facts) ───────────────────────────────────────
function extractProductDetails(s) {
  const pcd = s.productContainsDetails ?? {};
  return {
    description: (pcd.description ?? []).map(clean).filter(Boolean),
    details: (pcd.details ?? [])
      .filter((d) => clean(d.feature) && clean(d.value))
      .map((d) => ({ feature: clean(d.feature), value: clean(d.value) })),
  };
}

// ── How to use ───────────────────────────────────────────────────────────────
function extractHowToUse(s) {
  // Try howItsUsed first (has heading + step-by-step instructions)
  const hiu = s.howItsUsed;
  if (hiu?.steps?.length) {
    const heading = clean(hiu.heading);
    const steps = hiu.steps
      .map((st) => clean(st.description ?? st.title ?? ""))
      .filter(Boolean);
    return [heading, ...steps].filter(Boolean).join(". ");
  }
  // Fallback: mmHowToUseV2
  const v2 = s.mmHowToUseV2;
  if (Array.isArray(v2) && v2.length) {
    return v2.map((step) => clean(step.description ?? step.title ?? "")).filter(Boolean).join(" ");
  }
  if (v2 && typeof v2 === "object") {
    return clean(v2.description ?? v2.text ?? "");
  }
  return "";
}

// ── Timeline ─────────────────────────────────────────────────────────────────
function extractTimeline(s) {
  const steps = s.howItWorks?.steps ?? s.howItWorks2?.steps ?? [];
  return steps
    .filter((st) => clean(st.effectName) || clean(st.description))
    .map((st) => ({
      period: clean(st.effectName),
      title: clean(st.title),
      description: trimToSentences(st.description, 2),
      image: clean(st.image),
    }));
}

// ── FAQs ─────────────────────────────────────────────────────────────────────
function extractFaqs(s) {
  return (s.weGotAnswers?.answers ?? [])
    .filter((a) => clean(a.title))
    .map((a) => ({
      question: clean(a.title),
      answer: (a.contents ?? []).map(clean).join(" "),
    }));
}

// ── Reviews ──────────────────────────────────────────────────────────────────
function extractReviews(s) {
  return (s.reviews?.topReviews ?? [])
    .filter((r) => r.rating && clean(r.body))
    .map((r) => ({
      rating: Number(r.rating),
      author: clean(r.author),
      title: clean(r.title),
      body: clean(r.body),
      date: clean(r.dateCreated),
      verified: r.verified ?? true,
    }));
}

// ── Disclaimers ───────────────────────────────────────────────────────────────
function extractDisclaimers(s) {
  return (s.thingsToNote?.cards ?? [])
    .filter((c) => clean(c.title))
    .map((c) => ({
      title: clean(c.title),
      description: clean(c.description),
      image: clean(c.cardTitleImg),
    }));
}

// ── Works best with ──────────────────────────────────────────────────────────
function extractWorksBestWith(s) {
  return (s.whatItWorksBestWith?.cards ?? [])
    .filter((c) => clean(c.title))
    .map((c) => ({
      title: clean(c.title),
      description: clean(c.description),
      image: clean(c.cardTitleImg),
    }));
}

// ── Additional info (legal/manufacturing details) ─────────────────────────────
function extractAdditionalInfo(s) {
  return (s.additionalInformation?.sections ?? [])
    .filter((sec) => clean(sec.title) && clean(sec.content))
    .map((sec) => ({ title: clean(sec.title), content: clean(sec.content) }));
}

// ── Rating summary ────────────────────────────────────────────────────────────
function extractRating(raw) {
  const r = raw.productInfo?.rating;
  const rv = raw.productInfo?.reviews;
  return {
    average: r && !isNaN(Number(r)) ? Number(r) : null,
    count: rv && !isNaN(Number(rv)) ? Number(rv) : null,
  };
}

// ── BUILD OUTPUT ─────────────────────────────────────────────────────────────
const brand = detectBrand(raw);
const slug = deriveSlug(raw);
const sourceId = deriveSourceId(raw);
const { images, videos } = extractImages(raw);

const output = {
  slug,
  sourceId,
  brand,
  name: clean(raw.productInfo?.name ?? ""),
  subtitle: clean(raw.productInfo?.subtitle ?? ""),
  metaDescription: clean(raw.meta?.description ?? ""),
  rating: extractRating(raw),
  images,
  heroVideo: videos[0] ?? null,
  packs: extractPacks(raw),
  badges: extractBadges(s),
  ingredients: extractIngredients(s),
  productDetails: extractProductDetails(s),
  howToUse: extractHowToUse(s),
  timeline: extractTimeline(s),
  faqs: extractFaqs(s),
  reviews: extractReviews(s),
  disclaimers: extractDisclaimers(s),
  worksBestWith: extractWorksBestWith(s),
  additionalInfo: extractAdditionalInfo(s),
};

// ── Write output ──────────────────────────────────────────────────────────────
const outPath = resolve(outputDir, `${slug}.json`);
writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");

console.log(`✓ Transformed: ${inputPath}`);
console.log(`  Brand:       ${brand}`);
console.log(`  Slug:        ${slug}`);
console.log(`  Source ID:   ${sourceId}`);
console.log(`  Images:      ${images.length}`);
console.log(`  Ingredients: ${output.ingredients.length}`);
console.log(`  Badges:      ${output.badges.length}`);
console.log(`  Timeline:    ${output.timeline.length} steps`);
console.log(`  FAQs:        ${output.faqs.length}`);
console.log(`  Reviews:     ${output.reviews.length}`);
console.log(`  Packs:       ${output.packs.length}`);
console.log(`→ Output:      ${outPath}`);
