/* ══════════════════════════════════════════════════════════════
   BetterHalf — Male question bank + selection engine
   Concern × age × severity branching (female section TBD)

   Architecture:
   - QUESTION_BANK: key → question text + options (the content)
   - QUESTION_NODES: routing rules (when to ask each question)
   - selectNextQuestion(): pure fn — returns the best next question
     or null when all relevant questions are answered
   ══════════════════════════════════════════════════════════════ */

import type { UserProfile } from "./types";

/* ── Types ─────────────────────────────────────────────────── */
export interface BankQuestion {
  key: string;
  question: string;
  options: { label: string; value: string }[];
}

interface QuestionNode {
  key: string;
  concerns: string[];
  tier: "triage" | "branch" | "shared";
  // Only ask for these age groups (undefined = all ages)
  ageGroups?: string[];
  // Only ask if this condition is met from merged profile+answers
  condition?: { key: string; values: string[] };
  // Lower = asked sooner within the same tier
  priority: number;
  // Override priority for specific age groups
  agePriority?: Record<string, number>;
  // Only surface after this many protocol days (for progress/feedback questions)
  minDays?: number;
}

/* ── Full question content ─────────────────────────────────── */
export const QUESTION_BANK: Record<string, BankQuestion> = {

  /* ───── SHARED (asked once, signal for multiple concerns) ── */
  stress_level: {
    key: "stress_level",
    question: "How stressed do you feel on a typical day?",
    options: [
      { label: "High — anxious often", value: "high" },
      { label: "Moderate", value: "moderate" },
      { label: "Fairly calm", value: "low" },
    ],
  },
  sleep_quality: {
    key: "sleep_quality",
    question: "How's your sleep quality been lately?",
    options: [
      { label: "Rarely good", value: "poor" },
      { label: "Hit or miss", value: "variable" },
      { label: "Mostly fine", value: "good" },
    ],
  },
  water_intake: {
    key: "water_intake",
    question: "How many glasses of water do you drink daily?",
    options: [
      { label: "Less than 4", value: "low" },
      { label: "4–6 glasses", value: "moderate" },
      { label: "7 or more", value: "good" },
    ],
  },
  caffeine_intake: {
    key: "caffeine_intake",
    question: "How many cups of chai or coffee do you have daily?",
    options: [
      { label: "1–2 cups", value: "low" },
      { label: "3–4 cups", value: "moderate" },
      { label: "5 or more", value: "high" },
    ],
  },
  food_source: {
    key: "food_source",
    question: "Do you eat mostly home-cooked food or outside / street food?",
    options: [
      { label: "Mostly home-cooked", value: "home" },
      { label: "Mix of both", value: "mixed" },
      { label: "Mostly outside", value: "outside" },
    ],
  },
  protein_meals: {
    key: "protein_meals",
    question: "How many meals daily include a protein source? (eggs, chicken, dal, paneer, soya)",
    options: [
      { label: "None or one", value: "low" },
      { label: "Two meals", value: "moderate" },
      { label: "Three or more", value: "good" },
    ],
  },

  /* ───── HAIR / BEARD ──────────────────────────────────────── */
  hair_primary: {
    key: "hair_primary",
    question: "What's your main hair concern right now?",
    options: [
      { label: "Thinning & density", value: "thinning" },
      { label: "Hair fall", value: "hair_fall" },
      { label: "Receding hairline", value: "receding" },
      { label: "Dandruff & itchy scalp", value: "dandruff" },
      { label: "Beard growth", value: "beard" },
      { label: "Premature greying", value: "greying" },
    ],
  },
  hair_duration: {
    key: "hair_duration",
    question: "How long has this been a noticeable concern?",
    options: [
      { label: "Just started (< 3 months)", value: "recent" },
      { label: "A few months", value: "months" },
      { label: "Over a year", value: "chronic" },
    ],
  },
  hair_family: {
    key: "hair_family",
    question: "Does your dad or any paternal uncle have similar hair loss?",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
      { label: "Not sure", value: "unsure" },
    ],
  },
  hair_illness: {
    key: "hair_illness",
    question: "Have you had a fever, illness, or major health event in the past 6 months?",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
  },
  beard_type: {
    key: "beard_type",
    question: "How would you describe your beard growth right now?",
    options: [
      { label: "Very patchy", value: "very_patchy" },
      { label: "Growing but uneven", value: "uneven" },
      { label: "Slow overall", value: "slow" },
      { label: "Barely grows", value: "minimal" },
    ],
  },
  beard_family: {
    key: "beard_family",
    question: "Do your dad or brothers have full, thick beards?",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
      { label: "Not sure", value: "unsure" },
    ],
  },
  scalp_type: {
    key: "scalp_type",
    question: "How does your scalp feel most of the time?",
    options: [
      { label: "Very oily", value: "oily" },
      { label: "Dry and flaky", value: "dry" },
      { label: "Oily roots, dry ends", value: "mixed" },
    ],
  },
  scalp_hot_water: {
    key: "scalp_hot_water",
    question: "Do you wash your hair with hot water?",
    options: [
      { label: "Always hot", value: "always" },
      { label: "Sometimes", value: "sometimes" },
      { label: "Cold or lukewarm only", value: "cold" },
    ],
  },
  greying_early: {
    key: "greying_early",
    question: "Did you first notice greying before age 22?",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
  },
  greying_family: {
    key: "greying_family",
    question: "Does early greying run in your family?",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
      { label: "Not sure", value: "unsure" },
    ],
  },

  /* ───── SKIN ──────────────────────────────────────────────── */
  skin_primary: {
    key: "skin_primary",
    question: "What's your main skin concern right now?",
    options: [
      { label: "Acne & breakouts", value: "acne" },
      { label: "Oily skin", value: "oily" },
      { label: "Dullness & uneven tone", value: "dullness" },
      { label: "Dark circles", value: "dark_circles" },
      { label: "Pigmentation", value: "pigmentation" },
      { label: "Redness & irritation", value: "redness" },
    ],
  },
  skin_duration: {
    key: "skin_duration",
    question: "How long has this been a concern?",
    options: [
      { label: "Recently started", value: "recent" },
      { label: "A few months", value: "months" },
      { label: "Long-standing", value: "chronic" },
    ],
  },
  acne_location: {
    key: "acne_location",
    question: "Where do breakouts appear most on your face?",
    options: [
      { label: "Forehead", value: "forehead" },
      { label: "Cheeks", value: "cheeks" },
      { label: "Chin & jawline", value: "chin_jaw" },
      { label: "All over", value: "all_over" },
      { label: "Back & chest too", value: "body" },
    ],
  },
  acne_stress_link: {
    key: "acne_stress_link",
    question: "Do breakouts get noticeably worse during stressful periods?",
    options: [
      { label: "Always", value: "always" },
      { label: "Sometimes", value: "sometimes" },
      { label: "No connection", value: "no" },
    ],
  },
  acne_diet_link: {
    key: "acne_diet_link",
    question: "Do oily or fried foods seem to trigger your breakouts?",
    options: [
      { label: "Definitely yes", value: "yes" },
      { label: "Maybe", value: "maybe" },
      { label: "No", value: "no" },
    ],
  },
  oily_pattern: {
    key: "oily_pattern",
    question: "Is your skin oily all day or only by the afternoon?",
    options: [
      { label: "Oily from morning", value: "all_day" },
      { label: "Gets oily by afternoon", value: "afternoon" },
      { label: "Only T-zone (forehead/nose)", value: "tzone" },
    ],
  },
  skincare_routine: {
    key: "skincare_routine",
    question: "Do you currently use any skincare products?",
    options: [
      { label: "Yes, a proper routine", value: "routine" },
      { label: "Just face wash", value: "basic" },
      { label: "Nothing", value: "none" },
    ],
  },
  sun_exposure: {
    key: "sun_exposure",
    question: "How much sun exposure do you get on a typical day?",
    options: [
      { label: "Mostly indoors", value: "low" },
      { label: "Some outdoor time", value: "moderate" },
      { label: "A lot (outdoor work/travel)", value: "high" },
    ],
  },

  /* ───── WEIGHT / BODY COMPOSITION ────────────────────────── */
  weight_goal: {
    key: "weight_goal",
    question: "What's your primary goal right now?",
    options: [
      { label: "Lose fat", value: "lose" },
      { label: "Build muscle", value: "gain" },
      { label: "Both", value: "both" },
      { label: "Maintain & improve fitness", value: "maintain" },
    ],
  },
  activity_level: {
    key: "activity_level",
    question: "How active are you on a typical week?",
    options: [
      { label: "Desk-bound, minimal movement", value: "sedentary" },
      { label: "Light activity (walks, occasional gym)", value: "light" },
      { label: "Regular exercise (3–4x/week)", value: "active" },
      { label: "Intense training (5+ days)", value: "athlete" },
    ],
  },
  fat_distribution: {
    key: "fat_distribution",
    question: "Where does most of your excess fat sit?",
    options: [
      { label: "Belly mainly", value: "belly" },
      { label: "Evenly distributed", value: "even" },
      { label: "Face and all over", value: "overall" },
    ],
  },
  cravings: {
    key: "cravings",
    question: "Do you experience strong cravings for sugar or junk food?",
    options: [
      { label: "Daily or almost daily", value: "high" },
      { label: "A few times a week", value: "moderate" },
      { label: "Rarely", value: "low" },
    ],
  },
  meal_skipping: {
    key: "meal_skipping",
    question: "Do you often skip meals during the day?",
    options: [
      { label: "Yes, regularly", value: "often" },
      { label: "Sometimes", value: "sometimes" },
      { label: "Rarely", value: "rarely" },
    ],
  },
  supplement_history: {
    key: "supplement_history",
    question: "Do you currently take any fitness supplements? (protein powder, creatine, etc.)",
    options: [
      { label: "Yes, regularly", value: "yes" },
      { label: "No", value: "no" },
      { label: "Used to, not now", value: "stopped" },
    ],
  },
  workout_consistency: {
    key: "workout_consistency",
    question: "How consistent is your current workout routine?",
    options: [
      { label: "Very consistent", value: "consistent" },
      { label: "On and off", value: "inconsistent" },
      { label: "Just starting out", value: "beginner" },
    ],
  },
  daily_steps: {
    key: "daily_steps",
    question: "Roughly how many steps do you walk on a typical day?",
    options: [
      { label: "Under 3,000", value: "very_low" },
      { label: "3,000–7,000", value: "low" },
      { label: "7,000+", value: "good" },
    ],
  },
  weight_change: {
    key: "weight_change",
    question: "Has your weight changed noticeably in the past 6 months — without a major diet change?",
    options: [
      { label: "Gained weight", value: "gained" },
      { label: "Lost weight", value: "lost" },
      { label: "Stayed the same", value: "stable" },
    ],
  },
  fasting_habit: {
    key: "fasting_habit",
    question: "Do you practice intermittent fasting or regularly skip breakfast?",
    options: [
      { label: "Yes, intentionally", value: "yes" },
      { label: "Skip breakfast but not intentionally", value: "accidental" },
      { label: "No, I eat regular meals", value: "no" },
    ],
  },

  /* ───── ENERGY / GUT ─────────────────────────────────────── */
  energy_pattern: {
    key: "energy_pattern",
    question: "How would you describe your energy through the day?",
    options: [
      { label: "Consistently low", value: "consistently_low" },
      { label: "Good in morning, crashes later", value: "afternoon_crash" },
      { label: "Unpredictable", value: "unpredictable" },
      { label: "Generally good", value: "good" },
    ],
  },
  gut_symptom: {
    key: "gut_symptom",
    question: "Do you experience any gut discomfort regularly?",
    options: [
      { label: "Bloating", value: "bloating" },
      { label: "Acidity & heartburn", value: "acidity" },
      { label: "Constipation", value: "constipation" },
      { label: "Loose stools", value: "loose" },
      { label: "No issues", value: "none" },
    ],
  },
  late_dinner: {
    key: "late_dinner",
    question: "Do you eat heavy meals late at night (after 9 PM)?",
    options: [
      { label: "Almost daily", value: "often" },
      { label: "A few times a week", value: "sometimes" },
      { label: "Rarely", value: "rarely" },
    ],
  },
  fatigue_on_waking: {
    key: "fatigue_on_waking",
    question: "Do you feel tired even after what should be a full night of sleep?",
    options: [
      { label: "Yes, often", value: "often" },
      { label: "Sometimes", value: "sometimes" },
      { label: "Rarely", value: "rarely" },
    ],
  },
  eating_speed: {
    key: "eating_speed",
    question: "How fast do you usually eat your meals?",
    options: [
      { label: "Very fast (10 min or less)", value: "fast" },
      { label: "Normal pace", value: "normal" },
      { label: "Slowly", value: "slow" },
    ],
  },
  post_meal_discomfort: {
    key: "post_meal_discomfort",
    question: "Do you experience discomfort within 30 minutes of eating?",
    options: [
      { label: "Almost always", value: "always" },
      { label: "Sometimes", value: "sometimes" },
      { label: "Rarely", value: "rarely" },
    ],
  },
  bowel_regularity: {
    key: "bowel_regularity",
    question: "How regular are your bowel movements?",
    options: [
      { label: "Very irregular", value: "irregular" },
      { label: "Mostly regular", value: "mostly_regular" },
      { label: "Regular every day", value: "regular" },
    ],
  },
  meal_consistency: {
    key: "meal_consistency",
    question: "Do you eat meals at roughly the same time every day?",
    options: [
      { label: "Rarely — timings vary a lot", value: "inconsistent" },
      { label: "Usually", value: "mostly" },
      { label: "Yes, quite consistent", value: "consistent" },
    ],
  },

  /* ───── SLEEP / MIND ─────────────────────────────────────── */
  sleep_hours: {
    key: "sleep_hours",
    question: "How many hours of sleep do you get on most nights?",
    options: [
      { label: "Less than 5 hours", value: "very_low" },
      { label: "5–6 hours", value: "low" },
      { label: "7–8 hours", value: "good" },
      { label: "More than 8", value: "high" },
    ],
  },
  wake_feeling: {
    key: "wake_feeling",
    question: "How do you feel when you wake up?",
    options: [
      { label: "Exhausted, even after enough sleep", value: "exhausted" },
      { label: "Takes time to get going", value: "groggy" },
      { label: "Refreshed and ready", value: "refreshed" },
    ],
  },
  sleep_timing: {
    key: "sleep_timing",
    question: "What time do you usually fall asleep?",
    options: [
      { label: "Before 11 PM", value: "early" },
      { label: "11 PM – 1 AM", value: "normal" },
      { label: "After 1 AM", value: "late" },
    ],
  },
  screen_bedtime: {
    key: "screen_bedtime",
    question: "Do you use your phone right up until you sleep?",
    options: [
      { label: "Yes, in bed scrolling", value: "high" },
      { label: "Stop about 30 mins before", value: "moderate" },
      { label: "Stop well before bed", value: "low" },
    ],
  },
  sleep_interruption: {
    key: "sleep_interruption",
    question: "Do you wake up during the night and struggle to fall back asleep?",
    options: [
      { label: "Often", value: "often" },
      { label: "Sometimes", value: "sometimes" },
      { label: "Rarely", value: "rarely" },
    ],
  },
  brain_fog_morning: {
    key: "brain_fog_morning",
    question: "Do you feel mentally foggy or slow for the first hour after waking?",
    options: [
      { label: "Almost every day", value: "always" },
      { label: "A few times a week", value: "sometimes" },
      { label: "Rarely", value: "rarely" },
    ],
  },
  napping: {
    key: "napping",
    question: "Do you take naps during the day?",
    options: [
      { label: "Daily (feel like I need to)", value: "daily" },
      { label: "Occasionally", value: "sometimes" },
      { label: "Never", value: "never" },
    ],
  },
  overthinking: {
    key: "overthinking",
    question: "Do you experience racing thoughts or overthinking when trying to sleep?",
    options: [
      { label: "Often", value: "often" },
      { label: "Sometimes", value: "sometimes" },
      { label: "Rarely", value: "rarely" },
    ],
  },
  work_type: {
    key: "work_type",
    question: "What type of work do you do?",
    options: [
      { label: "Desk / office / WFH", value: "desk" },
      { label: "Physical / field work", value: "physical" },
      { label: "Mixed", value: "mixed" },
      { label: "Student", value: "student" },
    ],
  },

  /* ───── HORMONES (MALE) ──────────────────────────────────── */
  hormone_energy_change: {
    key: "hormone_energy_change",
    question: "Compared to 2 years ago, how would you rate your overall energy and drive?",
    options: [
      { label: "Noticeably lower", value: "much_lower" },
      { label: "Somewhat lower", value: "lower" },
      { label: "About the same", value: "same" },
      { label: "Better actually", value: "better" },
    ],
  },
  hormone_symptom: {
    key: "hormone_symptom",
    question: "Have you noticed any of these changes recently?",
    options: [
      { label: "Lower motivation & drive", value: "motivation" },
      { label: "Reduced libido", value: "libido" },
      { label: "Harder to build or keep muscle", value: "muscle" },
      { label: "Belly fat increasing", value: "belly_fat" },
      { label: "Mood changes or irritability", value: "mood" },
    ],
  },
  mood_shift: {
    key: "mood_shift",
    question: "Do you feel more irritable or low mood compared to before?",
    options: [
      { label: "Yes, noticeably", value: "yes" },
      { label: "Sometimes", value: "sometimes" },
      { label: "Not really", value: "no" },
    ],
  },
  anhedonia: {
    key: "anhedonia",
    question: "Has your interest or enjoyment in things you used to like reduced?",
    options: [
      { label: "Yes, quite a bit", value: "yes" },
      { label: "A little", value: "mild" },
      { label: "Not really", value: "no" },
    ],
  },
  libido_change: {
    key: "libido_change",
    question: "How would you compare your libido to 2–3 years ago?",
    options: [
      { label: "Significantly lower", value: "much_lower" },
      { label: "Somewhat lower", value: "lower" },
      { label: "About the same", value: "same" },
    ],
  },
  recovery_time: {
    key: "recovery_time",
    question: "How long does it take to recover after a workout or physical exertion?",
    options: [
      { label: "Much longer than it used to", value: "much_longer" },
      { label: "A bit longer than before", value: "longer" },
      { label: "Normal, no change", value: "normal" },
    ],
  },
  belly_fat_change: {
    key: "belly_fat_change",
    question: "Has belly fat increased noticeably, even without major diet changes?",
    options: [
      { label: "Yes, clearly", value: "yes" },
      { label: "A little", value: "mild" },
      { label: "Not really", value: "no" },
    ],
  },
  alcohol_intake: {
    key: "alcohol_intake",
    question: "How many alcoholic drinks do you have in a typical week?",
    options: [
      { label: "None", value: "none" },
      { label: "1–3 drinks", value: "low" },
      { label: "4–7 drinks", value: "moderate" },
      { label: "8 or more", value: "high" },
    ],
  },

  /* ── Female-specific questions ───────────────────────────── */
  postpartum_status: {
    key: "postpartum_status",
    question: "Are you currently postpartum or breastfeeding?",
    options: [
      { label: "Yes, within the last year", value: "yes" },
      { label: "No", value: "no" },
    ],
  },
  period_regularity: {
    key: "period_regularity",
    question: "How regular is your menstrual cycle?",
    options: [
      { label: "Very regular", value: "regular" },
      { label: "Slightly irregular (7+ days off)", value: "irregular" },
      { label: "Very irregular or missed cycles", value: "very_irregular" },
    ],
  },
  hormonal_concern_f: {
    key: "hormonal_concern_f",
    question: "What bothers you most right now?",
    options: [
      { label: "Period cramps & PMS", value: "cramps_pms" },
      { label: "Irregular or missed periods", value: "irregular_periods" },
      { label: "Hormonal acne & mood swings", value: "acne_mood" },
      { label: "Low energy & fatigue", value: "low_energy" },
    ],
  },
  pms_severity: {
    key: "pms_severity",
    question: "How disruptive are your PMS symptoms?",
    options: [
      { label: "Severe — affects daily life", value: "severe" },
      { label: "Moderate", value: "moderate" },
      { label: "Mild — mostly manageable", value: "mild" },
    ],
  },
  cycle_energy_impact: {
    key: "cycle_energy_impact",
    question: "Does your energy or mood shift significantly through your cycle?",
    options: [
      { label: "Yes, significantly", value: "high" },
      { label: "Sometimes", value: "moderate" },
      { label: "Barely noticeable", value: "low" },
    ],
  },

  /* ───── PROGRESS / FEEDBACK (fired after N days) ────────── */
  protocol_effect: {
    key: "protocol_effect",
    question: "It's been a while — have you noticed any changes since starting your protocol?",
    options: [
      { label: "Yes, feeling better", value: "improving" },
      { label: "Too early to tell", value: "early" },
      { label: "Not really yet", value: "no_change" },
      { label: "Actually feeling worse", value: "worse" },
    ],
  },
  energy_shift: {
    key: "energy_shift",
    question: "Compared to when you started, how's your energy holding up?",
    options: [
      { label: "Noticeably better", value: "better" },
      { label: "About the same", value: "same" },
      { label: "Still struggling", value: "low" },
    ],
  },
  biggest_barrier: {
    key: "biggest_barrier",
    question: "What's been the hardest part of staying consistent with your protocol?",
    options: [
      { label: "Forgetting to take them", value: "forgetfulness" },
      { label: "Not sure it's working", value: "doubt" },
      { label: "Cost is a concern", value: "cost" },
      { label: "I've been consistent", value: "consistent" },
    ],
  },

  /* ───── BLOOD TEST / KNOWN DEFICIENCY ───────────────────── */
  blood_test_recency: {
    key: "blood_test_recency",
    question: "Have you had a blood test done in the past year?",
    options: [
      { label: "Yes, recently", value: "yes" },
      { label: "Not in a while", value: "old" },
      { label: "Never", value: "never" },
    ],
  },
  known_deficiency: {
    key: "known_deficiency",
    question: "Did your blood report flag any deficiencies?",
    options: [
      { label: "Vitamin D", value: "vit_d" },
      { label: "B12", value: "b12" },
      { label: "Iron / haemoglobin", value: "iron" },
      { label: "Multiple things", value: "multiple" },
      { label: "All looked normal", value: "normal" },
    ],
  },

  /* ───── EXERCISE (shared for non-weight concerns) ────────── */
  exercise_frequency: {
    key: "exercise_frequency",
    question: "How often do you exercise or do any physical activity in a week?",
    options: [
      { label: "Rarely or never", value: "none" },
      { label: "1–2 times a week", value: "low" },
      { label: "3–4 times a week", value: "moderate" },
      { label: "5 or more times", value: "high" },
    ],
  },

  /* ───── FAMILY HISTORY ───────────────────────────────────── */
  family_thyroid: {
    key: "family_thyroid",
    question: "Does thyroid disease run in your family?",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
      { label: "Not sure", value: "unsure" },
    ],
  },
  family_diabetes: {
    key: "family_diabetes",
    question: "Has anyone in your immediate family been diagnosed with diabetes?",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
      { label: "Not sure", value: "unsure" },
    ],
  },

  /* ───── SUPPLEMENT TIMING ────────────────────────────────── */
  supplement_timing: {
    key: "supplement_timing",
    question: "When do you usually take your supplements?",
    options: [
      { label: "Morning with food", value: "morning_food" },
      { label: "Morning on empty stomach", value: "morning_empty" },
      { label: "Evening or night", value: "evening" },
      { label: "I keep forgetting", value: "forget" },
    ],
  },

  /* ───── FEMALE — EXTENDED ────────────────────────────────── */
  thyroid_symptoms_f: {
    key: "thyroid_symptoms_f",
    question: "Have you noticed any of these lately?",
    options: [
      { label: "Unexplained fatigue & sluggishness", value: "fatigue" },
      { label: "Unexpected weight changes", value: "weight" },
      { label: "Hair thinning or falling more than usual", value: "hair" },
      { label: "Feeling cold all the time", value: "cold" },
      { label: "None of these", value: "none" },
    ],
  },
  pcos_indicators: {
    key: "pcos_indicators",
    question: "Do you have irregular periods along with acne and difficulty managing weight?",
    options: [
      { label: "Yes, all three", value: "yes" },
      { label: "Some of these", value: "partial" },
      { label: "I've been told I have PCOS", value: "diagnosed" },
      { label: "No", value: "no" },
    ],
  },
  perimenopause_status: {
    key: "perimenopause_status",
    question: "Have you been experiencing any of these recently?",
    options: [
      { label: "Hot flashes or night sweats", value: "hot_flashes" },
      { label: "Periods becoming irregular", value: "irregular" },
      { label: "Mood changes or anxiety", value: "mood" },
      { label: "None of these", value: "none" },
    ],
  },

  /* ── Safety questions (shared, low-priority) ────────────── */
  allergies_check: {
    key: "allergies_check",
    question: "Do you have any food allergy or intolerance we should know about?",
    options: [
      { label: "Shellfish or fish", value: "shellfish" },
      { label: "Lactose or dairy", value: "lactose" },
      { label: "Gluten or wheat", value: "gluten" },
      { label: "Tree nuts", value: "nuts" },
      { label: "None", value: "none" },
    ],
  },
  medication_check: {
    key: "medication_check",
    question: "Are you currently on any prescription medications?",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
  },
};

