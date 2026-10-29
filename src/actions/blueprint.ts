"use server";

/**
 * @file src/actions/blueprint.ts
 * @description Next.js Server Actions for Blueprint creation, retrieval, and approval.
 * Dispatches Inngest event 'project.blueprint.approved' and returns immediately.
 */

import { getAuthUser } from "@/lib/auth/getAuthUser";
import dbConnect from "@/lib/db";
import { Blueprint } from "@/models/Blueprint";
import { inngest } from "@/inngest/client";
import { blueprintSchema, type BlueprintInput } from "@/lib/validations/blueprint";
import { revalidatePath } from "next/cache";

/**
 * Creates or updates a human-readable Blueprint for a project.
 */
export async function saveBlueprintAction(data: BlueprintInput) {
  const { userId, isAuthenticated } = await getAuthUser();
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized: Session required.");
  }

  const validated = blueprintSchema.parse(data);
  await dbConnect();

  let bp = await Blueprint.findOne({ projectId: validated.projectId, userId });
  if (bp) {
    bp.title = validated.title;
    bp.theme = validated.theme;
    bp.logline = validated.logline || bp.logline;
    bp.characters = validated.characters;
    bp.environments = validated.environments;
    bp.scenes = validated.scenes;
    await bp.save();
  } else {
    bp = await Blueprint.create({
      ...validated,
      userId,
      status: "draft",
    });
  }

  return JSON.parse(JSON.stringify(bp));
}

/**
 * Approves the Blueprint and triggers the Inngest background fan-out orchestration.
 * Returns immediately so the client can transition to the asset generation loading screen.
 */
export async function approveBlueprintAction(
  blueprintId: string,
  options?: { apiKey?: string }
) {
  const { userId, isAuthenticated } = await getAuthUser();
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized: Session required.");
  }

  await dbConnect();
  const blueprint = await Blueprint.findOne({ _id: blueprintId, userId });
  if (!blueprint) {
    throw new Error("Blueprint not found or unauthorized.");
  }

  blueprint.status = "approved";
  await blueprint.save();

  // Dispatch Inngest orchestrator event
  await inngest.send({
    name: "project.blueprint.approved",
    data: {
      projectId: blueprint.projectId,
      blueprintId: blueprint._id.toString(),
      apiKey: options?.apiKey,
    },
  });

  revalidatePath(`/project/${blueprint.projectId}`);

  return {
    success: true,
    blueprintId: blueprint._id.toString(),
    projectId: blueprint.projectId,
    status: "approved",
  };
}

/**
 * Retrieves the latest Blueprint for a given project.
 */
export async function getProjectBlueprintAction(projectId: string) {
  const { userId, isAuthenticated } = await getAuthUser();
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized: Session required.");
  }

  await dbConnect();
  const bp = await Blueprint.findOne({ projectId, userId }).sort({ updatedAt: -1 });
  return bp ? JSON.parse(JSON.stringify(bp)) : null;
}
