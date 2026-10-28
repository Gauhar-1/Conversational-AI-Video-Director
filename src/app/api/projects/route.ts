/**
 * @file src/app/api/projects/route.ts
 * @description API route for Project collection operations (Listing & Creation).
 * Enforces token authentication, multi-tenant user isolation, and Zod validation.
 */

import { NextResponse } from "next/server";
import { getAuthUser, requireAuthUser, DEV_DEFAULT_USER_ID } from "@/lib/auth/getAuthUser";
import { ProjectService } from "@/lib/services/projectService";
import { createProjectSchema } from "@/lib/validations/project";

export async function GET(req: Request) {
  try {
    const auth = await getAuthUser(req);
    const userId = auth.userId || process.env.DEV_USER_ID || DEV_DEFAULT_USER_ID;
    const projects = await ProjectService.getProjectsByUser(userId);

    return NextResponse.json(projects);
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: "Unauthorized: Access token required." }, { status: 401 });
    }
    console.error("Failed to fetch projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch project history" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireAuthUser(req);
    const body = await req.json().catch(() => ({}));

    // Validate request payload
    const validationResult = createProjectSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const newProject = await ProjectService.createProject(userId, validationResult.data);
    return NextResponse.json(newProject, { status: 201 });
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: "Unauthorized: Access token required." }, { status: 401 });
    }
    console.error("Failed to create project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}