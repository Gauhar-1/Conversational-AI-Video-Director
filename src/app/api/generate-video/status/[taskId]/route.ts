// src/app/api/video/status/[taskId]/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { VideoTask } from "@/models/VideoTask";
import { Project } from "@/models/Project";

// Notice the type definition matches your Next.js dynamic routing fix
export async function GET(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    await dbConnect();
    
    // Await the params to extract the ID securely
    const resolvedParams = await params;
    const taskId = resolvedParams.taskId;

    if (!taskId) {
      return NextResponse.json({ error: "taskId parameter is required" }, { status: 400 });
    }

    // 1. Query OUR database, not the external AI provider
    const task = await VideoTask.findById(taskId);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // 2. If the background worker finished the job, sync it to the main Project
    // (This ensures the video permanently lives in the user's storyboard)
    if (task.status === "completed" && task.finalVideoUrl) {
       await Project.findOneAndUpdate(
         { _id: task.projectId, "storyboard.scene_number": task.sceneNumber },
         { $set: { "storyboard.$.video_url": task.finalVideoUrl } }
       );
    }

    // 3. Return the unified state to the frontend
    return NextResponse.json({
      status: task.status, // "pending", "processing", "completed", or "failed"
      finalVideoUrl: task.finalVideoUrl,
      logs: task.logs, // Sends the exact failure reasons (if any) to the UI
      enhancedPrompt: task.enhancedPrompt // The cinematic prompt we generated
    });

  } catch (error: any) {
    console.error("🔥 Status Check Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}