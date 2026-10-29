/**
 * @file src/lib/validations/blueprint.ts
 * @description Zod validation schemas for human-readable Creative Blueprints.
 * Precedes fan-out orchestration into technical Replicate Flux prompts.
 */

import { z } from "zod";

export const blueprintCharacterSchema = z.object({
  assetId: z.string().min(1, "assetId is required"),
  name: z.string().min(1, "Character name is required"),
  role: z.string().default("Lead"),
  description: z.string().min(1, "Character description is required"),
});

export const blueprintEnvironmentSchema = z.object({
  assetId: z.string().min(1, "assetId is required"),
  name: z.string().min(1, "Environment name is required"),
  description: z.string().min(1, "Environment description is required"),
});

export const blueprintSceneSchema = z.object({
  sceneId: z.string().min(1, "sceneId is required"),
  order: z.number().int().min(1),
  action: z.string().min(1, "Scene action is required"),
  characterIds: z.array(z.string()).default([]),
  environmentId: z.string().default(""),
  cameraDirection: z.string().default("Cinematic framing"),
  duration: z.number().default(5),
});

export const blueprintStatusSchema = z.enum([
  "draft",
  "approved",
  "processing",
  "completed",
  "failed",
]);

export const blueprintSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  title: z.string().min(1, "Title is required"),
  theme: z.string().min(1, "Theme is required"),
  logline: z.string().optional(),
  characters: z.array(blueprintCharacterSchema).default([]),
  environments: z.array(blueprintEnvironmentSchema).default([]),
  scenes: z.array(blueprintSceneSchema).default([]),
  status: blueprintStatusSchema.default("draft"),
});

export const approveBlueprintEventSchema = z.object({
  projectId: z.string().min(1),
  blueprintId: z.string().min(1),
  apiKey: z.string().optional(),
});

export type BlueprintCharacter = z.infer<typeof blueprintCharacterSchema>;
export type BlueprintEnvironment = z.infer<typeof blueprintEnvironmentSchema>;
export type BlueprintScene = z.infer<typeof blueprintSceneSchema>;
export type BlueprintInput = z.infer<typeof blueprintSchema>;
export type ApproveBlueprintEvent = z.infer<typeof approveBlueprintEventSchema>;
