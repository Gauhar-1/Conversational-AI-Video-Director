import { NextResponse } from "next/server";
import { ai } from "@/lib/ai";
import dbConnect from "@/lib/db"; 
import { Project } from "@/models/Project";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {

    // 1. BYOK INTERCEPTION
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing API Key" }, { status: 401 });
    }
    const userApiKey = authHeader.split("Bearer ")[1];

    // DYNAMICALLY INSTANTIATE THE CLIENT
    const nvidiaClient = new OpenAI({
      apiKey: userApiKey,
      baseURL: "https://integrate.api.nvidia.com/v1", // Using NVIDIA NIM endpoint
    });

    await dbConnect();
   const { projectId, content, imageBase64, chatModel } = await req.json();
   const activeChatModel = chatModel || "meta/llama-3.1-70b-instruct";

    // 1. Auto-create or fetch project
    let project;
    if (!projectId) {
      project = await Project.create({ title: "New Video Project", chatHistory: [], visualMetadata: {} });
    } else {
      project = await Project.findById(projectId);
      if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 2. Phase 1: Process Image 
    if (imageBase64) {
      try {
        const visionResponse = await nvidiaClient.chat.completions.create({
          model: "meta/llama-3.2-90b-vision-instruct", 
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Extract the visual metadata (lighting, vibe, colors, major subjects) from this image as a JSON object." },
                { type: "image_url", image_url: { url: imageBase64 } } 
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

    // 3. Update History
    project.chatHistory.push({ role: "user", content: content || "I uploaded an image.", timestamp: Date.now().toString()});

    // 4. The Optimized Sliding Window Context Engine
    const validHistory = project.chatHistory.filter((m: any) => 
      !m.content.includes("I tried to generate the storyboard, but an error occurred") &&
      !m.content.includes("I have no response.")
    );

    const CONTEXT_WINDOW_SIZE = 6;
    const recentHistory = validHistory.slice(-CONTEXT_WINDOW_SIZE);
    const messages: any[] = recentHistory.map((m: any) => ({ role: m.role, content: m.content }));

    // ==========================================
    // 5. DETERMINISTIC STATE ROUTING (THE MAGIC)
    // ==========================================
    
    // Grab the user's message and the previous AI message to figure out what step we are on
    const userMsg = content ? content.toLowerCase() : "";
    const historyLen = project.chatHistory.length;
    const lastAiMsg = historyLen >= 2 ? project.chatHistory[historyLen - 2].content.toLowerCase() : "";
    
    // Are they explicitly clicking the "Generate" button?
    const isStoryboardIntent = userMsg.includes("generate storyboard") || userMsg.includes("generate the final storyboard");

    // Base Persona (Pinned State)
    let systemPrompt = `You are Director AI, an avant-garde, visionary music video director. Think like Christopher Nolan, Quentin Tarantino, and A24 Films. Be bold.
    CRITICAL SAFETY RULE: You must ensure all scene descriptions and actions are strictly PG-13. Keep the cinematic action intense but safe.`;

    if (Object.keys(project.visualMetadata).length > 0) {
        systemPrompt += `\n\nVISUAL METADATA (from user's image): ${JSON.stringify(project.visualMetadata)}. Always reference these specific colors/lighting in your scene descriptions.`;
    }

    // Dynamic Step Injector (Replaces the massive 5-step manual)
    if (isStoryboardIntent) {
      // STEP 5: FINAL JSON GENERATION
      systemPrompt += `\n\nCRITICAL DIRECTIVE: The user requested the final storyboard. You MUST return ONLY valid JSON containing an array of scenes. Schema: [{"scene_number": 1, "timestamp": "0:00", "location": "", "action": "", "camera_movement": "", "generation_prompt": ""}]`;
    
    } else if (imageBase64) {
      // STEP 4: IMAGE RECEIVED
      systemPrompt += `\n\nCRITICAL DIRECTIVE: The user just uploaded an image reference. Acknowledge the vibe/colors from the VISUAL METADATA. Then, ask EXACTLY: "Are you ready for me to generate the final Storyboard Canvas?"`;
    
    } else if (lastAiMsg.includes("satisfactory") || lastAiMsg.includes("adjustments")) {
      // STEP 3.5: CHECKING APPROVAL
      if (userMsg.includes("yes") || userMsg.includes("proceed") || userMsg.includes("perfect")) {
          systemPrompt += `\n\nCRITICAL DIRECTIVE: The user approved the script. Now, ask them to upload an image reference so you can match the color grading, lighting, and vibe.`;
      } else {
          systemPrompt += `\n\nCRITICAL DIRECTIVE: The user wants to adjust the script. Make the changes based on their feedback, and ask again: "Is this updated script satisfactory?"`;
      }
    
    } else if (lastAiMsg.includes("video length") || lastAiMsg.includes("how long")) {
      // STEP 3: SLICE & DICE SCRIPTING
      systemPrompt += `\n\nCRITICAL DIRECTIVE: The user has provided the video length. Now, slice their story into exact 5-second increments. Write out the continuity script (e.g., "0:00-0:05: [Action]"). End your message by asking EXACTLY: "Is this continuity script satisfactory?"`;
    
    } else {
      // STEP 1 & 2: BRAINSTORMING
      systemPrompt += `\n\nCRITICAL DIRECTIVE: Discuss the story concept. Ask clarifying questions to make it more cinematic. Once the core story feels established, end your message by asking EXACTLY: "Is this story finalized? If yes, what should be the total video length?"`;
    }

    messages.unshift({ role: "system", content: systemPrompt });

    // 6. Call the AI
    const chatResponse = await nvidiaClient.chat.completions.create({
      model: activeChatModel,
      messages: messages,
      temperature: isStoryboardIntent ? 0.1 : 0.7,
      max_tokens: 8000, 
    });

    let aiMessageText = chatResponse.choices[0]?.message?.content || "I have no response.";
    
    // 7. Bulletproof JSON Parsing
    if (isStoryboardIntent) {
       try {
         console.log("Raw AI Storyboard Output:", aiMessageText);

         const firstBracket = aiMessageText.indexOf('[');
         let lastBracket = aiMessageText.lastIndexOf(']');
         let jsonString = "";

         if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
           jsonString = aiMessageText.substring(firstBracket, lastBracket + 1);
         } else if (firstBracket !== -1 && lastBracket === -1) {
           console.warn("AI response was truncated! Attempting to recover JSON...");
           jsonString = aiMessageText.substring(firstBracket) + '"}]'; 
         } else {
            throw new Error("Could not find a valid JSON array start bracket.");
         }
         
         const sanitizedJson = jsonString.replace(/\n/g, " ").replace(/\r/g, "");
         const storyboardData = JSON.parse(sanitizedJson);
         
         if (Array.isArray(storyboardData)) {
            project.storyboard = storyboardData;
            aiMessageText = "I have successfully generated your storyboard! You can view it on the canvas.";
         }
       } catch (err) {
         console.error("Failed to parse storyboard JSON:", err);
         aiMessageText = "I tried to generate the storyboard, but an error occurred during formatting. Please check the terminal logs.";
       }
    }

    // 8. Save and Return
    project.chatHistory.push({ role: "assistant", content: aiMessageText, timestamp: Date.now().toString() });
    await project.save();

    return NextResponse.json({
      message: { id: Date.now().toString(), role: "assistant", content: aiMessageText },
      projectId: project._id, 
      storyboard: project.storyboard
    });
  } catch (error: any) {
    if (error.status === 401 || error.message.includes("401")) {
      return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
    }
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}