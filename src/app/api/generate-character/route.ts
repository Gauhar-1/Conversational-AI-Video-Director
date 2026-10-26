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

    const { prompt, charId, projectId, sceneNumber } = await req.json();

    if (!prompt || !charId || !projectId) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    await dbConnect();

    const enhancedPrompt = `
      Professional character concept sheet, studio portrait, neutral background. 
      Multiple angles of the same character: front view and 3/4 profile. 
      SUBJECT: ${prompt}. 
      High detail, sharp facial features, cinematic character lighting, photorealistic, 8k resolution.
    `.replace(/\s+/g, " ").trim();

    console.log(`👤 Generating Character Sheet for ${charId} via Replicate (FLUX)...`);

    const replicate = new Replicate({ auth: replicateApiKey });

    const output: any = await replicate.run("black-forest-labs/flux-schnell", {
      input: {
        prompt: enhancedPrompt,
        aspect_ratio: "1:1",
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
      throw new Error("Replicate returned an empty character image output.");
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
              folder: `director_ai/${projectId}/chars`,
              public_id: `scene_${sceneNumber}_${charId}`,
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

    // Update MongoDB character slot
    const updatedProject = await Project.findOneAndUpdate(
      { _id: projectId, "storyboard.scene_number": sceneNumber },
      { $set: { "storyboard.$.characters.$[char].generated_url": finalImageUrl } },
      { arrayFilters: [{ "char._id": charId }], returnDocument: 'after' } 
    );

    if (!updatedProject) {
      return NextResponse.json({ error: "Failed to link character image to project record." }, { status: 500 });
    }

    return NextResponse.json({ imageUrl: finalImageUrl });

  } catch (error: any) {
    console.error("🔥 Error in Generate Character:", error);
    return NextResponse.json({ error: error.message || "Failed to generate character." }, { status: 500 });
  }
}