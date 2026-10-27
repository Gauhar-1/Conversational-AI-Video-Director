/**
 * @file src/app/api/generate-video/status/[taskId]/route.ts
 * @description API route to check video generation status and poll prediction states.
 * Enforces multi-tenant user authentication, VideoTaskService, and scene syncing.
 */

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { VideoTaskService } from "@/lib/services/videoTaskService";
import { ProjectService } from "@/lib/services/projectService";
import { VideoGeneratorFactory } from "@/lib/generators/VideoGeneratorFactory";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { userId, isAuthenticated } = await getAuthUser(req);
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: "Unauthorized: Valid access token required." }, { status: 401 });
    }
    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json({ error: "taskId parameter is required" }, { status: 400 });
    }

    const task = await VideoTaskService.getTaskById(userId, taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // 1. If already completed, return cached URL immediately
    if (task.status === "completed" && task.finalVideoUrl) {
      return NextResponse.json({
        status: "completed",
        finalVideoUrl: task.finalVideoUrl,
        logs: task.logs,
        enhancedPrompt: task.enhancedPrompt,
      });
    }

    // 2. If already failed, return error state immediately
    if (task.status === "failed") {
      return NextResponse.json({
        status: "failed",
        logs: task.logs,
        enhancedPrompt: task.enhancedPrompt,
        error: task.error,
      });
    }

    // 3. If in flight and has prediction ID, poll the provider
    const replicateApiKey =
      req.headers.get("X-Replicate-Key") ||
      process.env.REPLICATE_API_KEY ||
      process.env.REPLICATE_API_TOKEN;

    if (task.replicatePredictionId && replicateApiKey) {
      const generator = VideoGeneratorFactory.getGenerator(task.logs?.[0]?.providerName || "kling");
      const statusResult = await generator.checkStatus(task.replicatePredictionId, replicateApiKey);

      if (statusResult.status === "completed" && statusResult.videoUrl) {
        // Update task state in database
        await VideoTaskService.updateTask(userId, taskId, {
          status: "completed",
          finalVideoUrl: statusResult.videoUrl,
        });

        // Sync video URL back to the target scene in the Project document
        const targetSceneId = task.sceneId || (task.sceneNumber ? `scene-${task.sceneNumber}` : "scene-1");
        await ProjectService.updateScene(userId, task.projectId, targetSceneId, {
          videoUrl: statusResult.videoUrl,
          status: "completed",
        }).catch((err) => console.warn("Failed to sync videoUrl to project scene:", err));

        return NextResponse.json({
          status: "completed",
          finalVideoUrl: statusResult.videoUrl,
          logs: task.logs,
          enhancedPrompt: task.enhancedPrompt,
        });
      }

      if (statusResult.status === "failed") {
        await VideoTaskService.updateTask(userId, taskId, {
          status: "failed",
          error: statusResult.error,
          logEntry: {
            providerName: generator.name,
            errorReason: statusResult.error || "Generation prediction failed",
          },
        });

        const targetSceneId = task.sceneId || (task.sceneNumber ? `scene-${task.sceneNumber}` : "scene-1");
        await ProjectService.updateScene(userId, task.projectId, targetSceneId, {
          status: "failed",
        }).catch(() => {});

        return NextResponse.json({
          status: "failed",
          logs: task.logs,
          enhancedPrompt: task.enhancedPrompt,
          error: statusResult.error,
        });
      }
    }

    // 4. In flight / processing
    return NextResponse.json({
      status: task.status || "processing",
      finalVideoUrl: task.finalVideoUrl,
      logs: task.logs,
      enhancedPrompt: task.enhancedPrompt,
    });
  } catch (error: any) {
    console.error("🔥 Status Check Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check video status" },
      { status: 500 }
    );
  }
}