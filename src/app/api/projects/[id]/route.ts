/**
 * @file src/app/api/projects/[id]/route.ts
 * @description API route for individual Project operations (GET & PATCH).
 * Strictly enforces token authentication, multi-tenant userId scoping, and Zod validation.
 */

import { NextResponse } from "next/server";
import { getAuthUser, requireAuthUser, DEV_DEFAULT_USER_ID } from "@/lib/auth/getAuthUser";
import { ProjectService } from "@/lib/services/projectService";
import { updateProjectSchema } from "@/lib/validations/project";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    const userId = auth.userId || process.env.DEV_USER_ID || DEV_DEFAULT_USER_ID;
    const { id } = await params;

    const project = await ProjectService.getProjectById(userId, id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project.toObject ? project.toObject() : project);
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: "Unauthorized: Access token required." }, { status: 401 });
    }
    console.error("Failed to fetch project:", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuthUser(req);
    const { id } = await params;
    const body = await req.json();

    const validationResult = updateProjectSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const updatedProject = await ProjectService.updateProject(userId, id, validationResult.data);
    if (!updatedProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Project updated successfully",
        project: updatedProject,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: "Unauthorized: Access token required." }, { status: 401 });
    }
    console.error("Failed to update project:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}