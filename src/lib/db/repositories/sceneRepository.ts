/**
 * @file src/lib/db/repositories/sceneRepository.ts
 * @description Mongoose implementation of ISceneRepository.
 * Enforces atomic delta updates (PATCH /api/scenes/[id]), multi-take management,
 * and zero-leakage multi-tenant security.
 */

import { Project, ISceneDoc, ITakeDoc } from "@/models/Project";
import dbConnect from "@/lib/db";
import type { ISceneRepository } from "./types";
import type {
  SceneDoc,
  PatchSceneDelta,
  Take,
} from "@/lib/validations/project";

export class SceneRepository implements ISceneRepository {
  /**
   * Retrieves all scenes for a project sorted by scene order.
   */
  async getScenesByProject(userId: string, projectId: string): Promise<ISceneDoc[]> {
    await dbConnect();
    const project = await Project.findOne(
      { _id: projectId, userId },
      { scenes: 1 }
    ).lean();

    if (!project || !Array.isArray(project.scenes)) {
      return [];
    }

    return (project.scenes as ISceneDoc[]).sort((a, b) => a.order - b.order);
  }

  /**
   * Retrieves a single scene by its sceneId.
   */
  async getSceneById(
    userId: string,
    sceneId: string,
    projectId?: string
  ): Promise<ISceneDoc | null> {
    await dbConnect();

    const query: Record<string, any> = { userId, "scenes.sceneId": sceneId };
    if (projectId) query._id = projectId;

    const project = await Project.findOne(query, { "scenes.$": 1 }).lean();
    if (!project || !project.scenes || project.scenes.length === 0) {
      return null;
    }

    return project.scenes[0] as ISceneDoc;
  }

  /**
   * Delta Update: Updates specific properties of a single scene without rewriting the project.
   * Directly addresses Section 3 (Bandwidth Optimization: PATCH /api/scenes/[id]).
   */
  async updateSceneDelta(
    userId: string,
    sceneId: string,
    delta: PatchSceneDelta,
    projectId?: string
  ): Promise<ISceneDoc | null> {
    await dbConnect();

    const query: Record<string, any> = { userId, "scenes.sceneId": sceneId };
    if (projectId) query._id = projectId;

    const setFields: Record<string, any> = {};
    for (const [key, val] of Object.entries(delta)) {
      if (val !== undefined) {
        setFields[`scenes.$.${key}`] = val;
      }
    }

    if (Object.keys(setFields).length === 0) {
      return this.getSceneById(userId, sceneId, projectId);
    }

    const updated = await Project.findOneAndUpdate(
      query,
      { $set: setFields },
      { new: true, runValidators: true }
    );

    if (!updated) return null;
    return updated.scenes.find((s) => s.sceneId === sceneId) || null;
  }

  /**
   * Appends a new scene to the project timeline.
   */
  async addScene(
    userId: string,
    projectId: string,
    scene: SceneDoc
  ): Promise<ISceneDoc | null> {
    await dbConnect();

    const project = await Project.findOne({ _id: projectId, userId }, { scenes: 1 });
    if (!project) return null;

    const nextOrder = scene.order || (project.scenes.length + 1);
    const sceneToInsert: ISceneDoc = {
      ...scene,
      order: nextOrder,
      takes: scene.takes || [],
      status: scene.status || "idle",
    };

    const updated = await Project.findOneAndUpdate(
      { _id: projectId, userId },
      { $push: { scenes: sceneToInsert } },
      { new: true, runValidators: true }
    );

    if (!updated) return null;
    return updated.scenes.find((s) => s.sceneId === scene.sceneId) || null;
  }

  /**
   * Deletes a scene from the project timeline.
   */
  async deleteScene(
    userId: string,
    projectId: string,
    sceneId: string
  ): Promise<boolean> {
    await dbConnect();

    const updated = await Project.findOneAndUpdate(
      { _id: projectId, userId },
      { $pull: { scenes: { sceneId } } },
      { new: true }
    );

    return !!updated;
  }

  /**
   * Reorders scenes on the timeline.
   */
  async reorderScenes(
    userId: string,
    projectId: string,
    orders: { sceneId: string; order: number }[]
  ): Promise<ISceneDoc[] | null> {
    await dbConnect();

    const project = await Project.findOne({ _id: projectId, userId });
    if (!project) return null;

    const orderMap = new Map(orders.map((o) => [o.sceneId, o.order]));

    for (const scene of project.scenes) {
      if (orderMap.has(scene.sceneId)) {
        scene.order = orderMap.get(scene.sceneId)!;
      }
    }

    project.scenes.sort((a, b) => a.order - b.order);
    await project.save();

    return project.scenes;
  }

  /**
   * Adds a new video generation take to a scene's takes array.
   */
  async addTake(
    userId: string,
    sceneId: string,
    take: Take,
    projectId?: string
  ): Promise<ITakeDoc | null> {
    await dbConnect();

    const query: Record<string, any> = { userId, "scenes.sceneId": sceneId };
    if (projectId) query._id = projectId;

    const updated = await Project.findOneAndUpdate(
      query,
      { $push: { "scenes.$.takes": take } },
      { new: true, runValidators: true }
    );

    if (!updated) return null;
    const scene = updated.scenes.find((s) => s.sceneId === sceneId);
    if (!scene) return null;

    const takes = scene.takes || [];
    return takes.find((t) => t.takeId === take.takeId) || null;
  }

  /**
   * Selects an active take for sequential playback and FCPXML export.
   * Synchronizes scenes.$.videoUrl to the active take video for fast loading.
   */
  async setActiveTake(
    userId: string,
    sceneId: string,
    takeId: string,
    projectId?: string
  ): Promise<ISceneDoc | null> {
    await dbConnect();

    const targetScene = await this.getSceneById(userId, sceneId, projectId);
    if (!targetScene) return null;

    const takes = targetScene.takes || [];
    const activeTake = takes.find((t) => t.takeId === takeId);
    const videoUrl = activeTake?.videoUrl || "";

    const query: Record<string, any> = { userId, "scenes.sceneId": sceneId };
    if (projectId) query._id = projectId;

    const updated = await Project.findOneAndUpdate(
      query,
      {
        $set: {
          "scenes.$.activeTakeId": takeId,
          "scenes.$.videoUrl": videoUrl,
        },
      },
      { new: true, runValidators: true }
    );

    if (!updated) return null;
    return updated.scenes.find((s) => s.sceneId === sceneId) || null;
  }

  /**
   * Deletes a specific take from a scene.
   */
  async deleteTake(
    userId: string,
    sceneId: string,
    takeId: string,
    projectId?: string
  ): Promise<boolean> {
    await dbConnect();

    const query: Record<string, any> = { userId, "scenes.sceneId": sceneId };
    if (projectId) query._id = projectId;

    const updated = await Project.findOneAndUpdate(
      query,
      { $pull: { "scenes.$.takes": { takeId } } },
      { new: true }
    );

    return !!updated;
  }
}

export const sceneRepository = new SceneRepository();
