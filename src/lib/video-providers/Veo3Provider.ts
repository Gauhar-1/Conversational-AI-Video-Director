// src/lib/video-providers/Veo3Provider.ts

import { BaseVideoProvider, GenerationParams } from "./BaseProvider";
import Replicate from "replicate";

export class Veo3Provider extends BaseVideoProvider {
  name = "Google Veo 3 (Replicate)";
  private replicate: Replicate;

  constructor(apiKey: string) {
    super();
    this.replicate = new Replicate({ auth: apiKey });
  }

  async generate(params: GenerationParams): Promise<string> {
    const { prompt, advancedInputs } = params;

    const input: any = {
      prompt: prompt,
      resolution: "720p",
      aspect_ratio: "16:9",
      duration: 5,
      generate_audio: true, // Always leverage Veo's flagship audio capabilities
    };

    if (advancedInputs) {
      // Image-to-Video capabilities
      if (advancedInputs.startFrameUrl) {
        input.image = advancedInputs.startFrameUrl;
      }
      
      // Dialogue handling: Veo 3 natively parses spoken dialogue from the prompt
      if (advancedInputs.dialogue) {
        // Appending the dialogue clearly so Veo knows exactly what to synthesize
        input.prompt = `${input.prompt}\n\nThe character speaks the following dialogue directly to the camera: "${advancedInputs.dialogue}"`;
      }
    }

    console.log(`🎬 [Veo 3] Initiating cinematic render with native audio...`);

    try {
      const output = await this.replicate.run(
        "google/veo-3",
        { input }
      );

      if (!output || typeof output !== 'string') {
        throw new Error("Google Veo 3 returned an invalid response.");
      }

      return output;

    } catch (error: any) {
      throw new Error(`Google Veo 3 API Error: ${error.message}`);
    }
  }
}