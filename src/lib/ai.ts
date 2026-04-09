import OpenAI from "openai";

// Configure OpenAI SDK to point directly to NVIDIA NIM endpoints
export const ai = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY,
});
