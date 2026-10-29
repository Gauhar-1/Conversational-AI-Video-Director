/**
 * @file src/inngest/client.ts
 * @description Inngest client initialization and typed event schemas for Director AI.
 * Orchestrates background fan-out, granular retries, and strict concurrency controls.
 */

import { Inngest } from "inngest";
import type {
  BlueprintCharacter,
  BlueprintEnvironment,
  BlueprintScene,
} from "@/lib/validations/blueprint";

export type DirectorEvents = {
  "project.blueprint.approved": {
    data: {
      projectId: string;
      blueprintId: string;
      apiKey?: string;
    };
  };
  "replicate.prompt.character": {
    data: {
      projectId: string;
      blueprintId: string;
      character: BlueprintCharacter;
      theme: string;
      apiKey?: string;
    };
  };
  "replicate.prompt.character.completed": {
    data: {
      projectId: string;
      blueprintId: string;
      assetId: string;
      prompt: string;
    };
  };
  "replicate.prompt.environment": {
    data: {
      projectId: string;
      blueprintId: string;
      environment: BlueprintEnvironment;
      theme: string;
      apiKey?: string;
    };
  };
  "replicate.prompt.environment.completed": {
    data: {
      projectId: string;
      blueprintId: string;
      assetId: string;
      prompt: string;
    };
  };
  "replicate.prompt.scene": {
    data: {
      projectId: string;
      blueprintId: string;
      scene: BlueprintScene;
      theme: string;
      apiKey?: string;
    };
  };
  "replicate.prompt.scene.completed": {
    data: {
      projectId: string;
      blueprintId: string;
      sceneId: string;
      imagePrompt: string;
      motionPrompt: string;
    };
  };
};

export const inngest = new Inngest({
  id: "director-ai",
  name: "Director AI Background Orchestrator",
});
