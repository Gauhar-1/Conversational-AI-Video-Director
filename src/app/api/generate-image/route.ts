import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import dbConnect from "@/lib/db";
import { Project } from "@/models/Project";

// Configure Cloudinary (Keep this server-side! You pay for storage, they pay for AI)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    // 1. EXTRACT THE USER'S HUGGING FACE KEY
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing Hugging Face API Key" }, { status: 401 });
    }
    const userHfKey = authHeader.split("Bearer ")[1];

    const { prompt, projectId, sceneNumber } = await req.json();

    if (!prompt || !projectId || sceneNumber === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();

    // 2. GENERATE IMAGE USING THE USER'S KEY
    const hfResponse = await fetch(
      "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
      {
        headers: {
          Authorization: `Bearer ${userHfKey}`, // INJECT USER KEY HERE
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    if (!hfResponse.ok) {
      const errorText = await hfResponse.text();
      console.error("Hugging Face API Error:", errorText);
      
      // Handle Quota/Auth errors specifically for better UX
      if (hfResponse.status === 401) {
        return NextResponse.json({ error: "Invalid Hugging Face API Key" }, { status: 401 });
      }
      if (hfResponse.status === 429) {
        return NextResponse.json({ error: "Hugging Face rate limit exceeded. Try again in an hour." }, { status: 429 });
      }
      
      return NextResponse.json({ error: "Failed to generate image from AI provider" }, { status: hfResponse.status });
    }

    // 3. Convert response to a Node.js Buffer
    const arrayBuffer = await hfResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Upload Buffer directly to Cloudinary using a stream
    const cloudinaryUrl = await new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: `director_ai/${projectId}` }, 
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