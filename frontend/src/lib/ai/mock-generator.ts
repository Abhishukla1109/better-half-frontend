/* ══════════════════════════════════════════════════════════════
   Mock protocol generator
   Works with zero API keys — produces demo-quality, varied outputs.
   Uses calculateProtocolMatch for real product recommendations.
   ══════════════════════════════════════════════════════════════ */

import { calculateProtocolMatch, resolveSegment } from "@/lib/protocolEngine";
import type { UserSegment } from "@/lib/protocolEngine";
import { calculateProfileDepth } from "./profile-depth";
import { getProductShopifyUrl } from "./product-handles";
import type {
  UserProfile,
  GeneratedProtocol,
  RoutineItem,
  ProtocolSupplement,
  FollowUpQuestion,
} from "./types";

/* ── Concern normalisation ──────────────────────────────────── */
const CONCERN_MAP: Record<string, string> = {
  "Hair / beard": "hair",
  "Skin / acne": "skin",
  "Energy / gut": "energy",
  "Weight": "weight",
  "Hormones": "hormones",
  "Sleep / mind": "sleep",
};

/* Parse comma-separated concerns string or fall back to single concern */
function parseConcerns(profile: UserProfile): string[] {
  const raw = profile.concerns as string | undefined;
  if (raw) return raw.split(",").filter(Boolean);
  return profile.concern ? [profile.concern] : [DEFAULT_CONCERN];
}

/* Bridge sentences linking pairs of concerns for multi-concern summaries */
const CONCERN_BRIDGES: Record<string, string> = {
  "Hair / beard|Energy / gut": "Your energy and gut health are foundational to hair recovery — they directly control the nutrient supply that follicles depend on.",
  "Hair / beard|Skin / acne": "Skin and hair share the same root systems — the gut-skin axis and micronutrient pipeline feed both simultaneously.",
  "Hair / beard|Sleep / mind": "Sleep is when follicle regeneration happens — disrupted sleep damages the hair growth cycle as directly as any deficiency.",
  "Hair / beard|Hormones": "Hormonal balance regulates the hair growth cycle — cortisol and DHT are two of the biggest structural drivers of thinning.",
  "Hair / beard|Weight": "Weight management and hair health share a common root: cortisol and insulin both affect follicle function and nutrient partitioning.",
  "Skin / acne|Energy / gut": "Your gut microbiome determines skin clarity — the same imbalances that cause bloating and fatigue directly trigger breakouts.",
  "Skin / acne|Sleep / mind": "Cortisol from poor sleep is one of the most consistent acne triggers — sleep quality is as much a skincare intervention as a wellness one.",
  "Skin / acne|Hormones": "Hormonal fluctuations are a primary driver of adult acne — your protocol targets both the cortisol and skin components simultaneously.",
  "Skin / acne|Weight": "Insulin spikes from poor diet trigger both acne and fat storage — addressing one improves the other through the same pathway.",
  "Energy / gut|Sleep / mind": "Sleep and energy are deeply coupled — poor sleep raises cortisol which disrupts gut function and amplifies fatigue the next day.",
  "Energy / gut|Hormones": "Gut health and hormonal balance are bidirectional — a disrupted microbiome directly reduces hormone synthesis efficiency.",
  "Energy / gut|Weight": "Your metabolism depends on gut health and nutrient absorption — both are addressed together in this protocol.",
  "Sleep / mind|Hormones": "Sleep is the most powerful hormonal lever — melatonin, cortisol, and sex hormones all reset during deep sleep.",
  "Sleep / mind|Weight": "Poor sleep raises ghrelin (hunger hormone) significantly and increases belly fat storage — sleep is a weight loss intervention.",
  "Hormones|Weight": "Cortisol and insulin are the primary drivers of body composition — this protocol targets both pathways at the root.",
};

