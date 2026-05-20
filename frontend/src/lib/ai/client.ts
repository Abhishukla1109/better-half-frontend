/* ──────────────────────────────────────────────────────────────
   LLM abstraction layer
   1. Tries Anthropic Claude (ANTHROPIC_API_KEY)
   2. Falls back to mock generator — no config required
   ────────────────────────────────────────────────────────────── */

import { generateMockProtocol, buildWarmMessage } from "./mock-generator";
import { buildPrompt } from "./prompt-builder";
import { calculateProfileDepth } from "./profile-depth";
import type { UserProfile, GeneratedProtocol } from "./types";

async function generateWithClaude(
  profile: UserProfile,
  apiKey: string,
): Promise<GeneratedProtocol> {
  const { system, user } = buildPrompt(profile);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Claude API ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const text: string = data.content?.[0]?.text ?? "";

  // Extract JSON block (Claude sometimes adds prose around it)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in Claude response");

  const parsed = JSON.parse(jsonMatch[0]);

  // Calculate profile depth server-side (not delegated to Claude)
  const profileDepth = calculateProfileDepth(profile);
  const allConcerns = profile.concerns
    ? String(profile.concerns).split(",").filter(Boolean)
    : profile.concern ? [profile.concern] : [];

  return {
    ...parsed,
    warmMessage: buildWarmMessage(profile, allConcerns),
    // Normalise supplement shape to include fields Claude may omit
    supplements: (parsed.supplements ?? []).map(
      (s: Record<string, unknown>, i: number) => ({
        id: String(s.id ?? `claude-${i}`),
        name: String(s.name ?? ""),
        brand: String(s.brand ?? ""),
        price: Number(s.price ?? 0),
        mrp: Number(s.mrp ?? 0),
        timing: String(s.timing ?? ""),
        reasoning: String(s.reasoning ?? ""),
        matchScore: Number(s.matchScore ?? 80),
        shopifyUrl: String(s.shopifyUrl ?? ""),
        priority: (s.priority as "essential" | "recommended" | "optional") ?? "recommended",
      }),
    ),
    confidence: profileDepth.total,
    profileDepth,
    generatedAt: new Date().toISOString(),
    model: "claude-haiku-4-5" as const,
  };
}

export async function generateProtocol(
  profile: UserProfile,
): Promise<GeneratedProtocol> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return generateMockProtocol(profile);
  }

  try {
    return await generateWithClaude(profile, apiKey);
  } catch (error) {
    console.error("[AI] Claude generation failed, falling back to mock:", error);
    return generateMockProtocol(profile);
  }
}
