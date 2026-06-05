/**
 * update-bw-metafields.mjs
 * Sets correct bh_concern, bh_score, and bh_follow_up for all Be Bodywise products.
 * Run: SHOPIFY_CLIENT_ID=... SHOPIFY_CLIENT_SECRET=... node scripts/update-bw-metafields.mjs
 */

const SHOP = "betterhalf-4.myshopify.com";
const CI = process.env.SHOPIFY_CLIENT_ID;
const CS = process.env.SHOPIFY_CLIENT_SECRET;

async function getToken() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST", headers: { "Content-Type": "application/json" },
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
  const r = await fetch(`https://${SHOP}/admin/api/2024-01/products.json?handle=${handle}&fields=id`, {
    headers: { "X-Shopify-Access-Token": token },
  });
  const d = await r.json();
  const id = d.products?.[0]?.id;
  return id ? `gid://shopify/Product/${id}` : null;
}

async function pushMetafields(token, gid, concern, score, followUp) {
  const mf = [
    { ownerId: gid, namespace: "custom", key: "bh_concern",   type: "single_line_text_field", value: concern },
    { ownerId: gid, namespace: "custom", key: "bh_gender",    type: "single_line_text_field", value: "female" },
    { ownerId: gid, namespace: "custom", key: "bh_segment",   type: "single_line_text_field", value: "female-18-25,female-25-35,female-35-plus" },
    { ownerId: gid, namespace: "custom", key: "bh_score",     type: "number_integer",         value: String(score) },
    { ownerId: gid, namespace: "custom", key: "bh_follow_up", type: "single_line_text_field", value: followUp },
  ];
  const res = await shopifyGql(token, `
    mutation($mf:[MetafieldsSetInput!]!){metafieldsSet(metafields:$mf){userErrors{field message}}}
  `, { mf });
  const errors = res?.data?.metafieldsSet?.userErrors ?? [];
  if (errors.length) throw new Error(errors.map(e => e.message).join(", "));
}

