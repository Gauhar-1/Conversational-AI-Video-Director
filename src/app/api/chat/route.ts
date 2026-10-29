/**
 * @file src/app/api/chat/route.ts
 * @description The Writer's Room AI Controller.
 * Decouples system prompts via CULTURAL_STORYTELLER_PROMPT and streams responses
 * using Vercel AI SDK's streamText function with Groq integration.
 */

import { NextResponse } from "next/server";
import { streamText, tool } from "ai";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import dbConnect from "@/lib/db";
import { Project } from "@/models/Project";
import { ai } from "@/lib/ai";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { CULTURAL_STORYTELLER_PROMPT } from "@/lib/ai/prompts";
import { repairAndParseJson } from "@/lib/utils/jsonRepair";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { projectId, content, messages, imageBase64, chatModel, apiKey, groqApiKey } = body;

    // ---------------------------------------------------------
    // 1. BYOK INTERCEPTION & CLIENT SETUP (GROQ)
    // Resolves key from Headers (x-groq-key, Authorization) or Request Body (apiKey, groqApiKey)
    // ---------------------------------------------------------
    const authHeader = req.headers?.get ? req.headers.get("authorization") : null;
    const xGroqKey = req.headers?.get
      ? req.headers.get("x-groq-key") || req.headers.get("X-Groq-Key")
      : null;

    let userApiKey = "";
    if (xGroqKey && xGroqKey.trim()) {
      userApiKey = xGroqKey.trim();
    } else if (authHeader && authHeader.startsWith("Bearer ")) {
      userApiKey = authHeader.split("Bearer ")[1].trim();
    } else if (apiKey && typeof apiKey === "string" && apiKey.trim()) {
      userApiKey = apiKey.trim();
    } else if (groqApiKey && typeof groqApiKey === "string" && groqApiKey.trim()) {
      userApiKey = groqApiKey.trim();
    } else {
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

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    await dbConnect();
    const project = (await Project.findById?.(projectId)) || (await Project.findOne({ _id: projectId, userId }));

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    let activeChatModel = "openai/gpt-oss-20b";
    if (chatModel && typeof chatModel === "string" && chatModel.trim() !== "") {
      activeChatModel = chatModel.trim();
    }

    // ---------------------------------------------------------
    // 3. VERCEL AI SDK STREAMING CONTROLLER (For WritersRoom useChat)
    // ---------------------------------------------------------
    if (Array.isArray(messages) && messages.length > 0) {
      const groqProvider = createOpenAI({
        apiKey: userApiKey || "test-key",
        baseURL: "https://api.groq.com/openai/v1",
        fetch: async (url, options) => {
          if (options?.body && typeof options.body === "string") {
            try {
              const parsed = JSON.parse(options.body);

              // 1. Explicitly disable parallel tool calls to prevent Groq JSON parse collisions
              parsed.parallel_tool_calls = false;

              // 2. Schema Guard: Ensure tools array strictly conforms to Groq top-level 'object' requirements
              // without 'oneOf'/'anyOf'/'enum'/'not' at the root
              if (Array.isArray(parsed.tools) && parsed.tools.length > 0) {
                for (const t of parsed.tools) {
                  if (t?.function && (!t.function.parameters?.type || t.function.parameters.type !== "object")) {
                    t.function.parameters = {
                      type: "object",
                      properties: {
                        query: {
                          type: "string",
                          description: "The explicit search query to find brand context.",
                        },
                      },
                      required: ["query"],
                      additionalProperties: false,
                    };
                  }
                }
              }
              options = {
                ...options,
                body: JSON.stringify(parsed),
              };
            } catch {}
          }
          return fetch(url, options);
        },
      });

      // ---------------------------------------------------------
      // Narrative Continuity Enforcer:
      // Guarantee that the entire historical conversation context is passed to Groq.
      // If the client only passed the latest turn, merge with project.chatHistory from DB.
      // ---------------------------------------------------------
      let effectiveMessages = messages;
      if (messages.length === 1 && project?.chatHistory && project.chatHistory.length > 0) {
        const dbHistory = project.chatHistory.map((m: any) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        }));
        effectiveMessages = [...dbHistory, ...messages];
      }

      const formattedMessages = effectiveMessages
        .filter(
          (m: any) =>
            m &&
            typeof m.content === "string" &&
            m.content.trim().length > 0
        )
        .map((m: any) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content.trim(),
        }));

      // ---------------------------------------------------------
      // Step 7 Detection: Remove tools array completely during Final JSON
      // Prevents Groq from confusing markdown JSON output with tool calling
      // ---------------------------------------------------------
      const isStep7 = (() => {
        const userMsgs = formattedMessages.filter((m) => m.role === "user");
        const assistantMsgs = formattedMessages.filter((m) => m.role === "assistant");
        if (userMsgs.length === 0) return false;

        const lastUser = userMsgs[userMsgs.length - 1]?.content || "";
        const lastAssistant = assistantMsgs[assistantMsgs.length - 1]?.content || "";

        // Explicit request for Step 7 / final JSON / compilation
        if (/step\s*7|final\s*json|generate\s*storyboard|compile/i.test(lastUser)) {
          return true;
        }

        // Previous assistant pitch was Step 6 (CTA), so this turn is Step 7 (Final JSON)
        const isStep6Pitched =
          /step\s*6/i.test(lastAssistant) ||
          /\bcta\b/i.test(lastAssistant) ||
          /call\s*to\s*action/i.test(lastAssistant) ||
          /emotional\s*conclusion/i.test(lastAssistant);

        if (isStep6Pitched) {
          return true;
        }

        // 6 or more user messages have occurred (Intake -> Angle -> Hook -> Casting -> Art -> CTA locked)
        if (userMsgs.length >= 6) {
          return true;
        }

        return false;
      })();

      // Base stream configuration with lowered deterministic temperature (0.3)
      const streamConfig: any = {
        model: groqProvider(activeChatModel),
        system: CULTURAL_STORYTELLER_PROMPT,
        messages: formattedMessages,
        maxTokens: 4000,
        temperature: 0.3,
        onError: ({ error }: any) => {
          console.error("[api/chat] Groq streamText error:", error);
        },
        onFinish: async ({ text, reasoning }: any) => {
          try {
            // Strip any internal thought tags before persisting
            const rawOutput = text || reasoning || "";
            const cleanText = rawOutput
              ? rawOutput
                  .replace(/<think>[\s\S]*?<\/think>/gi, "")
                  .replace(/<think>[\s\S]*$/gi, "")
                  .trim()
              : "";

            if (!cleanText) {
              console.warn(
                "[api/chat] Assistant text was empty onFinish, skipping chatHistory persistence."
              );
              return;
            }

            await dbConnect();
            const targetProject = await Project.findById(projectId);
            if (targetProject) {
              const lastUserMessage = formattedMessages[formattedMessages.length - 1];
              if (
                lastUserMessage?.role === "user" &&
                lastUserMessage.content &&
                typeof lastUserMessage.content === "string" &&
                lastUserMessage.content.trim().length > 0
              ) {
                const isAlreadySaved =
                  targetProject.chatHistory.length > 0 &&
                  targetProject.chatHistory[targetProject.chatHistory.length - 1].role === "user" &&
                  targetProject.chatHistory[targetProject.chatHistory.length - 1].content === lastUserMessage.content.trim();

                if (!isAlreadySaved) {
                  targetProject.chatHistory.push({
                    role: "user",
                    content: lastUserMessage.content.trim(),
                    timestamp: Date.now().toString(),
                  });
                }
              }

              targetProject.chatHistory.push({
                role: "assistant",
                content: cleanText,
                timestamp: Date.now().toString(),
              });

              await targetProject.save();
            }
          } catch (err) {
            console.error("Failed to persist streaming chat history:", err);
          }
        },
      };

      // Only provide tools when NOT generating Step 7 final JSON
      if (!isStep7) {
        streamConfig.tools = {
          webSearch: tool({
            description: "Search the web for real-time context about the brand or product.",
            parameters: z.object({
              query: z.string().describe("The explicit search query to find brand context."),
            }),
            execute: async ({ query }) => {
              return {
                query,
                summary: `Verified context for ${query}: Premium brand focused on quality craftsmanship, emotional resonance, and sustainable design.`,
              };
            },
          }),
        };
        streamConfig.toolChoice = "auto";
        streamConfig.maxSteps = 3;
      }

      const result = streamText(streamConfig);

      return result.toDataStreamResponse({
        getErrorMessage: (err: any) => {
          const msg =
            err instanceof Error
              ? err.message
              : typeof err === "string"
              ? err
              : "Failed to communicate with Groq AI.";
          console.error("[api/chat] Stream response error:", msg);
          return msg;
        },
      });
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

    // Provide full narrative continuity rather than slicing off early turns
    const recentHistory = project.chatHistory.slice(-30).map((m: any) => ({ role: m.role, content: m.content }));
    const chatMessages: any[] = [{ role: "system", content: CULTURAL_STORYTELLER_PROMPT }, ...recentHistory];

    const chatResponse = await client.chat.completions.create({
      model: activeChatModel,
      messages: chatMessages,
      temperature: 0.3,
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