/* ── Follow-up question bank ────────────────────────────────── */
const QUESTION_BANK: Record<string, FollowUpQuestion> = {
  sleep: {
    key: "sleep",
    question: "How's your sleep quality been?",
    options: [
      { label: "Rarely good", value: "poor" },
      { label: "Hit or miss", value: "variable" },
      { label: "Mostly fine", value: "good" },
    ],
  },
  stress: {
    key: "stress",
    question: "How would you rate your stress levels?",
    options: [
      { label: "High — anxious often", value: "high" },
      { label: "Moderate", value: "moderate" },
      { label: "Fairly calm", value: "low" },
    ],
  },
  activity: {
    key: "activity",
    question: "How active are you on a typical day?",
    options: [
      { label: "Desk-bound", value: "sedentary" },
      { label: "Light activity", value: "light" },
      { label: "Regularly active", value: "active" },
    ],
  },
  water: {
    key: "water",
    question: "How much water do you drink daily?",
    options: [
      { label: "Less than 1 litre", value: "low" },
      { label: "1–2 litres", value: "moderate" },
      { label: "2+ litres", value: "good" },
    ],
  },
  bloating: {
    key: "bloating",
    question: "Do you experience bloating or digestive discomfort often?",
    options: [
      { label: "Yes, frequently", value: "high" },
      { label: "Sometimes", value: "moderate" },
      { label: "Rarely", value: "low" },
    ],
  },
  goal: {
    key: "goal",
    question: "What's your primary goal right now?",
    options: [
      { label: "Lose fat", value: "lose" },
      { label: "Build muscle", value: "gain" },
      { label: "Both", value: "both" },
    ],
  },
  bedtime: {
    key: "bedtime",
    question: "What time do you usually wind down for the night?",
    options: [
      { label: "Before 10 PM", value: "early" },
      { label: "10 PM – midnight", value: "normal" },
      { label: "After midnight", value: "late" },
    ],
  },
  screens: {
    key: "screens",
    question: "Do you use screens (phone / TV) right before bed?",
    options: [
      { label: "Yes, often", value: "high" },
      { label: "Sometimes", value: "moderate" },
      { label: "Rarely", value: "low" },
    ],
  },
  moodSwings: {
    key: "moodSwings",
    question: "Do you experience mood swings or energy crashes?",
    options: [
      { label: "Frequently", value: "high" },
      { label: "Sometimes", value: "moderate" },
      { label: "Rarely", value: "low" },
    ],
  },
  familyHistory: {
    key: "familyHistory",
    question: "Does anyone in your family deal with similar concerns?",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
      { label: "Not sure", value: "unsure" },
    ],
  },
};

/* ── Concern configuration ──────────────────────────────────── */
interface ConcernNarrative {
  summaryBase: string;
  summaryVariants: {
    plantBased?: string;
    female?: string;
    older?: string; // 35-44 or 45+
    highStress?: string;
  };
  explanation: (p: UserProfile) => string;
  routine: RoutineItem[];
  lifestyle: string[];
  productTiming: Record<string, string>; // category → timing
  productReasoning: Record<string, string>; // category → reasoning
  productReasonTags?: Record<string, string[]>; // category → short tags
  priorityQuestions: string[];
}

