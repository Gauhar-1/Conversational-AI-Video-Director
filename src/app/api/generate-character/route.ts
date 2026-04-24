import { NextResponse } from "next/server";
import { Project } from "@/models/Project";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";
import dbConnect from "@/lib/db";

// --- HELPER: TIER 1 (NANO BANANA 2 / GEMINI 3.1 FLASH IMAGE) ---
async function fetchFromNanoBanana(prompt: string, googleApiKey: string): Promise<Buffer> {
  // Upgraded to the new Gemini 3.1 Flash Image unified endpoint
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${googleApiKey}`;
  
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Nano Banana HTTP ${response.status}`);
  }

  const data = await response.json();
  
  // Extract the base64 image from the new generateContent response structure
  const base64Data = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  
  if (!base64Data) throw new Error("Nano Banana 2 returned an empty or invalid image response.");
  
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
    await dbConnect();

    const googleApiKey = req.headers.get("X-Google-API-Key");
    const hfKey = req.headers.get("X-HF-API-Key");
    
    if (!googleApiKey && !hfKey) {
      return NextResponse.json({ error: "Missing API Keys. Please update settings." }, { status: 401 });
    }

    const { prompt, charId, projectId, sceneNumber } = await req.json();

    if (!prompt || !charId || !projectId) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const enhancedPrompt = `
      Professional 2D character model sheet, white background. 
      Multiple views of the same character: Front, side profile, and back view. 
      Bottom row showing various facial expressions (neutral, happy, angry, sad). 
      SUBJECT: ${prompt}. 
      High detail, sharp lines, cinematic lighting, masterpiece.
    `.replace(/\s+/g, " ").trim();

    console.log(`👤 Generating Appearance Board for Character ${charId}...`);

    let finalImageBuffer: Buffer | null = null;
    let lastError = "";

    // --- TIER 1: NANO BANANA (Gemini 3 Flash Image) ---
    try {
      console.log(`🚀 TIER 1: Attempting Nano Banana (Gemini API)...`);
      // Note: Assuming the userApiKey passed from the frontend is a Google API key right now.
      // If you separate keys in your settings, adjust the variable here.
      finalImageBuffer = await fetchFromNanoBanana(enhancedPrompt, googleApiKey || '');
      console.log(`✅ Success with Nano Banana!`);
    } catch (nanoError: any) {
      console.warn(`⚠️ Nano Banana Failed: ${nanoError.message}. Falling back to Tier 2...`);
      lastError = nanoError.message;

      // --- TIER 2: HUGGING FACE BYOK LOOP ---
      const fallbackChain = [
        { model: "black-forest-labs/FLUX.1-schnell", params: { num_inference_steps: 4, guidance_scale: 4.5 } },
        { model: "stabilityai/sdxl-turbo", params: { num_inference_steps: 4, guidance_scale: 0.0 } },
        { model: "runwayml/stable-diffusion-v1-5", params: { num_inference_steps: 25, guidance_scale: 7.5 } }
      ];

      for (const config of fallbackChain) {
        try {
          console.log(`➡️ TIER 2: Attempting HF model: ${config.model}...`);
          // Using the same key here for demonstration. In production, ensure you pass the correct HF key from settings.
          finalImageBuffer = await fetchFromHuggingFace(config.model, { inputs: enhancedPrompt, parameters: config.params }, hfKey || '');
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
        const failsafePrompt = `${enhancedPrompt}, masterpiece, highly detailed, sharp focus, 8k resolution`;
        const safePrompt = encodeURIComponent(failsafePrompt);
        const seed = Math.floor(Math.random() * 1000000); 
        
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;

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

    // 5. Stream Binary Blob to Cloudinary
    const cdnUrl = await uploadBufferToCloudinary(
      finalImageBuffer, 
      `director_ai/${projectId}/chars`, 
      `scene_${sceneNumber}_${charId}`
    );

   // 6. Update MongoDB
    const updatedProject = await Project.findOneAndUpdate(
      { _id: projectId, "storyboard.scene_number": sceneNumber },
      { $set: { "storyboard.$.characters.$[char].generated_url": cdnUrl } },
      // Make sure this says `returnDocument: 'after'` and NOT `new: true`
      { arrayFilters: [{ "char._id": charId }], returnDocument: 'after' } 
    );

    if (!updatedProject) {
      throw new Error("Failed to link generated image to database record.");
    }

    return NextResponse.json({ imageUrl: cdnUrl });

  } catch (error: any) {
    console.error("🔥 Character Gen Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}