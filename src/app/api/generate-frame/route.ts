import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import Replicate from "replicate";
import dbConnect from "@/lib/db";
import { Project } from "@/models/Project";
import { getAuthUser } from "@/lib/auth/getAuthUser";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const replicateApiKey = req.headers.get("X-Replicate-Key") || process.env.REPLICATE_API_KEY || process.env.REPLICATE_API_TOKEN;

    if (!replicateApiKey) {
      return NextResponse.json(
        { error: "Replicate API Key is required. Please configure it in Settings." }, 
        { status: 401 }
      );
    }

    const body = await req.json();
    const { prompt, projectId, sceneNumber } = body;

    if (!prompt || !projectId || sceneNumber === undefined) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    await dbConnect();
    const { userId, isAuthenticated } = await getAuthUser(req);
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: "Unauthorized: Valid access token required." }, { status: 401 });
    }

    const project = await Project.findOne({ _id: projectId, userId });
    if (!project) {
      return NextResponse.json({ error: "Project not found in database." }, { status: 404 });
    }

    const visualMeta = project.visualMetadata || {};
    const globalStyle = visualMeta.style || "highly detailed cinematic masterpiece";
    const globalLighting = visualMeta.lighting || "dramatic studio lighting";
    const globalColors = visualMeta.colors ? `Color grading: ${visualMeta.colors}` : "";

    const enhancedPrompt = `
      ${prompt}. 
      Style: ${globalStyle}. 
      Lighting: ${globalLighting}. 
      ${globalColors}. 
      Shot on ARRI Alexa 65, 35mm lens, 8k resolution, photorealistic, film grain, cinematic depth of field, wide screen composition.
    `.replace(/\s+/g, " ").trim();

    console.log(`🎬 Generating Keyframe for Scene ${sceneNumber} via Replicate (FLUX)...`);

    const replicate = new Replicate({ auth: replicateApiKey });

    const output: any = await replicate.run("black-forest-labs/flux-schnell", {
      input: {
        prompt: enhancedPrompt,
        aspect_ratio: "16:9",
        output_format: "webp",
        num_outputs: 1,
      },
    });

    let directUrl = "";
    if (Array.isArray(output) && output.length > 0) {
      directUrl = typeof output[0] === "string" ? output[0] : (output[0]?.url ? output[0].url() : String(output[0]));
    } else if (typeof output === "string") {
      directUrl = output;
    }

    if (!directUrl) {
      throw new Error("Replicate returned an empty frame image output.");
    }

    let finalImageUrl = directUrl;

    // Optional Cloudinary Upload for permanent CDN caching
    try {
      const imgRes = await fetch(directUrl);
      if (imgRes.ok) {
        const imageBuffer = Buffer.from(await imgRes.arrayBuffer());
        finalImageUrl = await new Promise<string>((resolve) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { 
              folder: `director_ai/${projectId}/frames`,
              public_id: `scene_${sceneNumber}_frame`,
              overwrite: true
            }, 
            (error, result) => {
              if (error || !result?.secure_url) {
                console.warn("Cloudinary upload failed, using Replicate URL:", error?.message);
                resolve(directUrl);
              } else {
                resolve(result.secure_url);
              }
            }
          );
          uploadStream.end(imageBuffer);
        });
      }
    } catch (cdnErr: any) {
      console.warn("CDN sync skipped:", cdnErr.message);
    }

    // Always update scenes firstFrameUrl
    await Project.updateOne(
      { _id: projectId, userId, "scenes.order": sceneNumber },
      { $set: { "scenes.$.firstFrameUrl": finalImageUrl } }
    ).catch(() => {});

    // Also update in storyboard if available
    await Project.updateOne(
      { _id: projectId, userId, "storyboard.scene_number": sceneNumber },
      { $set: { "storyboard.$.frame_url": finalImageUrl } }
    ).catch(() => {});

    return NextResponse.json({ 
      status: "success",
      imageUrl: finalImageUrl 
    });

  } catch (error: any) {
    console.error("🔥 Error in Generate Frame:", error);
    return NextResponse.json({ 
      error: error.message || "An unexpected internal server error occurred." 
    }, { status: 500 });
  }
}