const CONCERN_NARRATIVES: Record<string, ConcernNarrative> = {
  "Hair / beard": {
    summaryBase:
      "Hair thinning and growth issues are nutritional before they become structural.",
    summaryVariants: {
      highStress:
        "High stress triggers telogen effluvium — pushing follicles into rest phase prematurely. Managing cortisol is as important as any supplement.",
      plantBased:
        "On a plant-based diet, iron is absorbed at roughly 2–20% efficiency vs. 15–35% from animal sources. This creates a consistent deficit that shows up first in your hair.",
      female:
        "For women, iron deficiency is the single most commonly overlooked driver of hair loss — especially after 25.",
      older:
        "After 35, the hair growth cycle naturally shortens. The right micronutrients can counteract most of this shift.",
    },
    explanation: ({ sex, diet }) =>
      `Your protocol prioritises follicle nutrition${diet === "veg" || diet === "vegan" ? ", with extra weight on iron absorption which plant-based diets consistently underdeliver" : ""}${sex === "female" ? ". Iron and biotin are the two most evidence-backed interventions for female hair loss" : ""}.`,
    routine: [
      { time: "morning", text: "Take your hair supplement with breakfast — skip chai/coffee for at least 1 hour after" },
      { time: "afternoon", text: "5-minute scalp massage with fingertips — stimulates follicle blood flow" },
      { time: "evening", text: "Include protein in your dinner — hair is 95% keratin and needs amino acid supply" },
    ],
    lifestyle: [
      "Avoid tight hairstyles or harsh chemical treatments for the first 8 weeks of your protocol",
      "Include a protein source in at least 2 meals daily — eggs, dal, soya, or paneer all work",
      "Cold water rinse for 30 seconds at the end of your shower reduces breakage significantly",
    ],
    productTiming: {
      hair: "With breakfast",
      energy: "Morning with food",
      immunity: "Morning",
    },
    productReasoning: {
      hair: "Directly targets follicle nutrition — the root cause of thinning and slow growth",
      energy: "Corrects micronutrient gaps that compound hair loss over time",
      immunity: "Supports the systemic health that hair growth depends on",
    },
    productReasonTags: {
      hair: ["follicle nutrition", "growth cycle", "thinning"],
      energy: ["iron absorption", "micronutrient gaps"],
      immunity: ["systemic health"],
    },
    priorityQuestions: ["stress", "familyHistory", "activity"],
  },
  "Skin / acne": {
    summaryBase:
      "Acne and skin issues are almost always internal before they are topical.",
    summaryVariants: {
      highStress:
        "Chronic stress triggers cortisol, which increases sebum production and causes breakouts. Managing cortisol is as important as any skincare routine.",
      female:
        "For women, hormonal fluctuations are a primary trigger — your protocol addresses both the cortisol and gut-skin components.",
      plantBased:
        "Plant-based diets have a natural advantage here — high dietary fibre supports gut health, which is directly linked to skin clarity.",
      older:
        "Adult acne past 30 almost always has a hormonal or gut component — not just surface-level causes.",
    },
    explanation: ({ sex }) =>
      `Your protocol targets the gut-skin axis — the most consistent internal driver of adult acne${sex === "female" ? ", alongside the hormonal component that affects breakout patterns through the cycle" : ""}.`,
    routine: [
      { time: "morning", text: "Skin supplement 30 minutes before breakfast on an empty stomach" },
      { time: "afternoon", text: "Drink at least 500ml of water with lunch — hydration drives skin cell turnover" },
      { time: "evening", text: "Dim screens 1 hour before sleep — cortisol management is a skincare intervention" },
    ],
    lifestyle: [
      "Cut dairy and refined sugar for 4 weeks — two of the most consistent acne triggers in Indian diets",
      "Change your pillowcase every 3–4 days to prevent bacterial transfer to skin",
      "Apply a light non-comedogenic moisturiser after cleansing — dry skin triggers excess oil production",
    ],
    productTiming: {
      skin: "Before breakfast",
      hormones: "Evening with dinner",
      immunity: "Morning",
    },
    productReasoning: {
      skin: "Addresses the gut-skin axis — internal inflammation is the root cause of most adult acne",
      hormones: "Reduces cortisol-driven breakouts by calming the HPA axis",
      immunity: "Supports systemic health that skin clarity depends on",
    },
    productReasonTags: {
      skin: ["gut-skin axis", "acne root cause", "internal inflammation"],
      hormones: ["cortisol control", "breakout prevention"],
      immunity: ["microbiome balance"],
    },
    priorityQuestions: ["water", "stress", "sleep"],
  },
  "Energy / gut": {
    summaryBase:
      "Fatigue and gut discomfort almost always share the same root cause.",
    summaryVariants: {
      plantBased:
        "Plant-based diets absorb iron at roughly 2–20% efficiency. Without correction, this creates a compounding energy deficit that no amount of sleep fully fixes.",
      female:
        "For women, monthly blood loss makes iron deficiency significantly more likely — even with a balanced diet.",
      highStress:
        "Chronic stress damages the gut lining and shifts microbiome balance. Your gut symptoms and energy levels are almost certainly connected.",
      older:
        "After 35, stomach acid production declines, reducing absorption of iron and B12. Targeted supplementation closes this gap faster than dietary changes alone.",
    },
    explanation: ({ diet }) =>
      `Your protocol corrects the two most common energy-drain mechanisms: micronutrient gaps${diet === "veg" || diet === "vegan" ? " (iron, B12 — magnified on plant-based diets)" : " (iron, B12)"} and disrupted gut microbiome that reduces absorption of everything you eat.`,
    routine: [
      { time: "morning", text: "Take your supplement with breakfast — separate from chai or coffee by at least 1 hour" },
      { time: "afternoon", text: "Gut supplement before lunch — consistency matters more than perfect timing" },
      { time: "evening", text: "Light 10-minute walk after dinner to support digestion and overnight gut repair" },
    ],
    lifestyle: [
      "Avoid tea or coffee within 1 hour of iron — tannins block absorption by up to 60%",
      "Fermented foods like curd, idli, or dosa actively support your gut microbiome",
      "7–8 hours of sleep is non-negotiable — poor sleep doubles the cortisol that disrupts gut function",
    ],
    productTiming: {
      energy: "Morning with breakfast",
      immunity: "Morning",
      hair: "Morning with food",
    },
    productReasoning: {
      energy: "Most common cause of persistent fatigue — addresses the nutrient pipeline at the source",
      immunity: "Restores microbiome balance and improves absorption of every nutrient you eat",
      hair: "Micronutrient support that compounds the energy protocol's effectiveness",
    },
    productReasonTags: {
      energy: ["iron & B12", "energy deficit", "absorption"],
      immunity: ["gut microbiome", "microbiome balance"],
      hair: ["compound support"],
    },
    priorityQuestions: ["sleep", "bloating", "stress"],
  },
  "Weight": {
    summaryBase:
      "Sustainable weight change is 70% hormonal and metabolic, 30% caloric.",
    summaryVariants: {
      highStress:
        "Elevated cortisol is the most common reason people struggle with belly fat despite diet changes. Reducing cortisol is step one — not calorie restriction.",
      female:
        "Hormonal fluctuations throughout the cycle affect water retention, appetite, and fat storage patterns. Your protocol accounts for this.",
      plantBased:
        "Plant-based diets make it harder to hit protein targets — a quality protein supplement fills this gap cleanly without changing your food choices.",
      older:
        "After 35, muscle mass begins to decline at roughly 1% per year. Protein and resistance training become disproportionately important for both fat loss and metabolic rate.",
    },
    explanation: ({ sex, activity }) =>
      `Your protocol targets body composition through cortisol management and protein optimisation${sex === "female" ? ", adjusted for female hormonal patterns" : ""}${activity === "active" || activity === "athlete" ? " — timed around your activity level for maximum effect" : ""}.`,
    routine: [
      { time: "morning", text: "Don't skip breakfast — it sets cortisol patterns and controls cravings all day" },
      { time: "afternoon", text: "High-protein lunch — aim for at least 30g per meal to preserve muscle" },
      { time: "evening", text: "Take protein supplement within 30 minutes of exercise, or before bed on rest days" },
    ],
    lifestyle: [
      "7,000 steps daily even on rest days improves insulin sensitivity independently of structured exercise",
      "Don't eat in a severe deficit — below 1,200 calories triggers muscle breakdown and slows metabolism",
      "Sleep is the most underrated fat-loss lever — under 7 hours raises ghrelin (hunger hormone) significantly",
    ],
    productTiming: {
      fitness: "Post-workout or before bed",
      energy: "Morning with breakfast",
      hormones: "Evening",
    },
    productReasoning: {
      fitness: "Preserves muscle during fat loss and drives recovery — the cornerstone of body composition change",
      energy: "Manages cortisol — the primary hormone that drives belly fat storage and emotional eating",
      hormones: "Supports the hormonal balance that determines how efficiently your body burns fat",
    },
    productReasonTags: {
      fitness: ["body composition", "muscle preservation", "recovery"],
      energy: ["cortisol control", "metabolism"],
      hormones: ["fat storage", "insulin balance"],
    },
    priorityQuestions: ["goal", "activity", "stress"],
  },
  "Hormones": {
    summaryBase:
      "Hormonal imbalances are almost always downstream of two things: cortisol dysregulation and micronutrient deficiencies.",
    summaryVariants: {
      female:
        "For women, the cortisol-estrogen-progesterone cascade is highly sensitive to sleep, stress, and nutrition — all three are directly addressable.",
      highStress:
        "Chronic stress creates a cortisol burden that simultaneously suppresses sex hormones, thyroid function, and insulin sensitivity. This is the priority to fix.",
      older:
        "After 40, the hormonal shift is real — but nutrition and lifestyle interventions can significantly slow and partially reverse many of these changes.",
      plantBased:
        "Plant-based diets frequently create zinc and iron gaps — both are critical co-factors in hormone synthesis pathways.",
    },
    explanation: ({ sex }) =>
      `Your protocol resets the cortisol-${sex === "female" ? "estrogen" : "testosterone"} balance and restores the micronutrients that hormone synthesis depends on.`,
    routine: [
      { time: "morning", text: "Take your supplement to blunt the morning cortisol peak — the most impactful timing" },
      { time: "afternoon", text: "15 minutes outside or near a window — light exposure regulates the hormonal clock" },
      { time: "evening", text: "Light stretching or yoga — activates parasympathetic nervous system, lowers cortisol" },
    ],
    lifestyle: [
      "Reduce refined sugar — insulin spikes cascade directly into hormonal disruption",
      "Include healthy fats (ghee, nuts, avocado) in every meal — they are the literal building blocks of hormones",
      "A consistent sleep and wake time is more powerful than any supplement for hormonal regulation",
    ],
    productTiming: {
      hormones: "Morning or evening",
      energy: "Morning with food",
      sleep: "30 min before bed",
    },
    productReasoning: {
      hormones: "Regulates cortisol — the master switch that affects every downstream hormone",
      energy: "Essential co-factor in hormone synthesis — deficiency directly disrupts the pathway",
      sleep: "Restores the sleep depth that drives overnight hormonal repair and regulation",
    },
    productReasonTags: {
      hormones: ["cortisol balance", "hormone synthesis", "HPA axis"],
      energy: ["co-factor support", "synthesis pathway"],
      sleep: ["overnight repair", "hormonal reset"],
    },
    priorityQuestions: ["sleep", "stress", "moodSwings"],
  },
  "Sleep / mind": {
    summaryBase:
      "Poor sleep and mental fatigue are almost always driven by magnesium deficiency and elevated cortisol — not willpower.",
    summaryVariants: {
      highStress:
        "High cortisol at night is the single most common sleep disruptor. Your stress levels make cortisol management the top priority in this protocol.",
      female:
        "For women, hormonal fluctuations around the cycle significantly affect sleep quality. Magnesium addresses this directly.",
      older:
        "Sleep architecture changes significantly after 40 — deep sleep decreases and waking becomes more frequent. Magnesium and cortisol management are the most evidence-backed interventions.",
      plantBased:
        "Magnesium deficiency is nearly universal in urban India. Plant-rich diets help, but absorption is often poor without a bioavailable form.",
    },
    explanation: () =>
      `Your protocol addresses sleep at the neurochemical level — not just hygiene habits. Magnesium activates GABA receptors (the brain's brake pedal) and supplemented ashwagandha reduces cortisol by 28% on average.`,
    routine: [
      { time: "morning", text: "Get direct sunlight within 30 minutes of waking — anchors your circadian rhythm for the whole day" },
      { time: "afternoon", text: "No caffeine after 2 PM — it has a 6–8 hour half-life in your system" },
      { time: "evening", text: "Take your sleep supplement 30–45 minutes before your target bedtime" },
    ],
    lifestyle: [
      "Dim the lights 1 hour before your target bedtime — signals the brain to start producing melatonin",
      "Keep your room below 22°C if possible — body temperature drop is one of the key sleep-onset triggers",
      "A fixed sleep and wake time (even on weekends) resets circadian rhythm within 2 weeks",
    ],
    productTiming: {
      sleep: "30–45 min before bed",
      energy: "Evening with dinner",
      hormones: "Evening",
    },
    productReasoning: {
      sleep: "Activates GABA receptors for sleep and relaxes muscles — 80% of urban Indians are clinically deficient",
      energy: "Clinically reduces cortisol by 28% — allows the brain to actually wind down at night",
      hormones: "Restores the hormonal balance that determines sleep quality and depth",
    },
    productReasonTags: {
      sleep: ["GABA activation", "magnesium deficiency", "sleep depth"],
      energy: ["cortisol −28%", "wind-down support"],
      hormones: ["overnight regulation", "circadian reset"],
    },
    priorityQuestions: ["bedtime", "screens", "stress"],
  },
};

