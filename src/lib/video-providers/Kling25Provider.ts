// src/lib/video-providers/Kling25Provider.ts

import { BaseVideoProvider, GenerationParams } from "./BaseProvider";
import Replicate from "replicate";

export class Kling25Provider extends BaseVideoProvider {
  name = "Kling 2.5 Turbo Pro (Replicate)";
  private replicate: Replicate;

  constructor(apiKey: string) {
    super();
    this.replicate = new Replicate({ auth: apiKey });
  }

  async generate(params: GenerationParams): Promise<string> {
    const { prompt, advancedInputs } = params;

    const input: any = {
      prompt: prompt,
      duration: 5,
      aspect_ratio: "16:9"
    };

    if (advancedInputs) {
      // Use the new start_image parameter
      if (advancedInputs.startFrameUrl) {
        input.start_image = advancedInputs.startFrameUrl;
      }
      
      // Native transition support between two storyboard frames
      if (advancedInputs.startFrameUrl && advancedInputs.endFrameUrl) {
        input.end_image = advancedInputs.endFrameUrl;
      }
    }

    console.log(`🎬 [Kling 2.5 Pro] Initiating high-speed cinematic render...`);

    try {
      const output = await this.replicate.run(
        "kwaivgi/kling-v2.5-turbo-pro",
        { input }
      );

      if (!output || typeof output !== 'string') {
        throw new Error("Kling 2.5 Turbo Pro returned an invalid response.");
      }

      return output;

    } catch (error: any) {
      throw new Error(`Kling 2.5 API Error: ${error.message}`);
    }
  }
}