import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Project } from "@/models/Project";

// 1. Update the type definition: params is now a Promise
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    
    // 2. AWAIT the params to unwrap the ID before using it
    const { id } = await params;
    
    // 3. Use the unwrapped ID
    const project = await Project.findById(id).lean();
    
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error: any) {
    console.error("Failed to fetch project:", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}