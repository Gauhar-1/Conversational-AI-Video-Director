"use server";

/**
 * @file src/actions/scenes.ts
 * @description Next.js Server Actions for isolated scene operations,
 * atomic delta updates (PATCH /api/scenes/[id]), and multi-take management.
 */

import { getAuthUser } from "@/lib/auth/getAuthUser";
import { sceneRepository } from "@/lib/db/repositories/sceneRepository";
import {
  patchSceneDeltaSchema,
  createTakeSchema,
  type PatchSceneDelta,
  type CreateTakeInput,
  type Take,
} from "@/lib/validations/project";
import { revalidatePath } from "next/cache";

export async function updateSceneDeltaAction(
  sceneId: string,
  delta: PatchSceneDelta,
  projectId?: string
) {
  const { userId, isAuthenticated } = await getAuthUser();
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized: Session required.");
  }

  const validatedDelta = patchSceneDeltaSchema.parse(delta);
  const updatedScene = await sceneRepository.updateSceneDelta(
    userId,
    sceneId,
    validatedDelta,
    projectId
  );

  if (!updatedScene) {
    throw new Error("Scene not found or unauthorized.");
  }

  if (projectId) {
    revalidatePath(`/project/${projectId}/pipeline`);
  }

  return JSON.parse(JSON.stringify(updatedScene));
}

export async function addTakeAction(
  arg1: string,
  arg2: CreateTakeInput | string,
  arg3?: string
) {
  const { userId, isAuthenticated } = await getAuthUser();
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized: Session required.");
  }

  let sceneId: string;
  let validatedInput: CreateTakeInput;
  let projectId: string | undefined;

  // Handle (projectId, sceneId, prompt)
  if (typeof arg2 === "string") {
    projectId = arg1;
    sceneId = arg2;
    validatedInput = createTakeSchema.parse({ prompt: arg3 || "New Take variation" });
  } else {
    // Handle (sceneId, input, projectId)
    sceneId = arg1;
    validatedInput = createTakeSchema.parse(arg2);
    projectId = arg3;
  }

  const takeId = `take-${Date.now()}`;

  const take: Take = {
    takeId,
    takeNumber: validatedInput.takeNumber || 1,
    videoUrl: validatedInput.videoUrl || "",
    thumbnailUrl: validatedInput.thumbnailUrl,
    prompt: validatedInput.prompt,
    motionPrompt: validatedInput.motionPrompt,
    model: validatedInput.model || "kling-2.5",
    status: validatedInput.videoUrl ? "completed" : "pending",
    taskId: validatedInput.taskId,
    duration: validatedInput.duration || 10,
    createdAt: new Date().toISOString(),
  };

  const addedTake = await sceneRepository.addTake(userId, sceneId, take, projectId);
  if (!addedTake) {
    throw new Error("Failed to add take to scene.");
  }

  // If this is the active or only take, set as active
  if (validatedInput.videoUrl) {
    await sceneRepository.setActiveTake(userId, sceneId, takeId, projectId);
  }

  if (projectId) {
    revalidatePath(`/project/${projectId}/pipeline`);
  }

  return JSON.parse(JSON.stringify(addedTake));
}

export async function setActiveTakeAction(
  arg1: string,
  arg2: string,
  arg3?: string
) {
  const { userId, isAuthenticated } = await getAuthUser();
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized: Session required.");
  }

  // Handle (projectId, sceneId, takeId) vs (sceneId, takeId, projectId)
  let sceneId: string;
  let takeId: string;
  let projectId: string | undefined;

  if (arg3) {
    if (arg1.startsWith("proj-") || arg1.length === 24) {
      projectId = arg1;
      sceneId = arg2;
      takeId = arg3;
    } else {
      sceneId = arg1;
      takeId = arg2;
      projectId = arg3;
    }
  } else {
    sceneId = arg1;
    takeId = arg2;
  }

  const updatedScene = await sceneRepository.setActiveTake(
    userId,
    sceneId,
    takeId,
    projectId
  );

  if (!updatedScene) {
    throw new Error("Failed to set active take.");
  }

  if (projectId) {
    revalidatePath(`/project/${projectId}/pipeline`);
  }

  return JSON.parse(JSON.stringify(updatedScene));
}

export async function deleteTakeAction(
  arg1: string,
  arg2: string,
  arg3?: string
) {
  const { userId, isAuthenticated } = await getAuthUser();
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized: Session required.");
  }

  let sceneId: string;
  let takeId: string;
  let projectId: string | undefined;

  if (arg3) {
    if (arg1.startsWith("proj-") || arg1.length === 24) {
      projectId = arg1;
      sceneId = arg2;
      takeId = arg3;
    } else {
      sceneId = arg1;
      takeId = arg2;
      projectId = arg3;
    }
  } else {
    sceneId = arg1;
    takeId = arg2;
  }

  const success = await sceneRepository.deleteTake(
    userId,
    sceneId,
    takeId,
    projectId
  );

  if (projectId) {
    revalidatePath(`/project/${projectId}/pipeline`);
  }

  return success;
}

export async function reorderScenesAction(
  projectId: string,
  orders: { sceneId: string; order: number }[]
) {
  const { userId, isAuthenticated } = await getAuthUser();
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized: Session required.");
  }

  const reordered = await sceneRepository.reorderScenes(userId, projectId, orders);
  if (!reordered) {
    throw new Error("Failed to reorder scenes.");
  }

  revalidatePath(`/project/${projectId}/pipeline`);
  return JSON.parse(JSON.stringify(reordered));
}

