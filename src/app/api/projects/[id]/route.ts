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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    
    // 1. AWAIT the params to unwrap the ID
    const { id } = await params;
    
    // 2. Parse the request body
    const body = await req.json();
    const { title } = body;

    // 3. Validate the input
    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json({ error: "A valid title is required" }, { status: 400 });
    }

    // 4. Update the project using Mongoose
    // { new: true } ensures it returns the updated document
    // runValidators ensures it adheres to your Mongoose schema rules
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { $set: { title: title.trim() } },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Project title updated successfully",
      project: updatedProject 
    }, { status: 200 });

  } catch (error: any) {
    console.error("Failed to update project:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}