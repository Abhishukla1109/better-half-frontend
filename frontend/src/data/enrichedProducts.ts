import biotinHairGummies30n from "@/catalog/enriched/biotin-hair-gummies-30n.json";
import advancedHairRegrowthRegime from "@/catalog/enriched/advanced-hair-regrowth-regime.json";
import stage3HairRegrowthKit from "@/catalog/enriched/stage-3-hair-regrowth-kit.json";
import advanceAntiDandruffShampoo from "@/catalog/enriched/advance-daily-use-anti-dandruff-shampoo.json";
import creatineElectrolyte from "@/catalog/enriched/creatine-electrolyte.json";
import micronisedCreatine from "@/catalog/enriched/micronised-creatine-monohydrate.json";
import superBlendNutritionPowder from "@/catalog/enriched/super-blend-nutrition-powder.json";
import growmaxMinoxidil5 from "@/catalog/enriched/growmax-minoxidil-5.json";
import shilajitGummies from "@/catalog/enriched/shilajit-gummies.json";
import antiDandruffProKit from "@/catalog/enriched/anti-dandruff-pro-kit.json";
import beardmaxGrowthSerum from "@/catalog/enriched/beardmax-growth-serum-30-ml.json";
import beardGrowthKitLowBeard from "@/catalog/enriched/beard-growth-kit-for-low-beard.json";
import advancedMagnesiumGummies from "@/catalog/enriched/advanced-magnesium-gummies.json";
import magnesiumLotion from "@/catalog/enriched/magnesium-lotion.json";
import beardGrowthKit1MonthPack from "@/catalog/enriched/beard-growth-kit-1-month-pack.json";
import ketoconazoleShampoo200Ml from "@/catalog/enriched/1-ketoconazole-shampoo-200-ml.json";
import dermaRollerReplaceableHead from "@/catalog/enriched/derma-roller-replaceable-head.json";
import biotinHairGummies90n from "@/catalog/enriched/biotin-hair-gummies-90n.json";
import hairActivatorDermaRoller from "@/catalog/enriched/hair-activator-derma-roller.json";
import rejuvNiacinamideSerum from "@/catalog/enriched/rejuv-niacinamide-serum.json";
import minoxidil501Finasteride from "@/catalog/enriched/minoxidil-5-0-1-finasteride.json";
import ultimateStrengthKit from "@/catalog/enriched/ultimate-strength-kit.json";
import scalpMassager1n from "@/catalog/enriched/scalp-massager-1n.json";
import clearSkinStarterPack1xAntiAcneFaceWash1xRejuvFaceSerum from "@/catalog/enriched/clear-skin-starter-pack-1x-anti-acne-face-wash-1x-rejuv-face-serum.json";
import ashwagandhaGummies from "@/catalog/enriched/ashwagandha-gummies.json";
import charcoalBodyWash750Ml from "@/catalog/enriched/charcoal-body-wash-750-ml.json";
import tostero120Capsules from "@/catalog/enriched/tostero-120-capsules.json";
import completeCleansingKit from "@/catalog/enriched/complete-cleansing-kit.json";
import tosteroCapsules60n from "@/catalog/enriched/tostero-capsules-60n.json";
import faceBodyCleansingKit from "@/catalog/enriched/face-body-cleansing-kit.json";
import dermaRollerForSkin from "@/catalog/enriched/derma-roller-for-skin.json";
import plantProteinPowder500Gm from "@/catalog/enriched/plant-protein-powder-500-gm.json";
import beardDevelopmentKit from "@/catalog/enriched/beard-development-kit.json";
import charcoalBodyWash500Ml from "@/catalog/enriched/charcoal-body-wash-500-ml.json";
import wheyProteinPowder500Gm from "@/catalog/enriched/whey-protein-powder-500-gm.json";
import advanceGrowmax60ml from "@/catalog/enriched/advance-growmax-60ml.json";
import swashIntimateWash120ml from "@/catalog/enriched/swash-intimate-wash-120ml.json";
import antiHairFallShampoo300ml from "@/catalog/enriched/anti-hair-fall-shampoo-300ml.json";
import charcoalBodyWash250Ml from "@/catalog/enriched/charcoal-body-wash-250-ml.json";
import clearSkinPack1xRejuvFaceSerum1xDermaRoller from "@/catalog/enriched/clear-skin-pack-1x-rejuv-face-serum-1x-derma-roller.json";
import endureLongLastSpray20ml from "@/catalog/enriched/endure-long-last-spray-20ml.json";
import minoxidil10Finasteride50ml from "@/catalog/enriched/minoxidil-10-finasteride-50ml.json";
import muscleNutrientsKit from "@/catalog/enriched/muscle-nutrients-kit.json";
import multivitaminGummies from "@/catalog/enriched/multivitamin-gummies.json";
import antiHairFallShampoo200ml from "@/catalog/enriched/anti-hair-fall-shampoo-200ml.json";
import p1xAntiHairfallShampoo300ml1xHairGummies from "@/catalog/enriched/1x-anti-hairfall-shampoo-300ml-1x-hair-gummies.json";
import beardDevelopmentKit2228 from "@/catalog/enriched/beard-development-kit-22-28.json";
import hairActivatorDermaRoller1mm from "@/catalog/enriched/hair-activator-derma-roller-1mm.json";
import completeEnduranceKit1xEndureSpray1xTosteroCapsules from "@/catalog/enriched/complete-endurance-kit-1x-endure-spray-1x-tostero-capsules.json";
import biotinHairGummies60n from "@/catalog/enriched/biotin-hair-gummies-60n.json";
import oralMinoxidilForBeardGrowth from "@/catalog/enriched/oral-minoxidil-for-beard-growth.json";
import dailyHygieneKit from "@/catalog/enriched/daily-hygiene-kit.json";
import minoxidil5Procapil60ml from "@/catalog/enriched/minoxidil-5-procapil-60ml.json";
import p1xMinoxifin1xNourishHairGummies from "@/catalog/enriched/1x-minoxifin-1x-nourish-hair-gummies.json";
import creatinePowder from "@/catalog/enriched/creatine-powder.json";
import hairHealthGummies from "@/catalog/enriched/hair-health-gummies.json";

