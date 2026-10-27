/**
 * @file src/lib/validations/generation.ts
 * @description Zod Schemas for Video and Image generation payloads.
 */

import { z } from "zod";

export const generateVideoSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  sceneId: z.string().optional(),
  sceneNumber: z.number().int().positive().optional(),
  rawPrompt: z.string().trim().min(3, "Prompt must be at least 3 characters"),
  userPreference: z.string().optional().default("kling"),
  advancedInputs: z
    .object({
      startFrameUrl: z.string().url().optional().or(z.literal("")),
      endFrameUrl: z.string().url().optional().or(z.literal("")),
      characterReferenceUrls: z.array(z.string().url()).optional(),
      audioUrl: z.string().url().optional().or(z.literal("")),
      cameraMotion: z.string().optional(),
    })
    .optional(),
});
export type GenerateVideoType = z.infer<typeof generateVideoSchema>;

export const generateImageSchema = z.object({
  prompt: z.string().trim().min(3, "Prompt must be at least 3 characters"),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]).default("9:16"),
  negativePrompt: z.string().optional(),
  seed: z.number().int().optional(),
});
export type GenerateImageType = z.infer<typeof generateImageSchema>;
