"use server";

/**
 * @file src/actions/assets.ts
 * @description Next.js Server Actions for Casting & Scouting Global Assets.
 * Invokes ReplicateService (FLUX + PuLID) and persists to Project.global_assets via AssetRepository.
 */

import { getAuthUser } from "@/lib/auth/getAuthUser";
import { assetRepository } from "@/lib/db/repositories/assetRepository";
import { replicateService } from "@/lib/services/ai/ReplicateService";
import {
  createCharacterAssetSchema,
  createLocationAssetSchema,
  approveAssetSchema,
  type CharacterAsset,
  type LocationAsset,
} from "@/lib/validations/project";
import { revalidatePath } from "next/cache";

export async function generateCharacterAssetAction(
  projectId: string,
  input: {
    name: string;
    appearancePrompt: string;
    role?: string;
    pulidSeed?: number;
    apiKey?: string;
  }
) {
  const { userId, isAuthenticated } = await getAuthUser();
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized: Session required.");
  }

  const assetId = `char-${Date.now()}`;
  const seed = input.pulidSeed || 42;

  // 1. Generate via Replicate FLUX Schnell with seed preservation
  const result = await replicateService.generateCharacterSheet(
    input.name,
    input.appearancePrompt,
    seed,
    input.apiKey
  );

  // 2. Build domain character entity
  const character: CharacterAsset = {
    assetId,
    name: input.name,
    role: input.role || "Lead",
    appearancePrompt: input.appearancePrompt,
    imageUrl: result.imageUrl,
    pulidSeed: seed,
    status: "draft",
    generationHistory: [
      {
        id: `hist-${Date.now()}`,
        url: result.imageUrl,
        prompt: input.appearancePrompt,
        seed,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  // 3. Persist to Project.global_assets.characters
  const saved = await assetRepository.addCharacter(userId, projectId, character);
  if (!saved) {
    throw new Error("Failed to save character to project vault.");
  }

  revalidatePath(`/project/${projectId}/casting`);
  return JSON.parse(JSON.stringify(saved));
}

export async function approveCharacterAssetAction(
  projectId: string,
  assetId: string,
  approvedImageUrl: string
) {
  const { userId, isAuthenticated } = await getAuthUser();
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized: Session required.");
  }

  const approved = await assetRepository.approveCharacter(
    userId,
    projectId,
    assetId,
    approvedImageUrl
  );

  if (!approved) {
    throw new Error("Character asset not found.");
  }

  revalidatePath(`/project/${projectId}/casting`);
  return JSON.parse(JSON.stringify(approved));
}

export async function deleteCharacterAssetAction(
  projectId: string,
  assetId: string
) {
  const { userId, isAuthenticated } = await getAuthUser();
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized: Session required.");
  }

  const success = await assetRepository.removeCharacter(userId, projectId, assetId);
  revalidatePath(`/project/${projectId}/casting`);
  return success;
}

export async function generateLocationAssetAction(
  projectId: string,
  input: {
    name: string;
    environmentPrompt: string;
    lightingProfile?: string;
    apiKey?: string;
  }
) {
  const { userId, isAuthenticated } = await getAuthUser();
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized: Session required.");
  }

  const assetId = `loc-${Date.now()}`;

  // 1. Generate empty environmental plate via Replicate FLUX
  const result = await replicateService.generateLocationPlate(
    input.name,
    input.environmentPrompt,
    input.lightingProfile,
    input.apiKey
  );

  // 2. Build domain location entity
  const location: LocationAsset = {
    assetId,
    name: input.name,
    environmentPrompt: input.environmentPrompt,
    lightingProfile: input.lightingProfile || "Cinematic atmospheric lighting",
    imageUrl: result.imageUrl,
    status: "draft",
    generationHistory: [
      {
        id: `hist-${Date.now()}`,
        url: result.imageUrl,
        prompt: input.environmentPrompt,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  // 3. Persist to Project.global_assets.locations
  const saved = await assetRepository.addLocation(userId, projectId, location);
  if (!saved) {
    throw new Error("Failed to save location to project vault.");
  }

  revalidatePath(`/project/${projectId}/casting`);
  return JSON.parse(JSON.stringify(saved));
}

export async function approveLocationAssetAction(
  projectId: string,
  assetId: string,
  approvedImageUrl: string
) {
  const { userId, isAuthenticated } = await getAuthUser();
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized: Session required.");
  }

  const approved = await assetRepository.approveLocation(
    userId,
    projectId,
    assetId,
    approvedImageUrl
  );

  if (!approved) {
    throw new Error("Location asset not found.");
  }

  revalidatePath(`/project/${projectId}/casting`);
  return JSON.parse(JSON.stringify(approved));
}

export async function deleteLocationAssetAction(
  projectId: string,
  assetId: string
) {
  const { userId, isAuthenticated } = await getAuthUser();
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized: Session required.");
  }

  const success = await assetRepository.removeLocation(userId, projectId, assetId);
  revalidatePath(`/project/${projectId}/casting`);
  return success;
}

export async function updateCharacterPromptAction(
  projectId: string,
  assetId: string,
  prompt: string
) {
  const { userId, isAuthenticated } = await getAuthUser();
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized: Session required.");
  }

  const updated = await assetRepository.updateCharacter(userId, projectId, assetId, {
    appearancePrompt: prompt,
  });
  revalidatePath(`/project/${projectId}/casting`);
  return JSON.parse(JSON.stringify(updated));
}

export async function updateLocationPromptAction(
  projectId: string,
  assetId: string,
  prompt: string,
  lightingProfile?: string
) {
  const { userId, isAuthenticated } = await getAuthUser();
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized: Session required.");
  }

  const updated = await assetRepository.updateLocation(userId, projectId, assetId, {
    environmentPrompt: prompt,
    ...(lightingProfile ? { lightingProfile } : {}),
  });
  revalidatePath(`/project/${projectId}/casting`);
  return JSON.parse(JSON.stringify(updated));
}


export async function enrichPromptAction(
  prompt: string,
  type: "character" | "location" | "scene" = "scene",
  apiKey?: string
): Promise<string> {
  const { groqService } = await import("@/lib/services/ai/GroqService");
  return await groqService.enrichPrompt(prompt, type, apiKey);
}


