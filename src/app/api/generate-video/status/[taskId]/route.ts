// src/app/api/generate-video/status/[taskId]/route.ts
import { NextResponse } from "next/server";
import Replicate from "replicate";
import dbConnect from "@/lib/db";
import { VideoTask } from "@/models/VideoTask";
import { Project } from "@/models/Project";

export async function GET(
  req: Request, 
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    await dbConnect();
    
    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json({ error: "taskId parameter is required" }, { status: 400 });
    }

    const task = await VideoTask.findById(taskId);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // 1. If already completed, return immediately
    if (task.status === "completed" && task.finalVideoUrl) {
      return NextResponse.json({
        status: "completed",
        finalVideoUrl: task.finalVideoUrl,
        logs: task.logs,
        enhancedPrompt: task.enhancedPrompt,
      });
    }

    // 2. If already failed, return immediately
    if (task.status === "failed") {
      return NextResponse.json({
        status: "failed",
        logs: task.logs,
        enhancedPrompt: task.enhancedPrompt,
      });
    }

    // 3. If in flight and has a Replicate Prediction ID, check Replicate API
    const replicateApiKey = req.headers.get("X-Replicate-Key") || process.env.REPLICATE_API_KEY || process.env.REPLICATE_API_TOKEN;

    if (task.replicatePredictionId && replicateApiKey) {
      const replicate = new Replicate({ auth: replicateApiKey });
      const prediction = await replicate.predictions.get(task.replicatePredictionId);

      if (prediction.status === "succeeded") {
        const output = prediction.output;
        let finalUrl = "";

        if (Array.isArray(output) && output.length > 0) {
          finalUrl = String(output[0]);
        } else if (typeof output === "string") {
          finalUrl = output;
        } else if (output && typeof output === "object") {
          finalUrl = (output as any).video || (output as any).url || String(output);
        }

        task.status = "completed";
        task.finalVideoUrl = finalUrl;
        await task.save();

        // Sync video URL to the Project storyboard in MongoDB
        if (task.projectId && task.sceneNumber !== undefined) {
          await Project.findOneAndUpdate(
            { _id: task.projectId, "storyboard.scene_number": task.sceneNumber },
            { $set: { "storyboard.$.video_url": finalUrl } }
          );
        }

        return NextResponse.json({
          status: "completed",
          finalVideoUrl: finalUrl,
          logs: task.logs,
          enhancedPrompt: task.enhancedPrompt,
        });
      }

      if (prediction.status === "failed" || prediction.status === "canceled") {
        task.status = "failed";
        task.logs.push({
          providerName: "Replicate",
          attemptNumber: 1,
          errorReason: prediction.error ? String(prediction.error) : "Prediction failed on Replicate",
          timestamp: new Date(),
        });
        await task.save();

        return NextResponse.json({
          status: "failed",
          logs: task.logs,
          enhancedPrompt: task.enhancedPrompt,
          error: prediction.error,
        });
      }
    }

    // 4. Still processing on Replicate
    return NextResponse.json({
      status: task.status || "processing",
      finalVideoUrl: task.finalVideoUrl,
      logs: task.logs,
      enhancedPrompt: task.enhancedPrompt,
    });

  } catch (error: any) {
    console.error("🔥 Status Check Error:", error);
    return NextResponse.json({ error: error.message || "Failed to check video status" }, { status: 500 });
  }
}