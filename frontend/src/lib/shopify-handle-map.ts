// Maps catalog product IDs → actual Shopify store handles (from betterhalf-4.myshopify.com).
// Only needed when the catalog ID doesn't already match the Shopify handle exactly.
// The variant API falls back to using the ID as the handle if no entry is found here.
export const shopifyHandleMap: Record<string, string> = {

  // ── Old catalog slugs (treatment-types.ts + legacy) ────────────────────────
  "biotin-zinc-hair":           "hair-gummies",
  "ashwagandha-ksm66":          "ashwagandha-gummies",
  "magnesium-b6":               "magnesium-gummies",
  "creatine-monohydrate":       "creatine-powder",
  "whey-protein-isolate":       "whey-protein",
  "daily-probiotics":           "nobloat",
  "iron-vitamin-c":             "multivitamin-gummies-bw",       // no iron product in store
  "kids-multivitamin-gummies":  "lj-multivitamin-gummies-mothers",

  // ── Man Matters — Hair ──────────────────────────────────────────────────────
  "biotin-hair-gummies-30n":            "hair-health-gummies-xp",  // 30N → 30N product
  "biotin-hair-gummies-30n-mm":         "hair-health-gummies-xp",
  "biotin-hair-gummies-30n-no-sugar":   "hair-health-gummies-xp",  // no sugar variant → closest match
  "hair-gummies-60-pack-of-2":          "hair-gummies",
  "hair-health-gummies-60n":            "hair-gummies",             // 60N → 60N product
  "hair-strengthening-serum-60ml":      "hair-strength-serum",
  "anti-hair-fall-shampoo-200ml":       "ahs",
  "anti-hair-fall-shampoo-300ml":       "ahs",
  "anti-hair-fall-shampoo-300ml-mm":    "ahs",
  "1x-anti-hairfall-shampoo-300ml-1x-hair-gummies": "ahs",
  "anti-hairfall-kit-1x-shampoo-1x-gummies":        "ahs",
  "redensyl-grow-hair-tonic":           "Redensyl",
  "hair-tonic-2-bottles":               "Redensyl",
  "2x-redensyl-grow-hair-tonic":        "Redensyl",
  "3x-redensyl-grow-hair-tonic":        "Redensyl",
  "advanced-hair-regrowth-serum":       "ahs-serum",
  "advanced-hair-regrowth-serum-mm":    "ahs-serum",
  "1-ketoconazole-shampoo-100-ml":      "ketoconazole-shampoo",
  "1-ketoconazole-shampoo-100-ml-mm":   "ketoconazole-shampoo",
  "1-zpto-anti-dandruff-shampoo":       "ketoconazole-shampoo",
  "advance-ads-mm":                     "advance-ads",
  "anti-dandruff-daily-use-shampoo":    "ads",
  "anti-dandruff-daily-use-shampoo-mm": "ads",
  "ketopower-lotion":                   "ketoconazole-lotion",
  "scalp-massager-1n":                  "massager",
  "hair-activator-derma-roller":        "dermaroller",
  "dandruff-removal-lotion":            "adl",
  "hair-growth-oil-100ml":              "hair-oil",
  "hair-growth-oil-200ml":              "hair-oil",
  "onion-hair-oil":                     "hair-oil",
  "onion-redensyl-hair-oil":            "hair-oil",
  "folli-advanced-plus-hair-growth-serum-xp1": "ahs-serum",
  "nourish-hair-tablets":               "nourish-hair-tablets",

  // ── Man Matters — Beard ─────────────────────────────────────────────────────
  "beard-gummies-30n":                  "beard-gummies",
  "minoxidil-5-0-1-finasteride":        "minoxbeard",
  "beardgro-stimulator-kit-1-month-pack": "beard-tonic",
  "beardgro-tonic-2-month-pack":        "beard-tonic",
  "beardmax-3-month-pack":              "beard-gummies",

  // ── Man Matters — Performance / Hormones ───────────────────────────────────
  "endure-long-last-spray-20ml":        "endure-spray",
  "endure-long-last-spray-20ml-mm":     "endure-spray",
  "tostero-120-capsules":               "tostero",
  "tostero-capsules-3-month-pack":      "tostero",
  "perform-vitality-tablets-2-months-pack": "perform-tablets",
  "shilajit-gummies-mm":                "shilajit-gummies",

  // ── Man Matters — Nutrition ─────────────────────────────────────────────────
  "multivitamin-gummies":               "multi-gummies",
  "multivitamin-gummies-mm":            "multi-gummies",
  "mv-gummies-nutri":                   "multi-gummies",
  "ashwagandha-gummies-mm":             "ashwagandha-gummies",
  "creatine-powder-mm":                 "creatine-powder",
  "magnesium-gummies-mm":               "magnesium-gummies",
  "plant-protein-powder-500-gm":        "plant-protein",
  "plant-protein-powder-500-gm-mm":     "plant-protein",
  "whey-protein-powder-1-kg":           "whey-protein",
  "whey-protein-powder-1-kg-mm":        "whey-protein",
  "gut-health-powder":                  "nobloat",
  "daily-heath-booster":                "nobloat",
  "daily-heath-booster-mm":             "nobloat",

  // ── Man Matters — Sleep ─────────────────────────────────────────────────────
  "relax-melatonin-strips-30-strips":   "relax-melatonin-strips",
  "2x-relax-melatonin-strips":          "relax-melatonin-strips",
  "2x-relax-melatonin-strips-60-strips":"relax-melatonin-strips",
  "2x-calm-sleep-tea-1x-sleep-strips":  "calm-sleep-tea",

  // ── Man Matters — Skin ──────────────────────────────────────────────────────
  "men-s-face-wash-for-oily-skin":      "facewash",
  "rejuv-niacinamide-serum":            "skin-serum",
  "derma-roller-for-skin":              "skin-dermaroller",

  // ── Man Matters — Weight ────────────────────────────────────────────────────
  "apple-cider-vinegar-gummies-60-gummies":            "apple-cider-vinegar-gummies-30-gummies",
  "apple-cider-vinegar-gummies-4-month-pack-120-gummies": "apple-cider-vinegar-gummies-30-gummies",
  "three-month-pack-apple-cider-vinegar-gummies-90-gummies-zero": "apple-cider-vinegar-gummies-30-gummies",

  // ── Be Bodywise — Hair ──────────────────────────────────────────────────────
  "keratin-shampoo":                    "hair-fall-control-shampoo",
  "post-partum-hair-gummies":           "biotin-hair-gummies-breastfeeding-moms-30n",
  "biotin-hair-gummies-breastfeeding-moms": "biotin-hair-gummies-breastfeeding-moms-30n",
  "biotin-hair-gummies-breastfeeding-moms-deal": "biotin-hair-gummies-breastfeeding-moms-30n",
  "pcos-hairfall-kit":                  "hair-health-gummies-xp",
  "hair-growth-pack-pcos-xp":          "hair-health-gummies-xp",

  // ── Be Bodywise — Skin ──────────────────────────────────────────────────────
  "skin-clarifying-5":                  "skin-clarifying",
  "skin-health-gummies-60":             "skin-health-gummies",
  "skin-health-gummies-pack-2":         "skin-health-gummies",
  "skin-health-gummies-pack-3":         "skin-health-gummies",

  // ── Be Bodywise — Hormones / Women's Health ────────────────────────────────
  "magnesium-glycinate-gummies-60n-2-months":  "magnesium-glycinate-gummies-60n-xp2",
  "magnesium-glycinate-gummies-60n-xp1":       "magnesium-glycinate-gummies-60n-xp2",
  "pcos-balance-capsule-pack-2":               "vaginal-probiotic-capsules",
  "pcos-balance-capsule-pack-6":               "vaginal-probiotic-capsules",

  // ── Be Bodywise — Weight ────────────────────────────────────────────────────
  "apple-cider-vinegar-effervescent-tablets-pack-2": "apple-cider-vinegar-effervescent-tablets-pack-4",
  "apple-cider-vinegar-effervescent-tablets-pack-3": "apple-cider-vinegar-effervescent-tablets-pack-4",
  "apple-cider-vinegar-effervescent-tablets-pack-6": "apple-cider-vinegar-effervescent-tablets-pack-4",
  "active-assist-acv-gummies-2pack-2m":              "apple-cider-vinegar-effervescent-tablets-pack-4",
  "active-assist-acv-gummies-pack-3":                "apple-cider-vinegar-effervescent-tablets-pack-4",

  // ── Effervescent biotin variants ────────────────────────────────────────────
  "effervescent-biotin-tablets-pack-3":  "effervescent-biotin-tablets-pack-2",
  "effervescent-biotin-tablets-pack-6":  "effervescent-biotin-tablets-pack-2",
  "effervescent-biotin-tablets-pack-of-4": "effervescent-biotin-tablets-pack-2",
};
