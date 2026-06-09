// src/lib/video-providers/Wan25Provider.ts

import { BaseVideoProvider, GenerationParams } from "./BaseProvider";
import Replicate from "replicate";

export class Wan25Provider extends BaseVideoProvider {
  name = "Wan 2.5 I2V (Replicate)";
  private replicate: Replicate;

  constructor(apiKey: string) {
    super();
    this.replicate = new Replicate({ auth: apiKey });
  }

  async generate(params: GenerationParams): Promise<string> {
    const { prompt, advancedInputs } = params;

    // Strict Validation: Wan 2.5 I2V requires a starting image
    if (!advancedInputs?.startFrameUrl) {
      throw new Error("Wan 2.5 requires a 'Start Frame' image to generate video.");
    }

    const input: any = {
      image: advancedInputs.startFrameUrl,
      prompt: prompt,
      duration: 5,
      resolution: "720p",
      enable_prompt_expansion: false // Our LLM already handles prompt enhancement
    };

    // Native Audio Sync injection
    if (advancedInputs.audioUrl) {
      input.audio = advancedInputs.audioUrl;
    }

    console.log(`🎬 [Wan 2.5] Initiating scalable Image-to-Video render...`);

    try {
      const output = await this.replicate.run(
        "wan-video/wan-2.5-i2v",
        { input }
      );

      if (!output || typeof output !== 'string') {
        throw new Error("Wan 2.5 returned an invalid response.");
      }

      return output;

    } catch (error: any) {
      throw new Error(`Wan 2.5 API Error: ${error.message}`);
    }
  }
}