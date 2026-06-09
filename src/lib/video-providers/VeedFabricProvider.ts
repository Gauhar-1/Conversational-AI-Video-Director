// src/lib/video-providers/VeedFabricProvider.ts

import { BaseVideoProvider, GenerationParams } from "./BaseProvider";
import Replicate from "replicate";

export class VeedFabricProvider extends BaseVideoProvider {
  name = "VEED Fabric 1.0 (Replicate)";
  private replicate: Replicate;

  constructor(apiKey: string) {
    super();
    this.replicate = new Replicate({ auth: apiKey });
  }

  async generate(params: GenerationParams): Promise<string> {
    const { advancedInputs } = params;

    // 1. Strict Validation: Fabric strictly requires Image + Audio
    if (!advancedInputs?.startFrameUrl) {
      throw new Error("VEED Fabric requires a 'Start Frame' image of a face.");
    }
    if (!advancedInputs?.audioUrl) {
      throw new Error("VEED Fabric requires an 'Audio URL'. Please generate or upload dialogue audio first.");
    }

    // 2. Build the Fabric Payload
    const input = {
      image: advancedInputs.startFrameUrl,
      audio: advancedInputs.audioUrl,
      resolution: "720p" // Max resolution supported by Fabric 1.0
    };

    console.log(`🎬 [VEED Fabric] Initiating 60s Talking Head render...`);

    try {
      const output = await this.replicate.run(
        "veed/fabric-1.0",
        { input }
      );

      if (!output || typeof output !== 'string') {
        throw new Error("VEED Fabric returned an invalid response.");
      }

      return output;

    } catch (error: any) {
      throw new Error(`VEED Fabric API Error: ${error.message}`);
    }
  }
}