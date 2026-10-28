/**
 * @file src/lib/validations/project.ts
 * @description Zod Schemas for Project, Global Assets, Scenes, and Projections.
 * Strict typing across the 4-stage progressive disclosure pipeline:
 * 1. Writer's Room -> 2. Casting/Scouting Wizard -> 3. Auto-Wired Timeline -> 4. Export Engine.
 */

import { z } from "zod";
import {
  globalAssetsSchema,
  characterAssetSchema,
  locationAssetSchema,
  type GlobalAssets,
  type CharacterAsset,
  type LocationAsset,
} from "./asset";
import {
  sceneDocSchema,
  cameraAngleSchema,
  cameraMovementSchema,
  sceneStatusSchema,
  takeSchema,
  type SceneDoc,
  type CameraAngle,
  type CameraMovement,
  type SceneStatus,
  type Take,
} from "./scene";

// Re-export asset & scene schemas for convenience
export * from "./asset";
export * from "./scene";

// --- PROJECT STAGES ---
export const projectStageSchema = z.enum([
  "writers_room",
  "casting_scouting",
  "timeline",
  "export",
]);
export type ProjectStage = z.infer<typeof projectStageSchema>;

// --- ENUMS & LEGACY ANCHORS ---
export type CameraAngleType = CameraAngle;
export type SceneStatusType = SceneStatus;
export type SceneDocType = SceneDoc;

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

export const aspectRatioSchema = z.enum(["9:16", "16:9", "1:1"]).default("9:16");
export type AspectRatio = z.infer<typeof aspectRatioSchema>;

// Legacy Global Vault schema for backward compatibility
export const globalVaultSchema = z.object({
  characterAnchor: characterAnchorSchema.default(DEFAULT_CHARACTER_ANCHOR),
  environmentAnchor: environmentAnchorSchema.default(DEFAULT_ENVIRONMENT_ANCHOR),
  aspectRatio: aspectRatioSchema,
});
export type GlobalVaultType = z.infer<typeof globalVaultSchema>;

// --- CHAT & SCRIPT ---
export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  timestamp: z.string().default(() => new Date().toISOString()),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

// --- EXPORT CONFIG ---
export const exportConfigSchema = z.object({
  fcpxmlVersion: z.string().default("1.9"),
  frameRate: z.number().int().positive().default(24),
  resolution: z
    .object({
      width: z.number().int().positive().default(1080),
      height: z.number().int().positive().default(1920),
    })
    .default({ width: 1080, height: 1920 }),
});
export type ExportConfig = z.infer<typeof exportConfigSchema>;

// --- FULL PROJECT DOCUMENT SCHEMA ---
export const projectDocSchema = z.object({
  _id: z.string(),
  userId: z.string().uuid().or(z.string().min(1)),
  title: z.string().trim().min(1).max(120).default("Untitled Project"),
  currentStage: projectStageSchema.default("writers_room"),
  aspectRatio: aspectRatioSchema.default("9:16"),
  scriptContent: z.string().default(""),
  global_assets: globalAssetsSchema.default({ characters: [], locations: [] }),
  // Legacy globalVault retained for seamless backward compatibility
  globalVault: globalVaultSchema.optional(),
  scenes: z.array(sceneDocSchema).default([]),
  chatHistory: z.array(chatMessageSchema).default([]),
  exportConfig: exportConfigSchema.default({
    fcpxmlVersion: "1.9",
    frameRate: 24,
    resolution: { width: 1080, height: 1920 },
  }),
  visualMetadata: z.record(z.string(), z.any()).optional().default({}),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});
export type ProjectDoc = z.infer<typeof projectDocSchema>;

// --- MONGOOSE PROJECTION: DASHBOARD PROJECT SUMMARY ---
/**
 * Ultra-lean projection for /dashboard grid.
 * Strictly excludes heavy scenes and base64 payloads to minimize bandwidth and memory.
 */
export const projectSummarySchema = z.object({
  _id: z.string(),
  userId: z.string(),
  title: z.string(),
  currentStage: projectStageSchema.default("writers_room"),
  aspectRatio: aspectRatioSchema.default("9:16"),
  sceneCount: z.number().int().nonnegative().default(0),
  characterCount: z.number().int().nonnegative().default(0),
  locationCount: z.number().int().nonnegative().default(0),
  updatedAt: z.union([z.date(), z.string()]),
  createdAt: z.union([z.date(), z.string()]),
});
export type ProjectSummary = z.infer<typeof projectSummarySchema>;

// --- MUTATION SCHEMAS ---

export const createProjectSchema = z.object({
  title: z.string().trim().min(1).max(120).default("New Project"),
  aspectRatio: aspectRatioSchema.optional().default("9:16"),
  scriptContent: z.string().optional().default(""),
  currentStage: projectStageSchema.optional().default("writers_room"),
  global_assets: globalAssetsSchema.optional(),
  globalVault: globalVaultSchema.optional(),
  scenes: z.array(sceneDocSchema).optional(),
});
export type CreateProjectType = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  currentStage: projectStageSchema.optional(),
  aspectRatio: aspectRatioSchema.optional(),
  scriptContent: z.string().optional(),
  global_assets: globalAssetsSchema.partial().optional(),
  globalVault: globalVaultSchema.partial().optional(),
  scenes: z.array(sceneDocSchema).optional(),
  exportConfig: exportConfigSchema.partial().optional(),
});
export type UpdateProjectType = z.infer<typeof updateProjectSchema>;

export const enrichSceneSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  rawDelta: z.string().optional().default(""),
  cameraAngle: cameraAngleSchema.optional().default("CAM_A_CENTER"),
});
export type EnrichSceneType = z.infer<typeof enrichSceneSchema>;
