// src/lib/video-providers/SeedanceReplicateProvider.ts

import { BaseVideoProvider, GenerationParams } from "./BaseProvider";
import Replicate from "replicate";

export class SeedanceReplicateProvider extends BaseVideoProvider {
  name = "Seedance 2.0 (Replicate)";
  private replicate: Replicate;

  constructor(apiKey: string) {
    super();
    this.replicate = new Replicate({ auth: apiKey });
  }

  async generate(params: GenerationParams): Promise<string> {
    const { prompt, advancedInputs } = params;

    const referenceImages: string[] = [];
    let promptReferences = "";

    // Helper to safely add images to the array and generate the [ImageX] tag
    const addReference = (url: string, description: string) => {
      referenceImages.push(url);
      const tag = `[Image${referenceImages.length}]`;
      promptReferences += `${tag} serves as the ${description}. `;
      return tag;
    };

    if (advancedInputs) {
      if (advancedInputs.startFrameUrl) {
        addReference(advancedInputs.startFrameUrl, "exact visual layout and composition of the very first frame (0.0s)");
      }
      if (advancedInputs.backgroundReferenceUrl) {
        addReference(advancedInputs.backgroundReferenceUrl, "environmental background setting");
      }
      if (advancedInputs.characterReferenceUrls) {
        advancedInputs.characterReferenceUrls.forEach((url, index) => {
          addReference(url, `consistent physical appearance, clothing, and facial features for Character ${index + 1}`);
        });
      }
      if (advancedInputs.endFrameUrl) {
        addReference(advancedInputs.endFrameUrl, "exact visual layout and composition of the final frame to perfectly transition into");
      }
    }

    if (referenceImages.length > 9) {
      throw new Error("Seedance 2.0 allows a maximum of 9 reference images.");
    }

    // Build the final cinematic prompt
    let finalPrompt = `CINEMATIC DIRECTION: ${prompt}\n\nSCENE CONSTRUCTION RULES:\n${promptReferences}`;
    
    if (advancedInputs?.dialogue) {
      finalPrompt += `\nThe character speaks the following dialogue: "${advancedInputs.dialogue}"`;
    }

    console.log(`🎬 [Seedance Replicate] Starting render with ${referenceImages.length} references...`);

    try {
      // replicate.run() automatically polls until the video is ready or fails
      const output = await this.replicate.run(
        "bytedance/seedance-2.0",
        {
          input: {
            prompt: finalPrompt,
            reference_images: referenceImages.length > 0 ? referenceImages : undefined,
            duration: -1, // Let the model choose the best length
            resolution: "720p",
            aspect_ratio: "16:9",
            generate_audio: true,
          }
        }
      );

      // Replicate usually returns the URI string directly for this model schema
      if (!output || typeof output !== 'string') {
        throw new Error("Replicate returned an invalid or empty response.");
      }

      return output; 

    } catch (error: any) {
      // Catch specific Replicate API errors (like Out of Memory or Content Moderation)
      throw new Error(`Replicate API Error: ${error.message}`);
    }
  }
}