/**
 * @file src/app/api/inngest/route.ts
 * @description Inngest API endpoint for Next.js App Router.
 * Serves the master Blueprint orchestrator and specialized prompt workers.
 */

import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { orchestrateBlueprint } from "@/inngest/functions/orchestrateBlueprint";
import {
  generateCharacterTechnicalPrompt,
  generateEnvironmentTechnicalPrompt,
  generateSceneTechnicalPrompt,
} from "@/inngest/functions/generateTechnicalPrompts";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    orchestrateBlueprint,
    generateCharacterTechnicalPrompt,
    generateEnvironmentTechnicalPrompt,
    generateSceneTechnicalPrompt,
  ],
});
