/* ══════════════════════════════════════════════════════════════
   AI Protocol Layer — shared types
   Used by mock-generator, client, API route, and protocol page
   ══════════════════════════════════════════════════════════════ */

export interface UserProfile {
  concern?: string;
  sex?: string;
  age?: string;
  diet?: string;
  // Follow-up answers (any string key)
  sleep?: string;
  stress?: string;
  activity?: string;
  water?: string;
  bloating?: string;
  goal?: string;
  bedtime?: string;
  screens?: string;
  moodSwings?: string;
  familyHistory?: string;
  existingSupplements?: string;
  bloodReport?: string;
  [key: string]: string | undefined;
}

export interface RoutineItem {
  time: "morning" | "afternoon" | "evening";
  text: string;
}

export interface ProtocolSupplementAlternative {
  id: string;
  name: string;
  brand: string;
  price: number;
  mrp: number;
  image?: string;
  reason: string; // e.g. "₹150 cheaper · same actives" or "premium · stronger formula"
}

export interface ProtocolSupplement {
  id: string;
  name: string;
  brand: string;
  price: number;
  mrp: number;
  timing: string;
  reasoning: string;
  reasonTags?: string[];
  matchScore: number;
  shopifyUrl: string;
  image?: string;
  rating?: number;
  reviewCount?: number;
  priority: "essential" | "recommended" | "optional";
  alternative?: ProtocolSupplementAlternative;
  siblings?: Array<{ slug: string; label: string }>;
}

export interface FollowUpQuestion {
  key: string;
  question: string;
  options: { label: string; value: string }[];
}

export interface ProfileDepthBreakdown {
  concerns: number;     // 0–25
  demographics: number; // 0–10
  diet: number;         // 0–10
  lifestyle: number;    // 0–20 (sleep + stress + activity)
  supplements: number;  // 0–5
  bloodReport: number;  // 0–15
}

export interface ProfileDepth {
  total: number;
  breakdown: ProfileDepthBreakdown;
  nextStep: string;
}

export interface GeneratedProtocol {
  warmMessage: string;
  summary: string;
  explanation: string;
  dailyRoutine: RoutineItem[];
  lifestyle: string[];
  supplements: ProtocolSupplement[];
  followUpQuestions: FollowUpQuestion[];
  confidence: number;
  confidenceMessage: string;
  profileDepth: ProfileDepth;
  generatedAt: string;
  model: "mock" | "claude-haiku-4-5" | "claude-sonnet-4-6";
}
