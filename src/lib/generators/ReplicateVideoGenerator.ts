/**
 * @file src/lib/generators/ReplicateVideoGenerator.ts
 * @description Concrete implementation of IVideoGenerator for Replicate.
 * Supports Kling 2.5 Turbo Pro, Wan 2.5 i2v, MiniMax 01, and Luma Ray.
 */

import Replicate from "replicate";
import type { IVideoGenerator, VideoGenerationInput, VideoGenerationResult, VideoStatusResult } from "./types";

export class ReplicateVideoGenerator implements IVideoGenerator {
  readonly name = "Replicate";
  private modelPreference: string;

  constructor(modelPreference: string = "kling") {
    this.modelPreference = modelPreference.toLowerCase();
  }

  private resolveModelAndPayload(input: VideoGenerationInput): {
    model: string;
    payload: Record<string, any>;
  } {
    const startImage = input.startFrameUrl || input.characterReferenceUrls?.[0];
    const aspectRatio = input.aspectRatio || "16:9";

    if (this.modelPreference.includes("wan")) {
      return {
        model: "wan-video/wan-2.5-i2v",
        payload: {
          prompt: input.prompt,
          image: startImage,
          ...(input.audioUrl ? { audio: input.audioUrl } : {}),
          duration: input.duration || 5,
          resolution: "720p",
        },
      };
    }

    if (this.modelPreference.includes("minimax") || this.modelPreference.includes("hailuo")) {
      return {
        model: "minimax/video-01",
        payload: {
          prompt: input.prompt,
          ...(startImage ? { first_frame_image: startImage } : {}),
        },
      };
    }

    if (this.modelPreference.includes("luma")) {
      return {
        model: "luma/ray",
        payload: {
          prompt: input.prompt,
          ...(startImage ? { start_image: startImage } : {}),
        },
      };
    }

    // Default: Kling 2.5 Turbo Pro
    return {
      model: "kwaivgi/kling-v2.5-turbo-pro",
      payload: {
        prompt: input.prompt,
        ...(startImage ? { start_image: startImage } : {}),
        ...(input.endFrameUrl ? { end_image: input.endFrameUrl } : {}),
        duration: input.duration || 5,
        aspect_ratio: aspectRatio,
      },
    };
  }

  async generate(input: VideoGenerationInput): Promise<VideoGenerationResult> {
    const replicate = new Replicate({ auth: input.apiKey });
    const { model, payload } = this.resolveModelAndPayload(input);

    const prediction = await replicate.predictions.create({
      model: model as `${string}/${string}`,
      input: payload,
    });

    return {
      predictionId: prediction.id,
      status: "processing",
      model,
      rawResponse: prediction,
    };
  }

  async checkStatus(predictionId: string, apiKey: string): Promise<VideoStatusResult> {
    const replicate = new Replicate({ auth: apiKey });
    const prediction = await replicate.predictions.get(predictionId);

    if (prediction.status === "succeeded") {
      const output = prediction.output;
      const videoUrl = Array.isArray(output) ? output[0] : typeof output === "string" ? output : "";
      return {
        status: "completed",
        videoUrl,
      };
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      return {
        status: "failed",
        error: prediction.error ? String(prediction.error) : "Prediction failed or canceled",
      };
    }

    return {
      status: "processing",
    };
  }
}