const DEFAULT_CONCERN = "Energy / gut";

/* ── Summary builder ────────────────────────────────────────── */
function buildSummary(profile: UserProfile, narrative: ConcernNarrative): string {
  const parts: string[] = [narrative.summaryBase];
  const v = narrative.summaryVariants;

  const isPlantBased = profile.diet === "veg" || profile.diet === "vegan";
  const isFemale = profile.sex === "female";
  const isOlder = profile.age === "35-44" || profile.age === "45+";
  const isHighStress = profile.stress === "high";

  if (isHighStress && v.highStress) parts.push(v.highStress);
  else if (isFemale && v.female) parts.push(v.female);
  else if (isPlantBased && v.plantBased) parts.push(v.plantBased);
  else if (isOlder && v.older) parts.push(v.older);

  // Age-specific closing
  const ageClose =
    profile.age === "18-24"
      ? "At your age, building strong nutritional foundations now pays dividends for decades."
      : profile.age === "25-34"
        ? "In your mid-to-late 20s, stress and lifestyle are the primary disruptors."
        : profile.age === "35-44"
          ? "In your 30s, nutrient absorption and hormonal balance become increasingly critical."
          : profile.age === "45+"
            ? "After 45, targeted supplementation and lifestyle changes have an outsized positive impact."
            : null;

  if (ageClose && parts.length < 3) parts.push(ageClose);

  return parts.join(" ");
}