/* ── Routing nodes ─────────────────────────────────────────── */
const QUESTION_NODES: QuestionNode[] = [

  /* ── Shared — asked once even for multi-concern ─────────── */
  { key: "stress_level", concerns: ["Hair / beard", "Skin / acne", "Hormones", "Sleep / mind", "Weight"], tier: "shared", priority: 1 },
  { key: "sleep_quality", concerns: ["Skin / acne", "Hormones", "Energy / gut"], tier: "shared", priority: 2 },
  { key: "caffeine_intake", concerns: ["Hair / beard", "Energy / gut", "Sleep / mind"], tier: "shared", priority: 3 },
  { key: "protein_meals", concerns: ["Hair / beard", "Weight"], tier: "shared", priority: 4 },
  { key: "water_intake", concerns: ["Skin / acne", "Energy / gut"], tier: "shared", priority: 5 },
  { key: "food_source", concerns: ["Skin / acne", "Energy / gut", "Weight"], tier: "shared", priority: 6 },

  /* ── Hair / Beard triage ────────────────────────────────── */
  {
    key: "hair_primary", concerns: ["Hair / beard"], tier: "triage", priority: 1,
    agePriority: { "18-24": 1, "25-34": 1, "35-44": 1, "45+": 1 },
  },
  {
    key: "hair_duration", concerns: ["Hair / beard"], tier: "triage", priority: 2,
  },

  /* Hair branch — thinning / fall / receding */
  {
    key: "hair_family", concerns: ["Hair / beard"], tier: "branch", priority: 1,
    condition: { key: "hair_primary", values: ["thinning", "hair_fall", "receding"] },
  },
  {
    key: "hair_illness", concerns: ["Hair / beard"], tier: "branch", priority: 2,
    condition: { key: "hair_primary", values: ["thinning", "hair_fall"] },
    ageGroups: ["18-24", "25-34"],
  },

  /* Hair branch — beard */
  {
    key: "beard_type", concerns: ["Hair / beard"], tier: "branch", priority: 1,
    condition: { key: "hair_primary", values: ["beard"] },
    ageGroups: ["18-24", "25-34"],
  },
  {
    key: "beard_family", concerns: ["Hair / beard"], tier: "branch", priority: 2,
    condition: { key: "hair_primary", values: ["beard"] },
    ageGroups: ["18-24", "25-34"],
  },

  /* Hair branch — dandruff */
  {
    key: "scalp_type", concerns: ["Hair / beard"], tier: "branch", priority: 1,
    condition: { key: "hair_primary", values: ["dandruff"] },
  },
  {
    key: "scalp_hot_water", concerns: ["Hair / beard"], tier: "branch", priority: 2,
    condition: { key: "hair_primary", values: ["dandruff"] },
  },

  /* Hair branch — greying */
  {
    key: "greying_early", concerns: ["Hair / beard"], tier: "branch", priority: 1,
    condition: { key: "hair_primary", values: ["greying"] },
  },
  {
    key: "greying_family", concerns: ["Hair / beard"], tier: "branch", priority: 2,
    condition: { key: "hair_primary", values: ["greying"] },
  },

  /* ── Skin triage ────────────────────────────────────────── */
  { key: "skin_primary", concerns: ["Skin / acne"], tier: "triage", priority: 1 },
  { key: "skin_duration", concerns: ["Skin / acne"], tier: "triage", priority: 2 },

  /* Skin branch — acne */
  {
    key: "acne_location", concerns: ["Skin / acne"], tier: "branch", priority: 1,
    condition: { key: "skin_primary", values: ["acne"] },
  },
  {
    key: "acne_stress_link", concerns: ["Skin / acne"], tier: "branch", priority: 2,
    condition: { key: "skin_primary", values: ["acne"] },
  },
  {
    key: "acne_diet_link", concerns: ["Skin / acne"], tier: "branch", priority: 3,
    condition: { key: "skin_primary", values: ["acne"] },
  },

  /* Skin branch — oily */
  {
    key: "oily_pattern", concerns: ["Skin / acne"], tier: "branch", priority: 1,
    condition: { key: "skin_primary", values: ["oily"] },
  },
  {
    key: "skincare_routine", concerns: ["Skin / acne"], tier: "branch", priority: 2,
    condition: { key: "skin_primary", values: ["oily", "acne"] },
  },

  /* Skin branch — dullness / pigmentation */
  {
    key: "sun_exposure", concerns: ["Skin / acne"], tier: "branch", priority: 1,
    condition: { key: "skin_primary", values: ["dullness", "pigmentation"] },
  },

  /* ── Weight triage ──────────────────────────────────────── */
  { key: "weight_goal", concerns: ["Weight"], tier: "triage", priority: 1 },
  { key: "activity_level", concerns: ["Weight"], tier: "triage", priority: 2 },

  /* Weight branch — fat loss */
  {
    key: "fat_distribution", concerns: ["Weight"], tier: "branch", priority: 1,
    condition: { key: "weight_goal", values: ["lose", "both"] },
  },
  {
    key: "cravings", concerns: ["Weight"], tier: "branch", priority: 2,
    condition: { key: "weight_goal", values: ["lose", "both"] },
  },
  {
    key: "meal_skipping", concerns: ["Weight"], tier: "branch", priority: 3,
    condition: { key: "weight_goal", values: ["lose", "both"] },
  },

  /* Weight branch — muscle gain */
  {
    key: "supplement_history", concerns: ["Weight"], tier: "branch", priority: 1,
    condition: { key: "weight_goal", values: ["gain", "both"] },
  },
  {
    key: "workout_consistency", concerns: ["Weight"], tier: "branch", priority: 2,
    condition: { key: "weight_goal", values: ["gain", "both"] },
  },

  /* Weight branch — sedentary */
  {
    key: "daily_steps", concerns: ["Weight"], tier: "branch", priority: 1,
    condition: { key: "activity_level", values: ["sedentary"] },
  },

  /* Weight — universal */
  { key: "weight_change", concerns: ["Weight"], tier: "branch", priority: 10 },
  { key: "fasting_habit", concerns: ["Weight"], tier: "branch", priority: 11 },

  /* ── Energy / Gut triage ────────────────────────────────── */
  { key: "energy_pattern", concerns: ["Energy / gut"], tier: "triage", priority: 1 },
  { key: "gut_symptom", concerns: ["Energy / gut"], tier: "triage", priority: 2 },

  /* Energy branch — low energy / crash */
  {
    key: "late_dinner", concerns: ["Energy / gut"], tier: "branch", priority: 1,
    condition: { key: "energy_pattern", values: ["consistently_low", "afternoon_crash"] },
  },
  {
    key: "fatigue_on_waking", concerns: ["Energy / gut"], tier: "branch", priority: 2,
    condition: { key: "energy_pattern", values: ["consistently_low", "afternoon_crash", "unpredictable"] },
  },

  /* Gut branch — discomfort */
  {
    key: "eating_speed", concerns: ["Energy / gut"], tier: "branch", priority: 1,
    condition: { key: "gut_symptom", values: ["bloating", "acidity", "constipation"] },
  },
  {
    key: "post_meal_discomfort", concerns: ["Energy / gut"], tier: "branch", priority: 2,
    condition: { key: "gut_symptom", values: ["bloating", "acidity"] },
  },

  /* Energy/Gut — universal */
  { key: "meal_consistency", concerns: ["Energy / gut"], tier: "branch", priority: 10 },
  { key: "bowel_regularity", concerns: ["Energy / gut"], tier: "branch", priority: 11 },

  /* ── Sleep / Mind triage ────────────────────────────────── */
  { key: "sleep_hours", concerns: ["Sleep / mind"], tier: "triage", priority: 1 },
  { key: "wake_feeling", concerns: ["Sleep / mind"], tier: "triage", priority: 2 },

  /* Sleep branch — poor sleep */
  {
    key: "sleep_timing", concerns: ["Sleep / mind"], tier: "branch", priority: 1,
    condition: { key: "sleep_hours", values: ["very_low", "low"] },
  },
  {
    key: "screen_bedtime", concerns: ["Sleep / mind"], tier: "branch", priority: 2,
    condition: { key: "sleep_hours", values: ["very_low", "low"] },
  },
  {
    key: "sleep_interruption", concerns: ["Sleep / mind"], tier: "branch", priority: 3,
    condition: { key: "wake_feeling", values: ["exhausted", "groggy"] },
    ageGroups: ["35-44", "45+"],
  },

  /* Sleep branch — exhausted despite hours */
  {
    key: "brain_fog_morning", concerns: ["Sleep / mind"], tier: "branch", priority: 1,
    condition: { key: "wake_feeling", values: ["exhausted"] },
  },
  {
    key: "napping", concerns: ["Sleep / mind"], tier: "branch", priority: 2,
    condition: { key: "wake_feeling", values: ["exhausted", "groggy"] },
  },

  /* Sleep — universal */
  { key: "overthinking", concerns: ["Sleep / mind"], tier: "branch", priority: 10 },
  { key: "work_type", concerns: ["Sleep / mind"], tier: "branch", priority: 11 },

  /* ── Hormones triage ────────────────────────────────────── */
  {
    key: "hormone_energy_change", concerns: ["Hormones"], tier: "triage", priority: 1,
    ageGroups: ["25-34", "35-44", "45+"],
  },
  { key: "hormone_symptom", concerns: ["Hormones"], tier: "triage", priority: 2 },

  /* Hormones branch — motivation / mood */
  {
    key: "mood_shift", concerns: ["Hormones"], tier: "branch", priority: 1,
    condition: { key: "hormone_symptom", values: ["motivation", "mood"] },
  },
  {
    key: "anhedonia", concerns: ["Hormones"], tier: "branch", priority: 2,
    condition: { key: "hormone_symptom", values: ["motivation"] },
  },

  /* Hormones branch — libido */
  {
    key: "libido_change", concerns: ["Hormones"], tier: "branch", priority: 1,
    condition: { key: "hormone_symptom", values: ["libido"] },
  },

  /* Hormones branch — muscle / recovery */
  {
    key: "recovery_time", concerns: ["Hormones"], tier: "branch", priority: 1,
    condition: { key: "hormone_symptom", values: ["muscle"] },
  },

  /* Hormones branch — belly fat */
  {
    key: "belly_fat_change", concerns: ["Hormones"], tier: "branch", priority: 1,
    condition: { key: "hormone_symptom", values: ["belly_fat"] },
  },
  {
    key: "alcohol_intake", concerns: ["Hormones"], tier: "branch", priority: 2,
    condition: { key: "hormone_symptom", values: ["belly_fat"] },
    ageGroups: ["25-34", "35-44", "45+"],
  },

  /* ── Female Hormones triage ─────────────────────────────── */
  {
    key: "period_regularity", concerns: ["Hormones"], tier: "triage", priority: 1,
    condition: { key: "sex", values: ["female"] },
  },
  {
    key: "hormonal_concern_f", concerns: ["Hormones"], tier: "triage", priority: 2,
    condition: { key: "sex", values: ["female"] },
  },

  /* Female Hormones branches */
  {
    key: "pms_severity", concerns: ["Hormones"], tier: "branch", priority: 1,
    condition: { key: "hormonal_concern_f", values: ["cramps_pms", "irregular_periods"] },
  },
  {
    key: "cycle_energy_impact", concerns: ["Hormones"], tier: "branch", priority: 2,
    condition: { key: "sex", values: ["female"] },
  },

  /* ── Postpartum — female Hair + Energy users, age 25-44 ─── */
  {
    key: "postpartum_status", concerns: ["Hair / beard", "Energy / gut"], tier: "branch", priority: 3,
    condition: { key: "sex", values: ["female"] },
    ageGroups: ["25-34", "35-44"],
  },

  /* ── Female extended — thyroid, PCOS, perimenopause ─────── */
  {
    key: "thyroid_symptoms_f", concerns: ["Hormones", "Energy / gut"], tier: "branch", priority: 4,
    condition: { key: "sex", values: ["female"] },
  },
  {
    key: "pcos_indicators", concerns: ["Hormones"], tier: "branch", priority: 3,
    condition: { key: "period_regularity", values: ["irregular", "very_irregular"] },
  },
  {
    key: "perimenopause_status", concerns: ["Hormones"], tier: "branch", priority: 5,
    condition: { key: "sex", values: ["female"] },
    ageGroups: ["35-44", "45+"],
  },

  /* ── Safety — asked early (after lifestyle signals, before branch questions) ── */
  { key: "allergies_check", concerns: ["Hair / beard", "Skin / acne", "Energy / gut", "Weight", "Hormones", "Sleep / mind"], tier: "shared", priority: 7 },
  { key: "medication_check", concerns: ["Hair / beard", "Skin / acne", "Energy / gut", "Weight", "Hormones", "Sleep / mind"], tier: "shared", priority: 8 },

  /* ── Blood test / deficiency ────────────────────────────── */
  { key: "blood_test_recency", concerns: ["Hair / beard", "Skin / acne", "Energy / gut", "Weight", "Hormones", "Sleep / mind"], tier: "shared", priority: 9 },
  {
    key: "known_deficiency", concerns: ["Hair / beard", "Skin / acne", "Energy / gut", "Weight", "Hormones", "Sleep / mind"], tier: "branch", priority: 5,
    condition: { key: "blood_test_recency", values: ["yes"] },
  },

  /* ── Exercise frequency (shared for non-weight concerns) ── */
  { key: "exercise_frequency", concerns: ["Energy / gut", "Hormones", "Sleep / mind"], tier: "shared", priority: 10 },

  /* ── Sun exposure for vitamin D (energy + hormones) ─────── */
  { key: "sun_exposure", concerns: ["Energy / gut", "Hormones"], tier: "branch", priority: 13 },

  /* ── Family history ─────────────────────────────────────── */
  { key: "family_thyroid", concerns: ["Hormones", "Energy / gut"], tier: "branch", priority: 6 },
  { key: "family_diabetes", concerns: ["Weight", "Energy / gut"], tier: "branch", priority: 6 },

  /* ── Supplement timing ──────────────────────────────────── */
  { key: "supplement_timing", concerns: ["Hair / beard", "Skin / acne", "Energy / gut", "Weight", "Hormones", "Sleep / mind"], tier: "shared", priority: 11 },

  /* ── Progress / feedback (minDays gates when they appear) ── */
  { key: "protocol_effect", concerns: ["Hair / beard", "Skin / acne", "Energy / gut", "Weight", "Hormones", "Sleep / mind"], tier: "shared", priority: 12, minDays: 7 },
  { key: "energy_shift", concerns: ["Energy / gut"], tier: "branch", priority: 14, minDays: 7 },
  { key: "biggest_barrier", concerns: ["Hair / beard", "Skin / acne", "Energy / gut", "Weight", "Hormones", "Sleep / mind"], tier: "shared", priority: 13, minDays: 14 },
];

