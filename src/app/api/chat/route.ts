import { NextResponse } from "next/server";
import dbConnect from "@/lib/db"; 
import { Project } from "@/models/Project";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    // ---------------------------------------------------------
    // 1. BYOK INTERCEPTION & CLIENT SETUP (GROQ)
    // ---------------------------------------------------------
    const authHeader = req.headers.get("authorization");
    let userApiKey = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      userApiKey = authHeader.split("Bearer ")[1].trim();
    }
    if (!userApiKey) {
      userApiKey = process.env.GROQ_API_KEY || "";
    }

    if (!userApiKey) {
      return NextResponse.json(
        { error: "Unauthorized: Missing Groq API Key. Please configure it in Settings." }, 
        { status: 401 }
      );
    }

    const groqClient = new OpenAI({
      apiKey: userApiKey,
      baseURL: "https://api.groq.com/openai/v1", 
    });

    await dbConnect();
    const { projectId, content, imageBase64, chatModel } = await req.json();

    // User requested model: openai/gpt-oss-20b for text
    let activeChatModel = "openai/gpt-oss-20b";
    if (chatModel && chatModel.trim() !== "" && !chatModel.includes("meta/") && !chatModel.includes("nvidia") && !chatModel.includes("llama-3.1") && !chatModel.includes("llama-3.3")) {
      activeChatModel = chatModel.trim();
    }

    // ---------------------------------------------------------
    // 2. PROJECT STATE MANAGEMENT
    // ---------------------------------------------------------
    let project;
    if (!projectId) {
      project = await Project.create({ title: "New Cinematic Project", chatHistory: [], visualMetadata: {} });
    } else {
      project = await Project.findById(projectId);
      if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // ---------------------------------------------------------
    // 3. VISION EXTRACTION VIA GROQ (If Image is Provided)
    // ---------------------------------------------------------
    if (imageBase64) {
      try {
        const visionResponse = await groqClient.chat.completions.create({
          model: "llama-3.2-11b-vision-preview", 
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Extract visual metadata as a JSON object: { \"lighting\": \"...\", \"colors\": \"...\", \"style\": \"...\", \"camera_angle\": \"...\", \"environment\": \"...\" }. Be highly descriptive. Do not use markdown blocks." },
                { type: "image_url", image_url: { url: imageBase64 } } 
              ],
            },
          ],
          max_tokens: 400,
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

    // Update Chat History
    project.chatHistory.push({ 
      role: "user", 
      content: content || (imageBase64 ? "I uploaded an image reference." : ""), 
      timestamp: Date.now().toString()
    });

    // ---------------------------------------------------------
    // 4. OPTIMIZED CONTEXT WINDOW
    // ---------------------------------------------------------
    const validHistory = project.chatHistory.filter((m: any) => 
      !m.content.includes("I tried to generate the storyboard") &&
      !m.content.includes("I have no response.")
    );

    const CONTEXT_WINDOW_SIZE = 8; 
    const recentHistory = validHistory.slice(-CONTEXT_WINDOW_SIZE);
    const messages: any[] = recentHistory.map((m: any) => ({ role: m.role, content: m.content }));

    // ---------------------------------------------------------
    // 5. DETERMINISTIC STATE ROUTING & PROMPT ENGINEERING
    // ---------------------------------------------------------
    const userMsg = content ? content.toLowerCase() : "";
    const historyLen = project.chatHistory.length;
    const lastAiMsg = historyLen >= 2 ? project.chatHistory[historyLen - 2].content.toLowerCase() : "";
    
    const isStoryboardIntent = userMsg.includes("generate storyboard") || userMsg.includes("generate the final storyboard");

    // CORE PERSONA
    let systemPrompt = `You are Director AI, an avant-garde, visionary film director and VFX supervisor. 
    CRITICAL Directives:
    1. CONTENT BOUNDARIES: Push creative limits and adapt to the user's intended rating. Avoid explicit API-banned content (NSFW/gore).
    2. THE "CONTEXT AMNESIA" RULE: The downstream AI models that generate the images and videos have ZERO MEMORY of previous scenes. EVERY single prompt (frame, environment, character, video) must be a massive, highly detailed, self-contained paragraph.
    3. TIMING: Every video generation is exactly 5 seconds long.`;

    if (Object.keys(project.visualMetadata || {}).length > 0) {
        systemPrompt += `\n\nGLOBAL VISUAL METADATA: ${JSON.stringify(project.visualMetadata)}. YOU MUST weave these exact lighting, style, and color parameters into EVERY SINGLE prompt you generate.`;
    }

    // STATE MACHINE
    if (isStoryboardIntent) {
      systemPrompt += `
      \n\nCRITICAL DIRECTIVE: You are outputting a data structure for a Node-Based VFX Compositor. Return ONLY a valid JSON array of scenes. 
      
      Schema Requirements & Prompt Engineering Rules:
      - "scene_number": Integer
      - "timestamp": String (e.g., "0:00-0:05")
      - "location": Brief setting description.
      - "action": What happens in the scene.
      - "camera_movement": Precise cinematography (e.g., "Slow orbital pan left, racking focus").
      
      THE 4 GENERATION NODES (Must be Magnificent, Production-Grade Prompts):
      
      1. "environment_prompt": MUST be a highly detailed description of the background ONLY. No characters. Describe the geometry, depth, cinematic lighting (HDRI), textures, and atmosphere. (e.g., "Deep cyberpunk alleyway, volumetric fog, wet asphalt reflecting neon cyan lights, shallow depth of field, ARRI Alexa 65.")
      
      2. "characters": An array of objects for every character in the scene.
         Format: [{"_id": "char-1", "name": "Hero", "appearance_prompt": "..."}]
         The "appearance_prompt" MUST detail their exact physical features, clothing materials, age, and lighting. Do NOT use names in the prompt; use descriptions.
      
      3. "frame_prompt": The master composition for the Start Frame. It must describe exactly where the characters are standing within the environment described above. Specify the camera angle and lighting.
      
      4. "video_prompt": MUST be a dense, time-bracketed physics prompt detailing the exact 5-second motion. 
         Format strictly like this: "[0s-1s]: Camera starts locked, character stands still in the rain. [1s-3s]: Camera pushes in slowly, character turns head sharply left. [3s-5s]: Heavy rain falls as the character begins to run forward, fluid fabric physics on the coat. Highly realistic motion, no morphing."
      
      OUTPUT FORMAT EXACTLY LIKE THIS:
      [
        {
          "scene_number": 1,
          "timestamp": "0:00-0:05",
          "location": "...",
          "action": "...",
          "camera_movement": "...",
          "environment_prompt": "...",
          "characters": [
            { "_id": "char-1", "name": "...", "appearance_prompt": "..." }
          ],
          "frame_prompt": "...",
          "video_prompt": "[0s-1s]: ... [1s-3s]: ... [3s-5s]: ..."
        }
      ]`;
    
    } else if (lastAiMsg.includes("upload an image reference") || lastAiMsg.includes("you decide")) {
      if (imageBase64) {
        systemPrompt += `\n\nCRITICAL DIRECTIVE: You received visual metadata from the user's image. Ask EXACTLY: "Are you ready for me to generate the final Storyboard Canvas?"`;
      } else {
        systemPrompt += `\n\nCRITICAL DIRECTIVE: The user did NOT upload an image and wants you to define the visual aesthetic. 
        Act as the Director of Photography. You MUST include a JSON block in your response formatted EXACTLY like this:
        [VISUAL_METADATA_START]
        {
          "style": "Describe the film stock, era, and overall cinematic style",
          "lighting": "Describe the specific lighting setup (e.g., high contrast neon, soft diffused daylight)",
          "colors": "Describe the color palette"
        }
        [VISUAL_METADATA_END]
        
        After this JSON block, say: "I have established our visual profile. Are you ready for me to generate the final Storyboard Canvas?"`;
      }

    } else if (lastAiMsg.includes("satisfactory") || lastAiMsg.includes("adjustments")) {
      if (userMsg.includes("yes") || userMsg.includes("proceed") || userMsg.includes("perfect")) {
          systemPrompt += `\n\nCRITICAL DIRECTIVE: The script is approved. Now, ask EXACTLY: "Please upload an image reference to dictate the color grading, lighting, and cinematic vibe. If you don't have an image, just tell me 'You decide' and I will establish the aesthetic for us."`;
      } else {
          systemPrompt += `\n\nCRITICAL DIRECTIVE: Adjust the script based on their feedback. Ask again: "Is this updated script satisfactory?"`;
      }
    
    } else if (lastAiMsg.includes("video length") || lastAiMsg.includes("how long")) {
      systemPrompt += `\n\nCRITICAL DIRECTIVE: Break the story into exact 5-second contiguous blocks. Write the continuity script. End by asking EXACTLY: "Is this continuity script satisfactory?"`;
    
    } else {
      systemPrompt += `\n\nCRITICAL DIRECTIVE: Discuss the story concept. Flesh out specific character appearances. Once solid, ask EXACTLY: "Is this story finalized? If yes, what should be the total video length?"`;
    }

    messages.unshift({ role: "system", content: systemPrompt });

    // ---------------------------------------------------------
    // 6. AI INFERENCE (GROQ - openai/gpt-oss-20b)
    // ---------------------------------------------------------
    const chatResponse = await groqClient.chat.completions.create({
      model: activeChatModel,
      messages: messages,
      temperature: isStoryboardIntent ? 0.1 : 0.7,
      max_completion_tokens: 8000, 
    } as any);

    let aiMessageText = chatResponse.choices[0]?.message?.content || "I have no response.";
    
    // Strip internal thinking tags if emitted by reasoning models
    aiMessageText = aiMessageText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    
    // ---------------------------------------------------------
    // 7. RESPONSE INTERCEPTORS (JSON Parsing & Cleanup)
    // ---------------------------------------------------------

    // A. Intercept Auto-Generated Visual Metadata
    if (aiMessageText.includes("[VISUAL_METADATA_START]")) {
       try {
           const startIdx = aiMessageText.indexOf("[VISUAL_METADATA_START]") + "[VISUAL_METADATA_START]".length;
           const endIdx = aiMessageText.indexOf("[VISUAL_METADATA_END]");
           const jsonStr = aiMessageText.substring(startIdx, endIdx).trim();
           const parsedMeta = JSON.parse(jsonStr);
           
           project.visualMetadata = { ...project.visualMetadata, ...parsedMeta };
           project.markModified('visualMetadata');
           await project.save();

           aiMessageText = aiMessageText.replace(/\[VISUAL_METADATA_START\][\s\S]*?\[VISUAL_METADATA_END\]/, "").trim();
       } catch (e) {
           console.error("🔥 Failed to parse auto-generated visual metadata", e);
       }
    }

    // B. Intercept Final Storyboard Array
    if (isStoryboardIntent) {
       try {
         const firstBracket = aiMessageText.indexOf('[');
         let lastBracket = aiMessageText.lastIndexOf(']');
         let jsonString = "";

         if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
           jsonString = aiMessageText.substring(firstBracket, lastBracket + 1);
         } else if (firstBracket !== -1 && lastBracket === -1) {
           jsonString = aiMessageText.substring(firstBracket) + '"}]'; 
         } else {
            throw new Error("Could not find a valid JSON array start bracket.");
         }
         
         const sanitizedJson = jsonString.replace(/\n/g, " ").replace(/\r/g, "");
         const storyboardData = JSON.parse(sanitizedJson);
         
         if (Array.isArray(storyboardData)) {
            project.storyboard = storyboardData;
            aiMessageText = "The sequence is locked. I have compiled the Node Compositor Architecture. You can now view and render the pipeline on the Canvas.";
         }
       } catch (err) {
         console.error("🔥 Failed to parse storyboard JSON:", err);
         aiMessageText = "I attempted to generate the architecture, but the JSON formatting failed due to context length. Please refresh and try breaking the sequence into a shorter duration.";
       }
    }

    // ---------------------------------------------------------
    // 8. PERSISTENCE & RESPONSE
    // ---------------------------------------------------------
    project.chatHistory.push({ role: "assistant", content: aiMessageText, timestamp: Date.now().toString() });
    await project.save();

    return NextResponse.json({
      message: { id: Date.now().toString(), role: "assistant", content: aiMessageText },
      projectId: project._id, 
      storyboard: project.storyboard
    });

  } catch (error: any) {
    if (error.status === 401 || (error.message && error.message.includes("401"))) {
      return NextResponse.json({ error: "Invalid Groq API Key. Please update your Settings." }, { status: 401 });
    }
    console.error("🔥 Server API Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}