/* ── Supplement builder ─────────────────────────────────────── */
function buildSupplements(
  profile: UserProfile,
  narrative: ConcernNarrative,
): ProtocolSupplement[] {
  const concern = CONCERN_MAP[profile.concern ?? ""] || "energy";
  const segments = resolveSegment(
    profile.sex || "male",
    profile.age || "25-34",
    undefined,
    undefined,
  );

  const userSegment: UserSegment = {
    gender: profile.sex || "male",
    age: profile.age || "25-34",
    diet: profile.diet || "non-veg",
    concern,
  };

  const matched = calculateProtocolMatch(userSegment);

  if (matched.length === 0) {
    // Fallback if no products matched (shouldn't happen with real catalog)
    return [];
  }

  return matched.map((product, idx) => {
    const timing =
      narrative.productTiming[product.category] ||
      "Morning with breakfast";
    const reasoning =
      narrative.productReasoning[product.category] ||
      "Supports your primary health concern based on your profile";
    const reasonTags = narrative.productReasonTags?.[product.category] ?? [];
    const priority: ProtocolSupplement["priority"] =
      idx === 0 ? "essential" : idx === 1 ? "recommended" : "optional";

    return {
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      mrp: product.mrp,
      timing,
      reasoning,
      reasonTags,
      matchScore: product.matchScore,
      shopifyUrl: getProductShopifyUrl(product.id),
      priority,
    };
  });
}

