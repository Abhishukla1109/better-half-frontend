/**
 * update-metafields.mjs
 * Updates bh_follow_up, bh_score, and bh_concern for all 58 Man Matters products.
 *
 * followUp values are keywords that appear in the followUp strings built by
 * mock-generator.ts — the engine checks if any tag is a substring of that string.
 * Scores are differentiated by clinical potency within each concern.
 */

const SHOP = "betterhalf-4.myshopify.com";
const CI = process.env.SHOPIFY_CLIENT_ID ?? "";
const CS = process.env.SHOPIFY_CLIENT_SECRET ?? "";

// ─────────────────────────────────────────────
// PRODUCT MAP: handle → { followUp, score, concern (full replacement if changed) }
// ─────────────────────────────────────────────
const PRODUCTS = {

  // ── HAIR: THINNING / FALL / RECEDING ──────────────────────────────────────
  // Minoxidil — strongest clinical evidence for hair loss
  "minoxidil-5-0-1-finasteride":        { score: 87, followUp: "thinning,receding,hair fall,dht,density,hairline" },
  "minoxidil-10-finasteride-50ml":      { score: 87, followUp: "receding,thinning,hair fall,dht,hairline" },
  "advance-growmax-60ml":               { score: 85, followUp: "thinning,receding,hair fall,dht" },
  "growmax-minoxidil-5":                { score: 85, followUp: "thinning,receding,hair fall,dht" },
  "minoxidil-5-procapil-60ml":          { score: 84, followUp: "thinning,hair fall,density" },

  // Complete regrowth regimes/kits
  "advanced-hair-regrowth-regime":      { score: 85, followUp: "thinning,receding,hair fall,dht,density" },
  "stage-3-hair-regrowth-kit":          { score: 85, followUp: "thinning,receding,hair fall,dht" },
  "1x-minoxifin-1x-nourish-hair-gummies": { score: 83, followUp: "thinning,receding,hair fall,dht" },

  // Biotin gummies
  "biotin-hair-gummies-90n":            { score: 80, followUp: "thinning,hair fall,shedding,density,greying" },
  "biotin-hair-gummies-60n":            { score: 78, followUp: "thinning,hair fall,shedding,density,greying" },
  "biotin-hair-gummies-30n":            { score: 76, followUp: "thinning,hair fall,shedding,density,greying" },

  // Derma rollers for scalp
  "hair-activator-derma-roller":        { score: 78, followUp: "thinning,hair fall,receding,density" },
  "hair-activator-derma-roller-1mm":    { score: 78, followUp: "thinning,hair fall,receding,density" },
  "derma-roller-replaceable-head":      { score: 74, followUp: "thinning,hair fall,density" },

  // Hair fall shampoos + combos
  "anti-hair-fall-shampoo-300ml":       { score: 78, followUp: "hair fall,thinning,shedding" },
  "anti-hair-fall-shampoo-200ml":       { score: 76, followUp: "hair fall,thinning,shedding" },
  "1x-anti-hairfall-shampoo-300ml-1x-hair-gummies": { score: 80, followUp: "hair fall,thinning,shedding,density" },

  // Scalp massager
  "scalp-massager-1n":                  { score: 72, followUp: "hair fall,thinning,dandruff,scalp" },

  // ── HAIR: DANDRUFF ────────────────────────────────────────────────────────
  "1-ketoconazole-shampoo-200-ml":      { score: 85, followUp: "dandruff,scalp,itchy,oily scalp" },
  "anti-dandruff-pro-kit":              { score: 83, followUp: "dandruff,scalp,itchy" },
  "advance-daily-use-anti-dandruff-shampoo": { score: 80, followUp: "dandruff,scalp,itchy,oily scalp" },
  "advance-ads":                        { score: 80, followUp: "dandruff,scalp,itchy,oily scalp" },

  // ── BEARD ─────────────────────────────────────────────────────────────────
  "oral-minoxidil-for-beard-growth":    { score: 88, followUp: "beard,patchy,low beard,less dense,beard growth" },
  "beard-growth-kit-1-month-pack":      { score: 86, followUp: "beard,patchy,slow growth,less dense,beard growth" },
  "beard-development-kit":              { score: 85, followUp: "beard,patchy,slow growth,less dense,beard growth" },
  "beard-development-kit-22-28":        { score: 85, followUp: "beard,patchy,slow growth,less dense,beard growth" },
  "beard-growth-kit-for-low-beard":     { score: 86, followUp: "beard,low beard,less dense,slow growth,beard growth" },
  "beardmax-growth-serum-30-ml":        { score: 83, followUp: "beard,patchy,less dense,beard growth" },

  // ── SKIN ──────────────────────────────────────────────────────────────────
  "rejuv-niacinamide-serum":            { score: 83, followUp: "acne,oily,niacinamide,dullness,pigmentation,tone,sebum" },
  "clear-skin-starter-pack-1x-anti-acne-face-wash-1x-rejuv-face-serum": { score: 82, followUp: "acne,pimples,oily,breakouts,niacinamide" },
  "clear-skin-pack-1x-rejuv-face-serum-1x-derma-roller": { score: 82, followUp: "acne,dullness,pigmentation,niacinamide,collagen" },
  "derma-roller-for-skin":              { score: 78, followUp: "dullness,collagen,pigmentation,brightening,glow" },
  "complete-cleansing-kit":             { score: 78, followUp: "acne,oily,pimples,breakouts,sebum" },
  "face-body-cleansing-kit":            { score: 76, followUp: "acne,oily,body,sebum,breakouts" },
  "charcoal-body-wash-750-ml":          { score: 75, followUp: "oily,acne,sebum,body" },
  "charcoal-body-wash-500-ml":          { score: 74, followUp: "oily,acne,sebum" },
  "charcoal-body-wash-250-ml":          { score: 73, followUp: "oily,acne,sebum" },
  "daily-hygiene-kit":                  { score: 73, followUp: "oily,acne,body,sebum,redness" },
  "swash-intimate-wash-120ml":          { score: 72, followUp: "oily,redness,sensitive" },

  // ── ENERGY: TESTOSTERONE / LIBIDO ─────────────────────────────────────────
  "tostero-120-capsules":               { score: 83, followUp: "libido,testosterone,drive,motivation,muscle,belly fat" },
  "tostero-capsules-60n":               { score: 81, followUp: "libido,testosterone,drive,motivation,muscle" },
  "complete-endurance-kit-1x-endure-spray-1x-tostero-capsules": { score: 83, followUp: "libido,testosterone,drive,motivation,muscle,endurance" },
  "endure-long-last-spray-20ml":        { score: 78, followUp: "libido,drive,testosterone" },
  "shilajit-gummies":                   { score: 82, followUp: "libido,testosterone,drive,motivation,fatigue,energy,muscle" },
  "ashwagandha-gummies":                { score: 80, followUp: "stress,cortisol,anxiety,motivation,mood,libido,sleep,fatigue",
                                          concern: "energy,sleep" },

  // ── ENERGY: FITNESS / PROTEIN / CREATINE ──────────────────────────────────
  "ultimate-strength-kit":              { score: 82, followUp: "muscle,protein,performance,strength,recovery,gain" },
  "muscle-nutrients-kit":               { score: 80, followUp: "muscle,protein,recovery,strength,gain" },
  "whey-protein-powder-500-gm":         { score: 78, followUp: "protein,muscle,body composition,gain" },
  "plant-protein-powder-500-gm":        { score: 78, followUp: "protein,muscle,body composition,gain,fat,lose" },
  "super-blend-nutrition-powder":       { score: 78, followUp: "protein,muscle,body composition,gain,both" },
  "superblend":                         { score: 78, followUp: "protein,muscle,body composition,gain,both" },
  "micronised-creatine-monohydrate":    { score: 78, followUp: "muscle,strength,performance,recovery" },
  "creatine-powder":                    { score: 78, followUp: "muscle,strength,performance,recovery" },
  "creatine-electrolyte":               { score: 76, followUp: "performance,endurance,recovery,energy,athlete" },

  // ── ENERGY: SLEEP + RECOVERY (add sleep concern) ─────────────────────────
  "advanced-magnesium-gummies":         { score: 80, followUp: "sleep,fatigue,insomnia,recovery,poor sleep,exhaustion,muscle",
                                          concern: "energy,sleep" },
  "magnesium-gummies":                  { score: 80, followUp: "sleep,fatigue,insomnia,recovery,poor sleep,exhaustion",
                                          concern: "energy,sleep" },
  "magnesium-lotion":                   { score: 77, followUp: "sleep,fatigue,insomnia,recovery,poor sleep",
                                          concern: "energy,sleep" },

  // ── ENERGY: GENERAL VITALITY ───────────────────────────────────────────────
  "multivitamin-gummies":               { score: 75, followUp: "fatigue,energy,b12,nutrition,deficiency,motivation,afternoon crash,consistently low" },
};

