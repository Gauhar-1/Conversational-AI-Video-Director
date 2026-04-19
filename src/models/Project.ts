import mongoose, { Document, Model, Schema } from "mongoose";

export interface IMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface IScene {
  scene_number: number;
  timestamp: string;
  location: string;
  action: string;
  camera_movement: string;
  generation_prompt: string;
  image_url?: string; // <-- ADDED THIS: Optional because it's empty before generation
  video_url?: string;
}

export interface IProject extends Document {
  title: string;
  chatHistory: IMessage[];
  visualMetadata: Record<string, any>;
  storyboard: IScene[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  role: { type: String, enum: ["user", "assistant", "system"], required: true },
  content: { type: String, required: true },
  timestamp: { type: String, required: true },
});

const SceneSchema = new Schema<IScene>({
  scene_number: { type: Number, required: true },
  timestamp: { type: String, required: true },
  location: { type: String, required: true },
  action: { type: String, required: true },
  camera_movement: { type: String, required: true },
  generation_prompt: { type: String, required: true },
  image_url: { type: String, required: false }, // <-- ADDED THIS: Tells Mongoose to expect it
  video_url: { type: String, required: false },
});

const ProjectSchema = new Schema<IProject>(
  {
    title: { type: String, required: true, default: "New Project" },
    chatHistory: { type: [MessageSchema], default: [] },
    visualMetadata: { type: Schema.Types.Mixed, default: {} },
    storyboard: { type: [SceneSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

// Prevent mongoose from recompiling the model upon HMR in development
export const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);