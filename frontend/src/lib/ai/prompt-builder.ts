/* ──────────────────────────────────────────────────────────────
   Builds Claude prompts for protocol generation.
   Includes real matched products so the AI can reference them.
   ────────────────────────────────────────────────────────────── */

import { calculateProtocolMatch } from "@/lib/protocolEngine";
import type { Product } from "@/lib/protocolEngine";
import type { UserProfile } from "./types";

export function buildPrompt(profile: UserProfile, products: Product[]): { system: string; user: string } {
  // Parse all selected concerns
  const rawConcerns = profile.concerns as string | undefined;
  const allConcerns: string[] = rawConcerns
    ? rawConcerns.split(",").filter(Boolean)
    : [profile.concern || "Energy / gut"];

  const isMulti = allConcerns.length > 1;

  // Get matched products for each concern, merge unique
  const seenIds = new Set<string>();
  const allMatchedProducts: ReturnType<typeof calculateProtocolMatch> = [];
  for (const concern of allConcerns) {
    const p = profile as Record<string, string | undefined>;
    const isBearder = concern === "Hair / beard" && (p.hair_primary === "beard" || p.hair_concern_type === "beard");
    const matched = calculateProtocolMatch({
      gender: profile.sex || "male",
      age: profile.age || "25-34",
      diet: profile.diet || "non-veg",
      concern: isBearder ? "beard" : (concern.toLowerCase().split(" / ")[0] || "energy"),
    }, products);
    for (const p of matched) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        allMatchedProducts.push(p);
      }
    }
    if (allMatchedProducts.length >= 6) break;
  }

  const productContext =
    allMatchedProducts.length > 0
      ? `\nMatched products from catalog (recommend from these only):\n${allMatchedProducts
          .map(
            (p, i) =>
              `${i + 1}. ${p.name} by ${p.brand} — ₹${p.price} (${p.category}, ${p.matchScore}% match)`,
          )
          .join("\n")}`
      : "";

  const concernContext = isMulti
    ? `User has MULTIPLE health concerns: ${allConcerns.map((c, i) => `${i + 1}. ${c}`).join(", ")}.\nGenerate ONE UNIFIED protocol that addresses all concerns holistically — not separate protocols.`
    : `User concern: ${allConcerns[0]}`;

  const system = `You are BetterHalf's AI health protocol generator for urban Indian users.
${concernContext}
Generate a warm, personalised health protocol based on the user's profile.

Return ONLY valid JSON matching this exact structure:
{
  "summary": "string — 2-3 sentences, warm and specific to this person's profile${isMulti ? ", explicitly referencing multiple concerns and how they are interconnected" : ""}",
  "explanation": "string — 1-2 sentences on why this unified protocol was chosen",
  "dailyRoutine": [
    {"time": "morning", "text": "string"},
    {"time": "afternoon", "text": "string"},
    {"time": "evening", "text": "string"}
  ],
  "lifestyle": ["string", "string", "string"],
  "supplements": [
    {
      "name": "string — exact product name",
      "brand": "string — exact brand name",
      "timing": "string",
      "reasoning": "string — one specific sentence",
      "priority": "essential"
    }
  ],
  "followUpQuestions": [
    {
      "key": "string — camelCase unique key",
      "question": "string",
      "options": [{"label": "string", "value": "string"}]
    }
  ],
  "confidenceMessage": "string — 1 sentence on protocol confidence"
}

Hard rules:
- Exactly 3 dailyRoutine items (one morning, afternoon, evening)
- Exactly 3 lifestyle tips
- 2–4 supplement items using ONLY the matched products provided
- 2–3 followUpQuestions about profile fields NOT already answered
- Language: warm, specific, Indian-context-aware (mention chai, dal, curd naturally when relevant)
- Never diagnose; only wellness recommendations
- Include numbers and mechanisms where possible ("28% cortisol reduction", "67% better absorption")
- Make the protocol meaningfully different for different profile combinations${productContext}`;

  const knownFields = Object.fromEntries(
    Object.entries(profile).filter(([, v]) => v !== undefined && v !== ""),
  );

  const user = `Generate a personalised health protocol for this profile:
${JSON.stringify(knownFields, null, 2)}

${isMulti ? `IMPORTANT: The user has selected ${allConcerns.length} concerns. Create one unified protocol that holistically covers all of them. The summary must reference all concerns and show how they interconnect.\n` : ""}Known fields should NOT appear as follow-up questions.
Use the matched products above for supplement recommendations.`;

  return { system, user };
}
