import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import dbConnect from "@/lib/db";
import { Project } from "@/models/Project";

// 1. Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    // -----------------------------------------------------------------
    // 1. AUTHENTICATION (BYOK)
    // -----------------------------------------------------------------
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing SiliconFlow API Key in Settings." }, { status: 401 });
    }
    const userSfKey = authHeader.split("Bearer ")[1];

    const body = await req.json();

    // -----------------------------------------------------------------
    // CASE 1: CHECKING STATUS & SAVING TO DB (Polling)
    // -----------------------------------------------------------------
    if (body.requestId) {
      const { requestId, projectId, sceneNumber } = body;

      // FIX: Use .cn domain for SiliconFlow
      const statusRes = await fetch("https://api.siliconflow.cn/v1/video/status", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${userSfKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId }),
      });

      const statusData = await statusRes.json();
      
      if (statusData.status === "Succeed") {
        const temporaryUrl = statusData.results.videos[0].url;

        if (!temporaryUrl) {
           return NextResponse.json({ error: "Video completed but URL is missing from provider." }, { status: 500 });
        }

       let cloudinaryUrl = "";
        try {
          const uploadResult = await cloudinary.uploader.upload(temporaryUrl, {
            resource_type: "video",
            folder: `director_ai/${projectId}/videos`,
            public_id: `scene_${sceneNumber}_video`,
            overwrite: true
          });
          cloudinaryUrl = uploadResult.secure_url;
        } catch (cloudinaryError) {
          console.error("Cloudinary Upload Error:", cloudinaryError);
          return NextResponse.json({ error: "Video generated, but failed to save to cloud storage." }, { status: 500 });
        }

        // --- MONGODB UPDATE LOGIC ---
        await dbConnect();
        const numericSceneNumber = Number(sceneNumber);

        const updatedProject = await Project.findOneAndUpdate(
          { 
            _id: projectId, 
            "storyboard.scene_number": numericSceneNumber 
          },
          { $set: { "storyboard.$.video_url": cloudinaryUrl } },
          { new: true }
        );

        if (!updatedProject) {
          console.error(`🚨 Failed to update DB for project ${projectId}`);
          return NextResponse.json({ error: "DB update failed" }, { status: 500 });
        }

        console.log(`✅ Video saved for Scene ${numericSceneNumber}: ${cloudinaryUrl}`);
        return NextResponse.json({ status: "success", videoUrl: cloudinaryUrl });

      } else if (statusData.status === "FAILED") {
        return NextResponse.json({ 
          error: "Video generation failed on provider side", 
          details: statusData.reason || "Unknown provider error." 
        }, { status: 400 });
      } else {
        // Pending states: "IN_PROGRESS", "PENDING", etc.
        return NextResponse.json({ status: "pending" });
      }
    }

    // -----------------------------------------------------------------
    // CASE 2: SUBMITTING THE INTERPOLATION TASK
    // -----------------------------------------------------------------
    const { start_image, end_image, prompt, videoModel, projectId } = body;
    
    if (!start_image) return NextResponse.json({ error: "Start frame is required to animate." }, { status: 400 });

    // --- PROMPT ENGINEERING FOR CINEMATIC CONTINUITY ---
    await dbConnect();
    const project = await Project.findById(projectId);
    const globalStyle = project?.visualMetadata?.style || "cinematic";
    const globalLighting = project?.visualMetadata?.lighting || "dramatic lighting";

    // We build a highly restrictive prompt that forces the AI to focus on the *transition* // rather than inventing new elements.
    let enhancedPrompt = `
      Cinematic Sequence. ${globalStyle}, ${globalLighting}.
      Action: ${prompt}.
      Camera: Smooth cinematic motion, stable shot, no morphing, maintain subject consistency.
    `.replace(/\s+/g, " ").trim();

    // If an end_image is provided, we explicitly instruct the model to interpolate.
    if (end_image) {
      enhancedPrompt += " Smoothly transition the subject and camera to match the final keyframe exactly.";
    }

    console.log(`🎥 Submitting Video Task:`, enhancedPrompt);

    const payload: any = {
      model: "Wan-AI/Wan2.2-I2V-A14B", // Use Wan2.1 or Kling for best I2V results
      prompt: enhancedPrompt,
      image: start_image, 
    };

    // Attach the end keyframe if this is an interpolation shot
    if (end_image) {
      // Note: Check SiliconFlow documentation for the exact key. Usually it's 'image_end' or 'end_image' for Kling/Wan
      payload.image_end = end_image; 
    }

    const submitRes = await fetch("https://api.siliconflow.com/v1/video/submit", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${userSfKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      console.error("SiliconFlow Submit Error:", errText);

      // Granular Error Catching for UI
      if (submitRes.status === 401 || submitRes.status === 402 || submitRes.status === 403) {
         return NextResponse.json({ error: "SiliconFlow API Key invalid or out of credits. Check Settings." }, { status: submitRes.status });
      }
      if (submitRes.status === 429) {
         return NextResponse.json({ error: "Too many video requests. Please wait." }, { status: 429 });
      }
      
      // Attempt to parse safety filter blocks
      try {
         const parsedErr = JSON.parse(errText);
         if (parsedErr.message && parsedErr.message.toLowerCase().includes("sensitive")) {
            return NextResponse.json({ error: "Safety Filter Triggered: Please adjust the prompt to be PG-13." }, { status: 400 });
         }
      } catch(e) {}

      return NextResponse.json({ error: "Failed to start video generation" }, { status: submitRes.status });
    }

    const submitData = await submitRes.json();
    return NextResponse.json({ requestId: submitData.requestId });

  } catch (error: any) {
    console.error("🔥 Fatal Video Server Error:", error);
    return NextResponse.json({ error: "An unexpected internal server error occurred." }, { status: 500 });
  }
}