/* ── Selection engine ──────────────────────────────────────── */

/**
 * Returns the single best next question to ask, or null when done.
 *
 * Priority order (multi-concern):
 * 1. Primary concern triage — Q1 is always concern-specific
 * 2. Primary concern branches — surfaced immediately after primary triage, before secondary triage
 * 3. Secondary concerns triage
 * 4. Shared questions (lifestyle signals, asked once across all concerns)
 * 5. Remaining branches for all concerns
 *
 * Single-concern behaviour is identical to before (step 2 is skipped, step 3 is empty).
 */
export function selectNextQuestion(
  profile: UserProfile,
  followUpAnswers: Record<string, string>,
  allConcerns: string[],
  age: string,
  visitCount = 0,
): BankQuestion | null {
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries(profile)) {
    if (v) merged[k] = String(v);
  }
  for (const [k, v] of Object.entries(followUpAnswers)) {
    if (v) merged[k] = v;
  }

  const isAnswered = (key: string) => Boolean(merged[key]);
  const matchesAge = (node: QuestionNode) => !node.ageGroups || node.ageGroups.includes(age);
  const meetsMinDays = (node: QuestionNode) => !node.minDays || visitCount >= node.minDays;
  const conditionMet = (node: QuestionNode) => {
    if (!node.condition) return true;
    const val = merged[node.condition.key];
    return val !== undefined && node.condition.values.includes(val);
  };
  const concernSet = new Set(allConcerns);

  const eligible = (n: QuestionNode) =>
    !isAnswered(n.key) && matchesAge(n) && meetsMinDays(n) && conditionMet(n);

  const pickTriage = (concern: string) =>
    QUESTION_NODES
      .filter(n => n.concerns.includes(concern) && n.tier === "triage" && eligible(n))
      .sort((a, b) => (a.agePriority?.[age] ?? a.priority) - (b.agePriority?.[age] ?? b.priority));

  const pickBranch = (concern: string) =>
    QUESTION_NODES
      .filter(n => n.concerns.includes(concern) && n.tier === "branch" && eligible(n))
      .sort((a, b) => a.priority - b.priority);

  // 1. Primary concern triage
  const pt = pickTriage(allConcerns[0]);
  if (pt.length > 0) return QUESTION_BANK[pt[0].key] ?? null;

  // 2. [Multi-concern only] Primary concern branches — before secondary triage,
  //    so the user's main concern gets its refinement questions early.
  if (allConcerns.length > 1) {
    const pb = pickBranch(allConcerns[0]);
    if (pb.length > 0) return QUESTION_BANK[pb[0].key] ?? null;
  }

  // 3. Secondary concerns triage
  for (const concern of allConcerns.slice(1)) {
    const st = pickTriage(concern);
    if (st.length > 0) return QUESTION_BANK[st[0].key] ?? null;
  }

  // 4. Shared questions (lifestyle signals — asked once across all concerns)
  const sharedNodes = QUESTION_NODES
    .filter(n => n.tier === "shared" && n.concerns.some(c => concernSet.has(c)) && eligible(n))
    .sort((a, b) => a.priority - b.priority);
  if (sharedNodes.length > 0) return QUESTION_BANK[sharedNodes[0].key] ?? null;

  // 5. Remaining branches for all concerns (secondary + any primary not yet answered)
  for (const concern of allConcerns) {
    const triageKeys = QUESTION_NODES
      .filter(n => n.concerns.includes(concern) && n.tier === "triage")
      .map(n => n.key);
    if (!triageKeys.every(k => isAnswered(k))) continue;

    const sb = pickBranch(concern);
    if (sb.length > 0) return QUESTION_BANK[sb[0].key] ?? null;
  }

  return null;
}

/**
 * Count how many follow-up answers have been collected so far.
 * Used for the "X questions answered" display.
 */
export function countFollowUpAnswers(
  followUpAnswers: Record<string, string>,
): number {
  return Object.keys(followUpAnswers).filter(k => followUpAnswers[k]).length;
}
