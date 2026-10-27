/**
 * @file src/app/api/generate-video/route.ts
 * @description API route to initiate AI generative video tasks.
 * Enforces multi-tenant user isolation, rate limiting, deterministic idempotency keys,
 * and dependency inversion via VideoGeneratorFactory.
 */

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { generateVideoSchema } from "@/lib/validations/generation";
import { generateIdempotencyKey } from "@/lib/utils/idempotency";
import { VideoTaskService } from "@/lib/services/videoTaskService";
import { ProjectService } from "@/lib/services/projectService";
import { VideoGeneratorFactory } from "@/lib/generators/VideoGeneratorFactory";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/utils/rateLimiter";

export async function POST(req: Request) {
  try {
    const { userId, isAuthenticated } = await getAuthUser(req);
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: "Unauthorized: Valid access token required." }, { status: 401 });
    }

    // 1. RATE LIMITING SAFEGUARD (10 requests per minute per user)
    const rateLimit = await checkRateLimit(`video:${userId}`, 10, 60);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Video generation is limited to 10 requests per minute." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimit),
        }
      );
    }

    const body = await req.json().catch(() => ({}));

    // 2. PAYLOAD VALIDATION VIA ZOD
    const validationResult = generateVideoSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const {
      projectId,
      sceneId,
      sceneNumber,
      rawPrompt,
      userPreference = "kling",
      advancedInputs,
    } = validationResult.data;

    // 3. IDEMPOTENCY SAFEGUARD (Prevents double generation and double billing)
    const idempotencyKey = generateIdempotencyKey({
      userId,
      projectId,
      sceneId: sceneId || (sceneNumber ? `scene-${sceneNumber}` : "default"),
      prompt: rawPrompt,
      modelOrPreference: userPreference,
      advancedInputs,
    });

    const existingTask = await VideoTaskService.findByIdempotencyKey(userId, idempotencyKey);
    if (existingTask && (existingTask.status === "processing" || existingTask.status === "completed" || existingTask.status === "pending")) {
      console.log(`⚡ [Idempotency Guard] Returning cached video task ${existingTask._id} for scene ${sceneId || sceneNumber}`);
      return NextResponse.json({
        taskId: existingTask._id,
        status: existingTask.status,
        predictionId: existingTask.replicatePredictionId,
        enhancedPrompt: existingTask.enhancedPrompt,
        finalVideoUrl: existingTask.finalVideoUrl,
        isCached: true,
      });
    }

    // 4. API KEY EXTRACTION
    const replicateApiKey =
      req.headers.get("X-Replicate-Key") ||
      process.env.REPLICATE_API_KEY ||
      process.env.REPLICATE_API_TOKEN;

    if (!replicateApiKey) {
      return NextResponse.json(
        { error: "Replicate API Key is required. Please configure it in Settings." },
        { status: 401 }
      );
    }

    // 5. CINEMATIC PROMPT EXPANSION
    const enhancedCinematicPrompt = `${rawPrompt.trim()} - Cinematic masterpiece, 8k resolution, photorealistic, dynamic camera movement, cinematic lighting, 35mm film grain.`;

    // 6. DEPENDENCY INVERSION: VIDEO GENERATOR FACTORY
    const generator = VideoGeneratorFactory.getGenerator(userPreference);
    console.log(`🎬 Submitting video generation via ${generator.name} (${userPreference}) for scene ${sceneId || sceneNumber}...`);

    const result = await generator.generate({
      prompt: enhancedCinematicPrompt,
      startFrameUrl: advancedInputs?.startFrameUrl || advancedInputs?.characterReferenceUrls?.[0],
      endFrameUrl: advancedInputs?.endFrameUrl,
      characterReferenceUrls: advancedInputs?.characterReferenceUrls,
      audioUrl: advancedInputs?.audioUrl,
      duration: 5,
      apiKey: replicateApiKey,
    });

    // 7. RECORD TASK WITH MULTI-TENANT ISOLATION
    const targetSceneId = sceneId || (sceneNumber ? `scene-${sceneNumber}` : "scene-1");
    const task = await VideoTaskService.createTask({
      userId,
      projectId,
      sceneId: targetSceneId,
      sceneNumber,
      idempotencyKey,
      replicatePredictionId: result.predictionId,
      originalPrompt: rawPrompt,
      enhancedPrompt: enhancedCinematicPrompt,
      providerName: result.model || generator.name,
    });

    // 8. UPDATE SCENE STATUS TO GENERATING
    await ProjectService.updateScene(userId, projectId, targetSceneId, {
      status: "generating",
    }).catch((err) => console.warn("Could not sync scene status to generating:", err));

    return NextResponse.json(
      {
        taskId: task._id,
        status: "queued",
        predictionId: result.predictionId,
        enhancedPrompt: enhancedCinematicPrompt,
      },
      { headers: getRateLimitHeaders(rateLimit) }
    );
  } catch (error: any) {
    console.error("🔥 Error submitting video generation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initiate video generation." },
      { status: 500 }
    );
  }
}