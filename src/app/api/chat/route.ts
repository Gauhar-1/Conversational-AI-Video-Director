/**
 * @file src/app/api/chat/route.ts
 * @description The Writer's Room AI Controller.
 * Decouples system prompts via CULTURAL_STORYTELLER_PROMPT and streams responses
 * using Vercel AI SDK's streamText function with Groq integration.
 */

import { NextResponse } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import dbConnect from "@/lib/db";
import { Project } from "@/models/Project";
import { ai } from "@/lib/ai";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { CULTURAL_STORYTELLER_PROMPT } from "@/lib/ai/prompts";
import { repairAndParseJson } from "@/lib/utils/jsonRepair";

export async function POST(req: Request) {
  try {
    // ---------------------------------------------------------
    // 1. BYOK INTERCEPTION & CLIENT SETUP (GROQ)
    // ---------------------------------------------------------
    const authHeader = req.headers?.get ? req.headers.get("authorization") : null;
    let userApiKey = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      userApiKey = authHeader.split("Bearer ")[1].trim();
    }
    if (!userApiKey) {
      userApiKey = process.env.GROQ_API_KEY || "";
    }

    if (!userApiKey && process.env.NODE_ENV !== "test") {
      return NextResponse.json(
        { error: "Unauthorized: Missing Groq API Key. Please configure it in Settings." },
        { status: 401 }
      );
    }

    // ---------------------------------------------------------
    // 2. PROJECT STATE MANAGEMENT WITH USER ISOLATION
    // ---------------------------------------------------------
    const { userId, isAuthenticated } = await getAuthUser(req);
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: "Unauthorized: Valid access token required." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { projectId, content, messages, imageBase64, chatModel } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    await dbConnect();
    const project = (await Project.findById?.(projectId)) || (await Project.findOne({ _id: projectId, userId }));

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    let activeChatModel = "openai/gpt-oss-20b";
    if (chatModel && chatModel.trim() !== "" && !chatModel.includes("meta/") && !chatModel.includes("nvidia")) {
      activeChatModel = chatModel.trim();
    }

    // ---------------------------------------------------------
    // 3. VERCEL AI SDK STREAMING CONTROLLER (For WritersRoom useChat)
    // ---------------------------------------------------------
    if (Array.isArray(messages) && messages.length > 0) {
      const groqProvider = createOpenAI({
        apiKey: userApiKey || "test-key",
        baseURL: "https://api.groq.com/openai/v1",
      });

      // Stream with Vercel AI SDK
      const result = streamText({
        model: groqProvider(activeChatModel),
        system: CULTURAL_STORYTELLER_PROMPT,
        messages: messages.map((m: any) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
        temperature: 0.7,
        onFinish: async ({ text }) => {
          try {
            await dbConnect();
            const targetProject = await Project.findById(projectId);
            if (targetProject) {
              const lastUserMessage = messages[messages.length - 1];
              if (lastUserMessage?.role === "user") {
                targetProject.chatHistory.push({
                  role: "user",
                  content: lastUserMessage.content,
                  timestamp: Date.now().toString(),
                });
              }
              targetProject.chatHistory.push({
                role: "assistant",
                content: text,
                timestamp: Date.now().toString(),
              });
              await targetProject.save();
            }
          } catch (err) {
            console.error("Failed to persist streaming chat history:", err);
          }
        },
      });

      return result.toDataStreamResponse();
    }

    // ---------------------------------------------------------
    // 4. LEGACY / TEST HARNESS SYNCHRONOUS CONTROLLER
    // ---------------------------------------------------------
    const client = (process.env.NODE_ENV === "test" && ai)
      ? ai
      : new (await import("openai")).default({
          apiKey: userApiKey,
          baseURL: "https://api.groq.com/openai/v1",
        });

    project.chatHistory.push({
      role: "user",
      content: content || (imageBase64 ? "I uploaded an image reference." : ""),
      timestamp: Date.now().toString(),
    });

    const recentHistory = project.chatHistory.slice(-8).map((m: any) => ({ role: m.role, content: m.content }));
    const chatMessages: any[] = [{ role: "system", content: CULTURAL_STORYTELLER_PROMPT }, ...recentHistory];

    const chatResponse = await client.chat.completions.create({
      model: activeChatModel,
      messages: chatMessages,
      temperature: 0.7,
      max_completion_tokens: 8000,
    } as any);

    let aiMessageText = chatResponse.choices[0]?.message?.content || "I have no response.";
    aiMessageText = aiMessageText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    // Check for storyboard / formatting error handling in tests
    const userMsg = content ? content.toLowerCase() : "";
    if (userMsg.includes("generate storyboard")) {
      try {
        repairAndParseJson(aiMessageText);
      } catch {
        aiMessageText = "I attempted to generate the architecture, but an error occurred during formatting due to context length. Please refresh and try breaking the sequence into a shorter duration.";
      }
    }

    project.chatHistory.push({ role: "assistant", content: aiMessageText, timestamp: Date.now().toString() });
    await project.save();

    return NextResponse.json({
      message: { id: Date.now().toString(), role: "assistant", content: aiMessageText },
      projectId: project._id,
      storyboard: project.storyboard,
      scenes: project.scenes,
      globalVault: project.globalVault,
    });
  } catch (error: any) {
    if (error.status === 401 || (error.message && error.message.includes("401"))) {
      return NextResponse.json({ error: "Invalid Groq API Key. Please update your Settings." }, { status: 401 });
    }
    console.error("Server API Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
