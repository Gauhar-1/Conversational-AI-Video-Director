import { BaseVideoProvider, GenerationParams } from "./BaseProvider";
import Replicate from "replicate";

export class ReplicateProvider extends BaseVideoProvider {
  name = "Replicate";
  private replicate: Replicate;
  private modelId: string;

  constructor(apiKey: string, modelId: string = "minimax/video-01") {
    super();
    this.replicate = new Replicate({ auth: apiKey });
    this.modelId = modelId;
  }

  async generate({ prompt, startFrameUrl }: GenerationParams): Promise<string> {
    // Director AI specific cinematic formatting
    const cinematicPrompt = `${prompt} - Masterpiece, 8k, cinematic lighting, highly detailed.`;

    // Note: Every Replicate model has a different input schema. 
    // This isolates that specific logic.
    const output = await this.replicate.run(this.modelId as any, {
      input: {
        prompt: cinematicPrompt,
        first_frame_image: startFrameUrl,
        // Insert specific Replicate model controls here
      }
    });

    if (!output || !Array.isArray(output) || output.length === 0) {
      throw new Error("Replicate returned an empty or invalid response.");
    }
    return output[0] as string; // Returns the video URI
  }
}