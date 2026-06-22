/**
 * "Complete your routine" pairings — maps a product slug to paired products.
 * RULE: targets must be the same brand as the key. No cross-brand mixing.
 * reason: short 4-6 word chip shown on the card.
 */
export type PairingItem = { slug: string; reason: string };

export const PRODUCT_PAIRINGS: Record<string, PairingItem[]> = {

  // ─────────────────────────────────────────────────────────────────
  // MAN MATTERS — Hair (anti-dandruff shampoos)
  // ─────────────────────────────────────────────────────────────────
  "advance-daily-use-anti-dandruff-shampoo": [
    { slug: "scalp-massager-1n",           reason: "Boosts product absorption" },
    { slug: "biotin-hair-gummies-60n",     reason: "Nourishes from inside" },
    { slug: "hair-activator-derma-roller", reason: "Activates scalp circulation" },
  ],
  "1-ketoconazole-shampoo-200-ml": [
    { slug: "scalp-massager-1n",           reason: "Boosts medicated absorption" },
    { slug: "biotin-hair-gummies-60n",     reason: "Feeds follicles from within" },
    { slug: "hair-activator-derma-roller", reason: "Activates scalp blood flow" },
  ],

  // ─────────────────────────────────────────────────────────────────
  // MAN MATTERS — Hair (anti-hair fall shampoos)
  // ─────────────────────────────────────────────────────────────────
  "anti-hair-fall-shampoo-300ml": [
    { slug: "growmax-minoxidil-5",         reason: "Topical regrowth on top" },
    { slug: "biotin-hair-gummies-60n",     reason: "Nourishes roots from inside" },
    { slug: "hair-activator-derma-roller", reason: "Activates scalp blood flow" },
  ],
  "anti-hair-fall-shampoo-200ml": [
    { slug: "growmax-minoxidil-5",         reason: "Topical regrowth on top" },
    { slug: "biotin-hair-gummies-60n",     reason: "Nourishes roots from inside" },
    { slug: "hair-activator-derma-roller", reason: "Activates scalp blood flow" },
  ],

  // ─────────────────────────────────────────────────────────────────
  // MAN MATTERS — Hair (minoxidil serums)
  // ─────────────────────────────────────────────────────────────────
  "growmax-minoxidil-5": [
    { slug: "hair-activator-derma-roller", reason: "Doubles absorption by 40%" },
    { slug: "biotin-hair-gummies-60n",     reason: "Feeds follicles from within" },
    { slug: "scalp-massager-1n",           reason: "Drives deeper penetration" },
  ],
  "advance-growmax-60ml": [
    { slug: "hair-activator-derma-roller", reason: "Doubles absorption by 40%" },
    { slug: "biotin-hair-gummies-60n",     reason: "Feeds follicles from within" },
    { slug: "scalp-massager-1n",           reason: "Drives deeper penetration" },
  ],
  "minoxidil-5-0-1-finasteride": [
    { slug: "hair-activator-derma-roller", reason: "Doubles absorption by 40%" },
    { slug: "biotin-hair-gummies-60n",     reason: "Feeds follicles from within" },
    { slug: "scalp-massager-1n",           reason: "Drives deeper penetration" },
  ],
  "minoxidil-10-finasteride-50ml": [
    { slug: "hair-activator-derma-roller", reason: "Doubles absorption by 40%" },
    { slug: "biotin-hair-gummies-60n",     reason: "Feeds follicles from within" },
    { slug: "scalp-massager-1n",           reason: "Drives deeper penetration" },
  ],
  "minoxidil-5-procapil-60ml": [
    { slug: "hair-activator-derma-roller", reason: "Doubles absorption by 40%" },
    { slug: "biotin-hair-gummies-60n",     reason: "Feeds follicles from within" },
    { slug: "scalp-massager-1n",           reason: "Drives deeper penetration" },
  ],

  // ─────────────────────────────────────────────────────────────────
  // MAN MATTERS — Hair (tools)
  // ─────────────────────────────────────────────────────────────────
  "hair-activator-derma-roller": [
    { slug: "growmax-minoxidil-5",         reason: "Apply minoxidil right after" },
    { slug: "biotin-hair-gummies-60n",     reason: "Feeds new follicle growth" },
    { slug: "scalp-massager-1n",           reason: "Spread product post-roll" },
  ],
  "hair-activator-derma-roller-1mm": [
    { slug: "growmax-minoxidil-5",         reason: "Apply minoxidil right after" },
    { slug: "biotin-hair-gummies-60n",     reason: "Feeds new follicle growth" },
    { slug: "scalp-massager-1n",           reason: "Spread product post-roll" },
  ],
  "derma-roller-replaceable-head": [
    { slug: "growmax-minoxidil-5",         reason: "Apply minoxidil right after" },
    { slug: "biotin-hair-gummies-60n",     reason: "Feeds new follicle growth" },
    { slug: "scalp-massager-1n",           reason: "Spread product post-roll" },
  ],
  "scalp-massager-1n": [
    { slug: "advance-daily-use-anti-dandruff-shampoo", reason: "Use during shampoo" },
    { slug: "biotin-hair-gummies-60n",     reason: "Stack with inner nutrition" },
    { slug: "growmax-minoxidil-5",         reason: "Drives minoxidil deeper" },
  ],

  // ─────────────────────────────────────────────────────────────────
  // MAN MATTERS — Hair (supplements)
  // ─────────────────────────────────────────────────────────────────
  "biotin-hair-gummies-60n": [
    { slug: "growmax-minoxidil-5",         reason: "Pair with topical boost" },
    { slug: "anti-hair-fall-shampoo-300ml",reason: "Cleanses as gummies nourish" },
    { slug: "scalp-massager-1n",           reason: "Drive nutrition to roots" },
  ],
  "biotin-hair-gummies-30n": [
    { slug: "growmax-minoxidil-5",         reason: "Pair with topical boost" },
    { slug: "anti-hair-fall-shampoo-300ml",reason: "Cleanses as gummies nourish" },
    { slug: "scalp-massager-1n",           reason: "Drive nutrition to roots" },
  ],
  "biotin-hair-gummies-90n": [
    { slug: "growmax-minoxidil-5",         reason: "Pair with topical boost" },
    { slug: "anti-hair-fall-shampoo-300ml",reason: "Cleanses as gummies nourish" },
    { slug: "scalp-massager-1n",           reason: "Drive nutrition to roots" },
  ],

  // ─────────────────────────────────────────────────────────────────
  // MAN MATTERS — Beard
  // ─────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────
  // MAN MATTERS — Skin & Body
  // ─────────────────────────────────────────────────────────────────
  "rejuv-niacinamide-serum": [
    { slug: "derma-roller-for-skin",       reason: "Micro-channels boost serum" },
    { slug: "charcoal-body-wash-750-ml",   reason: "Cleanse before you treat" },
    { slug: "swash-intimate-wash-120ml",   reason: "Complete men's skin routine" },
  ],
  "derma-roller-for-skin": [
    { slug: "rejuv-niacinamide-serum",     reason: "Roll, then layer serum" },
    { slug: "charcoal-body-wash-750-ml",   reason: "Clean skin before rolling" },
    { slug: "swash-intimate-wash-120ml",   reason: "Complete men's skin care" },
  ],
  "charcoal-body-wash-750-ml": [
    { slug: "rejuv-niacinamide-serum",     reason: "Face serum to pair with" },
    { slug: "derma-roller-for-skin",       reason: "Level up your skin routine" },
    { slug: "swash-intimate-wash-120ml",   reason: "Complete body hygiene" },
  ],
  "charcoal-body-wash-500-ml": [
    { slug: "rejuv-niacinamide-serum",     reason: "Face serum to pair with" },
    { slug: "derma-roller-for-skin",       reason: "Level up your skin routine" },
    { slug: "swash-intimate-wash-120ml",   reason: "Complete body hygiene" },
  ],
  "charcoal-body-wash-250-ml": [
    { slug: "rejuv-niacinamide-serum",     reason: "Face serum to pair with" },
    { slug: "derma-roller-for-skin",       reason: "Level up your skin routine" },
    { slug: "swash-intimate-wash-120ml",   reason: "Complete body hygiene" },
  ],
  "swash-intimate-wash-120ml": [
    { slug: "charcoal-body-wash-750-ml",   reason: "Complete the body routine" },
    { slug: "rejuv-niacinamide-serum",     reason: "Face care to match" },
    { slug: "derma-roller-for-skin",       reason: "Full skin upgrade" },
  ],

  // ─────────────────────────────────────────────────────────────────
  // MAN MATTERS — Weight & Fitness
  // ─────────────────────────────────────────────────────────────────
  "micronised-creatine-monohydrate": [
    { slug: "whey-protein-powder-500-gm",  reason: "Protein to build muscle" },
    { slug: "shilajit-gummies",            reason: "Natural energy amplifier" },
    { slug: "multivitamin-gummies",        reason: "Fill micronutrient gaps" },
  ],
  "creatine-powder": [
    { slug: "whey-protein-powder-500-gm",  reason: "Protein to build muscle" },
    { slug: "shilajit-gummies",            reason: "Natural energy amplifier" },
    { slug: "multivitamin-gummies",        reason: "Fill micronutrient gaps" },
  ],
  "creatine-electrolyte": [
    { slug: "whey-protein-powder-500-gm",  reason: "Protein to build on top" },
    { slug: "super-blend-nutrition-powder",reason: "All-in-one nutrition layer" },
    { slug: "shilajit-gummies",            reason: "Natural energy amplifier" },
  ],
  "whey-protein-powder-500-gm": [
    { slug: "micronised-creatine-monohydrate", reason: "Creatine to power every rep" },
    { slug: "shilajit-gummies",            reason: "Stamina boost on top" },
    { slug: "multivitamin-gummies",        reason: "Fill micronutrient gaps" },
  ],
  "plant-protein-powder-500-gm": [
    { slug: "micronised-creatine-monohydrate", reason: "Creatine to power every rep" },
    { slug: "shilajit-gummies",            reason: "Stamina boost on top" },
    { slug: "multivitamin-gummies",        reason: "Fill micronutrient gaps" },
  ],
  "super-blend-nutrition-powder": [
    { slug: "micronised-creatine-monohydrate", reason: "Add creatine to the stack" },
    { slug: "shilajit-gummies",            reason: "Natural energy amplifier" },
    { slug: "multivitamin-gummies",        reason: "Cover daily deficiencies" },
  ],

  // ─────────────────────────────────────────────────────────────────
  // MAN MATTERS — Hormones & Energy
  // ─────────────────────────────────────────────────────────────────
  "tostero-120-capsules": [
    { slug: "ashwagandha-gummies",         reason: "Amplify with adaptogen" },
    { slug: "shilajit-gummies",            reason: "Ancient stamina stacker" },
    { slug: "multivitamin-gummies",        reason: "Fill daily nutrient gaps" },
  ],
  "tostero-capsules-60n": [
    { slug: "ashwagandha-gummies",         reason: "Amplify with adaptogen" },
    { slug: "shilajit-gummies",            reason: "Ancient stamina stacker" },
    { slug: "multivitamin-gummies",        reason: "Fill daily nutrient gaps" },
  ],
  "ashwagandha-gummies": [
    { slug: "tostero-120-capsules",        reason: "Clinical strength on top" },
    { slug: "shilajit-gummies",            reason: "Ancient energy combo" },
    { slug: "multivitamin-gummies",        reason: "Cover your daily basics" },
  ],
  "shilajit-gummies": [
    { slug: "tostero-120-capsules",        reason: "Clinical T-booster to pair" },
    { slug: "ashwagandha-gummies",         reason: "Adaptogen power combo" },
    { slug: "multivitamin-gummies",        reason: "Daily foundation layer" },
  ],
  "endure-long-last-spray-20ml": [
    { slug: "tostero-120-capsules",        reason: "Address the root cause" },
    { slug: "ashwagandha-gummies",         reason: "Ease performance anxiety" },
    { slug: "shilajit-gummies",            reason: "Stamina from inside out" },
  ],

  // ─────────────────────────────────────────────────────────────────
  // MAN MATTERS — Sleep
  // ─────────────────────────────────────────────────────────────────
  "advanced-magnesium-gummies": [
    { slug: "magnesium-lotion",            reason: "Transdermal to reinforce oral" },
    { slug: "ashwagandha-gummies",         reason: "Calm stress + sleep combo" },
    { slug: "multivitamin-gummies",        reason: "Fill the vitamin gaps" },
  ],
  "magnesium-lotion": [
    { slug: "advanced-magnesium-gummies",  reason: "Oral gummies to reinforce" },
    { slug: "ashwagandha-gummies",         reason: "Stress relief + sleep stack" },
    { slug: "multivitamin-gummies",        reason: "Cover daily deficiencies" },
  ],

  // ─────────────────────────────────────────────────────────────────
  // BE BODYWISE — Hair (anti-dandruff shampoos)
  // ─────────────────────────────────────────────────────────────────
  "1-ketoconazole-dandruff-shampoo-250ml": [
    { slug: "anti-dandruff-serum",         reason: "Keeps dandruff away longer" },
    { slug: "deep-moisturizing-conditioner", reason: "Restore moisture post-wash" },
    { slug: "hair-health-gummies",         reason: "Nourishes from inside" },
  ],
  "1-zpto-anti-dandruff-shampoo": [
    { slug: "anti-dandruff-serum",         reason: "Keeps dandruff away longer" },
    { slug: "deep-moisturizing-conditioner", reason: "Restore moisture post-wash" },
    { slug: "hair-health-gummies",         reason: "Nourishes from inside" },
  ],
  "anti-dandruff-serum": [
    { slug: "1-ketoconazole-dandruff-shampoo-250ml", reason: "Shampoo first, serum after" },
    { slug: "deep-moisturizing-conditioner", reason: "Moisture to seal treatment" },
    { slug: "hair-health-gummies",         reason: "Inside-out dandruff defence" },
  ],

  // ─────────────────────────────────────────────────────────────────
  // BE BODYWISE — Hair (serums & growth)
  // ─────────────────────────────────────────────────────────────────
  "folli-advanced-plus-hair-growth-serum": [
    { slug: "1-zpto-anti-dandruff-shampoo",reason: "Preps scalp for serum" },
    { slug: "deep-moisturizing-conditioner", reason: "Condition after serum" },
    { slug: "hair-health-gummies",         reason: "Amplifies serum results" },
  ],
  "hair-growth-serum-roll-on": [
    { slug: "1-zpto-anti-dandruff-shampoo",reason: "Preps scalp for serum" },
    { slug: "deep-moisturizing-conditioner", reason: "Condition after serum" },
    { slug: "hair-health-gummies",         reason: "Amplifies serum results" },
  ],
  "advanced-hair-growth-serum": [
    { slug: "1-zpto-anti-dandruff-shampoo",reason: "Preps scalp for serum" },
    { slug: "deep-moisturizing-conditioner", reason: "Condition after serum" },
    { slug: "hair-health-gummies",         reason: "Amplifies serum results" },
  ],

  // ─────────────────────────────────────────────────────────────────
  // BE BODYWISE — Hair (conditioner & supplements)
  // ─────────────────────────────────────────────────────────────────
  "deep-moisturizing-conditioner": [
    { slug: "1-ketoconazole-dandruff-shampoo-250ml", reason: "The shampoo that precedes" },
    { slug: "anti-dandruff-serum",         reason: "Treatment before conditioner" },
    { slug: "hair-health-gummies",         reason: "Inner nutrition to pair" },
  ],
  "hair-health-gummies": [
    { slug: "1-zpto-anti-dandruff-shampoo",reason: "Topical + oral hair care" },
    { slug: "folli-advanced-plus-hair-growth-serum", reason: "Activate roots, then nourish" },
    { slug: "deep-moisturizing-conditioner", reason: "Lock in with conditioner" },
  ],

  // ─────────────────────────────────────────────────────────────────
  // BE BODYWISE — Skin (face)
  // ─────────────────────────────────────────────────────────────────
  "2-salicylic-acid-face-wash": [
    { slug: "lightest-mineral-sunscreen-spf50", reason: "Always finish with SPF" },
    { slug: "1-peptide-ceramide-moisturizer",   reason: "Hydrate after cleansing" },
    { slug: "collagen-skin-gummies",            reason: "Glow from the inside" },
  ],
  "ultra-light-sunscreen-spf50": [
    { slug: "2-salicylic-acid-face-wash",       reason: "Cleanser that comes first" },
    { slug: "1-peptide-ceramide-moisturizer",   reason: "Moisturise, then protect" },
    { slug: "collagen-skin-gummies",            reason: "Inner + outer glow" },
  ],
  "pigmentation-repair-cream": [
    { slug: "2-salicylic-acid-face-wash",       reason: "Prep skin for treatment" },
    { slug: "lightest-mineral-sunscreen-spf50", reason: "SPF prevents more pigmentation" },
    { slug: "collagen-skin-gummies",            reason: "Brighten from within" },
  ],

  // ─────────────────────────────────────────────────────────────────
  // BE BODYWISE — Skin (body)
  // ─────────────────────────────────────────────────────────────────
  "salicylic-ceramide-bodywash": [
    { slug: "body-sunscreen-lotion-with-spf-50", reason: "Protect after you cleanse" },
    { slug: "niacinamide-body-lotion",            reason: "Lock in post-wash glow" },
    { slug: "collagen-skin-gummies",              reason: "Skin health from inside" },
  ],
  "body-sunscreen-lotion-with-spf-50": [
    { slug: "salicylic-ceramide-bodywash",        reason: "Cleanse before protecting" },
    { slug: "niacinamide-body-lotion",            reason: "Moisturise then protect" },
    { slug: "lightest-mineral-sunscreen-spf50",   reason: "Face SPF to match" },
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
