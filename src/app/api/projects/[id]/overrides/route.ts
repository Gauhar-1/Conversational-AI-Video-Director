import { NextResponse } from "next/server";
import { Project } from "@/models/Project";
import dbConnect from "@/lib/db"; // Ensure your DB import path is correct

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const projectId = params.id;
    const body = await req.json();
    const { sceneNumber, type, idOrPrompt, newPrompt, referenceImage } = body;

    if (sceneNumber === undefined || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // CRITICAL FIX: Ensure sceneNumber is strictly a Number for the MongoDB query
    const targetScene = Number(sceneNumber);

    let updateQuery: any = {};
    let arrayFilters: any[] = [];

    // Dynamically target the correct MongoDB fields based on which Node triggered the save
    switch (type) {
      case 'character':
        updateQuery = { 
          $set: { 
            "storyboard.$.characters.$[char].appearance_prompt": newPrompt,
            "storyboard.$.characters.$[char].reference_image": referenceImage
          } 
        };
        if (body.generatedUrl) {
          updateQuery.$set["storyboard.$.characters.$[char].generated_url"] = body.generatedUrl;
        }
        arrayFilters = [{ "char._id": idOrPrompt }];
        break;

      case 'background':
        updateQuery = { 
          $set: { 
            "storyboard.$.environment_prompt": newPrompt,
            "storyboard.$.environment_reference_image": referenceImage
          } 
        };
        break;

      case 'frame':
        updateQuery = { 
          $set: { 
            "storyboard.$.frame_prompt": newPrompt,
            "storyboard.$.frame_reference_image": referenceImage
          } 
        };
        break;

      case 'video':
        updateQuery = { 
          $set: { 
            "storyboard.$.video_prompt": newPrompt 
          } 
        };
        break;

      default:
        return NextResponse.json({ error: "Invalid node type provided" }, { status: 400 });
    }

    // Execute the surgical update
    const result = await Project.updateOne(
      { _id: projectId, "storyboard.scene_number": targetScene },
      updateQuery,
      { arrayFilters: arrayFilters.length > 0 ? arrayFilters : undefined }
    );

    // CRITICAL FIX: Check matchedCount, not modifiedCount.
    // If matchedCount is 0, the scene/project literally doesn't exist.
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: `Could not find Scene ${targetScene} in Project ${projectId} to update.` }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: result.modifiedCount === 0 ? "No changes detected." : "Node updated successfully." 
    });

  } catch (error: any) {
    console.error("Database Override Error:", error);
    return NextResponse.json({ error: "Internal Server Error while saving overrides." }, { status: 500 });
  }
}