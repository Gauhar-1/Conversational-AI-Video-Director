import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import Replicate from "replicate";
import dbConnect from "@/lib/db";
import { Project } from "@/models/Project";

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

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found in database." }, { status: 404 });
    }

    const visualMeta = project.visualMetadata || {};
    const globalStyle = visualMeta.style || "highly detailed cinematic masterpiece";
    const globalLighting = visualMeta.lighting || "dramatic studio lighting";
    const globalColors = visualMeta.colors ? `Color grading: ${visualMeta.colors}` : "";

    const enhancedPrompt = `
      Empty environment design, establishing wide shot. 
      LOCATION: ${prompt}. 
      Style: ${globalStyle}. 
      Lighting: ${globalLighting}. 
      ${globalColors}. 
      No characters, no people, highly detailed landscape, architectural digest, cinematic matte painting, 8k resolution.
    `.replace(/\s+/g, " ").trim();

    console.log(`🏞️ Generating Background for Scene ${sceneNumber} via Replicate (FLUX)...`);

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
      throw new Error("Replicate returned an empty image output.");
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
              folder: `director_ai/${projectId}/backgrounds`,
              public_id: `scene_${sceneNumber}_bg`,
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

    // Database Synchronization
    const updatedProject = await Project.findOneAndUpdate(
      { _id: projectId, "storyboard.scene_number": sceneNumber },
      { 
        $set: { 
          "storyboard.$.background_url": finalImageUrl,
        } 
      }, 
      { returnDocument: 'after' } 
    );

    if (!updatedProject) {
      return NextResponse.json({ error: "Image generated, but failed to save to database." }, { status: 500 });
    }

    return NextResponse.json({ 
      status: "success",
      imageUrl: finalImageUrl 
    });

  } catch (error: any) {
    console.error("🔥 Error in Generate Background:", error);
    return NextResponse.json({ 
      error: error.message || "An unexpected error occurred during background generation." 
    }, { status: 500 });
  }
}