import mongoose, { Document, Model, Schema } from "mongoose";

// --- INTERFACES ---

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

// 1. New Character Interface
export interface ICharacter {
  _id: string; // Custom string ID (e.g., 'char-1') to sync exactly with React Flow nodes
  name: string;
  appearance_prompt: string;
  reference_image?: string; // Base64 or CDN URL for Img2Img conditioning
  generated_url?: string;   // The final output character sheet/asset
}

export interface IScene {
  scene_number: number;
  timestamp: string;
  location: string;
  action: string;
  camera_movement: string;
  
  // --- TEMPORAL START FRAME NODE ---
  frame_prompt: string; 
  frame_reference_image?: string; // Optional Img2Img override
  frame_url?: string; 
  
  // --- ENVIRONMENT / BACKGROUND NODE ---
  environment_prompt?: string;
  environment_reference_image?: string;
  background_url?: string;

  // --- CHARACTER NODES (Dynamic Array) ---
  characters?: ICharacter[];

  // --- VIDEO COMPILER NODE ---
  video_prompt: string; 
  video_url?: string; 

  hf_parameters?: IHfParameters; 
}

export interface IProject extends Document {
  title: string;
  chatHistory: IMessage[];
  visualMetadata: Record<string, any>;
  storyboard: IScene[];
  createdAt: Date;
  updatedAt: Date;
}

// --- SCHEMAS ---

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

// 2. Embedded Character Schema
const CharacterSchema = new Schema<ICharacter>({
  _id: { type: String, required: true }, // Syncs with frontend `char-1`
  name: { type: String, required: true },
  appearance_prompt: { type: String, required: true },
  reference_image: { type: String, required: false },
  generated_url: { type: String, required: false },
});

// 3. Upgraded Scene Schema
const SceneSchema = new Schema<IScene>({
  scene_number: { type: Number, required: true },
  timestamp: { type: String, required: true },
  location: { type: String, required: true },
  action: { type: String, required: true },
  camera_movement: { type: String, required: true },
  
  // Left Node: Temporal Start Frame
  frame_prompt: { type: String, required: true },
  frame_reference_image: { type: String, required: false },
  frame_url: { type: String, required: false },
  
  // Bottom Node: Environment
  environment_prompt: { type: String, required: false },
  environment_reference_image: { type: String, required: false },
  background_url: { type: String, required: false },

  // Top Nodes: Dynamic Characters
  characters: { type: [CharacterSchema], default: [] },

  // Center/Right Node: Video
  video_prompt: { type: String, required: true },
  video_url: { type: String, required: false },

  hf_parameters: { type: HfParametersSchema, required: false },
});

const ProjectSchema = new Schema<IProject>(
  {
    title: { type: String, required: true, default: "New Project" },
    chatHistory: { type: [MessageSchema], default: [] },
    visualMetadata: { type: Schema.Types.Mixed, default: {} },
    storyboard: { type: [SceneSchema], default: [] },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// --- PRODUCTION INDEXES ---
// Optimize database lookups for sorting projects by newest first
ProjectSchema.index({ updatedAt: -1 });

export const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);