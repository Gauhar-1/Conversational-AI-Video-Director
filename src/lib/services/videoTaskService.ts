/**
 * @file src/lib/services/videoTaskService.ts
 * @description Video Task Service for tracking generation states, polling, and enforcing user isolation.
 */

import { VideoTask, IVideoTask } from "@/models/VideoTask";
import dbConnect from "@/lib/db";

export class VideoTaskService {
  /**
   * Finds an existing task by idempotency key to prevent double generation/billing.
   */
  static async findByIdempotencyKey(
    userId: string,
    idempotencyKey: string
  ): Promise<IVideoTask | null> {
    await dbConnect();
    return await VideoTask.findOne({ userId, idempotencyKey }).lean();
  }

  /**
   * Creates a new video task record.
   */
  static async createTask(data: {
    userId: string;
    projectId: string;
    sceneId?: string;
    sceneNumber?: number;
    idempotencyKey?: string;
    replicatePredictionId?: string;
    originalPrompt: string;
    enhancedPrompt?: string;
    providerName?: string;
  }): Promise<IVideoTask> {
    await dbConnect();
    return await VideoTask.create({
      userId: data.userId,
      projectId: data.projectId,
      sceneId: data.sceneId,
      sceneNumber: data.sceneNumber,
      idempotencyKey: data.idempotencyKey,
      status: "processing",
      replicatePredictionId: data.replicatePredictionId,
      originalPrompt: data.originalPrompt,
      enhancedPrompt: data.enhancedPrompt,
      logs: [
        {
          providerName: data.providerName || "Replicate",
          attemptNumber: 1,
          timestamp: new Date(),
        },
      ],
    });
  }

  /**
   * Retrieves a task by ID scoped to the authenticated user.
   */
  static async getTaskById(userId: string, taskId: string): Promise<IVideoTask | null> {
    await dbConnect();
    return await VideoTask.findOne({ _id: taskId, userId }).lean();
  }

  /**
   * Updates task status and stores output video URL or error message.
   */
  static async updateTask(
    userId: string,
    taskId: string,
    updates: {
      status?: "pending" | "processing" | "completed" | "failed";
      finalVideoUrl?: string;
      error?: string;
      logEntry?: {
        providerName?: string;
        modelUsed?: string;
        errorReason?: string;
      };
    }
  ): Promise<IVideoTask | null> {
    await dbConnect();
    const updateQuery: any = {};

    if (updates.status) updateQuery.status = updates.status;
    if (updates.finalVideoUrl) updateQuery.finalVideoUrl = updates.finalVideoUrl;
    if (updates.error) updateQuery.error = updates.error;

    const pushQuery: any = {};
    if (updates.logEntry) {
      pushQuery.logs = {
        ...updates.logEntry,
        timestamp: new Date(),
      };
    }

    const updateDoc: any = {};
    if (Object.keys(updateQuery).length > 0) updateDoc.$set = updateQuery;
    if (Object.keys(pushQuery).length > 0) updateDoc.$push = pushQuery;

    return await VideoTask.findOneAndUpdate(
      { _id: taskId, userId },
      updateDoc,
      { new: true }
    ).lean();
  }
}