// ── Product map ────────────────────────────────────────────────────────────────
// Format: handle → [concern, score, followUp]
const PRODUCTS = {
  // ── Hair: growth serums ────────────────────────────────────────────────────
  "hair-health-gummies":                   ["hair", 80, "hair fall,thinning,shedding,density,postpartum,biotin"],
  "hair-growth-serum-roll-on":             ["hair", 82, "hair fall,thinning,shedding,density,regrowth"],
  "folli-advanced-plus-hair-growth-serum": ["hair", 85, "hair fall,thinning,density,redensyl,rosemary,regrowth"],
  "hair-growth-pack-rosemary-roll-on-xp-2":["hair", 83, "hair fall,thinning,shedding,density,rosemary,regrowth"],
  "hair-growth-serum-roll-on-2-months-xp": ["hair", 83, "hair fall,thinning,shedding,density,regrowth,2 months"],
  "advanced-hair-growth-serum":            ["hair", 80, "hair fall,thinning,shedding,density,regrowth"],
  "hair-strengthening-serum":              ["hair", 78, "hair fall,thinning,weak,strengthening"],

  // ── Hair: dandruff ─────────────────────────────────────────────────────────
  "1-zpto-anti-dandruff-shampoo":          ["hair", 82, "dandruff,scalp,itchy,flaky,oily scalp,zpto"],
  "1-ketoconazole-dandruff-shampoo-250ml": ["hair", 80, "dandruff,scalp,itchy,flaky,ketoconazole,fungal"],
  "anti-dandruff-serum":                   ["hair", 80, "dandruff,scalp,itchy,flaky,sebum"],
  "intense-dandruff-kit":                  ["hair", 82, "dandruff,scalp,itchy,flaky,intense"],
  "dandruff-and-hairfall-kit":             ["hair", 80, "dandruff,hair fall,scalp,itchy"],
  "1-zpto-ads-hg30-kit":                   ["hair", 82, "dandruff,hair fall,scalp,oily,zpto"],

  // ── Hair: shampoo / conditioner ────────────────────────────────────────────
  "hair-fall-control-shampoo":             ["hair", 78, "hair fall,thinning,keratin,shampoo"],
  "deep-moisturizing-conditioner":         ["hair", 72, "hair fall,damaged,keratin,dry hair,conditioner"],

  // ── Hair: scalp tools ─────────────────────────────────────────────────────
  "scalp-massager":                        ["hair", 72, "hair fall,scalp,circulation,massage"],
  "brow-lash-serum":                       ["hair", 75, "brows,lashes,growth,eyebrow,sparse"],

  // ── Hair: gummies / supplements ───────────────────────────────────────────
  "biotin-hair-gummies-120":               ["hair", 80, "hair fall,thinning,shedding,density,biotin"],
  "biotin-hair-gummies-breastfeeding-moms-30n-xp": ["hair", 82, "postpartum,hair fall,breastfeeding,shedding,postnatal"],
  "shilajit-gummies-60n":                  ["hair", 78, "hair fall,thinning,postpartum,fatigue,shilajit"],
  "hair-magnesium-gummies-kit-30n":        ["hair", 80, "hair fall,thinning,stress,magnesium,stress-induced"],
  "postpartum-severe-hairfall-1month-xp":  ["hair", 85, "postpartum,hair fall,shedding,breastfeeding,severe"],

  // ── Skin: acne / body wash ────────────────────────────────────────────────
  "salicylic-ceramide-bodywash":           ["skin", 80, "acne,body acne,bumps,oily,salicylic,ceramide"],
  "1-salicylic-acid-body-wash":            ["skin", 78, "acne,body acne,bumps,oily,salicylic"],
  "1-salicylic-acid-body-wash-100ml":      ["skin", 75, "acne,body acne,bumps,oily,salicylic"],
  "5-aha-bha-bodywash":                    ["skin", 78, "acne,body acne,bumps,aha,bha,exfoliate"],
  "2-aha-body-wash":                       ["skin", 75, "rough,texture,aha,exfoliate,gentle"],
  "hyaluronic-acid-body-wash":             ["skin", 75, "dry,hydration,hyaluronic,ceramide"],
  "triple-milk-deep-hydrating-bodywash":   ["skin", 72, "dry,rough,hydration,moisture"],
  "5-niacinamide-body-wash":               ["skin", 78, "pigmentation,oily,niacinamide,body"],
  "5-niacinamide-body-wash-pack-of-2":     ["skin", 75, "pigmentation,oily,niacinamide,body"],
  "niacinamide-body-wash-700":             ["skin", 78, "pigmentation,oily,niacinamide,body,large"],
  "2-5-benzoyl-peroxide-bodywash":         ["skin", 80, "acne,body acne,pimples,oily,benzoyl peroxide"],
  "5-niacinamide-body-wash-pack-of-2":     ["skin", 75, "pigmentation,oily,niacinamide,body"],

  // ── Skin: face wash (previously mistagged energy) ─────────────────────────
  "2-salicylic-acid-face-wash":            ["skin", 78, "acne,pimples,oily,breakouts,salicylic,face"],
  "acne-control-wash":                     ["skin", 78, "acne,pimples,oily,foam,salicylic,face"],
  "hydrocolloid-acne-pimple-patch":        ["skin", 78, "acne,pimples,spot treatment,patch,breakouts"],

  // ── Skin: sunscreen (previously mistagged energy) ─────────────────────────
  "body-sunscreen-lotion-with-spf-50":     ["skin", 78, "sun damage,tan,pigmentation,spf,body"],
  "ultra-light-sunscreen-spf50":           ["skin", 78, "sun damage,tan,pigmentation,spf,lightweight,face"],
  "body-sunscreen-spray-with-spf-50":      ["skin", 76, "sun damage,tan,pigmentation,spf,spray,body"],
  "sun-care-duo-head-to-toe":              ["skin", 80, "sun damage,tan,pigmentation,spf,face,body"],
  "face-body-sunscreen-kit":               ["skin", 80, "sun damage,tan,pigmentation,spf,face,body"],
  "summer-essentials-kit":                 ["skin", 78, "sun damage,tan,pigmentation,summer,spf"],
  "lightest-mineral-sunscreen-spf50":      ["skin", 78, "sun damage,tan,pigmentation,mineral,spf"],

  // ── Skin: moisturizer (previously mistagged energy) ──────────────────────
  "1-peptide-ceramide-moisturizer":        ["skin", 76, "dry,hydration,peptide,ceramide,moisturizer"],
  "ice-roller":                            ["skin", 72, "puffiness,redness,brightening,glow,de-puff"],

  // ── Skin: urea / heel repair ──────────────────────────────────────────────
  "20-urea-roll-on-50ml":                  ["skin", 75, "dry,rough,cracked heels,urea,foot"],
  "20-urea-lotion-xp":                     ["skin", 75, "dry,rough,texture,urea,lotion"],
  "30-urea-foot-roll-on":                  ["skin", 75, "dry,rough,cracked heels,urea,foot,30%"],
  "10-urea-lotion":                        ["skin", 74, "dry,rough,urea,texture,lotion"],
  "urea-skin-heel-repair-kit-75ml":        ["skin", 75, "dry,cracked heels,urea,repair,kit"],

  // ── Skin: AHA/BHA / scrub / exfoliant ────────────────────────────────────
  "10-aha-body-scrub":                     ["skin", 78, "rough,texture,aha,exfoliate,scrub"],
  "12-aha-scrub":                          ["skin", 79, "rough,texture,aha,exfoliate,scrub,12%"],
  "glycolic-acid-stick":                   ["skin", 78, "rough,texture,glycolic,exfoliate,stick"],
  "4-aha-bha-body-butter":                 ["skin", 74, "dry,rough,texture,aha,bha,butter"],
  "sabodywash-scrub":                      ["skin", 72, "rough,texture,strawberry skin,exfoliate,scrub"],
  "aha-bha-body-pack":                     ["skin", 78, "rough,texture,aha,bha,body,exfoliate"],

  // ── Skin: underarm pigmentation ───────────────────────────────────────────
  "4-aha-bha-underarm-roll-on":            ["skin", 80, "pigmentation,dark underarms,aha,bha"],
  "6-aha-bha-underarm-roll-on":            ["skin", 80, "pigmentation,dark underarms,aha,bha,6%"],
  "4-aha-bha-underarm-roll-on-watermelon": ["skin", 78, "pigmentation,dark underarms,aha,bha,watermelon"],
  "4-aha-bha-underarm-roll-on-no-fragrance":["skin",78, "pigmentation,dark underarms,aha,bha,no fragrance,sensitive"],
  "4-aha-bha-underarm-rollon-frag-free-75":["skin", 78, "pigmentation,dark underarms,aha,bha,no fragrance,75ml"],
  "4-aha-bha-underarm-roll-on-pack-three": ["skin", 78, "pigmentation,dark underarms,aha,bha,pack of 3"],
  "underarm-pigmentation-kit-no-fragrance":["skin", 82, "pigmentation,dark underarms,kit,no fragrance"],
  "advanced-underarm-pigmentation-kit":    ["skin", 83, "pigmentation,dark underarms,advanced,kit"],
  "pigmentation-repair-cream":             ["skin", 80, "pigmentation,dark spots,dullness,brightening,cream"],
  "niacinamide-body-lotion":               ["skin", 78, "pigmentation,oily,niacinamide,texture,lotion"],

  // ── Skin: body lotion / butter ────────────────────────────────────────────
  "5-lactic-acid-body-lotion":             ["skin", 78, "rough,texture,dry,lactic acid,lotion"],
  "daily-hydration-kit":                   ["skin", 75, "dry,hydration,moisturizing,kit"],
  "hyaluronic-acid-mousse":                ["skin", 75, "dry,hydration,hyaluronic,mousse"],
  "strawberry-skin-pack":                  ["skin", 78, "rough,texture,strawberry skin,body care,kit"],
  "body-care-mini-pack":                   ["skin", 78, "body acne,bumps,acne,oily,mini"],
  "collagen-skin-gummies":                 ["skin", 78, "collagen,skin,glow,brightening,elasticity,gummies"],
  "glutathione-gummies-60":                ["skin", 78, "glow,skin,fatigue,glutathione,brightening,gummies"],

  // ── Sleep: magnesium ──────────────────────────────────────────────────────
  "magnesium-glycinate-gummies-60n":       ["sleep", 82, "sleep,poor sleep,insomnia,fatigue,recovery,magnesium,glycinate"],
  "magnesium-gummies-and-lotion-kit":      ["sleep", 80, "sleep,poor sleep,insomnia,fatigue,magnesium,kit"],

  // ── Energy: vitamins / supplements ───────────────────────────────────────
  "bw-multivitamin-gummies":               ["energy", 80, "fatigue,energy,consistently low,afternoon crash,vitamins,multivitamin"],
  "calcium-gummies":                       ["energy", 75, "calcium,bone,fatigue,energy,deficiency"],
  "calcium-gummies-xp":                    ["energy", 75, "calcium,bone,fatigue,pack of 2,deficiency"],
};

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const token = await getToken();
  let ok = 0, fail = 0;

  for (const [handle, [concern, score, followUp]] of Object.entries(PRODUCTS)) {
    try {
      const gid = await getProductGid(token, handle);
      if (!gid) { console.log(`  SKIP (not found): ${handle}`); continue; }
      await pushMetafields(token, gid, concern, score, followUp);
      console.log(`  ✓ ${handle} → concern=${concern}, score=${score}`);
      ok++;
    } catch (e) {
      console.error(`  ✗ ${handle}: ${e.message}`);
      fail++;
    }
  }

  console.log(`\nDone: ${ok} updated, ${fail} failed`);
}

main().catch(e => { console.error(e); process.exit(1); });
