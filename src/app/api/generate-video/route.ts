// src/app/api/video/generate/route.ts
import { NextResponse } from "next/server";
import Replicate from "replicate";
import dbConnect from "@/lib/db";
import { VideoTask } from "@/models/VideoTask";
import { videoQueue } from "@/lib/queue/videoQueue";

export async function POST(req: Request) {
  try {
    await dbConnect();
    
    // 1. Extract raw inputs and the Replicate API Key
    const { 
      rawPrompt, 
      projectId, 
      sceneNumber, 
      advancedInputs, 
      userPreference  
    } = await req.json();

    const replicateApiKey = req.headers.get("X-Replicate-Key");

    if (!advancedInputs?.startFrameUrl && !advancedInputs?.characterReferenceUrls) {
      return NextResponse.json({ error: "At least one visual reference is required." }, { status: 400 });
    }

    if (!replicateApiKey) {
      return NextResponse.json({ error: "Replicate API key is required." }, { status: 401 });
    }

    // 2. Initialize Replicate specifically for the Agentic Rewriter
    const replicate = new Replicate({ auth: replicateApiKey });

    // 3. THE AGENTIC REWRITER (Powered by Llama 3 on Replicate)
    // 3. THE AGENTIC REWRITER (Powered by Llama 3 on Replicate)
    let enhancedCinematicPrompt = rawPrompt;

    try {
      console.log(`✍️ [Scene ${sceneNumber}] Enhancing prompt via Replicate (Llama 3)...`);
      
      const systemPrompt = `You are the Master Cinematographer for Director AI, an elite video generation engine.
Take the user's basic scene idea and elevate it into a vivid, award-winning cinematic blueprint.
Structure output as a single descriptive paragraph.
Define Subject & Action, Camera Geometry, Lighting, and Lens & Depth.
Do NOT use narrative prose (e.g., "he feels sad"). Describe the physical manifestation.
Always append this exact text at the end: "Cinematic masterpiece, award-winning direction, production-grade, 8k resolution, photorealistic, hyper-detailed textures."`;

      const output = await replicate.run(
        "meta/meta-llama-3-70b-instruct",
        {
          input: {
            prompt: rawPrompt,
            system_prompt: systemPrompt,
            max_tokens: 512,
            temperature: 0.7,
          }
        }
      );

      if (Array.isArray(output)) {
        enhancedCinematicPrompt = output.join("").trim();
        console.log(`✅ [Scene ${sceneNumber}] Enhanced Prompt generated.`);
      }

    } catch (llmError) {
      console.warn("⚠️ Text Enhancement failed. Falling back to Director's Coverage Template.");
      
      // GRACEFUL DEGRADATION: The Hardcoded Director's Fail-Safe
      // This forces the video model to generate editing coverage based on whatever location/characters are in the raw prompt.
      enhancedCinematicPrompt = `A continuous, multi-angle cinematic coverage sequence of the following scene: "${rawPrompt}". 
The camera acts as a master cinematographer gathering coverage for post-production editing. It dynamically shifts perspectives, starting with a wide establishing shot of the location to show the environment, then smoothly transitioning into over-the-shoulder (OTS) tracking shots of the characters having a conversation, and finally moving into tight, emotive close-ups of their facial expressions. 
Cinematic masterpiece, award-winning direction, production-grade, 8k resolution, photorealistic, dramatic lighting, hyper-detailed textures.`;
    }

    // 4. DATABASE: Create the tracking document
    const task = await VideoTask.create({
      projectId,
      sceneNumber,
      status: "pending",
      originalPrompt: rawPrompt,
      enhancedPrompt: enhancedCinematicPrompt,
      logs: [] 
    });

    // 5. QUEUE: Push the heavy generation job to the background worker
    await videoQueue.add("generate-video", {
      taskId: task._id,
      prompt: enhancedCinematicPrompt,
      advancedInputs,
      userPreference,
      keys: {
        replicate: replicateApiKey // Pass the key to the background worker
      }
    });

    // 6. RESPOND INSTANTLY
    return NextResponse.json({ 
      taskId: task._id, 
      status: "queued", 
      enhancedPrompt: enhancedCinematicPrompt 
    });

  } catch (error: any) {
    console.error("🔥 Fatal Error in Video Submission Pipeline:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}