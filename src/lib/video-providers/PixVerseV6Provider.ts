// src/lib/video-providers/PixVerseV6Provider.ts

import { BaseVideoProvider, GenerationParams } from "./BaseProvider";
import Replicate from "replicate";

export class PixVerseV6Provider extends BaseVideoProvider {
  name = "PixVerse V6 (Replicate)";
  private replicate: Replicate;

  constructor(apiKey: string) {
    super();
    this.replicate = new Replicate({ auth: apiKey });
  }

  async generate(params: GenerationParams): Promise<string> {
    const { prompt, advancedInputs } = params;

    // Default configuration for high-fidelity cinematic output
    const input: any = {
      prompt: prompt, // Already enhanced by your Director AI Agentic Rewriter
      quality: "1080p",
      duration: 10,
      generate_audio_switch: true,
      generate_multi_clip_switch: false
    };

    // 1. Handling Input Logic
    if (advancedInputs) {
      if (advancedInputs.startFrameUrl) {
        input.image = advancedInputs.startFrameUrl;
      }
      
      // PixVerse Transition Mode: Smoothly morphs Start -> End
      if (advancedInputs.startFrameUrl && advancedInputs.endFrameUrl) {
        input.last_frame_image = advancedInputs.endFrameUrl;
        // Multi-clip is not allowed in transition mode
        input.generate_multi_clip_switch = false;
      } else if (prompt.includes("Shot 1") || prompt.includes("Shot 2")) {
        // Automatically enable multi-shot if the prompt follows the Shot structure
        input.generate_multi_clip_switch = true;
        input.duration = 15; // Set longer duration for multi-shot
      }
    }

    console.log(`🎬 [PixVerse V6] Initiating ${input.last_frame_image ? 'Transition' : 'Generation'}...`);

    try {
      const output = await this.replicate.run(
        "pixverse/pixverse-v6",
        { input }
      );

      if (!output || typeof output !== 'string') {
        throw new Error("PixVerse V6 returned an invalid response.");
      }

      return output;

    } catch (error: any) {
      throw new Error(`PixVerse API Error: ${error.message}`);
    }
  }
}