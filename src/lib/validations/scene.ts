/**
 * @file src/lib/validations/scene.ts
 * @description Zod schemas and TypeScript types for Scenes, Takes, and Timeline Macro Nodes.
 * Supports granular delta updates (PATCH /api/scenes/[id]) and multi-take variations.
 */

import { z } from "zod";

export const cameraAngleSchema = z.enum([
  "CAM_A_CENTER",
  "CAM_B_45_CLOSE",
  "CAM_C_OTS",
  "CLOSE_UP",
  "MEDIUM_SHOT",
  "WIDE_SHOT",
  "EXTREME_CLOSE_UP",
  "ESTABLISHING",
]);
export type CameraAngle = z.infer<typeof cameraAngleSchema>;

export const cameraMovementSchema = z.enum([
  "STATIC",
  "PUSH_IN",
  "PULL_OUT",
  "PAN_LEFT",
  "PAN_RIGHT",
  "TILT_UP",
  "TILT_DOWN",
  "TRACKING",
  "ORBIT",
]);
export type CameraMovement = z.infer<typeof cameraMovementSchema>;

export const sceneStatusSchema = z.enum([
  "draft",
  "idle",
  "enriching",
  "ready",
  "ready_for_render",
  "generating",
  "completed",
  "failed",
]);
export type SceneStatus = z.infer<typeof sceneStatusSchema>;

export const takeStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);
export type TakeStatus = z.infer<typeof takeStatusSchema>;

export const takeSchema = z.object({
  takeId: z.string().min(1, "takeId is required"),
  takeNumber: z.number().int().positive().default(1),
  videoUrl: z.string().default(""),
  thumbnailUrl: z.string().optional(),
  prompt: z.string().default(""),
  motionPrompt: z.string().optional(),
  model: z.string().default("kling-2.5"),
  status: takeStatusSchema.default("pending"),
  taskId: z.string().optional(),
  duration: z.number().positive().default(10),
  createdAt: z.string().default(() => new Date().toISOString()),
});
export type Take = z.infer<typeof takeSchema>;

export const sceneDocSchema = z.object({
  sceneId: z.string().min(1, "sceneId is required"),
  order: z.number().int().nonnegative().default(1),
  title: z.string().default(""),
  rawDelta: z.string().default(""),
  dialogue: z.string().optional().default(""),
  locationId: z.string().optional().default(""),
  characterIds: z.array(z.string()).default([]),
  cameraAngle: cameraAngleSchema.default("CAM_A_CENTER"),
  cameraMovement: cameraMovementSchema.default("STATIC"),
  duration: z.number().positive().default(10),
  imagePrompt: z.string().default(""),
  motionPrompt: z.string().default(""),
  firstFrameUrl: z.string().default(""),
  lastFrameUrl: z.string().default(""),
  videoUrl: z.string().default(""), // Backwards compatibility with active take videoUrl
  takes: z.array(takeSchema).default([]),
  activeTakeId: z.string().optional().default(""),
  status: sceneStatusSchema.default("idle"),
});
export type SceneDoc = z.infer<typeof sceneDocSchema>;

// --- DTO Schemas for Granular Mutations ---

export const createSceneSchema = sceneDocSchema.omit({
  takes: true,
  status: true,
}).extend({
  sceneId: z.string().optional(),
  order: z.number().int().nonnegative().optional(),
  takes: z.array(takeSchema).optional().default([]),
  status: sceneStatusSchema.optional().default("idle"),
});
export type CreateSceneInput = z.infer<typeof createSceneSchema>;

/**
 * Delta Update Schema for PATCH /api/scenes/[sceneId]
 * Allows selective partial updates without resending the entire project object.
 */
export const patchSceneDeltaSchema = z.object({
  cameraAngle: cameraAngleSchema.optional(),
  cameraMovement: cameraMovementSchema.optional(),
  rawDelta: z.string().optional(),
  dialogue: z.string().optional(),
  duration: z.number().positive().optional(),
  imagePrompt: z.string().optional(),
  motionPrompt: z.string().optional(),
  firstFrameUrl: z.string().optional(),
  lastFrameUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  characterIds: z.array(z.string()).optional(),
  locationId: z.string().optional(),
  activeTakeId: z.string().optional(),
  status: sceneStatusSchema.optional(),
  title: z.string().optional(),
});
export type PatchSceneDelta = z.infer<typeof patchSceneDeltaSchema>;

export const createTakeSchema = z.object({
  takeNumber: z.number().int().positive().optional(),
  prompt: z.string().min(1, "Prompt is required"),
  motionPrompt: z.string().optional().default(""),
  model: z.string().default("kling-2.5"),
  duration: z.number().positive().default(10),
  taskId: z.string().optional(),
  videoUrl: z.string().optional().default(""),
  thumbnailUrl: z.string().optional().default(""),
});
export type CreateTakeInput = z.input<typeof createTakeSchema>;

export const reorderScenesSchema = z.object({
  sceneOrders: z.array(
    z.object({
      sceneId: z.string().min(1),
      order: z.number().int().nonnegative(),
    })
  ).min(1),
});
export type ReorderScenesInput = z.infer<typeof reorderScenesSchema>;

