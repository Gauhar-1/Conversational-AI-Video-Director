import { NextResponse } from "next/server";

// CRITICAL FIX: The type definition is now Promise<{ taskId: string }>
export async function GET(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const seedanceKey = req.headers.get("X-Seedance-API-Key");

  // Awaiting the promised params
  const resolvedParams = await params;
  const taskId = resolvedParams.taskId;

  try {
    const response = await fetch(`https://pollo.ai/api/platform/task/${taskId}`, {
      headers: { "x-api-key": seedanceKey || "" }
    });

    const data = await response.json();

    // Seedance typical response includes 'status' and 'videoUrl' when finished
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}