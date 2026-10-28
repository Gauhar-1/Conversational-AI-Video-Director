/**
 * @file src/lib/services/ai/GroqService.ts
 * @description Groq LLM Provider implementing IScriptProvider.
 * Parses screenplays into structured JSON with Scenes, Characters, and Locations.
 */

import OpenAI from "openai";
import { repairAndParseJson } from "@/lib/utils/jsonRepair";
import type {
  IScriptProvider,
  ParseScriptInput,
  ParsedScriptResult,
} from "./types";

export class GroqService implements IScriptProvider {
  readonly name = "GroqService";

  private getClient(apiKey?: string): OpenAI {
    const key =
      apiKey ||
      process.env.GROQ_API_KEY ||
      process.env.OPENAI_API_KEY ||
      "test-groq-key";

    return new OpenAI({
      apiKey: key,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }

  /**
   * Parses raw script text into structured Scenes, Characters, and Locations.
   */
  async parseScript(input: ParseScriptInput): Promise<ParsedScriptResult> {
    const client = this.getClient(input.apiKey);

    const systemPrompt = `You are Director AI, a visionary film director and master VFX supervisor.
Analyze the human screenplay/script provided and extract a structured cinematic production breakdown.
Return ONLY valid JSON matching this exact schema:

{
  "title": "Project Title",
  "logline": "One sentence summary of the narrative arc",
  "characters": [
    {
      "name": "Character Name",
      "role": "Lead Protagonist | Antagonist | Supporting",
      "appearancePrompt": "Highly descriptive visual prompt detailing age, ethnicity, facial geometry, hairstyle, wardrobe, colors, cinematic studio portrait style"
    }
  ],
  "locations": [
    {
      "name": "Location Name",
      "environmentPrompt": "Atmospheric architectural environment prompt, volumetric lighting, textures, weather, empty of people, 8k matte painting",
      "lightingProfile": "Specific lighting setup e.g. Neon rain rim lighting | Warm sunset golden hour"
    }
  ],
  "scenes": [
    {
      "order": 1,
      "title": "Scene Name",
      "rawDelta": "What happens narratively in this 5-10s beat",
      "dialogue": "Spoken dialogue if any",
      "locationName": "Must match one of the locations names above",
      "characterNames": ["Names matching characters above in this scene"],
      "cameraAngle": "CAM_A_CENTER | CAM_B_45_CLOSE | CAM_C_OTS | CLOSE_UP | MEDIUM_SHOT | WIDE_SHOT",
      "cameraMovement": "STATIC | PUSH_IN | PULL_OUT | PAN_LEFT | PAN_RIGHT | TILT_UP | TILT_DOWN | TRACKING | ORBIT",
      "duration": 10,
      "imagePrompt": "Self-contained master keyframe conditioning prompt for 9:16 vertical cinema with full lighting and subject details",
      "motionPrompt": "Cinematic temporal motion prompt describing physics, camera dolly/pan, and character motion"
    }
  ]
}

DO NOT include any markdown code fences or conversational preamble. Return pure JSON.`;

    const response = await client.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input.script },
      ],
      temperature: 0.1,
      max_completion_tokens: 8000,
    } as any);

    const rawContent = response.choices[0]?.message?.content || "{}";
    const cleaned = rawContent.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    try {
      const parsed = repairAndParseJson(cleaned) as ParsedScriptResult;
      return {
        title: parsed.title || "Untitled Production",
        logline: parsed.logline || "",
        characters: Array.isArray(parsed.characters) ? parsed.characters : [],
        locations: Array.isArray(parsed.locations) ? parsed.locations : [],
        scenes: Array.isArray(parsed.scenes) ? parsed.scenes : [],
      };
    } catch (err: any) {
      console.error("GroqService JSON parse error:", err);
      throw new Error(`Failed to parse script breakdown: ${err.message}`);
    }
  }

  /**
   * Rewrites a raw concept or prompt into an ultra-detailed, cinematic prompt.
   */
  async enrichPrompt(
    prompt: string,
    type: "character" | "location" | "scene" = "scene",
    apiKey?: string
  ): Promise<string> {
    const client = this.getClient(apiKey);

    const typePrompts: Record<string, string> = {
      character:
        "You are an expert Hollywood character designer and VFX prompt engineer. Rewrite the user's basic character description into an ultra-detailed, photorealistic prompt for FLUX and PuLID face conditioning. Describe exact ethnicity, bone structure, eye color, hairstyle, skin texture, studio lighting (key, fill, rim), wardrobe fabric details, and 8k portrait cinematography. Return ONLY the enriched prompt text. No explanations, no quotes, no markdown fences.",
      location:
        "You are an award-winning production designer and matte painter. Rewrite the user's location description into an immersive, atmospheric environment prompt for a 16:9 cinematic plate. Detail architecture, textures, weather, volumetric lighting, color palette, fog, time of day, and anamorphic lens characteristics. The scene must be empty of people. Return ONLY the enriched prompt text. No explanations, no quotes, no markdown fences.",
      scene:
        "You are a visionary film director and cinematographer. Rewrite the user's scene concept into a highly detailed cinematic prompt for generative video. Include exact subject action, camera movement, focal length, depth of field, lighting temperature, and environmental physics. Return ONLY the enriched prompt text. No explanations, no quotes, no markdown fences.",
    };

    const systemPrompt = typePrompts[type] || typePrompts.scene;

    try {
      const response = await client.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_completion_tokens: 1000,
      } as any);

      const raw = response.choices[0]?.message?.content || "";
      const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      return cleaned || prompt;
    } catch (err: any) {
      console.warn("GroqService enrichPrompt fallback:", err.message);
      // Fallback enrichment if offline or test environment
      if (type === "character") {
        return `Cinematic 8k studio headshot portrait of ${prompt}, sharp facial geometry, photorealistic skin pores, directional rim lighting, 85mm lens f/1.4, neutral dark studio backdrop, ultra-detailed fabric textures.`;
      } else if (type === "location") {
        return `Cinematic 16:9 master matte painting of ${prompt}, atmospheric volumetric lighting, atmospheric fog, photorealistic surface textures, dynamic range, anamorphic depth of field, empty of people, 8k resolution.`;
      } else {
        return `Master cinematic composition of ${prompt}, 35mm anamorphic camera, volumetric atmosphere, intense dramatic lighting, cinematic color grading, photorealistic motion physics.`;
      }
    }
  }
}

export const groqService = new GroqService();

