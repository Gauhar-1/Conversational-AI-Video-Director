// src/lib/video-providers/PVideoProvider.ts

import { BaseVideoProvider, GenerationParams } from "./BaseProvider";
import Replicate from "replicate";

export class PVideoProvider extends BaseVideoProvider {
  name = "P-Video (Pruna AI)";
  private replicate: Replicate;

  constructor(apiKey: string) {
    super();
    this.replicate = new Replicate({ auth: apiKey });
  }

  async generate(params: GenerationParams): Promise<string> {
    const { prompt, advancedInputs } = params;

    // 1. Build the base P-Video payload
    const input: any = {
      prompt: prompt, // Our Agentic Rewriter already made this cinematic
      resolution: "720p",
      duration: 5,
      fps: 24,
      save_audio: true,
      draft: advancedInputs?.isDraft || false,
      prompt_upsampling: false, // Turn off, our LLM handles this
      disable_safety_filter: true // Prevents false-positive blocks on dramatic scenes
    };

    // 2. Map the visual and audio inputs
    if (advancedInputs) {
      if (advancedInputs.startFrameUrl) {
        input.image = advancedInputs.startFrameUrl;
      }
      if (advancedInputs.endFrameUrl && advancedInputs.startFrameUrl) {
        input.last_frame_image = advancedInputs.endFrameUrl;
      }
      
      // Handle Dialogue vs Explicit Audio File
      if (advancedInputs.audioUrl) {
        input.audio = advancedInputs.audioUrl;
      } else if (advancedInputs.dialogue) {
        // If no file is provided but dialogue text exists, we inject it into the prompt
        // for P-Video's native TTS generation
        input.prompt = `${prompt} The character speaks: "${advancedInputs.dialogue}"`;
      }
    }

    console.log(`🎬 [P-Video] Initiating ${input.draft ? 'FAST DRAFT' : 'STANDARD'} render...`);

    try {
      const output = await this.replicate.run(
        "prunaai/p-video",
        { input }
      );

      if (!output || typeof output !== 'string') {
        throw new Error("P-Video returned an invalid response.");
      }

      return output;

    } catch (error: any) {
      throw new Error(`P-Video API Error: ${error.message}`);
    }
  }
}