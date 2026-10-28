import mongoose, { Document, Model, Schema } from "mongoose";
import type {
  CameraAngle,
  CameraMovement,
  SceneStatus,
  TakeStatus,
  ProjectStage,
  AspectRatio,
  AssetStatus,
} from "@/lib/validations/project";

// --- RE-EXPORT TYPES ---
export type {
  CameraAngle,
  CameraMovement,
  SceneStatus,
  TakeStatus,
  ProjectStage,
  AspectRatio,
  AssetStatus,
};

// --- INTERFACES ---

export interface IAssetHistoryItem {
  id: string;
  url: string;
  prompt: string;
  seed?: number;
  createdAt: string;
}

export interface ICharacterAssetDoc {
  assetId: string;
  name: string;
  role: string;
  appearancePrompt: string;
  imageUrl: string;
  pulidSeed: number;
  status: AssetStatus;
  generationHistory: IAssetHistoryItem[];
  metadata?: Record<string, any>;
}

export interface ILocationAssetDoc {
  assetId: string;
  name: string;
  environmentPrompt: string;
  lightingProfile: string;
  imageUrl: string;
  status: AssetStatus;
  generationHistory: IAssetHistoryItem[];
  metadata?: Record<string, any>;
}

export interface IGlobalAssetsDoc {
  characters: ICharacterAssetDoc[];
  locations: ILocationAssetDoc[];
}

export interface ITakeDoc {
  takeId: string;
  takeNumber: number;
  videoUrl: string;
  thumbnailUrl?: string;
  frameUrl?: string;
  prompt: string;
  motionPrompt?: string;
  model: string;
  status: TakeStatus;
  taskId?: string;
  duration: number;
  createdAt: string;
}

export interface ISceneDoc {
  sceneId: string;
  order: number;
  title?: string;
  duration: number; // default 10s
  cameraAngle: CameraAngle;
  cameraMovement?: CameraMovement;
  rawDelta: string;
  dialogue?: string;
  locationId?: string;
  characterIds?: string[];
  imagePrompt: string;
  motionPrompt: string;
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  videoUrl?: string; // Active take video URL
  takes?: ITakeDoc[];
  activeTakeId?: string;
  status: SceneStatus;
}

export interface IMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface IExportConfigDoc {
  fcpxmlVersion: string;
  frameRate: number;
  resolution: {
    width: number;
    height: number;
  };
}

// Legacy interfaces retained for backward compatibility
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
  aspectRatio: "9:16" | "16:9" | "1:1";
}

export interface IProject extends Document {
  userId: string;
  title: string;
  currentStage: ProjectStage;
  aspectRatio: AspectRatio;
  scriptContent: string;
  global_assets: IGlobalAssetsDoc;
  globalVault?: IGlobalVault; // Backwards compatibility
  scenes: ISceneDoc[];
  chatHistory: IMessage[];
  exportConfig: IExportConfigDoc;
  visualMetadata?: Record<string, any>;
  storyboard?: any[]; // Legacy
  createdAt: Date;
  updatedAt: Date;
}

// --- MONGOOSE SCHEMAS ---

const AssetHistoryItemSchema = new Schema<IAssetHistoryItem>(
  {
    id: { type: String, required: true },
    url: { type: String, required: true },
    prompt: { type: String, default: "" },
    seed: { type: Number },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false }
);

