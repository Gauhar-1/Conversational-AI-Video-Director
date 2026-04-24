import { NextResponse } from "next/server";
import { Project } from "@/models/Project";
import dbConnect from "@/lib/db";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const hfKey = req.headers.get("Authorization")?.split(" ")[1];
    if (!hfKey) return NextResponse.json({ error: "Missing HF Key" }, { status: 401 });

    const { prompt, projectId, sceneNumber } = await req.json();

    const hfResponse = await fetch("https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev", {
      method: "POST",
      headers: { "Authorization": `Bearer ${hfKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: prompt }),
    });

    if (!hfResponse.ok) throw new Error("Hugging Face API Error: " + hfResponse.statusText);

    const buffer = Buffer.from(await hfResponse.arrayBuffer());
    const cdnUrl = await uploadBufferToCloudinary(buffer, `director_ai/${projectId}/frames`, `scene_${sceneNumber}_start`);

    // Update MongoDB Frame Field
    await Project.updateOne(
      { _id: projectId, "storyboard.scene_number": sceneNumber },
      { $set: { "storyboard.$.frame_url": cdnUrl } }
    );

    return NextResponse.json({ imageUrl: cdnUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}