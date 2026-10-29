import OpenAI from "openai";

// Configure OpenAI SDK to point to Groq with resilient fallback so module evaluation never crashes
export const ai = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY || "gsk_dummy_key_for_initialization",
});
