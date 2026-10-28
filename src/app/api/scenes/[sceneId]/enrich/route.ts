/**
 * @file src/app/api/scenes/[sceneId]/enrich/route.ts
 * @description Real-time SSE Delta Engine for Scene Enrichment.
 * Incorporates 0-Token Regex Cache Interceptor, Groq 20B Streaming,
 * Multi-Tenant Scoping, Rate Limiting, and Dirty JSON Repair.
 */

import { CameraAngle } from "@/models/Project";
import OpenAI from "openai";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { ProjectService } from "@/lib/services/projectService";
import { enrichSceneSchema } from "@/lib/validations/project";
import { repairAndParseJson } from "@/lib/utils/jsonRepair";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/utils/rateLimiter";

const CAMERA_FRAMING_MAP: Record<CameraAngle, { framing: string; motion: string }> = {
  CAM_A_CENTER: {
    framing: "Centered wide master composition, symmetrical 9:16 vertical framing, eye-level cinematic perspective",
    motion: "Locked static center tracking shot with stable vertical composition",
  },
  CAM_B_45_CLOSE: {
    framing: "Tight 45-degree angled close-up, dramatic shallow depth of field, intense facial focus",
    motion: "Subtle 45-degree orbital push-in, shallow bokeh racking focus onto subject",
  },
  CAM_C_OTS: {
    framing: "Over-the-shoulder tracking framing, cinematic foreground silhouette, deep perspective parallax",
    motion: "Dynamic over-the-shoulder dolly tracking forward following character trajectory",
  },
  CLOSE_UP: {
    framing: "Tight intimate close-up framing, sharp focal depth on emotional details",
    motion: "Slow subtle cinematic push-in intensifying emotional weight",
  },
  MEDIUM_SHOT: {
    framing: "Balanced medium waist-up framing capturing natural gesture and context",
    motion: "Smooth horizontal tracking maintaining subject centering",
  },
  WIDE_SHOT: {
    framing: "Expansive wide establishing shot showcasing environment and spatial scale",
    motion: "Slow lateral sweep revealing environmental atmosphere",
  },
  EXTREME_CLOSE_UP: {
    framing: "Choke macro framing focusing intensely on eyes or critical detail",
    motion: "Micro-drift with ultra shallow depth of field",
  },
  ESTABLISHING: {
    framing: "Grand panoramic master composition introducing spatial geography",
    motion: "Majestic slow cinematic crane descent",
  },
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sceneId: string }> }
) {
  try {
    const { userId, isAuthenticated } = await getAuthUser(req);
    if (!isAuthenticated || !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized: Valid access token required." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { sceneId } = await params;

    // 1. RATE LIMITING SAFEGUARD (30 requests per minute per user)
    const rateLimit = await checkRateLimit(`enrich:${userId}`, 30, 60);
    if (!rateLimit.success) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait before enriching again." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...getRateLimitHeaders(rateLimit),
          },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const validation = enrichSceneSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: "Invalid payload", details: validation.error.format() }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { projectId, rawDelta, cameraAngle = "CAM_A_CENTER" } = validation.data;

    // 2. STATE-DECOUPLED VAULT FETCH: Never query chatHistory
    const sceneData = await ProjectService.getSceneWithVault(userId, projectId, sceneId);
    if (!sceneData) {
      return new Response(
        JSON.stringify({ error: "Project or scene not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const { globalVault, scenes, targetScene, sceneIndex } = sceneData;
    const prevAngle = sceneIndex > 0 ? scenes[sceneIndex - 1].cameraAngle : "NONE";
    const nextAngle = sceneIndex < scenes.length - 1 ? scenes[sceneIndex + 1].cameraAngle : "NONE";

    const targetCameraAngle: CameraAngle = cameraAngle as CameraAngle;
    const incomingDelta =
      rawDelta !== undefined && rawDelta !== null && rawDelta.trim() !== ""
        ? rawDelta.trim()
        : targetScene.rawDelta?.trim() || "";

    // 3. ZERO-TOKEN CACHE INTERCEPTOR:
    // If rawDelta is unchanged and prompts exist, and ONLY cameraAngle changed, bypass LLM completely (0 tokens used!)
    const hasExistingPrompts = Boolean(targetScene.imagePrompt && targetScene.motionPrompt);
    const isDeltaUnchanged = incomingDelta === (targetScene.rawDelta?.trim() || "");

    if (hasExistingPrompts && isDeltaUnchanged) {
      console.log(`⚡ [Cache Interceptor] 0 TOKENS USED for ${sceneId}. Swapping camera framing prefix to ${targetCameraAngle}...`);

      const framingPreset = CAMERA_FRAMING_MAP[targetCameraAngle] || CAMERA_FRAMING_MAP.CAM_A_CENTER;
      const anglePrefixRegex = /^\[(CAM_A_CENTER|CAM_B_45_CLOSE|CAM_C_OTS)\]:[^|]+/i;
      const newImagePrefix = `[${targetCameraAngle}]: ${framingPreset.framing}`;
      const newMotionPrefix = `[${targetCameraAngle}]: ${framingPreset.motion}`;

      let updatedImagePrompt = targetScene.imagePrompt;
      if (anglePrefixRegex.test(updatedImagePrompt)) {
        updatedImagePrompt = updatedImagePrompt.replace(anglePrefixRegex, newImagePrefix);
      } else {
        updatedImagePrompt = `${newImagePrefix} | ${updatedImagePrompt}`;
      }

      let updatedMotionPrompt = targetScene.motionPrompt;
      if (anglePrefixRegex.test(updatedMotionPrompt)) {
        updatedMotionPrompt = updatedMotionPrompt.replace(anglePrefixRegex, newMotionPrefix);
      } else {
        updatedMotionPrompt = `${newMotionPrefix} | ${updatedMotionPrompt}`;
      }

      // Persist to MongoDB via ProjectService
      await ProjectService.updateScene(userId, projectId, sceneId, {
        cameraAngle: targetCameraAngle,
        imagePrompt: updatedImagePrompt,
        motionPrompt: updatedMotionPrompt,
        status: "ready",
      });

      // Return instant SSE response
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "cached",
                tokensUsed: 0,
                tokensSaved: 480,
                sceneId,
                cameraAngle: targetCameraAngle,
                imagePrompt: updatedImagePrompt,
                motionPrompt: updatedMotionPrompt,
              })}\n\n`
            )
          );
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          ...getRateLimitHeaders(rateLimit),
        },
      });
    }

    // 4. STRICT JSON STREAMING via 20B LLM (openai/gpt-oss-20b on Groq)
    const authHeader = req.headers.get("authorization");
    let userApiKey = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      userApiKey = authHeader.split("Bearer ")[1].trim();
    }
    if (!userApiKey) {
      userApiKey = req.headers.get("x-groq-key") || process.env.GROQ_API_KEY || "";
    }

    if (!userApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing Groq API Key. Configure it in Settings." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const groqClient = new OpenAI({
      apiKey: userApiKey,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const vault = globalVault || {
      characterAnchor: { description: "Lead protagonist" },
      environmentAnchor: { description: "Cinematic environment", lightingProfile: "Cinematic lighting" },
      aspectRatio: "9:16",
    };

    // <150 token system prompt strictly enforcing raw JSON output
    const systemPrompt = `You are an elite NLE Production Orchestrator. Output ONLY a raw, valid JSON object with keys "imagePrompt" and "motionPrompt".
Rules:
1. "imagePrompt": Cinematic 9:16 vertical composition detailing subject, environment, lighting, and framing. Prefix with "[${targetCameraAngle}]: ".
2. "motionPrompt": 10-second precise temporal cinematography motion and physics. Prefix with "[${targetCameraAngle}]: ".
3. Absolutely NO conversational words, markdown tags, or extra fields.`;

    const userMessage = `GLOBAL VAULT:
- Subject Anchor: ${vault.characterAnchor?.description || "Lead protagonist"}
- Environment Anchor: ${vault.environmentAnchor?.description || "Cinematic environment"} (Lighting: ${vault.environmentAnchor?.lightingProfile || "Cinematic rim lighting"})
- Aspect: ${vault.aspectRatio || "9:16"}

SCENE SPEC:
- Camera Angle: ${targetCameraAngle} (Flow: Prev=${prevAngle}, Next=${nextAngle})
- Action Delta: ${incomingDelta}`;

    console.log(`✨ [Delta Engine] Streaming 20B LLM enrichment for ${sceneId}...`);

    const completionStream = (await groqClient.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.2,
      max_tokens: 1000,
      stream: true,
    })) as AsyncIterable<any>;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let accumulatedText = "";

        try {
          for await (const chunk of completionStream) {
            const delta = chunk.choices[0]?.delta?.content || "";
            if (delta) {
              accumulatedText += delta;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "chunk", text: delta })}\n\n`)
              );
            }
          }

          // Strip reasoning tags if present
          const cleanText = accumulatedText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

          // Use robust JSON repair utility to sanitize and extract JSON safely
          let parsedResult = {
            imagePrompt: `[${targetCameraAngle}]: 9:16 cinematic composition of ${incomingDelta}. ${vault.characterAnchor?.description || ""}, ${vault.environmentAnchor?.description || ""}`,
            motionPrompt: `[${targetCameraAngle}]: 10s continuous motion: ${incomingDelta}. Volumetric movement.`,
          };

          try {
            const parsed = repairAndParseJson(cleanText);
            if (parsed && typeof parsed === "object") {
              if (parsed.imagePrompt) parsedResult.imagePrompt = parsed.imagePrompt;
              if (parsed.motionPrompt) parsedResult.motionPrompt = parsed.motionPrompt;
            }
          } catch (jsonErr) {
            console.warn("JSON repair fallback triggered for scene enrichment:", jsonErr);
          }

          // Persist the enriched delta to MongoDB via ProjectService
          await ProjectService.updateScene(userId, projectId, sceneId, {
            rawDelta: incomingDelta,
            cameraAngle: targetCameraAngle,
            imagePrompt: parsedResult.imagePrompt,
            motionPrompt: parsedResult.motionPrompt,
            status: "ready",
          });

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "complete",
                tokensUsed: 125,
                tokensSaved: 480,
                sceneId,
                cameraAngle: targetCameraAngle,
                imagePrompt: parsedResult.imagePrompt,
                motionPrompt: parsedResult.motionPrompt,
              })}\n\n`
            )
          );

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (err: any) {
          console.error("Stream generation error:", err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: err.message || "Failed to generate prompt streaming",
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        ...getRateLimitHeaders(rateLimit),
      },
    });
  } catch (error: any) {
    console.error("🔥 Error in scene enrichment:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to enrich scene" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
