import mongoose, { Document, Model, Schema } from "mongoose";

export type BlueprintStatus = "draft" | "approved" | "processing" | "completed" | "failed";

export interface IBlueprintCharacter {
  assetId: string;
  name: string;
  role?: string;
  description: string;
}

export interface IBlueprintEnvironment {
  assetId: string;
  name: string;
  description: string;
}

export interface IBlueprintScene {
  sceneId: string;
  order: number;
  action: string;
  characterIds?: string[];
  environmentId?: string;
  cameraDirection?: string;
  duration?: number;
}

export interface IBlueprint extends Document {
  projectId: string;
  userId: string;
  title: string;
  theme: string;
  logline?: string;
  characters: IBlueprintCharacter[];
  environments: IBlueprintEnvironment[];
  scenes: IBlueprintScene[];
  status: BlueprintStatus;
  createdAt: Date;
  updatedAt: Date;
}

const BlueprintCharacterSchema = new Schema<IBlueprintCharacter>(
  {
    assetId: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, default: "Lead" },
    description: { type: String, required: true },
  },
  { _id: false }
);

const BlueprintEnvironmentSchema = new Schema<IBlueprintEnvironment>(
  {
    assetId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
  },
  { _id: false }
);

const BlueprintSceneSchema = new Schema<IBlueprintScene>(
  {
    sceneId: { type: String, required: true },
    order: { type: Number, required: true },
    action: { type: String, required: true },
    characterIds: { type: [String], default: [] },
    environmentId: { type: String, default: "" },
    cameraDirection: { type: String, default: "" },
    duration: { type: Number, default: 5 },
  },
  { _id: false }
);

export const BlueprintSchema = new Schema<IBlueprint>(
  {
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, default: "Untitled Campaign" },
    theme: { type: String, required: true, default: "Emotional human storytelling" },
    logline: { type: String, default: "" },
    characters: { type: [BlueprintCharacterSchema], default: [] },
    environments: { type: [BlueprintEnvironmentSchema], default: [] },
    scenes: { type: [BlueprintSceneSchema], default: [] },
    status: {
      type: String,
      enum: ["draft", "approved", "processing", "completed", "failed"],
      default: "draft",
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for user isolation and fast lookup
BlueprintSchema.index({ userId: 1, projectId: 1 });
BlueprintSchema.index({ projectId: 1, status: 1 });

export const Blueprint: Model<IBlueprint> =
  mongoose.models.Blueprint || mongoose.model<IBlueprint>("Blueprint", BlueprintSchema);
