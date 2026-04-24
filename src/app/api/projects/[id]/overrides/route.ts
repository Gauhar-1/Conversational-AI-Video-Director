import { NextResponse } from "next/server";
import { Project } from "@/models/Project";
import dbConnect from "@/lib/db";

// Update the type definition to expect a Promise
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    
    // CRITICAL FIX: Await the params object before destructuring
    const resolvedParams = await params;
    const projectId = resolvedParams.id; 
    
    const body = await req.json();
    
    // Extracted generatedUrl (which contains our Base64 direct uploads)
    const { sceneNumber, type, idOrPrompt, newPrompt, referenceImage, generatedUrl } = body;

    if (sceneNumber === undefined || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const targetScene = Number(sceneNumber);

    let updateQuery: any = { $set: {} };
    let arrayFilters: any[] = [];

    // Dynamically target the correct MongoDB fields.
    // $set automatically ADDs the field if it's missing, or UPDATEs it if it exists!
    switch (type) {
      case 'character':
        updateQuery.$set["storyboard.$.characters.$[char].appearance_prompt"] = newPrompt;
        updateQuery.$set["storyboard.$.characters.$[char].reference_image"] = referenceImage;
        if (generatedUrl) {
          updateQuery.$set["storyboard.$.characters.$[char].generated_url"] = generatedUrl;
        }
        arrayFilters = [{ "char._id": idOrPrompt }];
        break;

      case 'background':
        updateQuery.$set["storyboard.$.environment_prompt"] = newPrompt;
        updateQuery.$set["storyboard.$.environment_reference_image"] = referenceImage;
        // Catch Direct Uploads for Backgrounds
        if (generatedUrl) {
          updateQuery.$set["storyboard.$.background_url"] = generatedUrl;
        }
        break;

      case 'frame':
        updateQuery.$set["storyboard.$.frame_prompt"] = newPrompt;
        updateQuery.$set["storyboard.$.frame_reference_image"] = referenceImage;
        // Catch Direct Uploads for Frames
        if (generatedUrl) {
          updateQuery.$set["storyboard.$.frame_url"] = generatedUrl;
        }
        break;

      case 'video':
        updateQuery.$set["storyboard.$.video_prompt"] = newPrompt;
        // Catch Direct Uploads for Videos (MP4s)
        if (generatedUrl) {
          updateQuery.$set["storyboard.$.video_url"] = generatedUrl;
        }
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