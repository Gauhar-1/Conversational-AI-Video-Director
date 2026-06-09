// src/lib/video-providers/RunwayGen45Provider.ts

import { BaseVideoProvider, GenerationParams } from "./BaseProvider";
import Replicate from "replicate";

export class RunwayGen45Provider extends BaseVideoProvider {
  name = "Runway Gen-4.5 (Replicate)";
  private replicate: Replicate;

  constructor(apiKey: string) {
    super();
    this.replicate = new Replicate({ auth: apiKey });
  }

  async generate(params: GenerationParams): Promise<string> {
    const { prompt, advancedInputs } = params;

    // Base configuration optimized for cinematic output
    const input: any = {
      prompt: prompt,
      duration: 5, // Can be extended to 10s based on user tier
      aspect_ratio: "16:9"
    };

    // Runway Gen-4.5 supports Image-to-Video via the 'image' parameter
    if (advancedInputs?.startFrameUrl) {
      input.image = advancedInputs.startFrameUrl;
    }

    console.log(`🎬 [Runway Gen-4.5] Initiating maximum fidelity physics render...`);

    try {
      // Execute the run on Replicate
      const output = await this.replicate.run(
        "runwayml/gen-4.5",
        { input }
      );

      // Replicate formats standard URI outputs as strings
      if (!output || typeof output !== 'string') {
        throw new Error("Runway Gen-4.5 returned an invalid response.");
      }

      return output;

    } catch (error: any) {
      throw new Error(`Runway Gen-4.5 API Error: ${error.message}`);
    }
  }
}