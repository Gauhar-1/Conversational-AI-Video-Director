import mongoose, { Document, Model, Schema } from "mongoose";

// --- ENUMS & TYPES ---
export type CameraAngle = 'CAM_A_CENTER' | 'CAM_B_45_CLOSE' | 'CAM_C_OTS';
export type SceneStatus = 'idle' | 'enriching' | 'ready' | 'generating' | 'completed' | 'failed';

export interface IGlobalVault {
  characterAnchor: {
    description?: string;
    imageUrl?: string;
    replicatePulidSeed?: number;
  };
  environmentAnchor: {
    description?: string;
    imageUrl?: string;
    lightingProfile?: string;
  };
  aspectRatio: '9:16' | '16:9';
}

export interface ISceneDoc {
  sceneId: string;
  order: number;
  duration: number; // default 10s
  cameraAngle: CameraAngle;
  rawDelta: string;
  imagePrompt: string;
  motionPrompt: string;
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  videoUrl?: string;
  status: SceneStatus;
}

export interface IMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface IHfParameters {
  negative_prompt?: string;
  guidance_scale?: number;
  num_inference_steps?: number;
  seed?: number;
}

export interface ICharacter {
  _id: string;
  name: string;
  appearance_prompt: string;
  reference_image?: string;
  generated_url?: string;
}

export interface IScene {
  scene_number: number;
  timestamp: string;
  location: string;
  action: string;
  camera_movement: string;
  frame_prompt: string; 
  frame_reference_image?: string;
  frame_url?: string; 
  environment_prompt?: string;
  environment_reference_image?: string;
  background_url?: string;
  characters?: ICharacter[];
  video_prompt: string; 
  video_url?: string; 
  hf_parameters?: IHfParameters; 
}

export interface IProject extends Document {
  userId: string;
  title: string;
  globalVault: IGlobalVault;
  scenes: ISceneDoc[];
  chatHistory: IMessage[];
  visualMetadata: Record<string, any>;
  storyboard: IScene[];
  createdAt: Date;
  updatedAt: Date;
}

// --- SCHEMAS ---

const GlobalVaultSchema = new Schema<IGlobalVault>({
  characterAnchor: {
    description: { type: String, default: "Lead protagonist with cinematic detailing" },
    imageUrl: { type: String, default: "" },
    replicatePulidSeed: { type: Number, default: 42 }
  },
  environmentAnchor: {
    description: { type: String, default: "Volumetric neon atmospheric environment" },
    imageUrl: { type: String, default: "" },
    lightingProfile: { type: String, default: "High contrast cinematic rim lighting" }
  },
  aspectRatio: { type: String, enum: ['9:16', '16:9'], default: '9:16' }
}, { _id: false });

const StrictSceneSchema = new Schema<ISceneDoc>({
  sceneId: { type: String, required: true },
  order: { type: Number, required: true },
  duration: { type: Number, default: 10 },
  cameraAngle: { 
    type: String, 
    enum: ['CAM_A_CENTER', 'CAM_B_45_CLOSE', 'CAM_C_OTS'], 
    default: 'CAM_A_CENTER' 
  },
  rawDelta: { type: String, default: "" },
  imagePrompt: { type: String, default: "" },
  motionPrompt: { type: String, default: "" },
  firstFrameUrl: { type: String, default: "" },
  lastFrameUrl: { type: String, default: "" },
  videoUrl: { type: String, default: "" },
  status: { 
    type: String, 
    enum: ['idle', 'enriching', 'ready', 'generating', 'completed', 'failed'], 
    default: 'idle' 
  }
}, { _id: false });

const MessageSchema = new Schema<IMessage>({
  role: { type: String, enum: ["user", "assistant", "system"], required: true },
  content: { type: String, required: true },
  timestamp: { type: String, required: true },
});

const HfParametersSchema = new Schema<IHfParameters>({
  negative_prompt: { type: String, required: false },
  guidance_scale: { type: Number, required: false, default: 7.5 },
  num_inference_steps: { type: Number, required: false, default: 4 },
  seed: { type: Number, required: false },
}, { _id: false });

const CharacterSchema = new Schema<ICharacter>({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  appearance_prompt: { type: String, required: true },
  reference_image: { type: String, required: false },
  generated_url: { type: String, required: false },
});

const SceneSchema = new Schema<IScene>({
  scene_number: { type: Number, required: true },
  timestamp: { type: String, required: true },
  location: { type: String, required: true },
  action: { type: String, required: true },
  camera_movement: { type: String, required: true },
  frame_prompt: { type: String, required: true },
  frame_reference_image: { type: String, required: false },
  frame_url: { type: String, required: false },
  environment_prompt: { type: String, required: false },
  environment_reference_image: { type: String, required: false },
  background_url: { type: String, required: false },
  characters: { type: [CharacterSchema], default: [] },
  video_prompt: { type: String, required: true },
  video_url: { type: String, required: false },
  hf_parameters: { type: HfParametersSchema, required: false },
});

const ProjectSchema = new Schema<IProject>(
  {
    userId: { type: String, required: true, index: true, default: "00000000-0000-0000-0000-000000000001" },
    title: { type: String, required: true, default: "New Project" },
    globalVault: {
      type: GlobalVaultSchema,
      default: () => ({
        characterAnchor: { description: "Lead protagonist with cinematic detailing", imageUrl: "", replicatePulidSeed: 42 },
        environmentAnchor: { description: "Volumetric neon atmospheric environment", imageUrl: "", lightingProfile: "High contrast cinematic rim lighting" },
        aspectRatio: '9:16'
      })
    },
    scenes: { type: [StrictSceneSchema], default: [] },
    chatHistory: { type: [MessageSchema], default: [] },
    visualMetadata: { type: Schema.Types.Mixed, default: {} },
    storyboard: { type: [SceneSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

// Compound multi-tenant indexes for efficient per-user project retrieval
ProjectSchema.index({ userId: 1, updatedAt: -1 });
ProjectSchema.index({ userId: 1, _id: 1 });

export const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);