export type EnrichedIngredient = {
  name: string;
  icon: string;
  shortDesc: string;
  longDesc: string;
};

export type EnrichedTimelineStep = {
  period: string;
  title: string;
  description: string;
  image: string;
};

export type EnrichedFaq = {
  question: string;
  answer: string;
};

export type EnrichedReview = {
  rating: number;
  author: string;
  title: string;
  body: string;
  date: string;
  verified?: boolean;
};

export type EnrichedPDP = {
  slug: string;
  sourceId: string;
  brand: string;
  name: string;
  subtitle: string;
  metaDescription: string;
  rating: { average: number | null; count: number | null };
  images: string[];
  heroVideo: string | null;
  packs: Array<{ label: string; type: string; sku: string; urlKey: string }>;
  badges: Array<{ label: string; icon: string }>;
  ingredients: EnrichedIngredient[];
  productDetails: {
    description: string[];
    details: Array<{ feature: string; value: string }>;
  };
  howToUse: string;
  timeline: EnrichedTimelineStep[];
  faqs: EnrichedFaq[];
  reviews: EnrichedReview[];
  disclaimers: Array<{ title: string; description: string; image?: string }>;
  worksBestWith: Array<{ title: string; description: string; image?: string }>;
  additionalInfo: Array<{ title: string; content: string }>;
  /** "For / With" callout — Be Bodywise specific, optional */
  forWith?: { for: string; with: string };
  /** Percentage of users who recommend this product, e.g. "97%" */
  recommendation?: string;
};

