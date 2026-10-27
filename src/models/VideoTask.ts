/**
 * @file src/models/VideoTask.ts
 * @description Mongoose Model for Generative Video Tasks with Multi-Tenant Isolation & Idempotency.
 */

import mongoose, { Document, Model, Schema } from "mongoose";

export interface IVideoTaskLog {
  providerName?: string;
  modelUsed?: string;
  attemptNumber?: number;
  errorReason?: string;
  timestamp: Date;
}

export interface IVideoTask extends Document {
  userId: string;
  projectId: string;
  sceneId?: string;
  sceneNumber?: number;
  status: "pending" | "processing" | "completed" | "failed";
  replicatePredictionId?: string;
  idempotencyKey?: string;
  originalPrompt: string;
  enhancedPrompt?: string;
  finalVideoUrl?: string;
  error?: string;
  logs: IVideoTaskLog[];
  createdAt: Date;
  updatedAt: Date;
}

const VideoTaskLogSchema = new Schema<IVideoTaskLog>(
  {
    providerName: { type: String },
    modelUsed: { type: String },
    attemptNumber: { type: Number, default: 1 },
    errorReason: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const VideoTaskSchema = new Schema<IVideoTask>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      default: "00000000-0000-0000-0000-000000000001",
    },
    projectId: { type: String, required: true, index: true },
    sceneId: { type: String, index: true },
    sceneNumber: { type: Number },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
    replicatePredictionId: { type: String, index: true },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    originalPrompt: { type: String, required: true },
    enhancedPrompt: { type: String },
    finalVideoUrl: { type: String },
    error: { type: String },
    logs: { type: [VideoTaskLogSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

// Multi-tenant indexes for rapid polling and deduplication
VideoTaskSchema.index({ userId: 1, projectId: 1, createdAt: -1 });
VideoTaskSchema.index({ userId: 1, sceneId: 1, status: 1 });

export const VideoTask: Model<IVideoTask> =
  mongoose.models.VideoTask || mongoose.model<IVideoTask>("VideoTask", VideoTaskSchema);