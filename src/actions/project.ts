"use server";

/**
 * @file src/actions/project.ts
 * @description Next.js Server Actions for Project Aggregate lifecycle.
 * Strictly enforces user authentication and delegates to ProjectRepository.
 */

import { getAuthUser } from "@/lib/auth/getAuthUser";
import { projectRepository } from "@/lib/db/repositories/projectRepository";
import {
  createProjectSchema,
  projectStageSchema,
  type CreateProjectType,
  type ProjectStage,
} from "@/lib/validations/project";
import { revalidatePath } from "next/cache";

export async function createProjectAction(data?: CreateProjectType) {
  const { userId, isAuthenticated } = await getAuthUser();
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized: You must be logged in to create a project.");
  }

  const validatedData = data ? createProjectSchema.parse(data) : undefined;
  const project = await projectRepository.createProject(userId, validatedData);

  revalidatePath("/dashboard");
  return JSON.parse(JSON.stringify(project));
}

export async function updateProjectStageAction(
  projectId: string,
  stage: ProjectStage
) {
  const { userId, isAuthenticated } = await getAuthUser();
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized: Session required.");
  }

  const validatedStage = projectStageSchema.parse(stage);
  const updated = await projectRepository.updateStage(userId, projectId, validatedStage);
  if (!updated) {
    throw new Error("Project not found or unauthorized.");
  }

  revalidatePath(`/project/${projectId}`);
  return JSON.parse(JSON.stringify(updated));
}

export async function updateProjectScriptAction(
  projectId: string,
  scriptContent: string
) {
  const { userId, isAuthenticated } = await getAuthUser();
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized: Session required.");
  }

  const updated = await projectRepository.updateScript(userId, projectId, scriptContent);
  if (!updated) {
    throw new Error("Project not found or unauthorized.");
  }

  return JSON.parse(JSON.stringify(updated));
}

