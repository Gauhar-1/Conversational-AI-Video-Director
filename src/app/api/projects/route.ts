import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Project } from "@/models/Project";

export async function GET() {
  try {
    await dbConnect();
    
    // Fetch all projects, but ONLY grab the ID, Title, and Date. 
    // We don't want to load massive chat histories just for the sidebar!
    const projects = await Project.find({})
      .select("_id title updatedAt")
      .sort({ updatedAt: -1 }) // Sort by newest first
      .lean();

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error("Failed to fetch projects:", error);
    return NextResponse.json({ error: "Failed to fetch project history" }, { status: 500 });
  }
}