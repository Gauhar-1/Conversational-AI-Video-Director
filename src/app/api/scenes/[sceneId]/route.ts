/**
 * @file src/app/api/scenes/[sceneId]/route.ts
 * @description Granular Delta Update API route for scenes (PATCH /api/scenes/[id]).
 * Validates payload with patchSceneDeltaSchema and executes atomic positional updates via sceneRepository.
 */

import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/getAuthUser";
import { sceneRepository } from "@/lib/db/repositories/sceneRepository";
import { patchSceneDeltaSchema } from "@/lib/validations/project";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sceneId: string }> }
) {
  try {
    const { userId } = await requireAuthUser(req);
    const { sceneId } = await params;
    const body = await req.json();

    // Extract delta fields: supports direct delta { cameraAngle: 'CLOSE_UP' } or nested { updates: { ... } }
    const deltaPayload = body.updates ? body.updates : body;
    const projectId = body.projectId || undefined;

    const validatedDelta = patchSceneDeltaSchema.parse(deltaPayload);

    const updatedScene = await sceneRepository.updateSceneDelta(
      userId,
      sceneId,
      validatedDelta,
      projectId
    );

    if (!updatedScene) {
      return NextResponse.json(
        { error: "Scene or project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, scene: updatedScene });
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json(
        { error: "Unauthorized: Access token required." },
        { status: 401 }
      );
    }
    console.error("🔥 Error updating scene delta:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update scene" },
      { status: 400 }
    );
  }
}
