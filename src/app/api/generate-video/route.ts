import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import dbConnect from "@/lib/db";
import { Project } from "@/models/Project";

// 1. Configure Cloudinary with your environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // -----------------------------------------------------------------
    // CASE 1: CHECKING STATUS & SAVING TO DB (Polling)
    // -----------------------------------------------------------------
    if (body.requestId) {
      const { requestId, projectId, sceneNumber } = body;

      const statusRes = await fetch("https://api.siliconflow.com/v1/video/status", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.SILICONFLOW_API_KEY?.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId }),
      });

      const statusData = await statusRes.json();
      
      if (statusData.status === "Succeed") {
        const temporaryUrl = statusData.results.videos[0].url;

        // --- CLOUDINARY UPLOAD LOGIC ---
        // We use the temporary URL from SiliconFlow and move it to our Cloudinary
        const uploadResult = await cloudinary.uploader.upload(temporaryUrl, {
          resource_type: "video", // CRITICAL for .mp4 files
          folder: `director_ai/${projectId}/scenes`,
          public_id: `scene_${sceneNumber}`,
          overwrite: true
        });

        // --- MONGODB UPDATE LOGIC ---
        await dbConnect();
        const numericSceneNumber = Number(sceneNumber);

        const updatedProject = await Project.findOneAndUpdate(
          { 
            _id: projectId, 
            "storyboard.scene_number": numericSceneNumber 
          },
          { $set: { "storyboard.$.video_url": uploadResult.secure_url } },
          { new: true }
        );

        if (!updatedProject) {
          console.error(`🚨 Failed to update DB for project ${projectId}`);
          return NextResponse.json({ error: "DB update failed" }, { status: 500 });
        }

        console.log(`✅ Video saved for Scene ${numericSceneNumber}: ${uploadResult.secure_url}`);
        
        return NextResponse.json({ 
          status: "success", 
          videoUrl: uploadResult.secure_url 
        });

      } else if (["InProgress", "Pending", "InQueue"].includes(statusData.status)) {
        return NextResponse.json({ status: "pending" });
      } else {
        return NextResponse.json({ 
          error: "Generation failed", 
          details: statusData.reason || "Unknown error" 
        }, { status: 500 });
      }
    }

    // -----------------------------------------------------------------
    // CASE 2: SUBMITTING THE INITIAL TASK
    // -----------------------------------------------------------------
    const { image, prompt } = body;
    if (!image) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    const submitRes = await fetch("https://api.siliconflow.com/v1/video/submit", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.SILICONFLOW_API_KEY?.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "Wan-AI/Wan2.2-I2V-A14B", 
        prompt: prompt,
        image: image
      }),
    });

    const submitData = await submitRes.json();
    if (!submitRes.ok) throw new Error(submitData.message || "Submit failed");

    return NextResponse.json({ requestId: submitData.requestId });

  } catch (error: any) {
    console.error("Render Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}