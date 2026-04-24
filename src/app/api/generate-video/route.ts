import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { Project } from "@/models/Project";
import dbConnect from "@/lib/db";

// Configure Cloudinary for the fallback upload
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    await dbConnect();
    
    // 1. Get ALL Keys and Preferences from headers
    const seedanceKey = req.headers.get("X-Seedance-API-Key");
    const hfKey = req.headers.get("X-HF-API-Key");
    const hfVideoModel = req.headers.get("X-Video-Model") || "stabilityai/stable-video-diffusion-img2vid-xt";

    const { prompt, projectId, sceneNumber, startFrameUrl } = await req.json();

    if (!startFrameUrl) {
      return NextResponse.json({ error: "Start Frame is required for I2V." }, { status: 400 });
    }

    let lastError = "";
    let finalVideoUrl = null;

    // ==========================================
    // TIER 1: SEEDANCE (Asynchronous - Premium)
    // ==========================================
    if (seedanceKey) {
      try {
        console.log(`🎥 [TIER 1] Initiating Seedance Render for Scene ${sceneNumber}...`);
        
        const payload = {
          input: {
            image: startFrameUrl,
            prompt: `${prompt}. Cinematic motion, high quality, realistic.`,
            resolution: "720p",
            length: 5,
            aspectRatio: "16:9",
            cameraFixed: false,
            generateAudio: true 
          }
        };

        const response = await fetch("https://pollo.ai/api/platform/generation/bytedance/seedance-1-5-pro", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": seedanceKey },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.taskId) {
          await Project.findOneAndUpdate(
            { _id: projectId, "storyboard.scene_number": sceneNumber },
            { $set: { "storyboard.$.video_task_id": data.taskId } }
          );
          return NextResponse.json({ taskId: data.taskId, status: "waiting", provider: "seedance" });
        } else {
          throw new Error(data.error || `HTTP ${response.status}`);
        }
      } catch (seedanceError: any) {
        console.warn(`⚠️ Seedance Failed (${seedanceError.message}). Falling back to Tier 2...`);
        lastError = seedanceError.message;
      }
    }

    // ==========================================
    // TIER 2: HUGGING FACE LOOP (Synchronous - Free Tier)
    // ==========================================
    if (hfKey && !finalVideoUrl) {
      const fallbackChain = [
        hfVideoModel, // Try user's preferred model first
        "ali-vilab/i2vgen-xl" // Lighter model, sometimes available on free tier
      ];

      for (const model of fallbackChain) {
        try {
          console.log(`🚀 [TIER 2] Attempting Hugging Face Video: ${model}...`);

          const imageRes = await fetch(startFrameUrl);
          const imageBuffer = await imageRes.arrayBuffer();

          const hfResponse = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${hfKey}` },
            body: Buffer.from(imageBuffer)
          });

          if (!hfResponse.ok) {
            const hfErrorData = await hfResponse.json().catch(() => ({}));
            throw new Error(`HF Error (${model}): ${hfErrorData.error || hfResponse.statusText}`);
          }

          const videoArrayBuffer = await hfResponse.arrayBuffer();
          const videoBuffer = Buffer.from(videoArrayBuffer);

          finalVideoUrl = await new Promise<string>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { resource_type: "video", folder: `director_ai/${projectId}/videos`, public_id: `scene_${sceneNumber}_video`, overwrite: true }, 
              (error, result) => {
                if (error) reject(error);
                else resolve(result!.secure_url);
              }
            );
            uploadStream.end(videoBuffer);
          });

          console.log(`✅ Success with HF Model: ${model}`);
          break; // Break the loop if successful

        } catch (hfError: any) {
          console.warn(`⚠️ Failed ${model}: ${hfError.message}`);
          lastError = hfError.message;
        }
      }
    }

    // ==========================================
    // TIER 3: THE CLOUDINARY "KEN BURNS" FAILSAFE
    // ==========================================
    if (!finalVideoUrl) {
      console.log(`🚨 Tiers 1 & 2 Overloaded. Triggering Cloudinary Ken Burns Failsafe...`);
      
      // If the URL is already a Cloudinary image, we rewrite it into a Zoom/Pan MP4
      if (startFrameUrl.includes('cloudinary.com') && startFrameUrl.includes('/image/upload/')) {
        finalVideoUrl = startFrameUrl
          // Inject the cinematic zoom-pan transformation
          .replace('/upload/', '/upload/e_zoompan/')
          // Change the file extension from image to video
          .replace(/\.(png|jpg|jpeg|webp)$/i, '.mp4');
          
        console.log(`✅ Failsafe Synthesized: ${finalVideoUrl}`);
      } else {
         return NextResponse.json({ error: `Total generator failure. Providers down, and Start Frame is not hosted on Cloudinary.` }, { status: 500 });
      }
    }

    // ==========================================
    // SAVE FINAL STATE
    // ==========================================
    await Project.findOneAndUpdate(
      { _id: projectId, "storyboard.scene_number": sceneNumber },
      { $set: { "storyboard.$.video_url": finalVideoUrl } },
      { returnDocument: 'after' }
    );
    
    return NextResponse.json({ videoUrl: finalVideoUrl, status: "completed", provider: "fallback" });

  } catch (error: any) {
    console.error("🔥 Fatal Error in Video Pipeline:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}