const ENRICHED: Record<string, EnrichedPDP> = {
  "biotin-hair-gummies-30n": biotinHairGummies30n as EnrichedPDP,
  "advanced-hair-regrowth-regime": advancedHairRegrowthRegime as EnrichedPDP,
  "stage-3-hair-regrowth-kit": stage3HairRegrowthKit as EnrichedPDP,
  "1x-minoxifin-1x-nourish-hair-gummies": p1xMinoxifin1xNourishHairGummies as EnrichedPDP,
  "advance-daily-use-anti-dandruff-shampoo": advanceAntiDandruffShampoo as EnrichedPDP,
  "advance-ads": advanceAntiDandruffShampoo as EnrichedPDP,
  "creatine-electrolyte": creatineElectrolyte as EnrichedPDP,
  "micronised-creatine-monohydrate": micronisedCreatine as EnrichedPDP,
  "super-blend-nutrition-powder": superBlendNutritionPowder as EnrichedPDP,
  "superblend": superBlendNutritionPowder as EnrichedPDP,
  "growmax-minoxidil-5": growmaxMinoxidil5 as EnrichedPDP,
  "shilajit-gummies": shilajitGummies as EnrichedPDP,
  "anti-dandruff-pro-kit": antiDandruffProKit as EnrichedPDP,
  "beardmax-growth-serum-30-ml": beardmaxGrowthSerum as EnrichedPDP,
  "beard-growth-kit-for-low-beard": beardGrowthKitLowBeard as EnrichedPDP,
  "magnesium-gummies": advancedMagnesiumGummies as EnrichedPDP,
  "advanced-magnesium-gummies": advancedMagnesiumGummies as EnrichedPDP,
  "magnesium-lotion": magnesiumLotion as EnrichedPDP,
  "beard-growth-kit-1-month-pack": beardGrowthKit1MonthPack as EnrichedPDP,
  "1-ketoconazole-shampoo-200-ml": ketoconazoleShampoo200Ml as EnrichedPDP,
  "biotin-hair-gummies-90n": biotinHairGummies90n as EnrichedPDP,
  "hair-activator-derma-roller": hairActivatorDermaRoller as EnrichedPDP,
  "rejuv-niacinamide-serum": rejuvNiacinamideSerum as EnrichedPDP,
  "minoxidil-5-0-1-finasteride": minoxidil501Finasteride as EnrichedPDP,
  "ultimate-strength-kit": ultimateStrengthKit as EnrichedPDP,
  "scalp-massager-1n": scalpMassager1n as EnrichedPDP,
  "derma-roller-replaceable-head": dermaRollerReplaceableHead as EnrichedPDP,
  "clear-skin-starter-pack-1x-anti-acne-face-wash-1x-rejuv-face-serum": clearSkinStarterPack1xAntiAcneFaceWash1xRejuvFaceSerum as EnrichedPDP,
  "ashwagandha-gummies": ashwagandhaGummies as EnrichedPDP,
  "charcoal-body-wash-750-ml": charcoalBodyWash750Ml as EnrichedPDP,
  "tostero-120-capsules": tostero120Capsules as EnrichedPDP,
  "complete-cleansing-kit": completeCleansingKit as EnrichedPDP,
  "tostero-capsules-60n": tosteroCapsules60n as EnrichedPDP,
  "face-body-cleansing-kit": faceBodyCleansingKit as EnrichedPDP,
  "derma-roller-for-skin": dermaRollerForSkin as EnrichedPDP,
  "plant-protein-powder-500-gm": plantProteinPowder500Gm as EnrichedPDP,
  "beard-development-kit": beardDevelopmentKit as EnrichedPDP,
  "charcoal-body-wash-500-ml": charcoalBodyWash500Ml as EnrichedPDP,
  "whey-protein-powder-500-gm": wheyProteinPowder500Gm as EnrichedPDP,
  "advance-growmax-60ml": advanceGrowmax60ml as EnrichedPDP,
  "swash-intimate-wash-120ml": swashIntimateWash120ml as EnrichedPDP,
  "anti-hair-fall-shampoo-300ml": antiHairFallShampoo300ml as EnrichedPDP,
  "charcoal-body-wash-250-ml": charcoalBodyWash250Ml as EnrichedPDP,
  "clear-skin-pack-1x-rejuv-face-serum-1x-derma-roller": clearSkinPack1xRejuvFaceSerum1xDermaRoller as EnrichedPDP,
  "endure-long-last-spray-20ml": endureLongLastSpray20ml as EnrichedPDP,
  "minoxidil-10-finasteride-50ml": minoxidil10Finasteride50ml as EnrichedPDP,
  "muscle-nutrients-kit": muscleNutrientsKit as EnrichedPDP,
  "multivitamin-gummies": multivitaminGummies as EnrichedPDP,
  "anti-hair-fall-shampoo-200ml": antiHairFallShampoo200ml as EnrichedPDP,
  "1x-anti-hairfall-shampoo-300ml-1x-hair-gummies": p1xAntiHairfallShampoo300ml1xHairGummies as EnrichedPDP,
  "beard-development-kit-22-28": beardDevelopmentKit2228 as EnrichedPDP,
  "hair-activator-derma-roller-1mm": hairActivatorDermaRoller1mm as EnrichedPDP,
  "complete-endurance-kit-1x-endure-spray-1x-tostero-capsules": completeEnduranceKit1xEndureSpray1xTosteroCapsules as EnrichedPDP,
  "biotin-hair-gummies-60n": biotinHairGummies60n as EnrichedPDP,
  "oral-minoxidil-for-beard-growth": oralMinoxidilForBeardGrowth as EnrichedPDP,
  "daily-hygiene-kit": dailyHygieneKit as EnrichedPDP,
  "minoxidil-5-procapil-60ml": minoxidil5Procapil60ml as EnrichedPDP,
  "creatine-powder": creatinePowder as EnrichedPDP,
  "hair-health-gummies": hairHealthGummies as EnrichedPDP,
};

export function getEnrichedPDP(slug: string): EnrichedPDP | null {
  return ENRICHED[slug] ?? null;
}
