import type { UserProfile, ProfileDepth } from "./types";

/* ──────────────────────────────────────────────────────────────
   Profile depth weighting
   Total possible: 100 points
   ────────────────────────────────────────────────────────────── */
export function calculateProfileDepth(profile: UserProfile): ProfileDepth {
  const p = profile as Record<string, unknown>;

  // Concern selection: 25 pts — the single most important signal
  const concerns = p.concern || p.concerns ? 25 : 0;

  // Basic demographics: 10 pts
  const sex = p.sex ? 5 : 0;
  const age = p.age ? 5 : 0;
  const demographics = sex + age;

  // Diet: 10 pts
  const diet = p.diet ? 10 : 0;

  // Core lifestyle signals: 15 pts max
  // Checks both old onboarding keys AND new question bank keys
  const hasSleep = p.sleep || p.sleep_quality || p.sleep_hours || p.wake_feeling;
  const hasStress = p.stress || p.stress_level;
  const hasActivity = p.activity || p.activity_level || p.daily_steps;
  const sleepPts = hasSleep ? 5 : 0;
  const stressPts = hasStress ? 5 : 0;
  const activityPts = hasActivity ? 5 : 0;
  const lifestyle = Math.min(sleepPts + stressPts + activityPts, 15);

  // Follow-up question bank answers: 2 pts each, max 15 pts
  // Only counts true follow-up keys (snake_case) — lifestyle aliases excluded to
  // avoid double-counting with the lifestyle bucket above
  const ONBOARDING_KEYS = new Set([
    "concern", "concerns", "sex", "age", "diet", "sleep", "stress", "activity",
    "water", "bloating", "goal", "bedtime", "screens", "moodSwings",
    "familyHistory", "existingSupplements", "bloodReport", "_version",
    // Lifestyle aliases — already counted in the lifestyle bucket
    "stress_level", "sleep_quality", "sleep_hours", "wake_feeling",
    "activity_level", "daily_steps",
  ]);
  const questionBankAnswered = Object.keys(p).filter(
    (k) => k.includes("_") && !ONBOARDING_KEYS.has(k) && Boolean(p[k]),
  ).length;
  const followUpBonus = Math.min(questionBankAnswered * 2, 15);

  // Existing supplement knowledge: 5 pts
  const supplementsKnowledge = p.existingSupplements ? 5 : 0;

  // Blood report: 10 pts
  // Max total: 10+25+10+10+15+15+5+10 = 100 exactly
  const bloodReport = p.bloodReport ? 10 : 0;

  // +10 base: protocol is already generated and meaningful
  const base = 10;

  const total = Math.min(
    base + concerns + demographics + diet + lifestyle + followUpBonus + supplementsKnowledge + bloodReport,
    100,
  );

  let nextStep = "Answer a few lifestyle questions to sharpen your protocol";
  if (!hasSleep || !hasStress) {
    nextStep = "Tell us about your sleep and stress levels";
  } else if (!hasActivity) {
    nextStep = "Share your activity level for a more accurate protocol";
  } else if (!p.existingSupplements) {
    nextStep = "Tell us which supplements you're already taking";
  } else if (!p.bloodReport) {
    nextStep = "Upload a blood report to unlock a fully personalised protocol";
  } else {
    nextStep = "Your protocol is fully personalised";
  }

  return {
    total,
    breakdown: {
      concerns,
      demographics,
      diet,
      lifestyle,
      supplements: supplementsKnowledge,
      bloodReport,
    },
    nextStep,
  };
}
