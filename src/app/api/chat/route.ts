import { NextResponse } from "next/server";
import { ai } from "@/lib/ai";
import dbConnect from "@/lib/db"; // Assuming you have a standard mongoose connect file
import { Project } from "@/models/Project";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { projectId, content, imageBase64 } = await req.json();

    // Auto-create a project if this is the first message
    let project;
    if (!projectId) {
      project = await Project.create({ title: "New Video Project", chatHistory: [], visualMetadata: {} });
    } else {
      project = await Project.findById(projectId);
      if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Phase 1: Process Image (THE FIX)
    if (imageBase64) {
      try {
        const visionResponse = await ai.chat.completions.create({
          model: "moonshot/kimi-v1-vision", // Standard NVIDIA vision model
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Extract the visual metadata (lighting, vibe, colors, major subjects) from this image as a JSON object." },
                { type: "image_url", image_url: { url: imageBase64 } } // Correct multimodal format
              ],
            },
          ],
          max_tokens: 500,
          temperature: 0.1,
        });

        const rawMetadata = visionResponse.choices[0]?.message?.content || "{}";
        const cleanJsonStr = rawMetadata.replace(/```json\n/g, "").replace(/```/g, "").trim();
        const parsedMetadata = JSON.parse(cleanJsonStr);
        project.visualMetadata = { ...project.visualMetadata, ...parsedMetadata };
        project.markModified('visualMetadata'); 
        await project.save();
      } catch (err) {
        console.warn("Vision processing failed:", err);
      }
    }

    // Phase 2: Process Text & Storyboard Intent
    project.chatHistory.push({ role: "user", content: content || "I uploaded an image." });

    const messages: any[] = project.chatHistory.map((m) => ({ role: m.role, content: m.content }));
    const isStoryboardIntent = content && content.toLowerCase().includes("generate storyboard");

    let systemPrompt = `You are Director AI. You help users storyboard music videos. 
    
    Current visual metadata extracted from the user's uploaded image: ${JSON.stringify(project.visualMetadata)}. 
    
    CRITICAL INSTRUCTION: If the user mentions an uploaded image, picture, or photo, DO NOT say that you are a text-based AI or that you cannot see images. You must act as if you can see the image by heavily referencing the 'Current visual metadata' provided above. Use those exact details to reply.`;

    if (isStoryboardIntent) {
      systemPrompt += `\n\nCRITICAL: The user requested a storyboard. You MUST return ONLY valid JSON containing an array of scenes. Schema: [{"scene_number": 1, "timestamp": "0:00", "location": "", "action": "", "camera_movement": "", "generation_prompt": ""}]`;
    }

    messages.unshift({ role: "system", content: systemPrompt });

    const chatResponse = await ai.chat.completions.create({
      model: "meta/llama3-70b-instruct",
      messages: messages,
      temperature: isStoryboardIntent ? 0.1 : 0.7,
      max_tokens: 1500,
    });

    let aiMessageText = chatResponse.choices[0]?.message?.content || "I have no response.";
    
    // Parse strict JSON if requested
    // Parse strict JSON if requested
    if (isStoryboardIntent) {
       try {
         // 1. Log the raw output so we can see what the AI actually said in our terminal
         console.log("Raw AI Storyboard Output:", aiMessageText);

         // 2. Find the first '[' and the last ']' to extract the pure array
         const firstBracket = aiMessageText.indexOf('[');
         const lastBracket = aiMessageText.lastIndexOf(']');
         
         if (firstBracket !== -1 && lastBracket !== -1) {
            const jsonString = aiMessageText.substring(firstBracket, lastBracket + 1);
            
            // Scrub rogue newlines that break JSON.parse!
            const sanitizedJson = jsonString.replace(/\n/g, " ").replace(/\r/g, "");
            
            const storyboardData = JSON.parse(sanitizedJson);
            
            if (Array.isArray(storyboardData)) {
               project.storyboard = storyboardData;
               aiMessageText = "I have successfully generated your storyboard! You can view it on the canvas.";
            }
         } else {
            throw new Error("Could not find a valid JSON array brackets in the AI response.");
         }
       } catch (err) {
         console.error("Failed to parse storyboard JSON:", err);
         aiMessageText = "I tried to generate the storyboard, but an error occurred during formatting. Please check the terminal logs.";
       }
    }

    project.chatHistory.push({ role: "assistant", content: aiMessageText });
    await project.save();

    return NextResponse.json({
      message: { id: Date.now().toString(), role: "assistant", content: aiMessageText },
      projectId: project._id, // Return the ID so the frontend can save it
      storyboard: project.storyboard
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


