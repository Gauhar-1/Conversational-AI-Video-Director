import OpenAI from "openai";

// Configure OpenAI SDK to point to Groq
export const ai = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY || "",
});
