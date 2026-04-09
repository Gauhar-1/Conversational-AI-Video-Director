import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import dbConnect from "@/lib/db";
import { Project } from "@/models/Project";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    // 1. We now need the projectId and sceneNumber from the frontend to save it to the DB
    const { prompt, projectId, sceneNumber } = await req.json();

    if (!prompt || !projectId || sceneNumber === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();

    // 2. Generate Image from Hugging Face
    const hfResponse = await fetch(
      "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    if (!hfResponse.ok) {
      const errorText = await hfResponse.text();
      console.error("Hugging Face API Error:", errorText);
      return NextResponse.json({ error: "Failed to generate image" }, { status: hfResponse.status });
    }

    // 3. Convert response to a Node.js Buffer
    const arrayBuffer = await hfResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Upload Buffer directly to Cloudinary using a stream
    const cloudinaryUrl = await new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: `director_ai/${projectId}` }, // Organizes images by project!
        (error, result) => {
          if (error) reject(error);
          else resolve(result!.secure_url);
        }
      );
      uploadStream.end(buffer);
    });

    // 5. Save the Cloudinary URL to the specific scene in MongoDB
    await Project.findOneAndUpdate(
      { _id: projectId, "storyboard.scene_number": sceneNumber },
      { $set: { "storyboard.$.image_url": cloudinaryUrl } }, 
      { new: true }
    );

    // 6. Return the permanent Cloudinary URL to the frontend
    return NextResponse.json({ imageUrl: cloudinaryUrl });

  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}