import { NextResponse } from "next/server";
import Replicate from "replicate";
import dbConnect from "@/lib/db";
import { VideoTask } from "@/models/VideoTask";

// Map user preference to official Replicate model and input payload
function resolveReplicateConfig(userPreference: string, prompt: string, advancedInputs: any) {
  const startImage = advancedInputs?.startFrameUrl || advancedInputs?.characterReferenceUrls?.[0];
  const audioUrl = advancedInputs?.audioUrl;

  const normalized = (userPreference || "").toLowerCase();

  if (normalized.includes("wan")) {
    return {
      model: "wan-video/wan-2.5-i2v",
      input: {
        prompt,
        image: startImage,
        ...(audioUrl ? { audio: audioUrl } : {}),
        duration: 5,
        resolution: "720p",
      },
    };
  }

  if (normalized.includes("minimax") || normalized.includes("hailuo")) {
    return {
      model: "minimax/video-01",
      input: {
        prompt,
        ...(startImage ? { first_frame_image: startImage } : {}),
      },
    };
  }

  if (normalized.includes("luma")) {
    return {
      model: "luma/ray",
      input: {
        prompt,
        ...(startImage ? { start_image: startImage } : {}),
      },
    };
  }

  // Default high-performance cinematic model: Kling 2.5 Turbo Pro
  return {
    model: "kwaivgi/kling-v2.5-turbo-pro",
    input: {
      prompt,
      ...(startImage ? { start_image: startImage } : {}),
      ...(advancedInputs?.endFrameUrl ? { end_image: advancedInputs.endFrameUrl } : {}),
      duration: 5,
      aspect_ratio: "16:9",
    },
  };
}

export async function POST(req: Request) {
  try {
    await dbConnect();

    const { 
      rawPrompt, 
      projectId, 
      sceneNumber, 
      advancedInputs, 
      userPreference 
    } = await req.json();

    const replicateApiKey = req.headers.get("X-Replicate-Key") || process.env.REPLICATE_API_KEY || process.env.REPLICATE_API_TOKEN;

    if (!replicateApiKey) {
      return NextResponse.json(
        { error: "Replicate API Key is required. Please add it in Settings." }, 
        { status: 401 }
      );
    }

    if (!rawPrompt) {
      return NextResponse.json({ error: "Scene prompt is required." }, { status: 400 });
    }

    const replicate = new Replicate({ auth: replicateApiKey });

    // Cinematic prompt enrichment
    const enhancedCinematicPrompt = `${rawPrompt.trim()} - Cinematic masterpiece, 8k resolution, photorealistic, dynamic camera movement, cinematic lighting, 35mm film grain.`;

    // Resolve Replicate model & parameters
    const { model, input } = resolveReplicateConfig(userPreference, enhancedCinematicPrompt, advancedInputs);

    console.log(`🎬 Submitting Replicate prediction for Scene ${sceneNumber} using model ${model}...`);

    // Create asynchronous prediction directly on Replicate
    const prediction = await replicate.predictions.create({
      model: model as `${string}/${string}`,
      input,
    });

    // Create VideoTask document in MongoDB for UI status tracking & polling
    const task = await VideoTask.create({
      projectId,
      sceneNumber,
      status: "processing",
      replicatePredictionId: prediction.id,
      originalPrompt: rawPrompt,
      enhancedPrompt: enhancedCinematicPrompt,
      logs: [
        {
          providerName: model,
          attemptNumber: 1,
          timestamp: new Date(),
        },
      ],
    });

    return NextResponse.json({
      taskId: task._id,
      status: "queued",
      predictionId: prediction.id,
      enhancedPrompt: enhancedCinematicPrompt,
    });

  } catch (error: any) {
    console.error("🔥 Error submitting video to Replicate:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initiate video generation." }, 
      { status: 500 }
    );
  }
}