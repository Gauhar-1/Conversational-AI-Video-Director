/**
 * @file src/lib/services/ai/ReplicateService.ts
 * @description Replicate AI Service implementing IImageProvider & IVideoProvider.
 * Provides FLUX Schnell static references, PuLID facial seed consistency,
 * and Kling/Wan/MiniMax/Luma video generation.
 */

import Replicate from "replicate";
import { v2 as cloudinary } from "cloudinary";
import type {
  IImageProvider,
  IVideoProvider,
  GenerateImageResult,
  GenerateVideoInput,
  GenerateVideoResult,
  VideoStatusResult,
} from "./types";
import { ReplicateVideoGenerator } from "@/lib/generators/ReplicateVideoGenerator";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class ReplicateService implements IImageProvider, IVideoProvider {
  readonly name = "ReplicateService";

  private getAuth(apiKey?: string): string {
    return (
      apiKey ||
      process.env.REPLICATE_API_KEY ||
      process.env.REPLICATE_API_TOKEN ||
      ""
    );
  }

  private async uploadToCloudinary(
    remoteUrl: string,
    folder: string
  ): Promise<string> {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return remoteUrl;
    }
    try {
      const uploadResult = await cloudinary.uploader.upload(remoteUrl, {
        folder: `director_ai/${folder}`,
        resource_type: "auto",
      });
      return uploadResult.secure_url;
    } catch (err) {
      console.warn("Cloudinary upload failed, using direct provider URL:", err);
      return remoteUrl;
    }
  }

  /**
   * Generates a character reference plate with PuLID seed consistency.
   */
  async generateCharacterSheet(
    name: string,
    prompt: string,
    pulidSeed: number = 42,
    apiKey?: string
  ): Promise<GenerateImageResult> {
    const auth = this.getAuth(apiKey);
    if (!auth) throw new Error("Replicate API Key is required.");

    const replicate = new Replicate({ auth });
    const enhancedPrompt = `
      Professional character concept sheet, studio portrait, neutral background.
      Multiple angles of the same character: front view and 3/4 profile.
      NAME: ${name}.
      SUBJECT: ${prompt}.
      High detail, sharp facial features, cinematic character lighting, photorealistic, 8k resolution.
    `.replace(/\s+/g, " ").trim();

    const output: any = await replicate.run("black-forest-labs/flux-schnell", {
      input: {
        prompt: enhancedPrompt,
        aspect_ratio: "1:1",
        output_format: "webp",
        num_outputs: 1,
        seed: pulidSeed,
      },
    });

    let rawUrl = "";
    if (Array.isArray(output) && output.length > 0) {
      rawUrl = typeof output[0] === "string" ? output[0] : (output[0]?.url ? output[0].url() : String(output[0]));
    } else if (typeof output === "string") {
      rawUrl = output;
    } else {
      throw new Error("Invalid output format from FLUX character generator.");
    }

    const cdnUrl = await this.uploadToCloudinary(rawUrl, "characters");
    return {
      imageUrl: cdnUrl,
      seed: pulidSeed,
      model: "black-forest-labs/flux-schnell",
    };
  }

  /**
   * Generates an empty environmental background plate.
   */
  async generateLocationPlate(
    name: string,
    prompt: string,
    lightingProfile?: string,
    apiKey?: string
  ): Promise<GenerateImageResult> {
    const auth = this.getAuth(apiKey);
    if (!auth) throw new Error("Replicate API Key is required.");

    const replicate = new Replicate({ auth });
    const enhancedPrompt = `
      Empty environment design, establishing cinematic wide shot.
      LOCATION: ${name} - ${prompt}.
      Lighting: ${lightingProfile || "Cinematic atmospheric lighting"}.
      No characters, no people, highly detailed landscape, architectural digest, cinematic matte painting, 8k resolution.
    `.replace(/\s+/g, " ").trim();

    const output: any = await replicate.run("black-forest-labs/flux-schnell", {
      input: {
        prompt: enhancedPrompt,
        aspect_ratio: "16:9",
        output_format: "webp",
        num_outputs: 1,
      },
    });

    let rawUrl = "";
    if (Array.isArray(output) && output.length > 0) {
      rawUrl = typeof output[0] === "string" ? output[0] : (output[0]?.url ? output[0].url() : String(output[0]));
    } else if (typeof output === "string") {
      rawUrl = output;
    } else {
      throw new Error("Invalid output format from FLUX location generator.");
    }

    const cdnUrl = await this.uploadToCloudinary(rawUrl, "locations");
    return {
      imageUrl: cdnUrl,
      model: "black-forest-labs/flux-schnell",
    };
  }

  /**
   * Generates a 9:16 or 16:9 keyframe image for a scene.
   */
  async generateKeyframe(
    prompt: string,
    aspectRatio: "9:16" | "16:9" = "9:16",
    apiKey?: string
  ): Promise<GenerateImageResult> {
    const auth = this.getAuth(apiKey);
    if (!auth) throw new Error("Replicate API Key is required.");

    const replicate = new Replicate({ auth });
    const output: any = await replicate.run("black-forest-labs/flux-schnell", {
      input: {
        prompt,
        aspect_ratio: aspectRatio,
        output_format: "webp",
        num_outputs: 1,
      },
    });

    let rawUrl = "";
    if (Array.isArray(output) && output.length > 0) {
      rawUrl = typeof output[0] === "string" ? output[0] : (output[0]?.url ? output[0].url() : String(output[0]));
    } else if (typeof output === "string") {
      rawUrl = output;
    } else {
      throw new Error("Invalid output format from FLUX keyframe generator.");
    }

    const cdnUrl = await this.uploadToCloudinary(rawUrl, "keyframes");
    return {
      imageUrl: cdnUrl,
      model: "black-forest-labs/flux-schnell",
    };
  }

  /**
   * Submits a video generation job.
   */
  async dispatchVideo(input: GenerateVideoInput): Promise<GenerateVideoResult> {
    const auth = this.getAuth(input.apiKey);
    if (!auth) throw new Error("Replicate API Key is required.");

    const generator = new ReplicateVideoGenerator(input.model || "kling");
    const result = await generator.generate({
      prompt: input.prompt,
      startFrameUrl: input.firstFrameUrl,
      duration: input.duration || 10,
      aspectRatio: input.aspectRatio || "9:16",
      apiKey: auth,
    });

    return {
      taskId: result.predictionId,
      status: result.status === "queued" ? "pending" : result.status,
      model: result.model,
    };
  }

  /**
   * Checks the status of an asynchronous video prediction.
   */
  async checkStatus(taskId: string, apiKey?: string): Promise<VideoStatusResult> {
    const auth = this.getAuth(apiKey);
    if (!auth) throw new Error("Replicate API Key is required.");

    const generator = new ReplicateVideoGenerator();
    return await generator.checkStatus(taskId, auth);
  }
}

export const replicateService = new ReplicateService();
