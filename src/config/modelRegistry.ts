// src/config/modelRegistry.ts

export type ModelFeature = {
  id: string;
  name: string;
  provider: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  qualityTier: "Draft" | "Standard" | "Pro" | "Cinematic"; // REPLACED costTier
  
  requiredInputs: {
    textPrompt: boolean;
    startImage: "optional" | "required" | "none";
    endImage: "optional" | "required" | "none";
    audioFile: "optional" | "required" | "none";
    multiCharacterRefs: boolean;
  };
  requiredNodes: string[]; 
};

export const DIRECTOR_MODELS: Record<string, ModelFeature> = {
  
  "seedance-2.0": {
    id: "seedance-2.0",
    name: "Seedance 2.0",
    provider: "ByteDance",
    description: "The consistency king. Best for story-driven projects requiring character continuity.",
    strengths: ["Up to 9 Character References", "Native Lip-sync", "Seamless Scene Transitions"],
    weaknesses: ["Slightly slower render times", "Complex prompts can confuse it"],
    qualityTier: "Cinematic",
    requiredInputs: { textPrompt: true, startImage: "optional", endImage: "optional", audioFile: "optional", multiCharacterRefs: true },
    requiredNodes: ['startFrame', 'character', 'background']
  },
  
  "kling-3-omni": {
    id: "kling-3-omni",
    name: "Kling 3.0 Omni",
    provider: "Kuaishou",
    description: "Perfect for multi-shot sequences and complex narratives.",
    strengths: ["15-second generation", "Native Audio", "Multi-shot control"],
    weaknesses: ["Can sometimes over-animate facial expressions"],
    qualityTier: "Cinematic",
    requiredInputs: { textPrompt: true, startImage: "optional", endImage: "none", audioFile: "optional", multiCharacterRefs: true },
    requiredNodes: ['startFrame', 'character']
  },

  "veo-3": {
    id: "veo-3",
    name: "Google Veo 3",
    provider: "Google DeepMind",
    description: "The Hollywood all-rounder. High-fidelity cinematic visuals with highly accurate native audio and dialogue.",
    strengths: ["Native Dialogue & Lip-sync", "Game World Creation", "High Prompt Accuracy"],
    weaknesses: ["Cannot use multiple character reference sheets"],
    qualityTier: "Cinematic",
    requiredInputs: { textPrompt: true, startImage: "optional", endImage: "none", audioFile: "none", multiCharacterRefs: false },
    requiredNodes: ['startFrame'] 
  },

  "runway-gen4.5": {
    id: "runway-gen4.5",
    name: "Runway Gen-4.5",
    provider: "RunwayML",
    description: "The gold standard for cinematic realism and physical accuracy.",
    strengths: ["Flawless Physics", "High Visual Fidelity", "Cinematic Lighting"],
    weaknesses: ["High Cost", "Cannot use multiple character reference sheets"],
    qualityTier: "Cinematic",
    requiredInputs: { textPrompt: true, startImage: "optional", endImage: "none", audioFile: "none", multiCharacterRefs: false },
    requiredNodes: ['startFrame']
  },

  "hailuo-2.3": {
    id: "hailuo-2.3",
    name: "Minimax Hailuo 2.3",
    provider: "Minimax",
    description: "The Actor's Director. Unmatched for human expressiveness, acting, and complex interactions.",
    strengths: ["Expressive Human Motion", "Cinematic VFX", "Strong Style Adherence"],
    weaknesses: ["Shorter duration limits (6s)"],
    qualityTier: "Pro",
    requiredInputs: { textPrompt: true, startImage: "optional", endImage: "none", audioFile: "none", multiCharacterRefs: false },
    requiredNodes: ['startFrame']
  },

  "luma-ray": {
    id: "luma-ray",
    name: "Luma Ray",
    provider: "Luma AI",
    description: "Incredible for hyper-realistic physics, fluid dynamics, and complex action shots.",
    strengths: ["Hyper-realistic motion", "Fast rendering", "Great for action"],
    weaknesses: ["Can struggle with precise facial consistency"],
    qualityTier: "Pro",
    requiredInputs: { textPrompt: true, startImage: "optional", endImage: "none", audioFile: "none", multiCharacterRefs: false },
    requiredNodes: ['startFrame']
  },

  "pixverse-v6": {
    id: "pixverse-v6",
    name: "PixVerse V6",
    provider: "PixVerse",
    description: "The transition specialist. Best for multi-shot sequences and morphing between frames.",
    strengths: ["Native Multi-Shot Sequencing", "Transition Mode", "1080p Native"],
    weaknesses: ["Not as physically accurate as Runway"],
    qualityTier: "Standard",
    requiredInputs: { textPrompt: true, startImage: "optional", endImage: "optional", audioFile: "none", multiCharacterRefs: false },
    requiredNodes: ['startFrame'] 
  },

  "p-video": {
    id: "p-video",
    name: "P-Video (Drafts)",
    provider: "Pruna AI",
    description: "The rapid prototyper. Built for speed, fast previews, and quick lip-syncing.",
    strengths: ["10-Second Draft Mode", "Fast Previews", "Native Lip Syncing"],
    weaknesses: ["Lower cinematic fidelity", "Not for complex storytelling"],
    qualityTier: "Draft",
    requiredInputs: { textPrompt: true, startImage: "optional", endImage: "none", audioFile: "optional", multiCharacterRefs: false },
    requiredNodes: ['startFrame']
  },

  // Add/Replace this block in your DIRECTOR_MODELS object in src/config/modelRegistry.ts

  "wan-2.5": {
    id: "wan-2.5",
    name: "Alibaba Wan 2.5 (I2V)",
    provider: "Alibaba Cloud",
    description: "The Scalable Workhorse. Highly affordable image-to-video generation with native 1-pass audio and lip-syncing capabilities.",
    strengths: ["Cost-Effective", "1-Pass Audio/Lip-Sync", "Multilingual Prompt Support"],
    weaknesses: ["Lower cinematic fidelity than Gen-4.5"],
    qualityTier: "Standard", // Elevated from Draft because of the A/V sync capabilities
    requiredInputs: {
      textPrompt: true, 
      startImage: "required", // Critical constraint for I2V
      endImage: "none", 
      audioFile: "optional", // Supports custom voice imports!
      multiCharacterRefs: false 
    },
    requiredNodes: ['startFrame'] 
  },

  "veed-fabric": {
    id: "veed-fabric",
    name: "VEED Fabric 1.0",
    provider: "VEED",
    description: "Specialized model for up to 60 seconds of a talking head monologue.",
    strengths: ["60s Duration", "Perfect Lip-sync", "Influencer Style"],
    weaknesses: ["Cannot generate scenes or action", "Only does talking heads"],
    qualityTier: "Standard",
    requiredInputs: { textPrompt: false, startImage: "required", endImage: "none", audioFile: "required", multiCharacterRefs: false },
    requiredNodes: ['startFrame'] 
  },

  // Add this to your DIRECTOR_MODELS object in src/config/modelRegistry.ts

  "kling-2.5": {
    id: "kling-2.5",
    name: "Kling 2.5 Turbo Pro",
    provider: "Kuaishou",
    description: "The Action Director. Turns a single image into high-speed cinematic video with fluid motion, complex camera moves, and strict prompt adherence.",
    strengths: ["High-speed Action & Camera Moves", "Start-to-End Frame Transitions", "Style Consistency"],
    weaknesses: ["No native audio generation"],
    qualityTier: "Pro",
    requiredInputs: {
      textPrompt: true, 
      startImage: "optional", 
      endImage: "optional", 
      audioFile: "none", 
      multiCharacterRefs: false 
    },
    requiredNodes: ['startFrame', 'endFrame'] 
  },
};