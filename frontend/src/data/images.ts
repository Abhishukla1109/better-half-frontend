/* ══════════════════════════════════════════════════════
   Image maps — maps slugs/keys to image paths
   ══════════════════════════════════════════════════════ */

/** Product slug → product image */
export const productImages: Record<string, string> = {
  "creatine-monohydrate": "/images/products/creatine.jpg",
  "iron-vitamin-c": "/images/products/iron.jpg",
  "biotin-zinc-hair": "/images/products/biotin.jpg",
  "ashwagandha-ksm66": "/images/products/ashwagandha.jpg",
  "daily-probiotics": "/images/products/probiotics.jpg",
  "whey-protein-isolate": "/images/products/whey.jpg",
  "magnesium-b6": "/images/products/magnesium.jpg",
  "kids-multivitamin-gummies": "/images/products/gummies.jpg",
};

/** Concern label → concern image */
export const concernImages: Record<string, string> = {
  "Hair / beard": "/images/concerns/hair.jpg",
  "Skin / acne": "/images/concerns/skin.jpg",
  "Energy / gut": "/images/concerns/energy.jpg",
  "Weight": "/images/concerns/weight.jpg",
  "Hormones": "/images/concerns/hormones.jpg",
  "Sleep / mind": "/images/concerns/sleep.jpg",
};

export function getProductImage(slug: string): string | undefined {
  return productImages[slug];
}

export function getConcernImage(concern: string): string | undefined {
  return concernImages[concern];
}
