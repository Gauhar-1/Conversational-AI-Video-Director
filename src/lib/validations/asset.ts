/**
 * @file src/lib/validations/asset.ts
 * @description Zod schemas and TypeScript types for Casting & Scouting Global Assets.
 * Supports character consistency (FLUX + PuLID) and environmental background anchors.
 */

import { z } from "zod";

export const assetTypeSchema = z.enum(["character", "location", "audio", "style"]);
export type AssetType = z.infer<typeof assetTypeSchema>;

export const assetStatusSchema = z.enum(["draft", "generating", "approved", "rejected"]);
export type AssetStatus = z.infer<typeof assetStatusSchema>;

export const assetHistoryItemSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  prompt: z.string().default(""),
  seed: z.number().optional(),
  createdAt: z.string().default(() => new Date().toISOString()),
});
export type AssetHistoryItem = z.infer<typeof assetHistoryItemSchema>;

export const characterAssetSchema = z.object({
  assetId: z.string().min(1, "assetId is required"),
  name: z.string().min(1, "Character name is required"),
  role: z.string().default("Lead"),
  appearancePrompt: z.string().min(1, "Appearance prompt is required"),
  imageUrl: z.string().default(""),
  pulidSeed: z.number().int().default(42),
  status: assetStatusSchema.default("draft"),
  generationHistory: z.array(assetHistoryItemSchema).default([]),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type CharacterAsset = z.infer<typeof characterAssetSchema>;

export const locationAssetSchema = z.object({
  assetId: z.string().min(1, "assetId is required"),
  name: z.string().min(1, "Location name is required"),
  environmentPrompt: z.string().min(1, "Environment prompt is required"),
  lightingProfile: z.string().default("Cinematic atmospheric lighting"),
  imageUrl: z.string().default(""),
  status: assetStatusSchema.default("draft"),
  generationHistory: z.array(assetHistoryItemSchema).default([]),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type LocationAsset = z.infer<typeof locationAssetSchema>;

export const globalAssetsSchema = z.object({
  characters: z.array(characterAssetSchema).default([]),
  locations: z.array(locationAssetSchema).default([]),
});
export type GlobalAssets = z.infer<typeof globalAssetsSchema>;

// --- DTO Schemas for Mutations ---

export const createCharacterAssetSchema = characterAssetSchema.omit({
  status: true,
  generationHistory: true,
}).extend({
  assetId: z.string().optional(),
  imageUrl: z.string().optional().default(""),
  pulidSeed: z.number().int().optional().default(42),
  role: z.string().optional().default("Lead"),
});
export type CreateCharacterAssetInput = z.infer<typeof createCharacterAssetSchema>;

export const updateCharacterAssetSchema = characterAssetSchema.partial().omit({
  assetId: true,
});
export type UpdateCharacterAssetInput = z.infer<typeof updateCharacterAssetSchema>;

export const createLocationAssetSchema = locationAssetSchema.omit({
  status: true,
  generationHistory: true,
}).extend({
  assetId: z.string().optional(),
  imageUrl: z.string().optional().default(""),
  lightingProfile: z.string().optional().default("Cinematic atmospheric lighting"),
});
export type CreateLocationAssetInput = z.infer<typeof createLocationAssetSchema>;

export const updateLocationAssetSchema = locationAssetSchema.partial().omit({
  assetId: true,
});
export type UpdateLocationAssetInput = z.infer<typeof updateLocationAssetSchema>;

export const approveAssetSchema = z.object({
  assetId: z.string().min(1),
  imageUrl: z.string().url("A valid image URL is required for asset approval"),
});
export type ApproveAssetInput = z.infer<typeof approveAssetSchema>;

