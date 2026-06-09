
export interface GenerationParams {
  prompt: string;
  // Fallback for simple models (like HF or Cloudinary)
  startFrameUrl?: string; 
  // Advanced routing for Seedance 2.0
  advancedInputs?: {
    characterReferenceUrls?: string[];
    backgroundReferenceUrl?: string;
    startFrameUrl?: string; // The frame the scene MUST start on
    endFrameUrl?: string;   // The frame the scene MUST end on
    dialogue?: string;
    audioUrl?: string; 
    isDraft?: boolean;
  };
}

export abstract class BaseVideoProvider {
  abstract name: string;
  abstract generate(params: GenerationParams): Promise<string>; 
}