export const CharacterAssetSchema = new Schema<ICharacterAssetDoc>(
  {
    assetId: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, default: "Lead" },
    appearancePrompt: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    pulidSeed: { type: Number, default: 42 },
    status: {
      type: String,
      enum: ["draft", "generating", "approved", "rejected"],
      default: "draft",
    },
    generationHistory: { type: [AssetHistoryItemSchema], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

export const LocationAssetSchema = new Schema<ILocationAssetDoc>(
  {
    assetId: { type: String, required: true },
    name: { type: String, required: true },
    environmentPrompt: { type: String, required: true },
    lightingProfile: { type: String, default: "Cinematic atmospheric lighting" },
    imageUrl: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "generating", "approved", "rejected"],
      default: "draft",
    },
    generationHistory: { type: [AssetHistoryItemSchema], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

export const GlobalAssetsSchema = new Schema<IGlobalAssetsDoc>(
  {
    characters: { type: [CharacterAssetSchema], default: [] },
    locations: { type: [LocationAssetSchema], default: [] },
  },
  { _id: false }
);

export const TakeSchema = new Schema<ITakeDoc>(
  {
    takeId: { type: String, required: true },
    takeNumber: { type: Number, required: true, default: 1 },
    videoUrl: { type: String, default: "" },
    thumbnailUrl: { type: String, default: "" },
    frameUrl: { type: String, default: "" },
    prompt: { type: String, default: "" },
    motionPrompt: { type: String, default: "" },
    model: { type: String, default: "kling-2.5" },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    taskId: { type: String, default: "" },
    duration: { type: Number, default: 10 },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false }
);

export const StrictSceneSchema = new Schema<ISceneDoc>(
  {
    sceneId: { type: String, required: true },
    order: { type: Number, required: true },
    title: { type: String, default: "" },
    duration: { type: Number, default: 10 },
    cameraAngle: {
      type: String,
      enum: [
        "CAM_A_CENTER",
        "CAM_B_45_CLOSE",
        "CAM_C_OTS",
        "CLOSE_UP",
        "MEDIUM_SHOT",
        "WIDE_SHOT",
        "EXTREME_CLOSE_UP",
        "ESTABLISHING",
      ],
      default: "CAM_A_CENTER",
    },
    cameraMovement: {
      type: String,
      enum: [
        "STATIC",
        "PUSH_IN",
        "PULL_OUT",
        "PAN_LEFT",
        "PAN_RIGHT",
        "TILT_UP",
        "TILT_DOWN",
        "TRACKING",
        "ORBIT",
      ],
      default: "STATIC",
    },
    rawDelta: { type: String, default: "" },
    dialogue: { type: String, default: "" },
    locationId: { type: String, default: "" },
    characterIds: { type: [String], default: [] },
    imagePrompt: { type: String, default: "" },
    motionPrompt: { type: String, default: "" },
    firstFrameUrl: { type: String, default: "" },
    lastFrameUrl: { type: String, default: "" },
    videoUrl: { type: String, default: "" },
    takes: { type: [TakeSchema], default: [] },
    activeTakeId: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "idle", "enriching", "ready", "generating", "completed", "failed"],
      default: "idle",
    },
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessage>(
  {
    role: { type: String, enum: ["user", "assistant", "system"], required: true },
    content: { type: String, required: true },
    timestamp: { type: String, required: true },
  },
  { _id: false }
);

const ExportConfigSchema = new Schema<IExportConfigDoc>(
  {
    fcpxmlVersion: { type: String, default: "1.9" },
    frameRate: { type: Number, default: 24 },
    resolution: {
      width: { type: Number, default: 1080 },
      height: { type: Number, default: 1920 },
    },
  },
  { _id: false }
);

// Legacy Global Vault Schema
const GlobalVaultSchema = new Schema<IGlobalVault>(
  {
    characterAnchor: {
      description: { type: String, default: "Lead protagonist with cinematic detailing" },
      imageUrl: { type: String, default: "" },
      replicatePulidSeed: { type: Number, default: 42 },
    },
    environmentAnchor: {
      description: { type: String, default: "Volumetric neon atmospheric environment" },
      imageUrl: { type: String, default: "" },
      lightingProfile: { type: String, default: "High contrast cinematic rim lighting" },
    },
    aspectRatio: { type: String, enum: ["9:16", "16:9", "1:1"], default: "9:16" },
  },
  { _id: false }
);

export const ProjectSchema = new Schema<IProject>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, default: "New Project" },
    currentStage: {
      type: String,
      enum: ["writers_room", "casting_scouting", "timeline", "export"],
      default: "writers_room",
    },
    aspectRatio: {
      type: String,
      enum: ["9:16", "16:9", "1:1"],
      default: "9:16",
    },
    scriptContent: { type: String, default: "" },
    global_assets: {
      type: GlobalAssetsSchema,
      default: () => ({ characters: [], locations: [] }),
    },
    globalVault: {
      type: GlobalVaultSchema,
      default: () => ({
        characterAnchor: {
          description: "Lead protagonist with cinematic detailing",
          imageUrl: "",
          replicatePulidSeed: 42,
        },
        environmentAnchor: {
          description: "Volumetric neon atmospheric environment",
          imageUrl: "",
          lightingProfile: "High contrast cinematic rim lighting",
        },
        aspectRatio: "9:16",
      }),
    },
    scenes: { type: [StrictSceneSchema], default: [] },
    chatHistory: { type: [MessageSchema], default: [] },
    exportConfig: {
      type: ExportConfigSchema,
      default: () => ({
        fcpxmlVersion: "1.9",
        frameRate: 24,
        resolution: { width: 1080, height: 1920 },
      }),
    },
    visualMetadata: { type: Schema.Types.Mixed, default: {} },
    storyboard: { type: [Schema.Types.Mixed], default: [] },
  },
  {
    timestamps: true,
  }
);

// --- MULTI-TENANT COMPOUND INDEXES ---
// 1. Dashboard fast query by user and update order
ProjectSchema.index({ userId: 1, updatedAt: -1 });
// 2. Direct user-scoped project lookup
ProjectSchema.index({ userId: 1, _id: 1 });
// 3. Fast delta updates targeting embedded scenes
ProjectSchema.index({ userId: 1, "scenes.sceneId": 1 });
// 4. Fast updates targeting character assets
ProjectSchema.index({ userId: 1, "global_assets.characters.assetId": 1 });
// 5. Fast updates targeting location assets
ProjectSchema.index({ userId: 1, "global_assets.locations.assetId": 1 });

export const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);
