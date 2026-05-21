/* ══════════════════════════════════════════════════════
   Image maps — maps slugs/keys to image paths
   ══════════════════════════════════════════════════════ */

/** Product slug → product image */
export const productImages: Record<string, string> = {
  "creatine-monohydrate":     "/images/products/creatine.jpg",
  "iron-vitamin-c":           "/images/products/iron.jpg",
  "biotin-zinc-hair":         "/images/products/biotin.jpg",
  "ashwagandha-ksm66":        "/images/products/ashwagandha.jpg",
  "daily-probiotics":         "/images/products/probiotics.jpg",
  "whey-protein-isolate":     "/images/products/whey.jpg",
  "magnesium-b6":             "/images/products/magnesium.jpg",
  "kids-multivitamin-gummies":"/images/products/gummies.jpg",
};

/** Concern label → concern image (gender-neutral fallback) */
export const concernImages: Record<string, string> = {
  "Hair / beard": "/images/concerns/hair.jpg",
  "Skin / acne":  "/images/concerns/skin.jpg",
  "Energy / gut": "/images/concerns/energy.jpg",
  "Weight":       "/images/concerns/weight.jpg",
  "Hormones":     "/images/concerns/hormones.jpg",
  "Sleep / mind": "/images/concerns/sleep.jpg",
};

/** Male concern images */
export const maleConcernImages: Record<string, string> = {
  "Hair / beard": "/images/concerns/hair-male.jpg",
  "Skin / acne":  "/images/concerns/skin-male.jpg",
  "Energy / gut": "/images/concerns/energy-male.jpg",
  "Weight":       "/images/concerns/weight-male.jpg",
  "Hormones":     "/images/concerns/hormones-male.jpg",
  "Sleep / mind": "/images/concerns/sleep-male.jpg",
};

/** Female concern images */
export const femaleConcernImages: Record<string, string> = {
  "Hair / beard": "/images/concerns/hair-female.jpg",
  "Skin / acne":  "/images/concerns/skin-female.jpg",
  "Energy / gut": "/images/concerns/energy-female.jpg",
  "Weight":       "/images/concerns/weight-female.jpg",
  "Hormones":     "/images/concerns/hormones-female.jpg",
  "Sleep / mind": "/images/concerns/sleep-female.jpg",
};

/** Returns the gender-appropriate image for a concern key */
export function getGenderedConcernImage(key: string, sex?: string): string | undefined {
  if (sex === "male")   return maleConcernImages[key]  ?? concernImages[key];
  if (sex === "female") return femaleConcernImages[key] ?? concernImages[key];
  return concernImages[key];
}

/** Protocol engine product ID → product image */
const protocolProductImages: Record<string, string> = {
  "mm-biotin-30":        "/images/products/biotin.jpg",
  "mm-hair-serum":       "/images/products/biotin.jpg",
  "mm-dht-shampoo":      "/images/products/biotin.jpg",
  "mm-dandruff-shampoo": "/images/products/biotin.jpg",
  "mm-stage1-kit":       "/images/products/biotin.jpg",
  "bb-biotin":           "/images/products/biotin.jpg",
  "bb-hair-serum":       "/images/products/biotin.jpg",
  "bb-keratin-shampoo":  "/images/products/biotin.jpg",
  "bb-postpreg-hair":    "/images/products/biotin.jpg",
  "lj-mom-hair":         "/images/products/biotin.jpg",
  "mm-beardmax":         "/images/products/ashwagandha.jpg",
  "mm-beard-kit":        "/images/products/ashwagandha.jpg",
  "mm-shilajit":         "/images/products/ashwagandha.jpg",
  "mm-tostero":          "/images/products/ashwagandha.jpg",
  "mm-ashwagandha":      "/images/products/ashwagandha.jpg",
  "bb-shilajit-women":   "/images/products/ashwagandha.jpg",
  "mm-niacinamide":      "/images/products/iron.jpg",
  "mm-facewash":         "/images/products/probiotics.jpg",
  "mm-clear-skin":       "/images/products/probiotics.jpg",
  "bb-salicylic-fw":     "/images/products/probiotics.jpg",
  "bb-glutathione":      "/images/products/iron.jpg",
  "bb-acne-pack":        "/images/products/probiotics.jpg",
  "bb-pimple-patch":     "/images/products/probiotics.jpg",
  "bb-collagen":         "/images/products/iron.jpg",
  "bb-iron":             "/images/products/iron.jpg",
  "mm-whey":             "/images/products/whey.jpg",
  "mm-creatine":         "/images/products/creatine.jpg",
  "bb-multivitamin":     "/images/products/gummies.jpg",
  "bb-magnesium":        "/images/products/magnesium.jpg",
  "lj-mom-multivitamin": "/images/products/gummies.jpg",
  "lj-mom-magnesium":    "/images/products/magnesium.jpg",
  "lj-mom-calcium":      "/images/products/magnesium.jpg",
  "lj-mom-kit":          "/images/products/magnesium.jpg",
  "lj-kids-immunity":    "/images/products/gummies.jpg",
  "lj-kids-brain":       "/images/products/gummies.jpg",
  "lj-kids-calcium":     "/images/products/magnesium.jpg",
  "lj-kids-multivitamin":"/images/products/gummies.jpg",
  "lj-nutrimix":         "/images/products/gummies.jpg",
  "lj-electrolyte":      "/images/products/magnesium.jpg",
};

export function getProductImage(slug: string): string | undefined {
  return productImages[slug];
}

export function getConcernImage(concern: string): string | undefined {
  return concernImages[concern];
}

export function getProtocolProductImage(productId: string): string | undefined {
  return protocolProductImages[productId];
}
