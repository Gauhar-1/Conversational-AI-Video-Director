/**
 * @file src/app/api/enrich-prompt/route.ts
 * @description API route for enriching character, location, and scene prompts via Groq.
 */

import { NextRequest, NextResponse } from "next/server";
import { groqService } from "@/lib/services/ai/GroqService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, type = "scene" } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "A valid prompt string is required" },
        { status: 400 }
      );
    }

    const apiKey =
      req.headers.get("x-groq-key") ||
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      undefined;

    const enrichedPrompt = await groqService.enrichPrompt(
      prompt.trim(),
      type as "character" | "location" | "scene",
      apiKey
    );

    return NextResponse.json({ enrichedPrompt });
  } catch (error: any) {
    console.error("Enrich prompt error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to enrich prompt" },
      { status: 500 }
    );
  }
}
