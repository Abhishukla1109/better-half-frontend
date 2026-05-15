import { NextRequest, NextResponse } from "next/server";
import { generateProtocol } from "@/lib/ai/client";
import type { UserProfile } from "@/lib/ai/types";

export async function POST(req: NextRequest) {
  try {
    const profile: UserProfile = await req.json();

    if (!profile || typeof profile !== "object") {
      return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
    }

    const protocol = await generateProtocol(profile);
    return NextResponse.json(protocol);
  } catch (error) {
    console.error("[/api/protocol]", error);
    return NextResponse.json(
      { error: "Protocol generation failed" },
      { status: 500 },
    );
  }
}
