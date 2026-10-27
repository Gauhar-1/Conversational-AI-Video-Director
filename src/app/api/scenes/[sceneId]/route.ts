/**
 * @file src/app/api/scenes/[sceneId]/route.ts
 * @description API route to update a specific scene within a project.
 * Enforces token authentication and ProjectService isolation.
 */

import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/getAuthUser";
import { ProjectService } from "@/lib/services/projectService";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sceneId: string }> }
) {
  try {
    const { userId } = await requireAuthUser(req);
    const { sceneId } = await params;
    const body = await req.json();
    const { projectId, updates } = body;

    if (!projectId || !sceneId || !updates) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updatedScene = await ProjectService.updateScene(userId, projectId, sceneId, updates);
    if (!updatedScene) {
      return NextResponse.json({ error: "Scene or project not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, scene: updatedScene });
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: "Unauthorized: Access token required." }, { status: 401 });
    }
    console.error("🔥 Error updating scene:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update scene" },
      { status: 500 }
    );
  }
}
