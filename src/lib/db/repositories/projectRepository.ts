/**
 * @file src/lib/db/repositories/projectRepository.ts
 * @description Mongoose implementation of IProjectRepository strictly enforcing
 * Multi-Tenant isolation, projection-based bandwidth optimization, and atomic transactions.
 */

import { Project, IProject } from "@/models/Project";
import dbConnect from "@/lib/db";
import { withMongoTransaction } from "@/lib/db/transaction";
import type { IProjectRepository } from "./types";
import type {
  CreateProjectType,
  UpdateProjectType,
  ProjectSummary,
  ProjectStage,
} from "@/lib/validations/project";

export class ProjectRepository implements IProjectRepository {
  /**
   * Retrieves lightweight project summaries for the user dashboard.
   * Employs projection to exclude heavy scenes and prompts, minimizing bandwidth.
   */
  async getUserProjects(userId: string): Promise<ProjectSummary[]> {
    await dbConnect();

    const projects = await Project.find({ userId })
      .select(
        "_id userId title thumbnailUrl currentStage aspectRatio scenes.sceneId global_assets.characters.assetId global_assets.locations.assetId updatedAt createdAt"
      )
      .sort({ updatedAt: -1 })
      .lean();

    return projects.map((p: any) => ({
      _id: p._id.toString(),
      userId: p.userId,
      title: p.title || "Untitled Project",
      thumbnail: p.thumbnailUrl || p.thumbnail || "",
      thumbnailUrl: p.thumbnailUrl || p.thumbnail || "",
      currentStage: (p.currentStage as ProjectStage) || "writers_room",
      aspectRatio: p.aspectRatio || "9:16",
      sceneCount: Array.isArray(p.scenes) ? p.scenes.length : 0,
      characterCount: Array.isArray(p.global_assets?.characters)
        ? p.global_assets.characters.length
        : 0,
      locationCount: Array.isArray(p.global_assets?.locations)
        ? p.global_assets.locations.length
        : 0,
      updatedAt: p.updatedAt,
      createdAt: p.createdAt,
    }));
  }

  /**
   * Retrieves a full project document strictly scoped to the authenticated user.
   */
  async getProjectById(userId: string, projectId: string): Promise<IProject | null> {
    await dbConnect();
    return await Project.findOne({ _id: projectId, userId });
  }

  /**
   * Creates a new project document inside a resilient MongoDB transaction.
   * Initializes default 9:16 aspect ratio, Writer's Room stage, and Scene 1.
   */
  async createProject(userId: string, data?: CreateProjectType): Promise<IProject> {
    return await withMongoTransaction(async (session) => {
      const defaultScenes = data?.scenes && data.scenes.length > 0
        ? data.scenes
        : [
            {
              sceneId: "scene-1",
              order: 1,
              title: "Opening Scene",
              duration: 10,
              cameraAngle: "CAM_A_CENTER" as const,
              cameraMovement: "STATIC" as const,
              rawDelta: "Cinematic opening sequence establishing atmosphere",
              imagePrompt: "[CAM_A_CENTER]: Master establishing frame in 9:16 vertical composition.",
              motionPrompt: "[CAM_A_CENTER]: Smooth cinematic push-in shot.",
              firstFrameUrl: "",
              lastFrameUrl: "",
              videoUrl: "",
              takes: [],
              status: "idle" as const,
            },
          ];

      const newProject = new Project({
        userId,
        title: data?.title || "New Project",
        currentStage: data?.currentStage || "writers_room",
        aspectRatio: data?.aspectRatio || "9:16",
        scriptContent: data?.scriptContent || "",
        global_assets: data?.global_assets || { characters: [], locations: [] },
        scenes: defaultScenes,
        chatHistory: [],
        exportConfig: {
          fcpxmlVersion: "1.9",
          frameRate: 24,
          resolution: { width: 1080, height: 1920 },
        },
      });

      if (session) {
        await newProject.save({ session });
      } else {
        await newProject.save();
      }

      return newProject;
    });
  }

  /**
   * Updates top-level project metadata.
   */
  async updateProject(
    userId: string,
    projectId: string,
    data: UpdateProjectType
  ): Promise<IProject | null> {
    await dbConnect();

    const updateFields: Record<string, any> = {};

    if (data.title !== undefined) updateFields.title = data.title;
    if (data.currentStage !== undefined) updateFields.currentStage = data.currentStage;
    if (data.aspectRatio !== undefined) updateFields.aspectRatio = data.aspectRatio;
    if (data.scriptContent !== undefined) updateFields.scriptContent = data.scriptContent;
    if (data.scenes !== undefined) updateFields.scenes = data.scenes;
    if (data.exportConfig !== undefined) updateFields.exportConfig = data.exportConfig;
    if (data.global_assets !== undefined) {
      if (data.global_assets.characters) {
        updateFields["global_assets.characters"] = data.global_assets.characters;
      }
      if (data.global_assets.locations) {
        updateFields["global_assets.locations"] = data.global_assets.locations;
      }
    }

    return await Project.findOneAndUpdate(
      { _id: projectId, userId },
      { $set: updateFields },
      { new: true, runValidators: true }
    );
  }

  /**
   * Transitions the project through progressive disclosure stages.
   */
  async updateStage(
    userId: string,
    projectId: string,
    stage: ProjectStage
  ): Promise<IProject | null> {
    await dbConnect();
    return await Project.findOneAndUpdate(
      { _id: projectId, userId },
      { $set: { currentStage: stage } },
      { new: true, runValidators: true }
    );
  }

  /**
   * Updates the raw script content from the Writer's Room.
   */
  async updateScript(
    userId: string,
    projectId: string,
    scriptContent: string
  ): Promise<IProject | null> {
    await dbConnect();
    return await Project.findOneAndUpdate(
      { _id: projectId, userId },
      { $set: { scriptContent } },
      { new: true, runValidators: true }
    );
  }

  /**
   * Deletes a project scoped strictly to userId.
   */
  async deleteProject(userId: string, projectId: string): Promise<boolean> {
    await dbConnect();
    const result = await Project.deleteOne({ _id: projectId, userId });
    return result.deletedCount > 0;
  }
}

export const projectRepository = new ProjectRepository();