// ─────────────────────────────────────────────
// Shopify API helpers
// ─────────────────────────────────────────────
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

async function gql(token, query, variables) {
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
  return { gid: `gid://shopify/Product/${p.id}`, status: p.status };
}

async function setMetafields(token, gid, metafields) {
  const mfInput = metafields.map(({ key, value }) => ({
    ownerId: gid,
    namespace: "custom",
    key,
    type: key === "bh_score" ? "number_integer" : "single_line_text_field",
    value: String(value),
  }));

  const res = await gql(token, `
    mutation($mf: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $mf) {
        userErrors { field message }
      }
    }
  `, { mf: mfInput });

  return res?.data?.metafieldsSet?.userErrors ?? [];
}

// ─────────────────────────────────────────────
async function main() {
  const token = await getToken();
  console.log("Token acquired.\n");

  const handles = Object.keys(PRODUCTS);
  let updated = 0, failed = 0;

  for (const handle of handles) {
    const cfg = PRODUCTS[handle];
    const found = await getProductGid(token, handle);

    if (!found) {
      console.log(`  ✗ ${handle} — not found on Shopify`);
      failed++;
      continue;
    }
    if (found.status === "archived") {
      console.log(`  ✗ ${handle} — archived, skipping`);
      failed++;
      continue;
    }

    const metafields = [
      { key: "bh_follow_up", value: cfg.followUp },
      { key: "bh_score",     value: cfg.score },
    ];
    if (cfg.concern) {
      metafields.push({ key: "bh_concern", value: cfg.concern });
    }

    const errors = await setMetafields(token, found.gid, metafields);
    if (errors.length) {
      console.error(`  ✗ ${handle}:`, errors.map(e => e.message).join(", "));
      failed++;
    } else {
      const changes = [`score=${cfg.score}`, `followUp set`];
      if (cfg.concern) changes.push(`concern=${cfg.concern}`);
      console.log(`  ✓ ${handle} [${changes.join(", ")}]`);
      updated++;
    }

    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\nDone: ${updated} updated, ${failed} failed`);
}

main().catch(e => { console.error(e); process.exit(1); });
