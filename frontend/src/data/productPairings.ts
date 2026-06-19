/**
 * "Complete your routine" pairings — maps a product slug to paired products.
 * reason: short 4-6 word chip shown on the card.
 * Add new entries here as we expand to more products.
 */
export type PairingItem = { slug: string; reason: string };

export const PRODUCT_PAIRINGS: Record<string, PairingItem[]> = {

  // ── HAIR: Anti-dandruff shampoos ────────────────────────────────────────────
  "advance-daily-use-anti-dandruff-shampoo": [
    { slug: "anti-dandruff-serum",       reason: "Targets scalp at the root" },
    { slug: "scalp-massager-1n",         reason: "Boosts product absorption" },
    { slug: "biotin-hair-gummies-60n",   reason: "Nourishes from inside" },
  ],
  "advance-ads": [
    { slug: "anti-dandruff-serum",       reason: "Targets scalp at the root" },
    { slug: "scalp-massager-1n",         reason: "Boosts product absorption" },
    { slug: "biotin-hair-gummies-60n",   reason: "Nourishes from inside" },
  ],
  "anti-dandruff-shampoo": [
    { slug: "anti-dandruff-serum",       reason: "Targets scalp at the root" },
    { slug: "scalp-massager-1n",         reason: "Boosts product absorption" },
    { slug: "biotin-hair-gummies-60n",   reason: "Nourishes from inside" },
  ],
  "1-ketoconazole-shampoo-200-ml": [
    { slug: "anti-dandruff-serum",       reason: "Keeps dandruff away longer" },
    { slug: "scalp-massager-1n",         reason: "Boosts medicated absorption" },
    { slug: "biotin-hair-gummies-60n",   reason: "Feeds follicles from within" },
  ],
  "1-ketoconazole-dandruff-shampoo-250ml": [
    { slug: "anti-dandruff-serum",       reason: "Keeps dandruff away longer" },
    { slug: "scalp-massager-1n",         reason: "Boosts medicated absorption" },
    { slug: "biotin-hair-gummies-60n",   reason: "Feeds follicles from within" },
  ],
  "1-zpto-anti-dandruff-shampoo": [
    { slug: "anti-dandruff-serum",       reason: "Keeps dandruff away longer" },
    { slug: "scalp-massager-1n",         reason: "Boosts medicated absorption" },
    { slug: "biotin-hair-gummies-60n",   reason: "Feeds follicles from within" },
  ],

  // ── HAIR: Anti-hair fall shampoos ───────────────────────────────────────────
  "anti-hair-fall-shampoo-300ml": [
    { slug: "growmax-minoxidil-5",       reason: "Topical regrowth on top" },
    { slug: "biotin-hair-gummies-60n",   reason: "Nourishes roots from inside" },
    { slug: "hair-activator-derma-roller", reason: "Activates scalp blood flow" },
  ],
  "anti-hair-fall-shampoo-200ml": [
    { slug: "growmax-minoxidil-5",       reason: "Topical regrowth on top" },
    { slug: "biotin-hair-gummies-60n",   reason: "Nourishes roots from inside" },
    { slug: "hair-activator-derma-roller", reason: "Activates scalp blood flow" },
  ],

  // ── HAIR: Conditioner ───────────────────────────────────────────────────────
  "deep-moisturizing-conditioner": [
    { slug: "anti-hair-fall-shampoo-300ml", reason: "The shampoo that precedes it" },
    { slug: "scalp-massager-1n",            reason: "Massage for deeper moisture" },
    { slug: "biotin-hair-gummies-60n",      reason: "Inner nutrition to pair" },
  ],

  // ── HAIR: Minoxidil serums ───────────────────────────────────────────────────
  "growmax-minoxidil-5": [
    { slug: "hair-activator-derma-roller",  reason: "Doubles absorption by 40%" },
    { slug: "biotin-hair-gummies-60n",      reason: "Feeds follicles from within" },
    { slug: "scalp-massager-1n",            reason: "Drives deeper penetration" },
  ],
  "advance-growmax-60ml": [
    { slug: "hair-activator-derma-roller",  reason: "Doubles absorption by 40%" },
    { slug: "biotin-hair-gummies-60n",      reason: "Feeds follicles from within" },
    { slug: "scalp-massager-1n",            reason: "Drives deeper penetration" },
  ],
  "minoxidil-5-0-1-finasteride": [
    { slug: "hair-activator-derma-roller",  reason: "Doubles absorption by 40%" },
    { slug: "biotin-hair-gummies-60n",      reason: "Feeds follicles from within" },
    { slug: "scalp-massager-1n",            reason: "Drives deeper penetration" },
  ],
  "minoxidil-10-finasteride-50ml": [
    { slug: "hair-activator-derma-roller",  reason: "Doubles absorption by 40%" },
    { slug: "biotin-hair-gummies-60n",      reason: "Feeds follicles from within" },
    { slug: "scalp-massager-1n",            reason: "Drives deeper penetration" },
  ],
  "minoxidil-5-procapil-60ml": [
    { slug: "hair-activator-derma-roller",  reason: "Doubles absorption by 40%" },
    { slug: "biotin-hair-gummies-60n",      reason: "Feeds follicles from within" },
    { slug: "scalp-massager-1n",            reason: "Drives deeper penetration" },
  ],

  // ── HAIR: Growth serums ─────────────────────────────────────────────────────
  "folli-advanced-plus-hair-growth-serum": [
    { slug: "anti-hair-fall-shampoo-300ml",  reason: "Preps scalp for serum" },
    { slug: "hair-activator-derma-roller",   reason: "Micro-channels boost serum" },
    { slug: "biotin-hair-gummies-60n",       reason: "Amplifies serum results" },
  ],
  "hair-growth-serum-roll-on": [
    { slug: "anti-hair-fall-shampoo-300ml",  reason: "Preps scalp for serum" },
    { slug: "hair-activator-derma-roller",   reason: "Micro-channels boost serum" },
    { slug: "biotin-hair-gummies-60n",       reason: "Amplifies serum results" },
  ],
  "advanced-hair-growth-serum": [
    { slug: "anti-hair-fall-shampoo-300ml",  reason: "Preps scalp for serum" },
    { slug: "hair-activator-derma-roller",   reason: "Micro-channels boost serum" },
    { slug: "biotin-hair-gummies-60n",       reason: "Amplifies serum results" },
  ],
  "anti-dandruff-serum": [
    { slug: "advance-daily-use-anti-dandruff-shampoo", reason: "Shampoo first, serum after" },
    { slug: "scalp-massager-1n",             reason: "Serum works deeper after massage" },
    { slug: "biotin-hair-gummies-60n",       reason: "Inside-out dandruff defence" },
  ],

  // ── HAIR: Tools ─────────────────────────────────────────────────────────────
  "hair-activator-derma-roller": [
    { slug: "growmax-minoxidil-5",           reason: "Apply minoxidil right after" },
    { slug: "biotin-hair-gummies-60n",       reason: "Feeds new follicle growth" },
    { slug: "scalp-massager-1n",             reason: "Spread product post-roll" },
  ],
  "hair-activator-derma-roller-1mm": [
    { slug: "growmax-minoxidil-5",           reason: "Apply minoxidil right after" },
    { slug: "biotin-hair-gummies-60n",       reason: "Feeds new follicle growth" },
    { slug: "scalp-massager-1n",             reason: "Spread product post-roll" },
  ],
  "derma-roller-replaceable-head": [
    { slug: "growmax-minoxidil-5",           reason: "Apply minoxidil right after" },
    { slug: "biotin-hair-gummies-60n",       reason: "Feeds new follicle growth" },
    { slug: "scalp-massager-1n",             reason: "Spread product post-roll" },
  ],
  "scalp-massager-1n": [
    { slug: "advance-daily-use-anti-dandruff-shampoo", reason: "Use during shampoo" },
    { slug: "anti-dandruff-serum",           reason: "Drive serum deeper in" },
    { slug: "biotin-hair-gummies-60n",       reason: "Stack with inner nutrition" },
  ],

  // ── HAIR: Supplements ───────────────────────────────────────────────────────
  "biotin-hair-gummies-60n": [
    { slug: "growmax-minoxidil-5",           reason: "Pair with topical boost" },
    { slug: "anti-hair-fall-shampoo-300ml",  reason: "Cleanses as gummies nourish" },
    { slug: "scalp-massager-1n",             reason: "Drive nutrition to roots" },
  ],
  "biotin-hair-gummies-30n": [
    { slug: "growmax-minoxidil-5",           reason: "Pair with topical boost" },
    { slug: "anti-hair-fall-shampoo-300ml",  reason: "Cleanses as gummies nourish" },
    { slug: "scalp-massager-1n",             reason: "Drive nutrition to roots" },
  ],
  "biotin-hair-gummies-90n": [
    { slug: "growmax-minoxidil-5",           reason: "Pair with topical boost" },
    { slug: "anti-hair-fall-shampoo-300ml",  reason: "Cleanses as gummies nourish" },
    { slug: "scalp-massager-1n",             reason: "Drive nutrition to roots" },
  ],
  "hair-health-gummies": [
    { slug: "anti-hair-fall-shampoo-300ml",  reason: "Topical + oral hair care" },
    { slug: "hair-activator-derma-roller",   reason: "Activate roots, then nourish" },
    { slug: "scalp-massager-1n",             reason: "Drive nutrients to roots" },
  ],

  // ── BEARD ───────────────────────────────────────────────────────────────────
  "beardmax-growth-serum-30-ml": [
    { slug: "oral-minoxidil-for-beard-growth", reason: "Stimulates growth internally" },
    { slug: "hair-activator-derma-roller",     reason: "Primes skin for serum" },
    { slug: "ashwagandha-gummies",             reason: "Supports testosterone naturally" },
  ],
  "oral-minoxidil-for-beard-growth": [
    { slug: "beardmax-growth-serum-30-ml",     reason: "Topical layer on top" },
    { slug: "hair-activator-derma-roller",     reason: "Micro-channels boost results" },
    { slug: "ashwagandha-gummies",             reason: "Amplifies hormonal support" },
  ],

  // ── SKIN: Face ──────────────────────────────────────────────────────────────
  "rejuv-niacinamide-serum": [
    { slug: "2-salicylic-acid-face-wash",    reason: "Clear skin before serum" },
    { slug: "ultra-light-sunscreen-spf50",   reason: "Must-have post-serum shield" },
    { slug: "derma-roller-for-skin",         reason: "Micro-channels boost serum" },
  ],
  "2-salicylic-acid-face-wash": [
    { slug: "rejuv-niacinamide-serum",       reason: "Layer serum after cleanse" },
    { slug: "ultra-light-sunscreen-spf50",   reason: "Always finish with SPF" },
    { slug: "derma-roller-for-skin",         reason: "Enhance serum penetration" },
  ],
  "ultra-light-sunscreen-spf50": [
    { slug: "2-salicylic-acid-face-wash",    reason: "Cleanser that comes first" },
    { slug: "rejuv-niacinamide-serum",       reason: "Treat before you protect" },
    { slug: "derma-roller-for-skin",         reason: "Boost the serum it shields" },
  ],
  "derma-roller-for-skin": [
    { slug: "rejuv-niacinamide-serum",       reason: "Roll, then layer serum" },
    { slug: "2-salicylic-acid-face-wash",    reason: "Clean before you roll" },
    { slug: "ultra-light-sunscreen-spf50",   reason: "Protect post-treatment skin" },
  ],
  "pigmentation-repair-cream": [
    { slug: "rejuv-niacinamide-serum",       reason: "Brighten and even out together" },
    { slug: "ultra-light-sunscreen-spf50",   reason: "SPF prevents new pigmentation" },
    { slug: "2-salicylic-acid-face-wash",    reason: "Prep skin for better absorption" },
  ],

  // ── SKIN: Body ──────────────────────────────────────────────────────────────
  "charcoal-body-wash-750-ml": [
    { slug: "body-sunscreen-lotion-with-spf-50", reason: "Protect after you cleanse" },
    { slug: "salicylic-ceramide-bodywash",        reason: "Alternate for textured skin" },
    { slug: "swash-intimate-wash-120ml",          reason: "Complete body hygiene" },
  ],
  "charcoal-body-wash-500-ml": [
    { slug: "body-sunscreen-lotion-with-spf-50", reason: "Protect after you cleanse" },
    { slug: "salicylic-ceramide-bodywash",        reason: "Alternate for textured skin" },
    { slug: "swash-intimate-wash-120ml",          reason: "Complete body hygiene" },
  ],
  "charcoal-body-wash-250-ml": [
    { slug: "body-sunscreen-lotion-with-spf-50", reason: "Protect after you cleanse" },
    { slug: "salicylic-ceramide-bodywash",        reason: "Alternate for textured skin" },
    { slug: "swash-intimate-wash-120ml",          reason: "Complete body hygiene" },
  ],
  "body-sunscreen-lotion-with-spf-50": [
    { slug: "charcoal-body-wash-750-ml",    reason: "Cleanse, then protect" },
    { slug: "ultra-light-sunscreen-spf50",  reason: "Face SPF to match" },
    { slug: "rejuv-niacinamide-serum",      reason: "Serum before your SPF" },
  ],
  "salicylic-ceramide-bodywash": [
    { slug: "body-sunscreen-lotion-with-spf-50", reason: "Protect after cleansing" },
    { slug: "charcoal-body-wash-750-ml",          reason: "Alternate cleanse option" },
    { slug: "swash-intimate-wash-120ml",          reason: "Complete daily hygiene" },
  ],
  "swash-intimate-wash-120ml": [
    { slug: "charcoal-body-wash-750-ml",    reason: "Complete the body routine" },
    { slug: "salicylic-ceramide-bodywash",  reason: "For skin-type hygiene needs" },
    { slug: "body-sunscreen-lotion-with-spf-50", reason: "Protect exposed skin too" },
  ],

  // ── WEIGHT ──────────────────────────────────────────────────────────────────
  "micronised-creatine-monohydrate": [
    { slug: "whey-protein-powder-500-gm",   reason: "Protein to build muscle" },
    { slug: "electrolyte",                  reason: "Rehydrate post-workout" },
    { slug: "shilajit-gummies",             reason: "Natural energy amplifier" },
  ],
  "creatine-powder": [
    { slug: "whey-protein-powder-500-gm",   reason: "Protein to build muscle" },
    { slug: "electrolyte",                  reason: "Rehydrate post-workout" },
    { slug: "shilajit-gummies",             reason: "Natural energy amplifier" },
  ],
  "creatine-electrolyte": [
    { slug: "whey-protein-powder-500-gm",   reason: "Protein to build on top" },
    { slug: "super-blend-nutrition-powder", reason: "All-in-one nutrition layer" },
    { slug: "shilajit-gummies",             reason: "Natural energy amplifier" },
  ],
  "whey-protein-powder-500-gm": [
    { slug: "micronised-creatine-monohydrate", reason: "Creatine to power every rep" },
    { slug: "electrolyte",                     reason: "Replace what you sweat out" },
    { slug: "shilajit-gummies",                reason: "Stamina boost on top" },
  ],
  "plant-protein-powder-500-gm": [
    { slug: "micronised-creatine-monohydrate", reason: "Creatine to power every rep" },
    { slug: "electrolyte",                     reason: "Replace what you sweat out" },
    { slug: "shilajit-gummies",                reason: "Stamina boost on top" },
  ],
  "super-blend-nutrition-powder": [
    { slug: "micronised-creatine-monohydrate", reason: "Add creatine to the stack" },
    { slug: "electrolyte",                     reason: "Stay hydrated through training" },
    { slug: "shilajit-gummies",                reason: "Natural energy amplifier" },
  ],
  "superblend": [
    { slug: "micronised-creatine-monohydrate", reason: "Add creatine to the stack" },
    { slug: "electrolyte",                     reason: "Stay hydrated through training" },
    { slug: "shilajit-gummies",                reason: "Natural energy amplifier" },
  ],
  "electrolyte": [
    { slug: "micronised-creatine-monohydrate", reason: "Pair with your creatine" },
    { slug: "whey-protein-powder-500-gm",      reason: "Post-workout protein" },
    { slug: "shilajit-gummies",                reason: "Sustained energy support" },
  ],

  // ── HORMONES / ENERGY ───────────────────────────────────────────────────────
  "tostero-120-capsules": [
    { slug: "ashwagandha-gummies",    reason: "Amplify with adaptogen" },
    { slug: "shilajit-gummies",       reason: "Ancient stamina stacker" },
    { slug: "multivitamin-gummies",   reason: "Fill daily nutrient gaps" },
  ],
  "tostero-capsules-60n": [
    { slug: "ashwagandha-gummies",    reason: "Amplify with adaptogen" },
    { slug: "shilajit-gummies",       reason: "Ancient stamina stacker" },
    { slug: "multivitamin-gummies",   reason: "Fill daily nutrient gaps" },
  ],
  "ashwagandha-gummies": [
    { slug: "tostero-120-capsules",   reason: "Clinical strength on top" },
    { slug: "shilajit-gummies",       reason: "Ancient energy combo" },
    { slug: "multivitamin-gummies",   reason: "Cover your daily basics" },
  ],
  "shilajit-gummies": [
    { slug: "tostero-120-capsules",   reason: "Clinical T-booster to pair" },
    { slug: "ashwagandha-gummies",    reason: "Adaptogen power combo" },
    { slug: "multivitamin-gummies",   reason: "Daily foundation layer" },
  ],
  "endure-long-last-spray-20ml": [
    { slug: "tostero-120-capsules",   reason: "Address the root cause" },
    { slug: "ashwagandha-gummies",    reason: "Ease performance anxiety" },
    { slug: "shilajit-gummies",       reason: "Stamina from inside out" },
  ],

  // ── SLEEP ───────────────────────────────────────────────────────────────────
  "magnesium-gummies": [
    { slug: "magnesium-lotion",            reason: "Transdermal to reinforce oral" },
    { slug: "ashwagandha-gummies",         reason: "Calm stress + sleep combo" },
    { slug: "multivitamin-gummies",        reason: "Fill the vitamin gaps" },
  ],
  "advanced-magnesium-gummies": [
    { slug: "magnesium-lotion",            reason: "Transdermal to reinforce oral" },
    { slug: "ashwagandha-gummies",         reason: "Calm stress + sleep combo" },
    { slug: "multivitamin-gummies",        reason: "Fill the vitamin gaps" },
  ],
  "magnesium-glycinate-gummies-60n": [
    { slug: "magnesium-lotion",            reason: "Topical layer on top" },
    { slug: "ashwagandha-gummies",         reason: "Dual wind-down stack" },
    { slug: "multivitamin-gummies",        reason: "Cover your daily gaps" },
  ],
  "magnesium-lotion": [
    { slug: "magnesium-gummies",           reason: "Oral gummies to reinforce" },
    { slug: "ashwagandha-gummies",         reason: "Stress relief + sleep stack" },
    { slug: "multivitamin-gummies",        reason: "Cover daily deficiencies" },
  ],

};

export const ROUTINE_HEADER: Record<string, string> = {
  hair:     "Complete your hair routine",
  beard:    "Complete your beard routine",
  skin:     "Complete your skin routine",
  weight:   "Stack for better results",
  energy:   "Power your protocol",
  sleep:    "Complete the wind-down stack",
  hormones: "Complete your protocol",
};
