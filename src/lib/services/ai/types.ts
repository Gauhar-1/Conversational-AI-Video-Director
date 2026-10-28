/**
 * @file src/lib/services/ai/types.ts
 * @description Dependency Inversion interfaces for AI generation providers.
 * Abstracted so models and vendors (Groq, Replicate, OpenAI, Fal) can be swapped
 * without breaking business logic or UI components.
 */

import type { CharacterAsset, LocationAsset, SceneDoc } from "@/lib/validations/project";

export interface ParseScriptInput {
  script: string;
  projectId?: string;
  apiKey?: string;
}

export interface ParsedCharacter {
  name: string;
  role: string;
  appearancePrompt: string;
}

export interface ParsedLocation {
  name: string;
  environmentPrompt: string;
  lightingProfile?: string;
}

export interface ParsedScene {
  order: number;
  title: string;
  rawDelta: string;
  dialogue?: string;
  locationName: string;
  characterNames: string[];
  cameraAngle: string;
  cameraMovement: string;
  duration: number;
  imagePrompt: string;
  motionPrompt: string;
}

export interface ParsedScriptResult {
  title: string;
  logline?: string;
  characters: ParsedCharacter[];
  locations: ParsedLocation[];
  scenes: ParsedScene[];
}

export interface GenerateImageInput {
  prompt: string;
  aspectRatio?: "1:1" | "9:16" | "16:9";
  pulidSeed?: number;
  referenceImageUrl?: string;
  apiKey?: string;
}

export interface GenerateImageResult {
  imageUrl: string;
  seed?: number;
  model: string;
}

export interface GenerateVideoInput {
  prompt: string;
  firstFrameUrl?: string;
  duration?: number;
  model?: string;
  aspectRatio?: "9:16" | "16:9";
  apiKey?: string;
}

export interface GenerateVideoResult {
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  model: string;
}

export interface VideoStatusResult {
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
}

/**
 * Script Provider Interface (e.g. Groq, OpenAI)
 */
export interface IScriptProvider {
  readonly name: string;
  parseScript(input: ParseScriptInput): Promise<ParsedScriptResult>;
}

/**
 * Image Provider Interface (e.g. Replicate FLUX Schnell, PuLID)
 */
export interface IImageProvider {
  readonly name: string;
  generateCharacterSheet(
    name: string,
    prompt: string,
    pulidSeed?: number,
    apiKey?: string
  ): Promise<GenerateImageResult>;
  generateLocationPlate(
    name: string,
    prompt: string,
    lightingProfile?: string,
    apiKey?: string
  ): Promise<GenerateImageResult>;
  generateKeyframe(
    prompt: string,
    aspectRatio?: "9:16" | "16:9",
    apiKey?: string
  ): Promise<GenerateImageResult>;
}

/**
 * Video Provider Interface (e.g. Replicate Kling, Wan, MiniMax, Luma)
 */
export interface IVideoProvider {
  readonly name: string;
  dispatchVideo(input: GenerateVideoInput): Promise<GenerateVideoResult>;
  checkStatus(taskId: string, apiKey?: string): Promise<VideoStatusResult>;
}

/**
 * Unified IAIProvider interface
 */
export interface IAIProvider {
  readonly script: IScriptProvider;
  readonly image: IImageProvider;
  readonly video: IVideoProvider;
}

