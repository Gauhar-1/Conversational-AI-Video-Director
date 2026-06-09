// src/lib/queue/videoWorker.ts
import { Worker } from 'bullmq';
import { VideoTask } from '@/models/VideoTask';
import { getFallbackChain } from './getFallbackChain';
import dbConnect from '../db';

export const worker = new Worker("video-queue", async (job: any) => {
  await dbConnect();
  
  const { taskId, prompt, advancedInputs, keys, userPreference, isDraft } = job.data;

  // Mark task as processing
  await VideoTask.findByIdAndUpdate(taskId, { status: "processing" });

  // Make sure to pass the hasAudio flag if your fallback chain needs it!
  const hasAudioFile = !!advancedInputs?.audioUrl;
  const providers = getFallbackChain(keys, userPreference, isDraft, hasAudioFile);
  
  let finalUrl = null;

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    try {
      // 1. Broadcast what we are currently attempting
      await VideoTask.findByIdAndUpdate(taskId, { currentModel: provider.name });
      console.log(`[Worker] Attempting render with ${provider.name}...`);

      // 2. Pass the flexible payload
      finalUrl = await provider.generate({ prompt, advancedInputs });
      
      // 3. Log the success so the UI gets that green ✅
      await VideoTask.findByIdAndUpdate(taskId, {
        $push: {
          logs: {
            providerName: provider.name,
            attemptNumber: i + 1,
            timestamp: new Date()
          } // No error reason means success!
        }
      });
      
      break; // Success! Exit the loop.
      
    } catch (error: any) {
      console.warn(`[Worker] ${provider.name} failed: ${error.message}`);
      
      // Log the failure to the DB for the user to see
      await VideoTask.findByIdAndUpdate(taskId, {
        $push: {
          logs: {
            providerName: provider.name,
            attemptNumber: i + 1,
            errorReason: error.message,
            timestamp: new Date()
          }
        }
      });
    }
  }

  // Final State Resolution
  if (finalUrl) {
    await VideoTask.findByIdAndUpdate(taskId, { 
      status: "completed", 
      finalVideoUrl: finalUrl,
      currentModel: null // Clear this out
    });
  } else {
    await VideoTask.findByIdAndUpdate(taskId, { 
      status: "failed",
      currentModel: null
    });
  }
}, { 
  connection: { 
    host: process.env.REDIS_HOST || "127.0.0.1", 
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD || undefined
  } 
});