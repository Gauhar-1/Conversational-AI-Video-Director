/**
 * @file src/lib/generators/types.ts
 * @description Interfaces and types for Dependency Inversion of Video Generation Providers.
 */

export interface VideoGenerationInput {
  prompt: string;
  startFrameUrl?: string;
  endFrameUrl?: string;
  characterReferenceUrls?: string[];
  audioUrl?: string;
  aspectRatio?: "9:16" | "16:9";
  duration?: number;
  apiKey: string;
}

export interface VideoGenerationResult {
  predictionId: string;
  status: "queued" | "processing" | "completed" | "failed";
  model: string;
  rawResponse?: any;
}

export interface VideoStatusResult {
  status: "processing" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
}

export interface IVideoGenerator {
  readonly name: string;

  /**
   * Dispatches an asynchronous video generation task to the provider.
   */
  generate(input: VideoGenerationInput): Promise<VideoGenerationResult>;

  /**
   * Polls the current state of a previously initiated video generation prediction.
   */
  checkStatus(predictionId: string, apiKey: string): Promise<VideoStatusResult>;
}