/* ── Follow-up questions ────────────────────────────────────── */
function buildFollowUps(
  profile: UserProfile,
  narrative: ConcernNarrative,
): FollowUpQuestion[] {
  return narrative.priorityQuestions
    .filter((key) => !profile[key]) // only ask about unknowns
    .slice(0, 3)
    .map((key) => QUESTION_BANK[key])
    .filter(Boolean);
}

/* ── Confidence message ─────────────────────────────────────── */
function buildConfidenceMessage(depth: number): string {
  if (depth >= 70)
    return "Your protocol is highly personalised. Each recommendation is calibrated specifically to your profile.";
  if (depth >= 50)
    return "Your protocol is well-personalised. Answer the follow-up questions to sharpen it further.";
  if (depth >= 35)
    return "This is your starting protocol. 2–3 more answers will significantly improve its accuracy.";
  return "This is a baseline protocol based on your concern. Sharing more about your lifestyle will tailor it significantly.";
}

/* ── Multi-concern summary ──────────────────────────────────── */
function buildMultiConcernSummary(profile: UserProfile, allConcerns: string[]): string {
  const primary = allConcerns[0];
  const primaryNarrative = CONCERN_NARRATIVES[primary] ?? CONCERN_NARRATIVES[DEFAULT_CONCERN];
  const parts: string[] = [buildSummary(profile, primaryNarrative)];

  for (let i = 1; i < Math.min(allConcerns.length, 3); i++) {
    const secondary = allConcerns[i];
    const key1 = `${primary}|${secondary}`;
    const key2 = `${secondary}|${primary}`;
    const bridge = CONCERN_BRIDGES[key1] || CONCERN_BRIDGES[key2];
    if (bridge) {
      parts.push(bridge);
    } else {
      const secNarrative = CONCERN_NARRATIVES[secondary];
      if (secNarrative) {
        const base = secNarrative.summaryBase.replace(/\.$/, "").toLowerCase();
        parts.push(`For your ${secondary.toLowerCase()} goal: ${base}.`);
      }
    }
  }

  return parts.join(" ");
}

