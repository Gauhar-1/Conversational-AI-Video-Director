/**
 * @file src/__tests__/inngestFanOut.test.ts
 * @description Comprehensive test suite for Inngest Plan-and-Execute Fan-Out,
 * Rate-limiting concurrency controls, Blueprint validation, and SWR asset generation tracking.
 */

import { inngest } from "@/inngest/client";
import { orchestrateBlueprint } from "@/inngest/functions/orchestrateBlueprint";
import {
  generateCharacterTechnicalPrompt,
  generateEnvironmentTechnicalPrompt,
  generateSceneTechnicalPrompt,
} from "@/inngest/functions/generateTechnicalPrompts";
import { blueprintSchema } from "@/lib/validations/blueprint";

// Mock dependencies
jest.mock("@/lib/auth/getAuthUser", () => ({
  getAuthUser: jest.fn().mockResolvedValue({
    userId: "test-user-uuid",
    isAuthenticated: true,
  }),
}));

jest.mock("@/lib/db", () => jest.fn().mockResolvedValue(true));

describe("Inngest Fan-Out & Rate Limit Mitigation Architecture", () => {
  describe("1. Inngest Client & Orchestrator Configuration", () => {
    it("initializes Inngest client with director-ai id", () => {
      expect(inngest.id).toBe("director-ai");
    });

    it("configures orchestrateBlueprint with concurrency limit: 1 per project", () => {
      // Access Inngest function internal options
      const fnOpts = (orchestrateBlueprint as any).opts;
      expect(fnOpts.id).toBe("orchestrate-blueprint");
      expect(fnOpts.concurrency).toBeDefined();
      expect(fnOpts.concurrency.limit).toBe(1);
      expect(fnOpts.concurrency.key).toBe("event.data.projectId");
    });

    it("triggers master orchestrator on 'project.blueprint.approved'", () => {
      const triggers = (orchestrateBlueprint as any).opts.triggers;
      const hasApprovedTrigger = triggers.some(
        (t: any) => t.event === "project.blueprint.approved"
      );
      expect(hasApprovedTrigger).toBe(true);
    });
  });

  describe("2. Specialized Workers Rate Limiting (Concurrency: 3)", () => {
    it("enforces concurrency limit: 3 on Character technical prompt worker", () => {
      const fnOpts = (generateCharacterTechnicalPrompt as any).opts;
      expect(fnOpts.id).toBe("generate-character-technical-prompt");
      expect(fnOpts.concurrency.limit).toBe(3);
      const triggers = fnOpts.triggers;
      expect(triggers.some((t: any) => t.event === "replicate.prompt.character")).toBe(true);
    });

    it("enforces concurrency limit: 3 on Environment technical prompt worker", () => {
      const fnOpts = (generateEnvironmentTechnicalPrompt as any).opts;
      expect(fnOpts.id).toBe("generate-environment-technical-prompt");
      expect(fnOpts.concurrency.limit).toBe(3);
      const triggers = fnOpts.triggers;
      expect(triggers.some((t: any) => t.event === "replicate.prompt.environment")).toBe(true);
    });

    it("enforces concurrency limit: 3 on Scene technical prompt worker", () => {
      const fnOpts = (generateSceneTechnicalPrompt as any).opts;
      expect(fnOpts.id).toBe("generate-scene-technical-prompt");
      expect(fnOpts.concurrency.limit).toBe(3);
      const triggers = fnOpts.triggers;
      expect(triggers.some((t: any) => t.event === "replicate.prompt.scene")).toBe(true);
    });
  });

  describe("3. Zod Blueprint Validation & DB Segregation", () => {
    it("validates a compliant human-readable Blueprint without error", () => {
      const validBlueprint = {
        projectId: "proj-123",
        title: "The Carpenter's Hands",
        theme: "Quiet fatherly sacrifice and generational craftsmanship",
        characters: [
          {
            assetId: "char-1",
            name: "Harish",
            role: "Father / Master Carpenter",
            description: "Elderly Indian carpenter in his 60s, weathered calloused hands, warm smile, simple khadi kurta.",
          },
        ],
        environments: [
          {
            assetId: "env-1",
            name: "Sunlit Workshop",
            description: "Rustic wooden workshop with morning sunlight cutting through sawdust haze, antique hand planes on wooden benches.",
          },
        ],
        scenes: [
          {
            sceneId: "scene-1",
            order: 1,
            action: "Harish gently planes a block of teak wood as golden sawdust floats in the air.",
            characterIds: ["char-1"],
            environmentId: "env-1",
            cameraDirection: "Slow push-in macro shot",
            duration: 5,
          },
        ],
        status: "draft" as const,
      };

      const parsed = blueprintSchema.safeParse(validBlueprint);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.characters).toHaveLength(1);
        expect(parsed.data.environments).toHaveLength(1);
        expect(parsed.data.scenes).toHaveLength(1);
      }
    });

    it("rejects invalid blueprint missing required fields", () => {
      const invalidBlueprint = {
        title: "Missing Project ID",
        characters: [],
      };

      const parsed = blueprintSchema.safeParse(invalidBlueprint);
      expect(parsed.success).toBe(false);
    });
  });

  describe("4. Asset Status ready_for_render Support", () => {
    it("supports ready_for_render status in asset and scene validations", async () => {
      const { assetStatusSchema } = await import("@/lib/validations/asset");
      const { sceneStatusSchema } = await import("@/lib/validations/scene");

      expect(assetStatusSchema.safeParse("ready_for_render").success).toBe(true);
      expect(sceneStatusSchema.safeParse("ready_for_render").success).toBe(true);
    });
  });
});
