"use server";

/**
 * @file src/actions/project.ts
 * @description Next.js Server Actions for Project Aggregate lifecycle.
 * Strictly enforces user authentication and delegates to ProjectRepository.
 */

import { getAuthUser } from "@/lib/auth/getAuthUser";
import { projectRepository } from "@/lib/db/repositories/projectRepository";
import { Project, ISceneDoc, ICharacterAssetDoc, ILocationAssetDoc } from "@/models/Project";
import dbConnect from "@/lib/db";
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

export interface CompilePipelinePayload {
  title?: string;
  logline?: string;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  characters?: Array<{
    assetId: string;
    name: string;
    role?: string;
    appearancePrompt: string;
    imageUrl?: string;
  }>;
  environments?: Array<{
    assetId: string;
    name: string;
    environmentPrompt: string;
    lightingProfile?: string;
    imageUrl?: string;
  }>;
  scenes?: Array<{
    sceneId: string;
    order?: number;
    duration?: number;
    cameraAngle?: string;
    cameraMovement?: string;
    rawDelta?: string;
    imagePrompt?: string;
    motionPrompt?: string;
  }>;
}

/**
 * Server Action: Compiles Writer's Room JSON Finale directly into Project state
 * and transitions project stage to the node timeline.
 */
export async function compileWritersRoomPipelineAction(
  projectId: string,
  pipelineData: CompilePipelinePayload
) {
  const { userId, isAuthenticated } = await getAuthUser();
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized: Session required.");
  }

  await dbConnect();

  const project = await Project.findOne({
    _id: projectId,
    userId,
  });

  if (!project) {
    throw new Error("Project not found or unauthorized.");
  }

  // 1. Update Project Title & Aspect Ratio
  if (pipelineData.title && pipelineData.title.trim()) {
    project.title = pipelineData.title.trim();
  }
  if (pipelineData.aspectRatio) {
    project.aspectRatio = pipelineData.aspectRatio;
  }

  // 2. Map & Lock Characters
  if (Array.isArray(pipelineData.characters) && pipelineData.characters.length > 0) {
    const characters: ICharacterAssetDoc[] = pipelineData.characters.map((c, idx) => ({
      assetId: c.assetId || `char-${idx + 1}`,
      name: c.name || `Character ${idx + 1}`,
      role: c.role || "Lead",
      appearancePrompt: c.appearancePrompt || "Cinematic character portrait",
      imageUrl: c.imageUrl || "",
      pulidSeed: 42,
      status: "draft" as const,
      generationHistory: [],
    }));
    project.global_assets.characters = characters;
  }

  // 3. Map & Lock Environments
  if (Array.isArray(pipelineData.environments) && pipelineData.environments.length > 0) {
    const locations: ILocationAssetDoc[] = pipelineData.environments.map((e, idx) => ({
      assetId: e.assetId || `env-${idx + 1}`,
      name: e.name || `Location ${idx + 1}`,
      environmentPrompt: e.environmentPrompt || "Cinematic atmospheric background",
      lightingProfile: e.lightingProfile || "High-contrast cinematic rim lighting",
      imageUrl: e.imageUrl || "",
      status: "draft" as const,
      generationHistory: [],
    }));
    project.global_assets.locations = locations;
  }

  // 4. Map & Lock Timeline Scenes
  if (Array.isArray(pipelineData.scenes) && pipelineData.scenes.length > 0) {
    const validAngles = ["CAM_A_CENTER", "CAM_B_45_CLOSE", "CAM_C_OTS", "ESTABLISHING"] as const;
    const scenes: ISceneDoc[] = pipelineData.scenes.map((s, idx) => {
      const order = s.order || idx + 1;
      const cameraAngle = (validAngles.includes(s.cameraAngle as any) ? s.cameraAngle : "CAM_A_CENTER") as any;
      return {
        sceneId: s.sceneId || `scene-${order}`,
        order,
        duration: s.duration || 5,
        cameraAngle,
        cameraMovement: (s.cameraMovement || "PUSH_IN") as any,
        rawDelta: s.rawDelta || `Scene ${order} narrative action`,
        imagePrompt: s.imagePrompt || `[${cameraAngle}]: Master composition for Scene ${order}`,
        motionPrompt: s.motionPrompt || `[${cameraAngle}]: 5-second cinematic movement`,
        firstFrameUrl: "",
        lastFrameUrl: "",
        videoUrl: "",
        status: "idle" as const,
        takes: [],
      };
    });
    project.scenes = scenes;
  }

  // 5. Advance Stage to Timeline
  project.currentStage = "timeline";
  project.markModified("global_assets");
  project.markModified("scenes");
  await project.save();

  revalidatePath(`/project/${projectId}`);
  revalidatePath(`/project/${projectId}/script`);
  revalidatePath(`/project/${projectId}/pipeline`);
  revalidatePath(`/dashboard`);

  return JSON.parse(JSON.stringify(project));
}