/* ── Multi-concern supplements ──────────────────────────────── */
function buildMultiConcernSupplements(
  profile: UserProfile,
  allConcerns: string[],
  primaryNarrative: ConcernNarrative,
): ProtocolSupplement[] {
  const seen = new Set<string>();
  const result: ProtocolSupplement[] = [];

  for (const rawConcern of allConcerns) {
    const concern = CONCERN_MAP[rawConcern] || "energy";
    const narrative = CONCERN_NARRATIVES[rawConcern] ?? primaryNarrative;

    const userSegment: UserSegment = {
      gender: profile.sex || "male",
      age: profile.age || "25-34",
      diet: profile.diet || "non-veg",
      concern,
    };

    const matched = calculateProtocolMatch(userSegment);

    for (const product of matched) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);

      const timing = narrative.productTiming[product.category] || "Morning with breakfast";
      const reasoning =
        narrative.productReasoning[product.category] ||
        `Supports your ${rawConcern.toLowerCase()} concern based on your profile`;
      const reasonTags = narrative.productReasonTags?.[product.category] ?? [];

      const priority: ProtocolSupplement["priority"] =
        result.length === 0 ? "essential" : result.length === 1 ? "recommended" : "optional";

      result.push({
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        mrp: product.mrp,
        timing,
        reasoning,
        reasonTags,
        matchScore: product.matchScore,
        shopifyUrl: getProductShopifyUrl(product.id),
        priority,
      });

      if (result.length >= 4) break;
    }
    if (result.length >= 4) break;
  }

  return result;
}

/* ── Multi-concern lifestyle tips ───────────────────────────── */
function buildMultiConcernLifestyle(allConcerns: string[]): string[] {
  const tips: string[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < allConcerns.length; i++) {
    const narrative = CONCERN_NARRATIVES[allConcerns[i]];
    if (!narrative) continue;
    const limit = i === 0 ? 3 : 1;
    let added = 0;
    for (const tip of narrative.lifestyle) {
      if (!seen.has(tip) && added < limit) {
        tips.push(tip);
        seen.add(tip);
        added++;
      }
    }
    if (tips.length >= 5) break;
  }

  return tips;
}

/* ── Multi-concern follow-up questions ──────────────────────── */
function buildMultiConcernFollowUps(
  profile: UserProfile,
  allConcerns: string[],
): FollowUpQuestion[] {
  const seen = new Set<string>();
  const keys: string[] = [];

  for (const concern of allConcerns) {
    const narrative = CONCERN_NARRATIVES[concern];
    if (!narrative) continue;
    for (const key of narrative.priorityQuestions) {
      if (!seen.has(key) && !profile[key]) {
        seen.add(key);
        keys.push(key);
      }
    }
  }

  return keys.slice(0, 3).map((k) => QUESTION_BANK[k]).filter(Boolean);
}

/* ── Main export ────────────────────────────────────────────── */
export function generateMockProtocol(profile: UserProfile): GeneratedProtocol {
  const allConcerns = parseConcerns(profile);
  const primaryConcern = allConcerns[0] || DEFAULT_CONCERN;
  const narrative = CONCERN_NARRATIVES[primaryConcern] ?? CONCERN_NARRATIVES[DEFAULT_CONCERN];
  const profileDepth = calculateProfileDepth(profile);
  const isMulti = allConcerns.length > 1;

  const summary = isMulti
    ? buildMultiConcernSummary(profile, allConcerns)
    : buildSummary(profile, narrative);

  const explanation = narrative.explanation(profile);

  const supplements = isMulti
    ? buildMultiConcernSupplements(profile, allConcerns, narrative)
    : buildSupplements(profile, narrative);

  const dailyRoutine = narrative.routine; // primary concern drives routine structure

  const lifestyle = isMulti
    ? buildMultiConcernLifestyle(allConcerns)
    : narrative.lifestyle;

  const followUpQuestions = isMulti
    ? buildMultiConcernFollowUps(profile, allConcerns)
    : buildFollowUps(profile, narrative);

  return {
    summary,
    explanation,
    dailyRoutine,
    lifestyle,
    supplements,
    followUpQuestions,
    confidence: profileDepth.total,
    confidenceMessage: buildConfidenceMessage(profileDepth.total),
    profileDepth,
    generatedAt: new Date().toISOString(),
    model: "mock",
  };
}
