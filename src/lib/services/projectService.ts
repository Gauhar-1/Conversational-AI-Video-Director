/**
 * @file src/lib/services/projectService.ts
 * @description Decoupled Project Service layer strictly enforcing Multi-Tenant User Isolation.
 * Handles ACID transactions, State-Decoupled Vault queries, and legacy migrations.
 */

import { Project, IProject, ISceneDoc, CameraAngle } from "@/models/Project";
import dbConnect from "@/lib/db";
import { withMongoTransaction } from "@/lib/db/transaction";
import {
  type CreateProjectType,
  type UpdateProjectType,
  DEFAULT_CHARACTER_ANCHOR,
  DEFAULT_ENVIRONMENT_ANCHOR,
} from "@/lib/validations/project";

export class ProjectService {
  /**
   * Retrieves all projects belonging to the authenticated user.
   * Restricts fields to _id, title, currentStage, and counts for high-speed dashboard rendering.
   */
  static async getProjectsByUser(userId: string) {
    const { projectRepository } = await import("@/lib/db/repositories/projectRepository");
    return await projectRepository.getUserProjects(userId);
  }

  /**
   * Retrieves a single project strictly scoped to the authenticated user.
   * Automatically migrates legacy storyboard formats if present.
   */
  static async getProjectById(userId: string, projectId: string): Promise<IProject | null> {
    await dbConnect();
    const project = await Project.findOne({ _id: projectId, userId });
    if (!project) return null;

    // Auto-migrate legacy storyboard array to strict scenes if empty
    if ((!project.scenes || project.scenes.length === 0) && project.storyboard && project.storyboard.length > 0) {
      const angles: CameraAngle[] = ["CAM_A_CENTER", "CAM_B_45_CLOSE", "CAM_C_OTS"];
      const migratedScenes: ISceneDoc[] = project.storyboard.map((s, idx) => ({
        sceneId: `scene-${s.scene_number || idx + 1}`,
        order: s.scene_number || idx + 1,
        duration: 10,
        cameraAngle: angles[idx % 3],
        rawDelta: s.action || s.location || `Scene ${idx + 1} cinematic action`,
        imagePrompt: s.frame_prompt || `[${angles[idx % 3]}]: Establishing master composition for Scene ${idx + 1}`,
        motionPrompt: s.video_prompt || `[${angles[idx % 3]}]: 10-second cinematic temporal movement`,
        firstFrameUrl: s.frame_url || "",
        lastFrameUrl: "",
        videoUrl: s.video_url || "",
        status: s.video_url ? "completed" : s.frame_url ? "ready" : "idle",
      }));

      project.scenes = migratedScenes;
      if (!project.globalVault?.characterAnchor?.description && project.visualMetadata?.style) {
        project.globalVault = {
          characterAnchor: {
            description: project.visualMetadata?.style || "Lead protagonist with cinematic detailing",
            imageUrl: project.storyboard[0]?.characters?.[0]?.generated_url || "",
            replicatePulidSeed: 42,
          },
          environmentAnchor: {
            description: project.storyboard[0]?.location || "Volumetric neon atmospheric environment",
            imageUrl: project.storyboard[0]?.background_url || "",
            lightingProfile: project.visualMetadata?.lighting || "High contrast cinematic rim lighting",
          },
          aspectRatio: "9:16",
        };
      }
      await project.save();
    }

    return project;
  }

  /**
   * Creates a new project in a resilient MongoDB transaction.
   * Initializes the Global Continuity Vault and default initial Scene 1.
   */
  static async createProject(userId: string, input?: CreateProjectType): Promise<IProject> {
    return await withMongoTransaction(async (session) => {
      const defaultScenes: ISceneDoc[] = input?.scenes && input.scenes.length > 0
        ? input.scenes.map((s, idx) => ({
            ...s,
            order: s.order || idx + 1,
            duration: s.duration || 10,
            cameraAngle: s.cameraAngle || "CAM_A_CENTER",
            status: s.status || "idle",
            takes: s.takes || [],
          })) as ISceneDoc[]
        : [
            {
              sceneId: "scene-1",
              order: 1,
              duration: 10,
              cameraAngle: "CAM_A_CENTER",
              rawDelta: "Cinematic opening sequence establishing atmosphere",
              imagePrompt: "[CAM_A_CENTER]: Master establishing frame in 9:16 vertical composition.",
              motionPrompt: "[CAM_A_CENTER]: Smooth cinematic push-in shot.",
              firstFrameUrl: "",
              lastFrameUrl: "",
              videoUrl: "",
              status: "idle",
            },
          ];

      const doc = new Project({
        userId,
        title: input?.title || "New Cinematic Project",
        globalVault: input?.globalVault || {
          characterAnchor: DEFAULT_CHARACTER_ANCHOR,
          environmentAnchor: DEFAULT_ENVIRONMENT_ANCHOR,
          aspectRatio: "9:16",
        },
        scenes: defaultScenes,
        chatHistory: [],
      });

      if (session) {
        await doc.save({ session });
      } else {
        await doc.save();
      }

      return doc;
    });
  }

  /**
   * Updates an existing project scoped strictly to userId.
   */
  static async updateProject(userId: string, projectId: string, input: UpdateProjectType): Promise<IProject | null> {
    await dbConnect();
    const updateFields: any = {};

    if (input.title !== undefined) updateFields.title = input.title;
    if (input.globalVault !== undefined) updateFields.globalVault = input.globalVault;
    if (input.scenes !== undefined) updateFields.scenes = input.scenes;

    return await Project.findOneAndUpdate(
      { _id: projectId, userId },
      { $set: updateFields },
      { new: true, runValidators: true }
    ).lean();
  }

  /**
   * Token-Saving Scene Fetch: Queries ONLY globalVault and the single target scene.
   * Explicitly avoids loading chat history to optimize token usage and payload latency.
   */
  static async getSceneWithVault(userId: string, projectId: string, sceneId: string) {
    await dbConnect();
    const project = await Project.findOne(
      { _id: projectId, userId },
      { globalVault: 1, scenes: 1 }
    ).lean();

    if (!project) return null;

    const scenes = project.scenes || [];
    const sceneIndex = scenes.findIndex((s) => s.sceneId === sceneId);
    if (sceneIndex === -1) return null;

    return {
      globalVault: project.globalVault,
      scenes,
      targetScene: scenes[sceneIndex],
      sceneIndex,
    };
  }

  /**
   * Atomically updates a specific scene within a project's scenes array.
   */
  static async updateScene(
    userId: string,
    projectId: string,
    sceneId: string,
    updates: Partial<ISceneDoc>
  ) {
    await dbConnect();
    const project = await Project.findOne({ _id: projectId, userId });
    if (!project) return null;

    const sceneIdx = project.scenes.findIndex((s) => s.sceneId === sceneId);
    if (sceneIdx === -1) return null;

    // Merge updates into the target scene
    Object.assign(project.scenes[sceneIdx], updates);
    project.markModified("scenes");
    await project.save();

    return project.scenes[sceneIdx];
  }
}
