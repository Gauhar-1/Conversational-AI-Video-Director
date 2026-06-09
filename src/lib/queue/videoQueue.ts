// src/lib/queue/videoQueue.ts
import { Queue } from "bullmq";
import Redis from "ioredis";

// Use a shared Redis connection to prevent exhausting connection limits
const redisConnection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const videoQueue = new Queue("video-queue", {
  connection: redisConnection,
});