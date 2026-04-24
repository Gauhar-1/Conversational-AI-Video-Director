import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import dbConnect from "@/lib/db";
import { Project } from "@/models/Project";

// Configure Cloudinary (Server-side only)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- HELPER: TIER 1 (NANO BANANA 2 / GEMINI 3.1 FLASH IMAGE) ---
async function fetchFromNanoBanana(prompt: string, googleApiKey: string): Promise<Buffer> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${googleApiKey}`;
  
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Nano Banana HTTP ${response.status}`);
  }

  const data = await response.json();
  const base64Data = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Data) throw new Error("Nano Banana returned an empty image response.");
  
  return Buffer.from(base64Data, "base64");
}

// --- HELPER: TIER 2 (HUGGING FACE) ---
async function fetchFromHuggingFace(modelId: string, payload: any, hfKey: string): Promise<Buffer> {
  const response = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${hfKey}`, 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status} from ${modelId}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(req: Request) {
  try {
    // 1. BYOK Authentication (Extracting BOTH Keys)
    const googleApiKey = req.headers.get("X-Google-API-Key");
    const hfKey = req.headers.get("X-HF-API-Key");
    
    if (!googleApiKey && !hfKey) {
      return NextResponse.json({ error: "Missing API Keys. Please update settings." }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, projectId, sceneNumber } = body;

    if (!prompt || !projectId || sceneNumber === undefined) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    await dbConnect();

    // 2. FETCH GLOBAL CONTEXT & ENHANCE PROMPT
    const project = await Project.findById(projectId);
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
      Shot on ARRI Alexa 65, 35mm lens, 8k resolution, photorealistic, film grain, cinematic depth of field.
    `.replace(/\s+/g, " ").trim();

    console.log(`🎬 Generating Frame for Scene ${sceneNumber}...`);

    let finalImageBuffer: Buffer | null = null;
    let lastError = "";

    // --- TIER 1: NANO BANANA (Gemini) ---
    try {
      console.log(`🚀 TIER 1: Attempting Nano Banana (Gemini API)...`);
      finalImageBuffer = await fetchFromNanoBanana(enhancedPrompt, googleApiKey || "");
      console.log(`✅ Success with Nano Banana!`);
    } catch (nanoError: any) {
      console.warn(`⚠️ Nano Banana Failed: ${nanoError.message}. Falling back to Tier 2...`);
      lastError = nanoError.message;

      // --- TIER 2: HUGGING FACE BYOK LOOP ---
      const fallbackChain = [
        { model: "black-forest-labs/FLUX.1-schnell", params: { num_inference_steps: 4, guidance_scale: 7.5 } },
        { model: "stabilityai/sdxl-turbo", params: { num_inference_steps: 4, guidance_scale: 0.0 } },
        { model: "runwayml/stable-diffusion-v1-5", params: { num_inference_steps: 25, guidance_scale: 7.5 } }
      ];

      for (const config of fallbackChain) {
        try {
          console.log(`➡️ TIER 2: Attempting HF model: ${config.model}...`);
          finalImageBuffer = await fetchFromHuggingFace(config.model, { inputs: enhancedPrompt, parameters: config.params }, hfKey || "");
          console.log(`✅ Success with HF: ${config.model}`);
          break; 
        } catch (hfError: any) {
          console.warn(`⚠️ Failed ${config.model}: ${hfError.message}`);
          lastError = hfError.message;
        }
      }
    }

    // --- TIER 3: THE NUCLEAR FAILSAFE (Pollinations.ai) ---
    if (!finalImageBuffer) {
      console.log(`🚨 Tiers 1 & 2 Overloaded. Triggering Pollinations Failsafe...`);
      try {
        const safePrompt = encodeURIComponent(enhancedPrompt);
        const seed = Math.floor(Math.random() * 1000000); 
        
        // Use landscape 16:9 ratio for frames (1280x720) instead of square
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=1280&height=720&nologo=true&seed=${seed}&model=flux`;

        const pollResponse = await fetch(pollinationsUrl);
        if (!pollResponse.ok) throw new Error(`Pollinations HTTP ${pollResponse.status}`);
        
        const arrayBuffer = await pollResponse.arrayBuffer();
        finalImageBuffer = Buffer.from(arrayBuffer);
        console.log(`✅ Success with Pollinations FLUX Failsafe!`);
      } catch (pollError: any) {
         throw new Error(`Total generator failure. Last Error: ${lastError}. Failsafe Error: ${pollError.message}`);
      }
    }
    // -------------------------------------------------------

    // 4. CLOUDINARY UPLOAD PIPELINE
    const cloudinaryUrl = await new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder: `director_ai/${projectId}/frames`,
          public_id: `scene_${sceneNumber}_frame`,
          overwrite: true
        }, 
        (error, result) => {
          if (error) {
            console.error("Cloudinary Upload Error:", error);
            reject(new Error("Failed to save image to cloud storage."));
          } else {
            resolve(result!.secure_url);
          }
        }
      );
      uploadStream.end(finalImageBuffer);
    });

    // 5. DATABASE SYNCHRONIZATION
    const updatedProject = await Project.findOneAndUpdate(
      { _id: projectId, "storyboard.scene_number": sceneNumber },
      { 
        $set: { 
          "storyboard.$.frame_url": cloudinaryUrl,
        } 
      }, 
      // CRITICAL FIX: Replaced `new: true` with `returnDocument: 'after'`
      { returnDocument: 'after' } 
    );

    if (!updatedProject) {
      console.error(`🚨 Failed to update DB for project ${projectId}, scene ${sceneNumber}`);
      return NextResponse.json({ error: "Image generated, but failed to save to database." }, { status: 500 });
    }

    return NextResponse.json({ 
      status: "success",
      imageUrl: cloudinaryUrl 
    });

  } catch (error: any) {
    console.error("🔥 Fatal Server Error in Generate Frame:", error);
    return NextResponse.json({ 
      error: error.message || "An unexpected internal server error occurred." 
    }, { status: 500 });
  }
}