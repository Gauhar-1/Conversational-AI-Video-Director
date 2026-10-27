/**
 * @file src/lib/validations/project.ts
 * @description Zod Schemas for Project, Vault, and Scene validation following Interface Segregation.
 */

import { z } from "zod";

export const cameraAngleSchema = z.enum(["CAM_A_CENTER", "CAM_B_45_CLOSE", "CAM_C_OTS"]);
export type CameraAngleType = z.infer<typeof cameraAngleSchema>;

export const sceneStatusSchema = z.enum([
  "idle",
  "enriching",
  "ready",
  "generating",
  "completed",
  "failed",
]);
export type SceneStatusType = z.infer<typeof sceneStatusSchema>;

export const DEFAULT_CHARACTER_ANCHOR = {
  description: "Lead protagonist with cinematic detailing",
  imageUrl: "",
  replicatePulidSeed: 42,
};

export const DEFAULT_ENVIRONMENT_ANCHOR = {
  description: "Volumetric neon atmospheric environment",
  imageUrl: "",
  lightingProfile: "High contrast cinematic rim lighting",
};

export const characterAnchorSchema = z.object({
  description: z.string().default(DEFAULT_CHARACTER_ANCHOR.description),
  imageUrl: z.string().default(DEFAULT_CHARACTER_ANCHOR.imageUrl),
  replicatePulidSeed: z.number().int().default(DEFAULT_CHARACTER_ANCHOR.replicatePulidSeed),
});

export const environmentAnchorSchema = z.object({
  description: z.string().default(DEFAULT_ENVIRONMENT_ANCHOR.description),
  imageUrl: z.string().default(DEFAULT_ENVIRONMENT_ANCHOR.imageUrl),
  lightingProfile: z.string().default(DEFAULT_ENVIRONMENT_ANCHOR.lightingProfile),
});

export const aspectRatioSchema = z.enum(["9:16", "16:9"]).default("9:16");

export const globalVaultSchema = z.object({
  characterAnchor: characterAnchorSchema.default(DEFAULT_CHARACTER_ANCHOR),
  environmentAnchor: environmentAnchorSchema.default(DEFAULT_ENVIRONMENT_ANCHOR),
  aspectRatio: aspectRatioSchema,
});
export type GlobalVaultType = z.infer<typeof globalVaultSchema>;

export const sceneDocSchema = z.object({
  sceneId: z.string().min(1, "sceneId is required"),
  order: z.number().int().nonnegative().default(1),
  duration: z.number().positive().default(10),
  cameraAngle: cameraAngleSchema.default("CAM_A_CENTER"),
  rawDelta: z.string().default(""),
  imagePrompt: z.string().default(""),
  motionPrompt: z.string().default(""),
  firstFrameUrl: z.string().default(""),
  lastFrameUrl: z.string().default(""),
  videoUrl: z.string().default(""),
  status: sceneStatusSchema.default("idle"),
});
export type SceneDocType = z.infer<typeof sceneDocSchema>;

export const createProjectSchema = z.object({
  title: z.string().trim().min(1).max(120).default("New Project"),
  globalVault: globalVaultSchema.optional(),
  scenes: z.array(sceneDocSchema).optional(),
});
export type CreateProjectType = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  globalVault: globalVaultSchema.partial().optional(),
  scenes: z.array(sceneDocSchema).optional(),
});
export type UpdateProjectType = z.infer<typeof updateProjectSchema>;

export const enrichSceneSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  rawDelta: z.string().optional().default(""),
  cameraAngle: cameraAngleSchema.optional().default("CAM_A_CENTER"),
});
export type EnrichSceneType = z.infer<typeof enrichSceneSchema>;
