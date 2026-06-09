// src/models/VideoTask.ts
import mongoose from "mongoose";

const VideoTaskSchema = new mongoose.Schema({
  projectId: String,
  sceneNumber: Number,
  status: { type: String, enum: ["pending", "processing", "completed", "failed"], default: "pending" },
  finalVideoUrl: String,
  logs: [{
    providerName: String,
    modelUsed: String,
    attemptNumber: Number,
    errorReason: String,
    timestamp: Date
  }]
}, { timestamps: true });

export const VideoTask = mongoose.models.VideoTask || mongoose.model("VideoTask", VideoTaskSchema);