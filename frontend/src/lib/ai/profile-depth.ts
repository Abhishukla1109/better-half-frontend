import type { UserProfile, ProfileDepth } from "./types";

/* ──────────────────────────────────────────────────────────────
   Profile depth weighting
   Total possible: 100 points
   ────────────────────────────────────────────────────────────── */
export function calculateProfileDepth(profile: UserProfile): ProfileDepth {
  // Concern selection: 25 pts — the single most important signal
  const concerns = profile.concern ? 25 : 0;

  // Basic demographics: 10 pts
  const sex = profile.sex ? 5 : 0;
  const age = profile.age ? 5 : 0;
  const demographics = sex + age;

  // Diet: 10 pts
  const diet = profile.diet ? 10 : 0;

  // Core lifestyle signals: 20 pts max
  const sleepPts = profile.sleep ? 7 : 0;
  const stressPts = profile.stress ? 7 : 0;
  const activityPts = profile.activity ? 6 : 0;
  const lifestyle = Math.min(sleepPts + stressPts + activityPts, 20);

  // Protocol follow-up answers (water, bloating, goal, bedtime, etc.): 15 pts max
  const followUpKeys = ["water", "bloating", "goal", "bedtime", "screens", "moodSwings", "familyHistory"];
  const followUpAnswered = followUpKeys.filter((k) => profile[k]).length;
  const followUpBonus = Math.min(followUpAnswered * 3, 15);

  // Existing supplement knowledge: 5 pts
  const supplementsKnowledge = profile.existingSupplements ? 5 : 0;

  // Blood report: 15 pts — biggest single unlock
  const bloodReport = profile.bloodReport ? 15 : 0;

  const total = Math.min(
    concerns + demographics + diet + lifestyle + followUpBonus + supplementsKnowledge + bloodReport,
    100,
  );

  let nextStep = "Answer a few lifestyle questions to sharpen your protocol";
  if (!profile.sleep || !profile.stress) {
    nextStep = "Tell us about your sleep and stress levels";
  } else if (!profile.activity) {
    nextStep = "Share your activity level for a more accurate protocol";
  } else if (!profile.existingSupplements) {
    nextStep = "Tell us which supplements you're already taking";
  } else if (!profile.bloodReport) {
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
